//! PCZT roles for FROST treasury spends: proving, a verified human-readable
//! summary for signers, and applying externally aggregated spend authorization
//! signatures.

use std::collections::BTreeMap;
use std::sync::OnceLock;

use orchard::circuit::{OrchardCircuitVersion, ProvingKey, VerifyingKey};
use pczt::{
    roles::{
        prover::Prover,
        redactor::{orchard::OrchardRedactor, Redactor},
        signer::{Signer, SpendAuthSignature},
        verifier::Verifier,
    },
    Pczt,
};
use serde::Serialize;
use zcash_keys::address::{Address, UnifiedAddress};
use zcash_primitives::transaction::fees::{zip317, FeeRule as _};
use zcash_note_encryption::{
    try_output_recovery_with_pkd_esk, Domain, EphemeralKeyBytes, ShieldedOutput,
    ENC_CIPHERTEXT_SIZE,
};
use zcash_protocol::{
    consensus::{BlockHeight, BranchId, Network},
    memo::{Memo, MemoBytes},
    value::{BalanceError, Zatoshis},
};
use zcash_keys::keys::UnifiedFullViewingKey;

use sapling_crypto as sapling;

use crate::util::{ctx_dbg, Error, Result};

/// The `zcash_client_backend` PCZT proprietary key carrying output recipient
/// metadata (a postcard-encoded `PcztRecipient<AccountId>`).
const PROPRIETARY_OUTPUT_INFO: &str = "zcash_client_backend:output_info";

/// Value-pool names used in the JS API.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OrchardPool {
    Orchard,
    Ironwood,
}

impl OrchardPool {
    pub fn name(self) -> &'static str {
        match self {
            OrchardPool::Orchard => "orchard",
            OrchardPool::Ironwood => "ironwood",
        }
    }

    pub fn parse(s: &str) -> Result<Self> {
        match s {
            "orchard" => Ok(OrchardPool::Orchard),
            "ironwood" => Ok(OrchardPool::Ironwood),
            other => Err(Error::new(format!(
                "Invalid pool {other:?}: expected \"orchard\" or \"ironwood\""
            ))),
        }
    }

    fn value_pool(self) -> orchard::ValuePool {
        match self {
            OrchardPool::Orchard => orchard::ValuePool::Orchard,
            OrchardPool::Ironwood => orchard::ValuePool::Ironwood,
        }
    }
}

pub fn parse_pczt(bytes: &[u8]) -> Result<Pczt> {
    Pczt::parse(bytes).map_err(ctx_dbg("Invalid PCZT"))
}

pub fn serialize_pczt(pczt: Pczt) -> Result<Vec<u8>> {
    pczt.serialize().map_err(ctx_dbg("Failed to serialize PCZT"))
}

/// The Orchard Action circuit version for a transaction's consensus branch. Both
/// the Orchard and the Ironwood bundle of a v6 transaction use it.
pub fn circuit_version_for(pczt: &Pczt) -> Result<OrchardCircuitVersion> {
    let branch = BranchId::try_from(*pczt.global().consensus_branch_id())
        .map_err(|_| Error::new("PCZT has an unknown consensus branch ID"))?;
    let version = zcash_primitives::transaction::components::orchard::bundle_version_for_branch(
        branch,
        orchard::ValuePool::Orchard,
    )
    .ok_or_else(|| Error::new("PCZT consensus branch predates Orchard"))?
    .circuit_version();
    if version == OrchardCircuitVersion::InsecurePreNu6_2 {
        return Err(Error::new("Refusing to prove with the insecure pre-NU6.2 Orchard circuit"));
    }
    Ok(version)
}

/// Process-wide Orchard proving keys, one per circuit version (building one takes
/// seconds and ~tens of MB, so it is done once and kept).
pub fn proving_key(version: OrchardCircuitVersion) -> &'static ProvingKey {
    static FIXED_POST_NU6_2: OnceLock<ProvingKey> = OnceLock::new();
    static POST_NU6_3: OnceLock<ProvingKey> = OnceLock::new();
    let cell = match version {
        OrchardCircuitVersion::PostNu6_3 => &POST_NU6_3,
        _ => &FIXED_POST_NU6_2,
    };
    cell.get_or_init(|| ProvingKey::build(version))
}

