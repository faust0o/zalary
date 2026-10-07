//! FROST(Pallas, BLAKE2b-512) treasuries: distributed key generation and
//! rerandomized signing, wire-compatible with ZF's frost-client / frostd.
//!
//! - DKG: a transport-agnostic port of frost-client's HTTP DKG flow and
//!   `DKGSessionState`, including the Goldwasser–Lindell echo broadcast of the
//!   round 1 packages (skipped for two participants), with every message wrapped
//!   in the same one-way Noise channels frost-client uses ([`crate::noise`]).
//! - Signing: one rerandomized FROST signature per Orchard/Ironwood spend, with
//!   frost-client's JSON payloads (`Vec<SigningCommitments>`,
//!   `SendSigningPackageArgs`, `Vec<SignatureShare>`).

use std::collections::{BTreeMap, BTreeSet, HashMap};

use frost_core::{
    keys::{
        dkg::{self, round1, round2},
        KeyPackage, PublicKeyPackage,
    },
    round1::{SigningCommitments, SigningNonces},
    round2::SignatureShare,
    Identifier, SigningPackage,
};
use frost_rerandomized::{RandomizedParams, Randomizer};
use rand_core::OsRng;
use reddsa::frost::redpallas::{keys::EvenY, PallasBlake2b512 as P};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::noise::{self, TransportState};
use crate::util::{ctx, parse_hex_array, Error, Result};

pub type Id = Identifier<P>;

/// Derives a participant identifier exactly like frost-client:
/// `Identifier::derive(session_id.as_bytes() || comms_pubkey)`, where
/// `session_id.as_bytes()` are the UUID's 16 raw bytes.
pub fn derive_identifier(session_id: &uuid::Uuid, pubkey: &[u8; 32]) -> Result<Id> {
    Id::derive(&[session_id.as_bytes().as_slice(), pubkey.as_slice()].concat())
        .map_err(ctx("Failed to derive FROST identifier"))
}

pub fn identifier_hex(id: &Id) -> String {
    hex::encode(id.serialize())
}

pub fn parse_identifier(s: &str) -> Result<Id> {
    let bytes = hex::decode(s.trim()).map_err(ctx("Invalid identifier hex"))?;
    Id::deserialize(&bytes).map_err(ctx("Invalid FROST identifier"))
}

/// The orchard `ak` encoding of a FROST group key, which must have ỹ = 0.
pub fn spend_validating_key(group_key: &[u8; 32]) -> Result<orchard::keys::SpendValidatingKey> {
    orchard::keys::SpendValidatingKey::from_bytes(group_key).ok_or_else(|| {
        Error::new("Group public key is not a valid Orchard spend validating key (must be a non-identity Pallas point with even y)")
    })
}

// ---------------------------------------------------------------------------
// DKG
// ---------------------------------------------------------------------------

