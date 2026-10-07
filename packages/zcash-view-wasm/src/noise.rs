//! One-way `Noise_K_25519_ChaChaPoly_BLAKE2s` channels, byte-for-byte identical on
//! the wire to frost-client's `Cipher` (which uses `snow`).
//!
//! frost-client keeps one Noise state per peer and direction: the sender of a
//! message is the initiator and the recipient is the responder, with an empty
//! prologue. The first message on a directed channel is the K handshake message
//! (`-> e, es, ss` plus the encrypted payload); after it both sides switch to
//! transport mode using the first cipher of `Split()`.
//!
//! The state machine is implemented here (rather than wrapping `snow`) so that the
//! transport state — a ChaCha20-Poly1305 key and a nonce counter — can be
//! serialized and resumed after a page reload. Interop with `snow` is pinned by
//! the tests at the bottom of this file.

use blake2::{Blake2s256, Digest};
use chacha20poly1305::{
    aead::{Aead, KeyInit, Payload},
    ChaCha20Poly1305, Key, Nonce,
};
use rand_core::OsRng;
use serde::{Deserialize, Serialize};
use x25519_dalek::{PublicKey, StaticSecret};
use zeroize::{Zeroize, Zeroizing};

use crate::util::{parse_hex_array, Error, Result};

/// `Noise_K_25519_ChaChaPoly_BLAKE2s` is exactly HASHLEN (32) bytes long, so it is
/// used as the initial handshake hash without padding or hashing.
const PROTOCOL_NAME: &[u8; 32] = b"Noise_K_25519_ChaChaPoly_BLAKE2s";
const BLOCKLEN: usize = 64;
const TAGLEN: usize = 16;
const DHLEN: usize = 32;
/// The Noise maximum message length (also frost-client's `MAX_MSG_SIZE`).
pub const MAX_MESSAGE_LEN: usize = 65535;

fn hash(parts: &[&[u8]]) -> [u8; 32] {
    let mut h = Blake2s256::new();
    for p in parts {
        h.update(p);
    }
    h.finalize().into()
}

/// HMAC-BLAKE2s, as defined by the Noise spec (and implemented by `snow`).
fn hmac(key: &[u8; 32], data: &[&[u8]]) -> Zeroizing<[u8; 32]> {
    let mut ipad = Zeroizing::new([0x36u8; BLOCKLEN]);
    let mut opad = Zeroizing::new([0x5cu8; BLOCKLEN]);
    for (i, b) in key.iter().enumerate() {
        ipad[i] ^= b;
        opad[i] ^= b;
    }
    let mut inner = Blake2s256::new();
    inner.update(&ipad[..]);
    for d in data {
        inner.update(d);
    }
    let inner: Zeroizing<[u8; 32]> = Zeroizing::new(inner.finalize().into());
    let mut outer = Blake2s256::new();
    outer.update(&opad[..]);
    outer.update(&inner[..]);
    Zeroizing::new(outer.finalize().into())
}

/// Noise `HKDF(chaining_key, input_key_material, 2)`.
fn hkdf2(ck: &[u8; 32], ikm: &[u8]) -> (Zeroizing<[u8; 32]>, Zeroizing<[u8; 32]>) {
    let temp_key = hmac(ck, &[ikm]);
    let out1 = hmac(&temp_key, &[&[0x01]]);
    let out2 = hmac(&temp_key, &[&out1[..], &[0x02]]);
    (out1, out2)
}

/// ChaChaPoly nonce: 32 bits of zeros followed by the little-endian 64-bit counter.
fn nonce_bytes(n: u64) -> [u8; 12] {
    let mut nonce = [0u8; 12];
    nonce[4..].copy_from_slice(&n.to_le_bytes());
    nonce
}

fn aead_encrypt(k: &[u8; 32], n: u64, ad: &[u8], plaintext: &[u8]) -> Result<Vec<u8>> {
    ChaCha20Poly1305::new(Key::from_slice(k))
        .encrypt(Nonce::from_slice(&nonce_bytes(n)), Payload { msg: plaintext, aad: ad })
        .map_err(|_| Error::new("Noise encryption failed"))
}