/// Process-wide Orchard verifying keys, one per circuit version.
pub fn verifying_key(version: OrchardCircuitVersion) -> &'static VerifyingKey {
    static FIXED_POST_NU6_2: OnceLock<VerifyingKey> = OnceLock::new();
    static POST_NU6_3: OnceLock<VerifyingKey> = OnceLock::new();
    let cell = match version {
        OrchardCircuitVersion::PostNu6_3 => &POST_NU6_3,
        _ => &FIXED_POST_NU6_2,
    };
    cell.get_or_init(|| VerifyingKey::build(version))
}

/// Creates the Orchard and Ironwood proofs a PCZT is missing.
pub fn prove(pczt: Pczt) -> Result<Pczt> {
    let prover = Prover::new(pczt);
    if prover.requires_sapling_proofs() {
        return Err(Error::new(
            "This PCZT needs Sapling proofs, which treasuries cannot create (Sapling recipients are not supported by treasuries yet)",
        ));
    }
    let needs_orchard = prover.requires_orchard_proof();
    let needs_ironwood = prover.requires_ironwood_proof();
    if !needs_orchard && !needs_ironwood {
        return Ok(prover.finish());
    }
    let pczt = prover.finish();
    let pk = proving_key(circuit_version_for(&pczt)?);
    let mut prover = Prover::new(pczt);
    if needs_orchard {
        prover = prover
            .create_orchard_proof(pk)
            .map_err(ctx_dbg("Orchard proving failed"))?;
    }
    if needs_ironwood {
        prover = prover
            .create_ironwood_proof(pk)
            .map_err(ctx_dbg("Ironwood proving failed"))?;
    }
    Ok(prover.finish())
}

/// The copy of a proven PCZT that goes to the server and the other signers.
///
/// Checking and signing need the transaction's effects, its proofs, the spend
/// randomizers and the outputs' note plaintexts. The rest stays with the
/// coordinator: the treasury's full viewing key (the prover needed it), the
/// spent notes' plaintexts and Merkle witnesses (which link them to the
/// deposits that created them), and the value commitment trapdoors and binding
/// key (which reveal what the spent notes held). Signatures can't be applied to
/// this copy (the Signer needs the viewing key), only to the coordinator's.
pub fn redact_for_signers(pczt: Pczt) -> Pczt {
    fn redact(mut bundle: OrchardRedactor<'_>) {
        bundle.clear_bsk();
        bundle.redact_actions(|mut action| {
            action.clear_spend_recipient();
            action.clear_spend_value();
            action.clear_spend_rho();
            action.clear_spend_rseed();
            action.clear_spend_fvk();
            action.clear_spend_witness();
            action.clear_spend_zip32_derivation();
            action.clear_spend_proprietary();
            action.clear_output_ock();
            action.clear_output_zip32_derivation();
            action.clear_rcv();
        });
    }
    Redactor::new(pczt)
        .redact_orchard_with(redact)
        .redact_ironwood_with(redact)
        .finish()
}

/// Applies aggregated RedPallas spend authorization signatures. Each signature is
/// verified against its action's `rk` and the transaction's (v5 or v6) sighash.
pub fn apply_signatures(pczt: Pczt, signatures: &[(OrchardPool, usize, [u8; 64])]) -> Result<Pczt> {
    let mut signer = Signer::new(pczt).map_err(ctx_dbg("PCZT cannot be signed"))?;
    for (pool, index, sig) in signatures {
        signer
            .apply_orchard_spend_auth_signature(&SpendAuthSignature::from_parts(
                pool.value_pool(),
                *index,
                *sig,
            ))
            .map_err(|e| {
                Error::new(format!(
                    "Signature for {} spend #{index} was rejected: {e:?}",
                    pool.name()
                ))
            })?;
    }
    Ok(signer.finish())
}