/// A Noise-encrypted message to send to one participant through frostd.
#[derive(Debug, Clone)]
pub struct Outgoing {
    pub recipient: [u8; 32],
    pub msg: Vec<u8>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Phase {
    /// `start()` not yet called.
    NotStarted,
    /// Waiting for every other participant's round 1 package.
    Round1,
    /// Waiting for the echo broadcasts of the round 1 packages (n > 2 only).
    Echo,
    /// Round 2 packages sent; waiting for everyone else's.
    Round2,
    Done,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Kind {
    Round1,
    Echo,
    Round2,
}

enum Incoming {
    Round1(round1::Package<P>),
    Echo(Id, round1::Package<P>),
    Round2(round2::Package<P>),
}

/// The result of a completed DKG.
pub struct DkgOutput {
    pub identifier: Id,
    pub key_package: KeyPackage<P>,
    pub public_key_package: PublicKeyPackage<P>,
    pub group_public_key: [u8; 32],
}

pub struct Dkg {
    secret: Zeroizing<[u8; 32]>,
    own_pubkey: [u8; 32],
    session_id: uuid::Uuid,
    identifier: Id,
    min_signers: u16,
    /// Every participant (including us), comms pubkey → identifier.
    participants: BTreeMap<[u8; 32], Id>,
    /// Noise state of our channel to each peer (`None` until the first message).
    send_states: BTreeMap<[u8; 32], Option<TransportState>>,
    /// Noise state of each peer's channel to us.
    recv_states: BTreeMap<[u8; 32], Option<TransportState>>,
    /// Number of messages decrypted from each peer so far.
    recv_counts: BTreeMap<[u8; 32], usize>,
    /// Decrypted messages that cannot be processed in the current phase yet, in
    /// arrival order.
    pending: Vec<(Id, Incoming)>,
    phase: Phase,
    round1_secret: Option<dkg::round1::SecretPackage<P>>,
    round2_secret: Option<dkg::round2::SecretPackage<P>>,
    round1_packages: BTreeMap<Id, round1::Package<P>>,
    /// Echoed round 1 packages, keyed by original sender, then by echoing sender.
    echoes: BTreeMap<Id, BTreeMap<Id, round1::Package<P>>>,
    round2_packages: BTreeMap<Id, round2::Package<P>>,
    output: Option<(KeyPackage<P>, PublicKeyPackage<P>)>,
    failed: Option<String>,
}

impl Dkg {
    pub fn new(
        secret: &[u8],
        session_id: &str,
        participants: &[String],
        min_signers: u16,
    ) -> Result<Self> {
        let secret: [u8; 32] = crate::util::bytes_array(secret, "comms secret")?;
        let secret = Zeroizing::new(secret);
        let own_pubkey = noise::public_key(&secret);
        let session_id = uuid::Uuid::parse_str(session_id.trim())
            .map_err(ctx("Invalid DKG session id (expected a UUID)"))?;

        let mut map = BTreeMap::new();
        for p in participants {
            let pk = noise::parse_public_key(p)?;
            if map.insert(pk, derive_identifier(&session_id, &pk)?).is_some() {
                return Err(Error::new(format!("Duplicate DKG participant {p}")));
            }
        }
        let identifier = *map.get(&own_pubkey).ok_or_else(|| {
            Error::new("Own comms public key is not among the DKG participants")
        })?;
        let n = map.len();
        if n < 2 {
            return Err(Error::new("A DKG needs at least 2 participants"));
        }
        if n > u16::MAX as usize {
            return Err(Error::new("Too many DKG participants"));
        }
        if min_signers < 2 || min_signers as usize > n {
            return Err(Error::new(format!(
                "minSigners must be between 2 and the number of participants ({n}), got {min_signers}"
            )));
        }
        let peers: Vec<[u8; 32]> = map.keys().copied().filter(|k| *k != own_pubkey).collect();
        Ok(Dkg {
            secret,
            own_pubkey,
            session_id,
            identifier,
            min_signers,
            participants: map,
            send_states: peers.iter().map(|p| (*p, None)).collect(),
            recv_states: peers.iter().map(|p| (*p, None)).collect(),
            recv_counts: peers.iter().map(|p| (*p, 0)).collect(),
            pending: vec![],
            phase: Phase::NotStarted,
            round1_secret: None,
            round2_secret: None,
            round1_packages: BTreeMap::new(),
            echoes: BTreeMap::new(),
            round2_packages: BTreeMap::new(),
            output: None,
            failed: None,
        })
    }

    pub fn identifier(&self) -> Id {
        self.identifier
    }

    pub fn identifier_of(&self, pubkey: &[u8; 32]) -> Result<Id> {
        derive_identifier(&self.session_id, pubkey)
    }

    fn n(&self) -> usize {
        self.participants.len()
    }

    fn check_alive(&self) -> Result<()> {
        match &self.failed {
            Some(e) => Err(Error::new(format!("DKG aborted earlier: {e}"))),
            None => Ok(()),
        }
    }

    /// Runs part 1 and returns the encrypted round 1 package for every other
    /// participant (plus anything already-buffered messages now trigger).
    pub fn start(&mut self) -> Result<Vec<Outgoing>> {
        self.check_alive()?;
        if self.phase != Phase::NotStarted {
            return Err(Error::new("DKG already started"));
        }
        let r = self.start_inner();
        self.fail_on_error(r)
    }

    fn start_inner(&mut self) -> Result<Vec<Outgoing>> {
        let (secret, package) =
            dkg::part1::<P, _>(self.identifier, self.n() as u16, self.min_signers, OsRng)
                .map_err(ctx("DKG part 1 failed"))?;
        self.round1_secret = Some(secret);
        self.phase = Phase::Round1;
        let payload = serde_json::to_vec(&package).map_err(ctx("serialize round 1 package"))?;
        let mut out = vec![];
        for peer in self.peers() {
            out.push(self.encrypt_to(&peer, &payload)?);
        }
        out.extend(self.pump()?);
        Ok(out)
    }

    /// Handles a message from `sender` and returns the messages it triggers.
    pub fn receive(&mut self, sender: &[u8; 32], ciphertext: &[u8]) -> Result<Vec<Outgoing>> {
        self.check_alive()?;
        if *sender == self.own_pubkey {
            return Err(Error::new("Received a DKG message from ourselves"));
        }
        let sender_id = *self
            .participants
            .get(sender)
            .ok_or_else(|| Error::new(format!("Unknown DKG sender {}", hex::encode(sender))))?;

        // Decrypt first; a message that fails to decrypt leaves all state untouched.
        let state = self.recv_states.get(sender).cloned().flatten();
        let (new_state, plaintext) = noise::decrypt(&self.secret, sender, state, ciphertext)?;
        let plaintext = Zeroizing::new(plaintext);
        self.recv_states.insert(*sender, Some(new_state));
        let index = self.recv_counts[sender];
        *self.recv_counts.get_mut(sender).expect("peer") += 1;

        let r = self.receive_inner(sender_id, index, &plaintext);
        self.fail_on_error(r)
    }

    fn receive_inner(&mut self, sender: Id, index: usize, plaintext: &[u8]) -> Result<Vec<Outgoing>> {
        // Each peer sends, in order: its round 1 package, n − 2 echoes (when
        // n > 2), and its round 2 package for us.
        let echoes = if self.n() > 2 { self.n() - 2 } else { 0 };
        let kind = if index == 0 {
            Kind::Round1
        } else if index <= echoes {
            Kind::Echo
        } else if index == echoes + 1 {
            Kind::Round2
        } else {
            return Err(Error::new("Unexpected extra DKG message"));
        };
        let incoming = match kind {
            Kind::Round1 => Incoming::Round1(
                serde_json::from_slice(plaintext).map_err(ctx("Invalid round 1 package"))?,
            ),
            Kind::Echo => {
                let (id, pkg): (Id, round1::Package<P>) = serde_json::from_slice(plaintext)
                    .map_err(ctx("Invalid echoed round 1 package"))?;
                Incoming::Echo(id, pkg)
            }
            Kind::Round2 => Incoming::Round2(
                serde_json::from_slice(plaintext).map_err(ctx("Invalid round 2 package"))?,
            ),
        };
        self.pending.push((sender, incoming));
        self.pump()
    }

    fn fail_on_error<T>(&mut self, r: Result<T>) -> Result<T> {
        if let Err(e) = &r {
            self.failed = Some(e.0.clone());
        }
        r
    }

    pub fn is_complete(&self) -> bool {
        self.phase == Phase::Done
    }

    pub fn output(&self) -> Result<DkgOutput> {
        self.check_alive()?;
        let (key_package, public_key_package) = self
            .output
            .clone()
            .ok_or_else(|| Error::new("DKG is not complete yet"))?;
        let group_public_key: [u8; 32] = public_key_package
            .verifying_key()
            .serialize()
            .map_err(ctx("serialize group key"))?
            .try_into()
            .map_err(|_| Error::new("group key must be 32 bytes"))?;
        Ok(DkgOutput {
            identifier: self.identifier,
            key_package,
            public_key_package,
            group_public_key,
        })
    }

    fn peers(&self) -> Vec<[u8; 32]> {
        self.send_states.keys().copied().collect()
    }

    fn pubkey_of(&self, id: &Id) -> [u8; 32] {
        *self
            .participants
            .iter()
            .find(|(_, i)| *i == id)
            .expect("identifier of a participant")
            .0
    }

    fn encrypt_to(&mut self, recipient: &[u8; 32], payload: &[u8]) -> Result<Outgoing> {
        let state = self.send_states.get_mut(recipient).expect("peer").take();
        let (state, msg) = noise::encrypt(&self.secret, recipient, state, payload)?;
        self.send_states.insert(*recipient, Some(state));
        Ok(Outgoing { recipient: *recipient, msg })
    }

    /// Processes every buffered message the current phase allows, advancing the
    /// phase (and producing outgoing messages) as often as possible.
    fn pump(&mut self) -> Result<Vec<Outgoing>> {
        let mut out = vec![];
        loop {
            let mut progressed = false;
            let mut i = 0;
            while i < self.pending.len() {
                let ready = match &self.pending[i].1 {
                    Incoming::Round1(_) => true,
                    Incoming::Echo(..) => self.phase == Phase::Echo,
                    Incoming::Round2(_) => self.phase == Phase::Round2,
                };
                if ready {
                    let (sender, msg) = self.pending.remove(i);
                    self.handle(sender, msg)?;
                    progressed = true;
                } else {
                    i += 1;
                }
            }
            let advanced = self.advance(&mut out)?;
            if !progressed && !advanced {
                return Ok(out);
            }
        }
    }

    fn handle(&mut self, sender: Id, msg: Incoming) -> Result<()> {
        match msg {
            Incoming::Round1(pkg) => {
                if self.round1_packages.insert(sender, pkg).is_some() {
                    return Err(Error::new("Duplicate round 1 package"));
                }
            }
            Incoming::Echo(original, pkg) => {
                // `original` is not authenticated; check it is a session member
                if !self.participants.values().any(|id| *id == original) {
                    return Err(Error::new("Echoed round 1 package from an unknown participant"));
                }
                if original == self.identifier {
                    return Err(Error::new("Received own broadcast round 1 package"));
                }
                if original == sender {
                    return Err(Error::new("Received redundant broadcast round 1 package"));
                }
                if self.round1_packages.get(&original) != Some(&pkg) {
                    return Err(Error::new(
                        "Echo broadcast mismatch: a participant sent different round 1 packages to different participants",
                    ));
                }
                if self
                    .echoes
                    .entry(original)
                    .or_default()
                    .insert(sender, pkg)
                    .is_some()
                {
                    return Err(Error::new("Duplicate broadcast round 1 package"));
                }
            }
            Incoming::Round2(pkg) => {
                if !self.round1_packages.contains_key(&sender) {
                    return Err(Error::new("Round 2 package from a participant without round 1 package"));
                }
                if self.round2_packages.insert(sender, pkg).is_some() {
                    return Err(Error::new("Duplicate round 2 package"));
                }
            }
        }
        Ok(())
    }

    fn others(&self) -> BTreeSet<Id> {
        self.participants
            .values()
            .copied()
            .filter(|id| *id != self.identifier)
            .collect()
    }

    fn echoes_complete(&self) -> bool {
        let others = self.others();
        self.echoes.keys().copied().collect::<BTreeSet<_>>() == others
            && self.echoes.iter().all(|(original, map)| {
                let mut ids: BTreeSet<Id> = map.keys().copied().collect();
                ids.insert(*original);
                ids == others
                    && map
                        .values()
                        .all(|pkg| Some(pkg) == self.round1_packages.get(original))
            })
    }

    /// Advances the phase if its completion condition holds. Returns whether it did.
    fn advance(&mut self, out: &mut Vec<Outgoing>) -> Result<bool> {
        match self.phase {
            Phase::NotStarted | Phase::Done => Ok(false),
            Phase::Round1 => {
                if self.round1_packages.len() != self.n() - 1 {
                    return Ok(false);
                }
                if self.n() > 2 {
                    // Echo every received round 1 package to every other
                    // participant except its original sender.
                    let packages: Vec<(Id, round1::Package<P>)> = self
                        .round1_packages
                        .iter()
                        .map(|(id, p)| (*id, p.clone()))
                        .collect();
                    for peer in self.peers() {
                        let peer_id = self.participants[&peer];
                        for (original, pkg) in &packages {
                            if *original == peer_id {
                                continue;
                            }
                            let payload = serde_json::to_vec(&(original, pkg))
                                .map_err(ctx("serialize echo"))?;
                            out.push(self.encrypt_to(&peer, &payload)?);
                        }
                    }
                    self.phase = Phase::Echo;
                } else {
                    // With two participants the echo broadcast degenerates into a
                    // plain broadcast, so frost-client skips it.
                    self.run_part2(out)?;
                }
                Ok(true)
            }
            Phase::Echo => {
                if !self.echoes_complete() {
                    return Ok(false);
                }
                self.run_part2(out)?;
                Ok(true)
            }
            Phase::Round2 => {
                if self.round2_packages.keys().copied().collect::<BTreeSet<_>>()
                    != self.round1_packages.keys().copied().collect::<BTreeSet<_>>()
                {
                    return Ok(false);
                }
                let secret = self
                    .round2_secret
                    .take()
                    .ok_or_else(|| Error::new("missing round 2 secret"))?;
                let (key_package, public_key_package) =
                    dkg::part3(&secret, &self.round1_packages, &self.round2_packages)
                        .map_err(ctx("DKG part 3 failed"))?;
                drop(secret);
                // RedPallas post-processing, exactly as frost-client's dkg/cli.rs:
                // negate everything if needed so that the group key (Orchard `ak`)
                // has ỹ = 0. (frost-core 3 already does this in part3 via
                // `Ciphersuite::post_dkg`, so this is a no-op kept for parity.)
                let is_even = public_key_package.has_even_y();
                let key_package = key_package.into_even_y(Some(is_even));
                let public_key_package = public_key_package.into_even_y(Some(is_even));
                let gk: [u8; 32] = public_key_package
                    .verifying_key()
                    .serialize()
                    .map_err(ctx("serialize group key"))?
                    .try_into()
                    .map_err(|_| Error::new("group key must be 32 bytes"))?;
                spend_validating_key(&gk)?;
                self.output = Some((key_package, public_key_package));
                self.round1_secret = None;
                self.phase = Phase::Done;
                Ok(true)
            }
        }
    }

    fn run_part2(&mut self, out: &mut Vec<Outgoing>) -> Result<()> {
        let secret = self
            .round1_secret
            .take()
            .ok_or_else(|| Error::new("missing round 1 secret"))?;
        let (secret2, packages) =
            dkg::part2(secret, &self.round1_packages).map_err(ctx("DKG part 2 failed"))?;
        self.round2_secret = Some(secret2);
        for (id, pkg) in packages.iter() {
            let peer = self.pubkey_of(id);
            let payload = Zeroizing::new(
                serde_json::to_vec(pkg).map_err(ctx("serialize round 2 package"))?,
            );
            out.push(self.encrypt_to(&peer, &payload)?);
        }
        self.phase = Phase::Round2;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

/// frost-client's `api::SendSigningPackageArgs`, the coordinator → participant
/// payload of a signing session.
#[derive(Serialize, Deserialize)]
#[serde(bound = "")]
pub struct SendSigningPackageArgs {
    pub signing_package: Vec<SigningPackage<P>>,
    #[serde(
        serialize_with = "serdect::slice::serialize_hex_lower_or_bin",
        deserialize_with = "serdect::slice::deserialize_hex_or_bin_vec"
    )]
    pub aux_msg: Vec<u8>,
    pub randomizer: Vec<Randomizer<P>>,
}

pub fn parse_key_package(json: &str) -> Result<KeyPackage<P>> {
    serde_json::from_str(json).map_err(ctx("Invalid key package JSON"))
}

/// The group public key a key share belongs to, as 32 bytes.
pub fn key_package_group_key(json: &str) -> Result<[u8; 32]> {
    parse_key_package(json)?
        .verifying_key()
        .serialize()
        .map_err(ctx("serialize group key"))?
        .try_into()
        .map_err(|_| Error::new("group key must be 32 bytes"))
}

pub fn parse_public_key_package(json: &str) -> Result<PublicKeyPackage<P>> {
    serde_json::from_str(json).map_err(ctx("Invalid public key package JSON"))
}

fn parse_randomizer(alpha_hex: &str) -> Result<Randomizer<P>> {
    let alpha = parse_hex_array::<32>(alpha_hex, "randomizer")?;
    Randomizer::deserialize(&alpha).map_err(ctx("Invalid randomizer (alpha)"))
}

fn parse_sighash(s: &str) -> Result<[u8; 32]> {
    parse_hex_array::<32>(s, "sighash")
}

/// Round 1: generates `count` nonce/commitment pairs (one per spend). Returns
/// `(nonces_json, commitments_json)`; the commitments JSON is exactly the
/// `Vec<SigningCommitments>` payload frost-client participants send.
pub fn commit(key_package_json: &str, count: usize) -> Result<(String, String)> {
    if count == 0 {
        return Err(Error::new("count must be at least 1"));
    }
    let key_package = parse_key_package(key_package_json)?;
    let mut nonces = Vec::with_capacity(count);
    let mut commitments = Vec::with_capacity(count);
    for _ in 0..count {
        let (n, c) = frost_core::round1::commit(key_package.signing_share(), &mut OsRng);
        nonces.push(n);
        commitments.push(c);
    }
    Ok((
        serde_json::to_string(&nonces).map_err(ctx("serialize nonces"))?,
        serde_json::to_string(&commitments).map_err(ctx("serialize commitments"))?,
    ))
}

/// Parses a JSON object `{ "<identifier hex>": <payload> }`.
fn parse_id_map<T: serde::de::DeserializeOwned>(json: &str, what: &str) -> Result<BTreeMap<Id, T>> {
    let raw: HashMap<String, T> = serde_json::from_str(json)
        .map_err(|e| Error::new(format!("Invalid {what} JSON object: {e}")))?;
    let mut out = BTreeMap::new();
    for (k, v) in raw {
        if out.insert(parse_identifier(&k)?, v).is_some() {
            return Err(Error::new(format!("Duplicate identifier {k} in {what}")));
        }
    }
    Ok(out)
}

/// Coordinator: builds frost-client's `SendSigningPackageArgs` with one
/// `SigningPackage` (message = sighash) and one randomizer per spend.
pub fn build_signing_package(
    commitments_json: &str,
    sighash_hex: &str,
    randomizers: &[String],
) -> Result<String> {
    let sighash = parse_sighash(sighash_hex)?;
    if randomizers.is_empty() {
        return Err(Error::new("At least one randomizer (spend) is required"));
    }
    let randomizers = randomizers
        .iter()
        .map(|r| parse_randomizer(r))
        .collect::<Result<Vec<_>>>()?;
    let commitments: BTreeMap<Id, Vec<SigningCommitments<P>>> =
        parse_id_map(commitments_json, "commitments")?;
    if commitments.is_empty() {
        return Err(Error::new("No signing commitments"));
    }
    for (id, c) in &commitments {
        if c.len() != randomizers.len() {
            return Err(Error::new(format!(
                "Participant {} sent {} commitments but there are {} spends",
                identifier_hex(id),
                c.len(),
                randomizers.len()
            )));
        }
    }
    let signing_package = (0..randomizers.len())
        .map(|i| {
            let map: BTreeMap<Id, SigningCommitments<P>> =
                commitments.iter().map(|(id, c)| (*id, c[i])).collect();
            SigningPackage::new(map, &sighash)
        })
        .collect();
    let args = SendSigningPackageArgs {
        signing_package,
        aux_msg: vec![],
        randomizer: randomizers,
    };
    serde_json::to_string(&args).map_err(ctx("serialize signing package"))
}

/// Participant round 2: checks the coordinator's package against what this
/// participant reviewed and committed to, then signs every spend.
pub fn sign(
    key_package_json: &str,
    nonces_json: &str,
    args_json: &str,
    expected_sighash_hex: &str,
    expected_randomizers: &[String],
) -> Result<String> {
    let key_package = parse_key_package(key_package_json)?;
    let nonces: Zeroizing<Vec<SigningNonces<P>>> = Zeroizing::new(
        serde_json::from_str(nonces_json).map_err(ctx("Invalid nonces JSON"))?,
    );
    let args: SendSigningPackageArgs =
        serde_json::from_str(args_json).map_err(ctx("Invalid signing package JSON"))?;
    let sighash = parse_sighash(expected_sighash_hex)?;
    let expected: Vec<Randomizer<P>> = expected_randomizers
        .iter()
        .map(|r| parse_randomizer(r))
        .collect::<Result<_>>()?;

    let n = expected.len();
    if n == 0 {
        return Err(Error::new("No spends to sign"));
    }
    if args.signing_package.len() != n || args.randomizer.len() != n || nonces.len() != n {
        return Err(Error::new(format!(
            "Spend count mismatch: expected {n}, signing packages {}, randomizers {}, nonces {}",
            args.signing_package.len(),
            args.randomizer.len(),
            nonces.len()
        )));
    }
    // Check every spend before producing any signature share.
    let own = key_package.identifier();
    for i in 0..n {
        let sp = &args.signing_package[i];
        if sp.message().as_slice() != sighash.as_slice() {
            return Err(Error::new(format!(
                "Signing package #{i} message does not match the expected sighash"
            )));
        }
        if args.randomizer[i].serialize() != expected[i].serialize() {
            return Err(Error::new(format!(
                "Randomizer #{i} does not match the expected randomizer"
            )));
        }
        match sp.signing_commitments().get(own) {
            Some(c) if c == nonces[i].commitments() => {}
            Some(_) => {
                return Err(Error::new(format!(
                    "Signing package #{i} contains commitments for this participant that do not match its nonces"
                )))
            }
            None => {
                return Err(Error::new(format!(
                    "Signing package #{i} does not include this participant"
                )))
            }
        }
    }
    let mut shares = Vec::with_capacity(n);
    for i in 0..n {
        #[allow(deprecated)]
        let share = frost_rerandomized::sign(
            &args.signing_package[i],
            &nonces[i],
            &key_package,
            args.randomizer[i],
        )
        .map_err(ctx("FROST signing failed"))?;
        shares.push(share);
    }
    serde_json::to_string(&shares).map_err(ctx("serialize signature shares"))
}

/// Coordinator: aggregates the signature shares of every spend into RedPallas
/// spend authorization signatures, verifying each against the randomized group
/// key (`rk = ak + [alpha] G`).
pub fn aggregate(args_json: &str, shares_json: &str, pkp_json: &str) -> Result<Vec<[u8; 64]>> {
    let args: SendSigningPackageArgs =
        serde_json::from_str(args_json).map_err(ctx("Invalid signing package JSON"))?;
    let pkp = parse_public_key_package(pkp_json)?;
    let shares: BTreeMap<Id, Vec<SignatureShare<P>>> = parse_id_map(shares_json, "signature shares")?;
    let n = args.signing_package.len();
    if n == 0 || args.randomizer.len() != n {
        return Err(Error::new("Signing package must have one randomizer per spend"));
    }
    for (id, s) in &shares {
        if s.len() != n {
            return Err(Error::new(format!(
                "Participant {} sent {} signature shares but there are {n} spends",
                identifier_hex(id),
                s.len()
            )));
        }
    }

    let gk: [u8; 32] = pkp
        .verifying_key()
        .serialize()
        .map_err(ctx("serialize group key"))?
        .try_into()
        .map_err(|_| Error::new("group key must be 32 bytes"))?;
    let ak = spend_validating_key(&gk)?;

    let mut out = Vec::with_capacity(n);
    for i in 0..n {
        let sp = &args.signing_package[i];
        let shares_i: BTreeMap<Id, SignatureShare<P>> =
            shares.iter().map(|(id, s)| (*id, s[i])).collect();
        let params = RandomizedParams::from_randomizer(pkp.verifying_key(), args.randomizer[i]);
        let sig = frost_rerandomized::aggregate(sp, &shares_i, &pkp, &params)
            .map_err(|e| Error::new(format!("Aggregating spend #{i} failed: {e}")))?;
        params
            .randomized_verifying_key()
            .verify(sp.message(), &sig)
            .map_err(|e| Error::new(format!("Aggregated signature #{i} does not verify: {e}")))?;
        let bytes: [u8; 64] = sig
            .serialize()
            .map_err(ctx("serialize signature"))?
            .try_into()
            .map_err(|_| Error::new("signature must be 64 bytes"))?;

        // Independent check with orchard's RedPallas, against ak.randomize(alpha).
        let alpha = alpha_scalar(&args.randomizer[i].serialize())?;
        let rk = ak.randomize(&alpha);
        rk.verify(
            sp.message(),
            &orchard::primitives::redpallas::Signature::<orchard::primitives::redpallas::SpendAuth>::from(bytes),
        )
        .map_err(|e| Error::new(format!("Signature #{i} does not verify against rk: {e:?}")))?;
        out.push(bytes);
    }
    Ok(out)
}

/// Parses a canonical little-endian Pallas scalar.
pub fn alpha_scalar(bytes: &[u8]) -> Result<pasta_curves::pallas::Scalar> {
    use ff::PrimeField;
    let repr: [u8; 32] = crate::util::bytes_array(bytes, "randomizer")?;
    Option::from(pasta_curves::pallas::Scalar::from_repr(repr))
        .ok_or_else(|| Error::new("Randomizer is not a canonical Pallas scalar"))
}