fn aead_decrypt(k: &[u8; 32], n: u64, ad: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>> {
    ChaCha20Poly1305::new(Key::from_slice(k))
        .decrypt(Nonce::from_slice(&nonce_bytes(n)), Payload { msg: ciphertext, aad: ad })
        .map_err(|_| Error::new("Noise decryption failed (wrong key, tampered or out-of-order message)"))
}

fn dh(secret: &StaticSecret, public: &[u8; 32]) -> Result<Zeroizing<[u8; 32]>> {
    let shared = secret.diffie_hellman(&PublicKey::from(*public));
    if !shared.was_contributory() {
        return Err(Error::new("Noise: peer public key is a low-order point"));
    }
    Ok(Zeroizing::new(shared.to_bytes()))
}

/// Noise `SymmetricState` for the single handshake message of pattern K.
struct SymmetricState {
    ck: Zeroizing<[u8; 32]>,
    h: [u8; 32],
    k: Option<Zeroizing<[u8; 32]>>,
    n: u64,
}

impl SymmetricState {
    /// `InitializeSymmetric(protocol_name)`, `MixHash(prologue = "")` and the K
    /// pre-messages (`-> s`, `<- s`).
    fn new(initiator_static: &[u8; 32], responder_static: &[u8; 32]) -> Self {
        let mut s = SymmetricState {
            ck: Zeroizing::new(*PROTOCOL_NAME),
            h: *PROTOCOL_NAME,
            k: None,
            n: 0,
        };
        s.mix_hash(&[]);
        s.mix_hash(initiator_static);
        s.mix_hash(responder_static);
        s
    }

    fn mix_hash(&mut self, data: &[u8]) {
        self.h = hash(&[&self.h, data]);
    }

    fn mix_key(&mut self, ikm: &[u8]) {
        let (ck, k) = hkdf2(&self.ck, ikm);
        self.ck = ck;
        self.k = Some(k);
        self.n = 0;
    }

    fn encrypt_and_hash(&mut self, plaintext: &[u8]) -> Result<Vec<u8>> {
        let k = self.k.as_ref().ok_or_else(|| Error::new("Noise: no handshake key"))?;
        let ct = aead_encrypt(k, self.n, &self.h, plaintext)?;
        self.n += 1;
        self.mix_hash(&ct);
        Ok(ct)
    }

    fn decrypt_and_hash(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>> {
        let k = self.k.as_ref().ok_or_else(|| Error::new("Noise: no handshake key"))?;
        let pt = aead_decrypt(k, self.n, &self.h, ciphertext)?;
        self.n += 1;
        self.mix_hash(ciphertext);
        Ok(pt)
    }

    /// `Split()`, keeping only the initiator-to-responder cipher (pattern K is one-way).
    fn split(self) -> TransportState {
        let (k1, _k2) = hkdf2(&self.ck, &[]);
        TransportState { k: *k1, n: 0 }
    }
}

/// The transport-mode state of one directed channel: the cipher key and the next
/// nonce. Serialized as JSON so JavaScript can persist it.
#[derive(Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TransportState {
    #[serde(with = "hex_key")]
    k: [u8; 32],
    n: u64,
}

impl Drop for TransportState {
    fn drop(&mut self) {
        self.k.zeroize();
    }
}

impl std::fmt::Debug for TransportState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TransportState").field("n", &self.n).finish_non_exhaustive()
    }
}

mod hex_key {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S: Serializer>(k: &[u8; 32], s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&hex::encode(k))
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<[u8; 32], D::Error> {
        let s = zeroize::Zeroizing::new(String::deserialize(d)?);
        let v = zeroize::Zeroizing::new(hex::decode(s.as_bytes()).map_err(serde::de::Error::custom)?);
        <[u8; 32]>::try_from(&v[..]).map_err(|_| serde::de::Error::custom("key must be 32 bytes"))
    }
}

/// Versioned wrapper for the serialized channel state.
#[derive(Serialize, Deserialize)]
struct StoredState {
    v: u8,
    #[serde(flatten)]
    t: TransportState,
}

impl TransportState {
    /// Serializes this state to the opaque string handed to JavaScript.
    pub fn to_json(&self) -> String {
        serde_json::to_string(&StoredState { v: 1, t: self.clone() })
            .expect("transport state serialization cannot fail")
    }