#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SpendSummary {
    pub pool: &'static str,
    pub index: u32,
    pub alpha: String,
    pub value_zat: Option<String>,
}

#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OutputSummary {
    pub pool: &'static str,
    pub address: Option<String>,
    pub value_zat: String,
    pub memo: Option<String>,
    pub change: bool,
}

#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PcztSummary {
    pub tx_version: u32,
    pub sighash: String,
    pub expiry_height: u32,
    pub fee_zat: String,
    /// The ZIP-317 fee for this transaction's shape. A higher `fee_zat` burns
    /// treasury money for nothing.
    pub conventional_fee_zat: String,
    pub spends: Vec<SpendSummary>,
    pub outputs: Vec<OutputSummary>,
}

/// Recipient metadata written by `create_pczt_from_proposal`: the postcard enum
/// discriminant of `PcztRecipient` (0 = External, 1 = EphemeralTransparent,
/// 2 = InternalShielded, 3 = InternalTransparent). Unauthenticated hint only.
fn metadata_says_internal(proprietary: &BTreeMap<String, Vec<u8>>) -> Option<bool> {
    proprietary
        .get(PROPRIETARY_OUTPUT_INFO)
        .and_then(|v| v.first())
        .map(|d| *d != 0)
}

fn memo_text(bytes: &[u8; 512]) -> Option<String> {
    let memo = MemoBytes::from_bytes(bytes).ok()?;
    match Memo::try_from(memo).ok()? {
        Memo::Text(t) => Some(String::from(t)),
        _ => None,
    }
}

fn verify_err<E: std::fmt::Debug>(what: String) -> impl FnOnce(E) -> Error {
    move |e| Error::new(format!("{what}: {e:?}"))
}

/// Builds the signer-facing summary of a PCZT. Everything shown is checked
/// against the transaction data the signature commits to:
///
/// - the sighash is computed from the PCZT's effects (v5 or v6 algorithm);
/// - every shielded output's recipient and value are checked against its note
///   commitment, its memo is recovered from the committed ciphertext (which also
///   proves the recipient can decrypt it), and any `user_address` must contain
///   the output's actual receiver;
/// - transparent output addresses are derived from their scripts;
/// - the fee is the transaction's value balance.
///
/// When `ufvk` is given, an output is reported as change exactly when its
/// receiver belongs to that key (cryptographic check); otherwise the
/// unauthenticated `zcash_client_backend` metadata is used.
pub fn summarize(pczt: &Pczt, network: Network, ufvk: Option<&UnifiedFullViewingKey>) -> Result<PcztSummary> {
    let signer = Signer::new(pczt.clone()).map_err(ctx_dbg("PCZT cannot be signed"))?;
    let sighash = signer.shielded_sighash();
    drop(signer);

    let effects = pczt.clone().into_effects().map_err(ctx_dbg("Invalid PCZT effects"))?;
    if effects
        .transparent_bundle()
        .is_some_and(|b| !b.vin.is_empty())
    {
        return Err(Error::new("PCZTs with transparent inputs are not supported by treasuries"));
    }
    let fee = effects
        .fee_paid(|_| Ok::<Option<Zatoshis>, BalanceError>(None))
        .map_err(ctx_dbg("Invalid PCZT value balance"))?
        .ok_or_else(|| Error::new("Cannot compute PCZT fee"))?;
    let conventional_fee = zip317::FeeRule::standard()
        .fee_required(
            &network,
            BlockHeight::from_u32(*pczt.global().expiry_height()),
            std::iter::empty::<zcash_primitives::transaction::fees::transparent::InputSize>(),
            effects
                .transparent_bundle()
                .map(|b| b.vout.iter().map(|o| 8 + o.script_pubkey().serialized_size()).collect())
                .unwrap_or_else(Vec::new),
            effects.sapling_bundle().map_or(0, |b| b.shielded_spends().len()),
            effects.sapling_bundle().map_or(0, |b| b.shielded_outputs().len()),
            effects.orchard_bundle().map_or(0, |b| b.actions().len()),
            effects.ironwood_bundle().map_or(0, |b| b.actions().len()),
        )
        .map_err(ctx_dbg("Cannot compute the ZIP-317 fee"))?;

    let mut spends = vec![];
    let mut outputs = vec![];

    // Orchard-protocol pools
    for pool in [OrchardPool::Orchard, OrchardPool::Ironwood] {
        let mut err: Option<Error> = None;
        let closure = |bundle: &orchard::pczt::Bundle| {
            if let Err(e) = summarize_orchard_bundle(pool, bundle, network, ufvk, &mut spends, &mut outputs) {
                err = Some(e);
            }
            Ok(())
        };
        let verifier = Verifier::new(pczt.clone());
        match pool {
            OrchardPool::Orchard => verifier.with_orchard::<(), _>(closure).map(|_| ()),
            OrchardPool::Ironwood => verifier.with_ironwood::<(), _>(closure).map(|_| ()),
        }
        .map_err(|e| Error::new(format!("Invalid {} bundle: {e:?}", pool.name())))?;
        if let Some(e) = err {
            return Err(e);
        }
    }

    // Sapling
    {
        let mut err: Option<Error> = None;
        Verifier::new(pczt.clone())
            .with_sapling::<(), _>(|bundle| {
                if let Err(e) = summarize_sapling_bundle(bundle, network, ufvk, &mut outputs) {
                    err = Some(e);
                }
                Ok(())
            })
            .map_err(|e| Error::new(format!("Invalid sapling bundle: {e:?}")))?;
        if let Some(e) = err {
            return Err(e);
        }
    }

    // Transparent
    {
        let mut err: Option<Error> = None;
        Verifier::new(pczt.clone())
            .with_transparent::<(), _>(|bundle| {
                for (i, out) in bundle.outputs().iter().enumerate() {
                    let r = (|| -> Result<OutputSummary> {
                        let taddr = zcash_transparent::address::TransparentAddress::from_script_pubkey(
                            out.script_pubkey(),
                        )
                        .ok_or_else(|| {
                            Error::new(format!("Transparent output #{i} has a non-standard script"))
                        })?;
                        if let Some(ua) = out.user_address() {
                            let matches = match decode_address(ua, network)? {
                                Address::Transparent(t) => t == taddr,
                                Address::Unified(u) => u.transparent() == Some(&taddr),
                                Address::Tex(h) => {
                                    taddr == zcash_transparent::address::TransparentAddress::PublicKeyHash(h)
                                }
                                Address::Sapling(_) => false,
                            };
                            if !matches {
                                return Err(Error::new(format!(
                                    "Transparent output #{i}: user_address does not match its script"
                                )));
                            }
                        }
                        let address = out
                            .user_address()
                            .clone()
                            .unwrap_or_else(|| Address::Transparent(taddr).encode(&network));
                        Ok(OutputSummary {
                            pool: "transparent",
                            address: Some(address),
                            value_zat: u64::from(*out.value()).to_string(),
                            memo: None,
                            // A treasury viewing key is Orchard-only: with one, no
                            // transparent output can be change. Without, only the
                            // unauthenticated metadata is left.
                            change: ufvk.is_none()
                                && metadata_says_internal(out.proprietary()).unwrap_or(false),
                        })
                    })();
                    match r {
                        Ok(o) => outputs.push(o),
                        Err(e) => {
                            err = Some(e);
                            break;
                        }
                    }
                }
                Ok(())
            })
            .map_err(|e| Error::new(format!("Invalid transparent bundle: {e:?}")))?;
        if let Some(e) = err {
            return Err(e);
        }
    }

    Ok(PcztSummary {
        tx_version: *pczt.global().tx_version(),
        sighash: hex::encode(sighash),
        expiry_height: *pczt.global().expiry_height(),
        fee_zat: u64::from(fee).to_string(),
        conventional_fee_zat: u64::from(conventional_fee).to_string(),
        spends,
        outputs,
    })
}