    /// Parses a state previously produced by [`Self::to_json`].
    pub fn from_json(s: &str) -> Result<Self> {
        let stored: StoredState =
            serde_json::from_str(s).map_err(|e| Error::new(format!("Invalid Noise state: {e}")))?;
        if stored.v != 1 {
            return Err(Error::new(format!("Unsupported Noise state version {}", stored.v)));
        }
        Ok(stored.t)
    }

    fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>> {
        if self.n == u64::MAX {
            return Err(Error::new("Noise nonce exhausted"));
        }
        let ct = aead_encrypt(&self.k, self.n, &[], plaintext)?;
        self.n += 1;
        Ok(ct)
    }

    fn decrypt(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>> {
        if self.n == u64::MAX {
            return Err(Error::new("Noise nonce exhausted"));
        }
        let pt = aead_decrypt(&self.k, self.n, &[], ciphertext)?;
        self.n += 1;
        Ok(pt)
    }
}

/// The X25519 public key for a comms private key (as `snow` derives it).
pub fn public_key(secret: &[u8; 32]) -> [u8; 32] {
    PublicKey::from(&StaticSecret::from(*secret)).to_bytes()
}

/// Encrypts `plaintext` on the channel from the owner of `secret` (initiator) to
/// `peer` (responder). `state == None` means this is the first message on the
/// channel, which then carries the K handshake.
pub fn encrypt(
    secret: &[u8; 32],
    peer: &[u8; 32],
    state: Option<TransportState>,
    plaintext: &[u8],
) -> Result<(TransportState, Vec<u8>)> {
    match state {
        Some(mut t) => {
            if plaintext.len() + TAGLEN > MAX_MESSAGE_LEN {
                return Err(Error::new("Noise message too large"));
            }
            let ct = t.encrypt(plaintext)?;
            Ok((t, ct))
        }
        None => {
            if DHLEN + plaintext.len() + TAGLEN > MAX_MESSAGE_LEN {
                return Err(Error::new("Noise message too large"));
            }
            let s = StaticSecret::from(*secret);
            let s_pub = PublicKey::from(&s).to_bytes();
            let mut sym = SymmetricState::new(&s_pub, peer);

            // -> e
            let e = StaticSecret::random_from_rng(OsRng);
            let e_pub = PublicKey::from(&e).to_bytes();
            sym.mix_hash(&e_pub);
            // es
            sym.mix_key(&dh(&e, peer)?[..]);
            // ss
            sym.mix_key(&dh(&s, peer)?[..]);

            let mut msg = Vec::with_capacity(DHLEN + plaintext.len() + TAGLEN);
            msg.extend_from_slice(&e_pub);
            msg.extend_from_slice(&sym.encrypt_and_hash(plaintext)?);
            Ok((sym.split(), msg))
        }
    }
}

/// Decrypts `ciphertext` received by the owner of `secret` (responder) from `peer`
/// (initiator). `state == None` means this is the first message on the channel,
/// which must be the K handshake message.
pub fn decrypt(
    secret: &[u8; 32],
    peer: &[u8; 32],
    state: Option<TransportState>,
    ciphertext: &[u8],
) -> Result<(TransportState, Vec<u8>)> {
    if ciphertext.len() > MAX_MESSAGE_LEN {
        return Err(Error::new("Noise message too large"));
    }
    match state {
        Some(mut t) => {
            if ciphertext.len() < TAGLEN {
                return Err(Error::new("Noise message too short"));
            }
            let pt = t.decrypt(ciphertext)?;
            Ok((t, pt))
        }
        None => {
            if ciphertext.len() < DHLEN + TAGLEN {
                return Err(Error::new("Noise handshake message too short"));
            }
            let s = StaticSecret::from(*secret);
            let s_pub = PublicKey::from(&s).to_bytes();
            let mut sym = SymmetricState::new(peer, &s_pub);

            // -> e
            let re: [u8; 32] = ciphertext[..DHLEN].try_into().expect("checked length");
            sym.mix_hash(&re);
            // es (responder side: DH(s, re))
            sym.mix_key(&dh(&s, &re)?[..]);
            // ss
            sym.mix_key(&dh(&s, peer)?[..]);

            let pt = sym.decrypt_and_hash(&ciphertext[DHLEN..])?;
            Ok((sym.split(), pt))
        }
    }
}

/// Parses an optional serialized state as handed back by JavaScript.
pub fn parse_state(state: Option<&str>) -> Result<Option<TransportState>> {
    state.map(TransportState::from_json).transpose()
}

/// Parses a hex X25519 public key.
pub fn parse_public_key(hex_key: &str) -> Result<[u8; 32]> {
    parse_hex_array::<32>(hex_key, "comms public key")
}

/// XEdDSA (xed25519) signature over the 16 raw bytes of a frostd login challenge
/// UUID, exactly as frost-client's `PrivateKey::sign(challenge.as_bytes())`.
pub fn sign_challenge(secret: &[u8; 32], challenge: &str) -> Result<[u8; 64]> {
    use xeddsa::{xed25519, Sign as _};
    let uuid = uuid::Uuid::parse_str(challenge.trim())
        .map_err(|e| Error::new(format!("Invalid challenge UUID: {e}")))?;
    let key = xed25519::PrivateKey::from(secret);
    Ok(key.sign(uuid.as_bytes(), OsRng))
}

#[cfg(test)]
mod tests {
    use super::*;

    const PATTERN: &str = "Noise_K_25519_ChaChaPoly_BLAKE2s";

    fn snow_keypair() -> ([u8; 32], [u8; 32]) {
        let kp = snow::Builder::new(PATTERN.parse().unwrap()).generate_keypair().unwrap();
        (kp.private.try_into().unwrap(), kp.public.try_into().unwrap())
    }

    /// A one-way `snow` channel, set up exactly like frost-client's `Cipher`.
    enum SnowSide {
        Handshake(snow::HandshakeState),
        Transport(snow::TransportState),
    }

    impl SnowSide {
        fn initiator(local: &[u8; 32], remote: &[u8; 32]) -> Self {
            SnowSide::Handshake(
                snow::Builder::new(PATTERN.parse().unwrap())
                    .local_private_key(local)
                    .remote_public_key(remote)
                    .build_initiator()
                    .unwrap(),
            )
        }

        fn responder(local: &[u8; 32], remote: &[u8; 32]) -> Self {
            SnowSide::Handshake(
                snow::Builder::new(PATTERN.parse().unwrap())
                    .local_private_key(local)
                    .remote_public_key(remote)
                    .build_responder()
                    .unwrap(),
            )
        }

        fn write(&mut self, payload: &[u8]) -> Vec<u8> {
            let mut buf = vec![0u8; MAX_MESSAGE_LEN];
            let len = match self {
                SnowSide::Handshake(h) => h.write_message(payload, &mut buf).unwrap(),
                SnowSide::Transport(t) => t.write_message(payload, &mut buf).unwrap(),
            };
            self.advance();
            buf.truncate(len);
            buf
        }

        fn read(&mut self, msg: &[u8]) -> Vec<u8> {
            let mut buf = vec![0u8; MAX_MESSAGE_LEN];
            let len = match self {
                SnowSide::Handshake(h) => h.read_message(msg, &mut buf).unwrap(),
                SnowSide::Transport(t) => t.read_message(msg, &mut buf).unwrap(),
            };
            self.advance();
            buf.truncate(len);
            buf
        }

        fn advance(&mut self) {
            if let SnowSide::Handshake(h) = self {
                if h.is_handshake_finished() {
                    let SnowSide::Handshake(h) =
                        std::mem::replace(self, SnowSide::Handshake(dummy_handshake()))
                    else {
                        unreachable!()
                    };
                    *self = SnowSide::Transport(h.into_transport_mode().unwrap());
                }
            }
        }
    }

    fn dummy_handshake() -> snow::HandshakeState {
        let (sk, _) = snow_keypair();
        let (_, pk) = snow_keypair();
        snow::Builder::new(PATTERN.parse().unwrap())
            .local_private_key(&sk)
            .remote_public_key(&pk)
            .build_initiator()
            .unwrap()
    }