fn decode_address(s: &str, network: Network) -> Result<Address> {
    Address::decode(&network, s)
        .ok_or_else(|| Error::new(format!("PCZT user_address {s:?} is not a valid address for this network")))
}

fn summarize_orchard_bundle(
    pool: OrchardPool,
    bundle: &orchard::pczt::Bundle,
    network: Network,
    ufvk: Option<&UnifiedFullViewingKey>,
    spends: &mut Vec<SpendSummary>,
    outputs: &mut Vec<OutputSummary>,
) -> Result<()> {
    use ff::PrimeField;
    use orchard::note::{NoteVersion, Rho};
    let name = pool.name();

    for (idx, action) in bundle.actions().iter().enumerate() {
        // Spends awaiting a spend authorization signature (same rule as
        // zcash-sign: no signature yet and a randomizer present; protocol dummies
        // were already signed by the IO finalizer).
        let spend = action.spend();
        if spend.spend_auth_sig().is_none() {
            if let Some(alpha) = spend.alpha() {
                spends.push(SpendSummary {
                    pool: name,
                    index: idx as u32,
                    alpha: hex::encode(alpha.to_repr()),
                    value_zat: spend.value().map(|v| v.inner().to_string()),
                });
            }
        }

        let out = action.output();
        let (Some(recipient), Some(value), Some(rseed)) = (out.recipient(), out.value(), out.rseed())
        else {
            return Err(Error::new(format!(
                "{name} output #{idx} is missing its note plaintext fields; cannot verify it"
            )));
        };
        out.verify_note_commitment(spend)
            .map_err(verify_err(format!("{name} output #{idx} does not match its note commitment")))?;
        if action.rcv().is_some() && spend.value().is_some() {
            action
                .verify_cv_net()
                .map_err(verify_err(format!("{name} action #{idx} has an inconsistent value commitment")))?;
        }

        let internal_meta = metadata_says_internal(out.proprietary());
        // Padding outputs carry no recipient metadata and no value.
        if internal_meta.is_none() && value.inner() == 0 && out.user_address().is_none() {
            continue;
        }

        let rho = Rho::from_bytes(&spend.nullifier().to_bytes())
            .into_option()
            .ok_or_else(|| Error::new(format!("{name} action #{idx} has an invalid nullifier")))?;
        let note = orchard::Note::from_parts(
            *recipient,
            *value,
            rho,
            *rseed,
            *out.note_version(),
        )
        .into_option()
        .ok_or_else(|| Error::new(format!("{name} output #{idx} is not a valid note")))?;

        let memo = match out.note_version() {
            NoteVersion::V3 => {
                let domain = orchard::note_encryption::IronwoodDomain::for_pczt_action(action);
                recover_memo(&domain, &note, action)
            }
            _ => {
                let domain = orchard::note_encryption::OrchardDomain::for_pczt_action(action);
                recover_memo(&domain, &note, action)
            }
        }
        .ok_or_else(|| {
            Error::new(format!(
                "{name} output #{idx}: the encrypted note does not decrypt to the committed note"
            ))
        })?;

        if let Some(ua) = out.user_address() {
            let ok = match decode_address(ua, network)? {
                Address::Unified(u) => u.orchard() == Some(recipient),
                _ => false,
            };
            if !ok {
                return Err(Error::new(format!(
                    "{name} output #{idx}: user_address does not contain the output's Orchard receiver"
                )));
            }
        }

        let change = match ufvk {
            Some(k) => k
                .orchard()
                .is_some_and(|fvk| fvk.scope_for_address(recipient).is_some()),
            None => internal_meta.unwrap_or(false) && out.user_address().is_none(),
        };
        let address = match out.user_address() {
            Some(a) => a.clone(),
            None => UnifiedAddress::from_receivers(Some(*recipient), None, None)
                .expect("an Orchard receiver makes a valid UA")
                .encode(&network),
        };
        outputs.push(OutputSummary {
            pool: name,
            address: Some(address),
            value_zat: value.inner().to_string(),
            memo,
            change,
        });
    }
    Ok(())
}

fn recover_memo<D, O>(domain: &D, note: &D::Note, output: &O) -> Option<Option<String>>
where
    D: Domain<Memo = [u8; 512]>,
    O: ShieldedOutput<D, ENC_CIPHERTEXT_SIZE>,
{
    let pk_d = D::get_pk_d(note);
    let esk = D::derive_esk(note)?;
    let (_, _, memo) = try_output_recovery_with_pkd_esk(domain, pk_d, esk, output)?;
    Some(memo_text(&memo))
}

struct SaplingOutputRef<'a>(&'a sapling::pczt::Output);

impl ShieldedOutput<sapling::note_encryption::SaplingDomain, ENC_CIPHERTEXT_SIZE> for SaplingOutputRef<'_> {
    fn ephemeral_key(&self) -> EphemeralKeyBytes {
        self.0.ephemeral_key().clone()
    }

    fn cmstar_bytes(&self) -> [u8; 32] {
        self.0.cmu().to_bytes()
    }

    fn enc_ciphertext(&self) -> &[u8; ENC_CIPHERTEXT_SIZE] {
        self.0.enc_ciphertext()
    }
}

fn summarize_sapling_bundle(
    bundle: &sapling::pczt::Bundle,
    network: Network,
    ufvk: Option<&UnifiedFullViewingKey>,
    outputs: &mut Vec<OutputSummary>,
) -> Result<()> {
    if bundle.spends().iter().any(|s| s.spend_auth_sig().is_none()) {
        return Err(Error::new("PCZT has Sapling spends, which treasuries cannot sign"));
    }
    for (idx, out) in bundle.outputs().iter().enumerate() {
        let (Some(recipient), Some(value), Some(rseed)) = (out.recipient(), out.value(), out.rseed())
        else {
            return Err(Error::new(format!(
                "sapling output #{idx} is missing its note plaintext fields; cannot verify it"
            )));
        };
        out.verify_note_commitment()
            .map_err(verify_err(format!("sapling output #{idx} does not match its note commitment")))?;
        if out.rcv().is_some() {
            out.verify_cv()
                .map_err(verify_err(format!("sapling output #{idx} has an inconsistent value commitment")))?;
        }
        let internal_meta = metadata_says_internal(out.proprietary());
        if internal_meta.is_none() && value.inner() == 0 && out.user_address().is_none() {
            continue;
        }
        let note = sapling::Note::from_parts(*recipient, *value, sapling::Rseed::AfterZip212(*rseed));
        let domain = sapling::note_encryption::SaplingDomain::new(
            sapling::note_encryption::Zip212Enforcement::On,
        );
        let memo = recover_memo(&domain, &note, &SaplingOutputRef(out)).ok_or_else(|| {
            Error::new(format!(
                "sapling output #{idx}: the encrypted note does not decrypt to the committed note"
            ))
        })?;
        if let Some(ua) = out.user_address() {
            let ok = match decode_address(ua, network)? {
                Address::Sapling(pa) => pa == *recipient,
                Address::Unified(u) => u.sapling() == Some(recipient),
                _ => false,
            };
            if !ok {
                return Err(Error::new(format!(
                    "sapling output #{idx}: user_address does not contain the output's Sapling receiver"
                )));
            }
        }
        let change = match ufvk.and_then(|k| k.sapling()) {
            Some(dfvk) => dfvk.decrypt_diversifier(recipient).is_some(),
            None if ufvk.is_some() => false,
            None => internal_meta.unwrap_or(false) && out.user_address().is_none(),
        };
        let address = out
            .user_address()
            .clone()
            .unwrap_or_else(|| Address::Sapling(*recipient).encode(&network));
        outputs.push(OutputSummary {
            pool: "sapling",
            address: Some(address),
            value_zat: value.inner().to_string(),
            memo,
            change,
        });
    }
    Ok(())
}