    fn messages() -> Vec<Vec<u8>> {
        vec![
            b"{\"header\":{\"version\":0}}".to_vec(),
            vec![],
            vec![7u8; 1000],
            b"fourth".to_vec(),
            vec![0xAB; MAX_MESSAGE_LEN - TAGLEN],
        ]
    }

    #[test]
    fn public_key_matches_snow() {
        for _ in 0..8 {
            let (sk, pk) = snow_keypair();
            assert_eq!(public_key(&sk), pk);
        }
    }

    #[test]
    fn we_encrypt_snow_decrypts() {
        let (a_sk, a_pk) = snow_keypair();
        let (b_sk, b_pk) = snow_keypair();
        let mut snow_rx = SnowSide::responder(&b_sk, &a_pk);
        let mut state: Option<String> = None;
        for msg in messages() {
            // Round-trip the state through its serialized form every time, as JS does
            let (t, ct) = encrypt(&a_sk, &b_pk, parse_state(state.as_deref()).unwrap(), &msg).unwrap();
            state = Some(t.to_json());
            assert_eq!(snow_rx.read(&ct), msg);
        }
    }

    #[test]
    fn snow_encrypts_we_decrypt() {
        let (a_sk, a_pk) = snow_keypair();
        let (b_sk, b_pk) = snow_keypair();
        let mut snow_tx = SnowSide::initiator(&a_sk, &b_pk);
        let mut state: Option<TransportState> = None;
        for (i, msg) in messages().into_iter().enumerate() {
            let ct = snow_tx.write(&msg);
            // Resume from serialized state midway through the stream
            if i == 2 {
                state = Some(TransportState::from_json(&state.unwrap().to_json()).unwrap());
            }
            let (t, pt) = decrypt(&b_sk, &a_pk, state.take(), &ct).unwrap();
            assert_eq!(pt, msg);
            state = Some(t);
        }
    }

    #[test]
    fn ours_to_ours_and_failure_modes() {
        let (a_sk, a_pk) = snow_keypair();
        let (b_sk, b_pk) = snow_keypair();
        let (c_sk, c_pk) = snow_keypair();

        let (tx, ct0) = encrypt(&a_sk, &b_pk, None, b"hello").unwrap();
        // Wrong recipient or wrong claimed sender cannot read the handshake
        assert!(decrypt(&c_sk, &a_pk, None, &ct0).is_err());
        assert!(decrypt(&b_sk, &c_pk, None, &ct0).is_err());
        let (rx, pt) = decrypt(&b_sk, &a_pk, None, &ct0).unwrap();
        assert_eq!(pt, b"hello");

        let (tx, ct1) = encrypt(&a_sk, &b_pk, Some(tx), b"one").unwrap();
        let (_tx, ct2) = encrypt(&a_sk, &b_pk, Some(tx), b"two").unwrap();
        // Out of order delivery fails and leaves the state usable
        assert!(decrypt(&b_sk, &a_pk, Some(rx.clone()), &ct2).is_err());
        let (rx, pt1) = decrypt(&b_sk, &a_pk, Some(rx), &ct1).unwrap();
        assert_eq!(pt1, b"one");
        // Tampering is detected
        let mut bad = ct2.clone();
        bad[0] ^= 1;
        assert!(decrypt(&b_sk, &a_pk, Some(rx.clone()), &bad).is_err());
        let (_rx, pt2) = decrypt(&b_sk, &a_pk, Some(rx), &ct2).unwrap();
        assert_eq!(pt2, b"two");

        // Oversized messages are rejected like snow does
        assert!(encrypt(&a_sk, &b_pk, None, &vec![0; MAX_MESSAGE_LEN]).is_err());
    }

    #[test]
    fn challenge_signature_verifies_as_xeddsa() {
        use xeddsa::{xed25519, Verify as _};
        let (sk, pk) = snow_keypair();
        let challenge = "6f1b3c2a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
        let sig = sign_challenge(&sk, challenge).unwrap();
        let uuid = uuid::Uuid::parse_str(challenge).unwrap();
        xed25519::PublicKey(pk).verify(uuid.as_bytes(), &sig).unwrap();
        assert!(xed25519::PublicKey(pk).verify(b"other", &sig).is_err());
    }
}
