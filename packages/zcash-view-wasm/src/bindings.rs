//! `#[wasm_bindgen]` exports for FROST treasuries: frostd comms identity and
//! Noise channels, DKG, signing, PCZT helpers and treasury viewing keys.
//!
//! None of these touch the wallet or any other mutable global state (the only
//! statics are the write-once Orchard proving/verifying key caches), so they can
//! be called while a wallet sync is in flight.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::frost;
use crate::noise;
use crate::pczt_ops::{self, OrchardPool};
use crate::treasury;
use crate::util::{bytes_array, parse_hex_array, parse_network, Error};

#[wasm_bindgen(typescript_custom_section)]
const TS_TYPES: &'static str = r#"
export interface NoiseEncryptResult { state: string; ciphertext: Uint8Array }
export interface NoiseDecryptResult { state: string; plaintext: Uint8Array }
export interface DkgMessage { recipient: string; msg: Uint8Array }
export interface DkgResult {
  identifier: string;
  keyPackage: string;
  publicKeyPackage: string;
  groupPublicKey: string;
}
export interface FrostCommitResult { nonces: string; commitments: string }
export interface PcztSpend {
  pool: "orchard" | "ironwood";
  index: number;
  alpha: string;
  valueZat: string | null;
}
export interface PcztOutput {
  pool: "transparent" | "sapling" | "orchard" | "ironwood";
  address: string | null;
  valueZat: string;
  memo: string | null;
  change: boolean;
}
export interface PcztSummary {
  txVersion: number;
  sighash: string;
  expiryHeight: number;
  feeZat: string;
  conventionalFeeZat: string;
  spends: PcztSpend[];
  outputs: PcztOutput[];
}
export interface PcztSignature { pool: "orchard" | "ironwood"; index: number; signature: string }
export interface TreasuryViewingKey { ufvk: string; address: string; changeAddress: string }
export interface TreasuryViewingKeyInfo { groupPublicKey: string; address: string; changeAddress: string }
"#;

/// Serializes to a plain JS object (maps as objects, `None` as `null`).
pub(crate) fn to_js<T: Serialize>(value: &T) -> Result<JsValue, JsError> {
    let serializer = serde_wasm_bindgen::Serializer::new()
        .serialize_maps_as_objects(true)
        .serialize_missing_as_null(true);
    value
        .serialize(&serializer)
        .map_err(|e| JsError::new(&e.to_string()))
}

fn secret_key(secret: &[u8]) -> Result<zeroize::Zeroizing<[u8; 32]>, Error> {
    Ok(zeroize::Zeroizing::new(bytes_array::<32>(secret, "comms secret")?))
}

fn set(obj: &js_sys::Object, key: &str, value: &JsValue) {
    js_sys::Reflect::set(obj, &JsValue::from_str(key), value).expect("setting a property on a fresh object");
}

// ---------------------------------------------------------------------------
// Comms identity and Noise
// ---------------------------------------------------------------------------

/// Hex X25519 public key of a 32-byte frostd comms private key.
#[wasm_bindgen(js_name = "commsPublicKey")]
pub fn comms_public_key(secret: &[u8]) -> Result<String, JsError> {
    Ok(hex::encode(noise::public_key(&*secret_key(secret)?)))
}

/// Hex 64-byte XEdDSA signature over the 16 raw bytes of a frostd `/challenge`
/// UUID, as frostd `/login` expects.
#[wasm_bindgen(js_name = "frostdSignChallenge")]
pub fn frostd_sign_challenge(secret: &[u8], challenge: &str) -> Result<String, JsError> {
    Ok(hex::encode(noise::sign_challenge(&*secret_key(secret)?, challenge)?))
}

/// Encrypts a message on the one-way Noise_K channel from us to `peerPublic`.
/// `state` is `null` for the first message on that channel.
#[wasm_bindgen(js_name = "noiseEncrypt", unchecked_return_type = "NoiseEncryptResult")]
pub fn noise_encrypt(
    secret: &[u8],
    peer_public: &str,
    state: Option<String>,
    plaintext: &[u8],
) -> Result<JsValue, JsError> {
    let peer = noise::parse_public_key(peer_public)?;
    let state = noise::parse_state(state.as_deref())?;
    let (state, ciphertext) = noise::encrypt(&*secret_key(secret)?, &peer, state, plaintext)?;
    let obj = js_sys::Object::new();
    set(&obj, "state", &JsValue::from_str(&state.to_json()));
    set(&obj, "ciphertext", &js_sys::Uint8Array::from(&ciphertext[..]).into());
    Ok(obj.into())
}

/// Decrypts a message on the one-way Noise_K channel from `peerPublic` to us.
/// `state` is `null` if nothing has been received on that channel yet.
#[wasm_bindgen(js_name = "noiseDecrypt", unchecked_return_type = "NoiseDecryptResult")]
pub fn noise_decrypt(
    secret: &[u8],
    peer_public: &str,
    state: Option<String>,
    ciphertext: &[u8],
) -> Result<JsValue, JsError> {
    let peer = noise::parse_public_key(peer_public)?;
    let state = noise::parse_state(state.as_deref())?;
    let (state, plaintext) = noise::decrypt(&*secret_key(secret)?, &peer, state, ciphertext)?;
    let plaintext = zeroize::Zeroizing::new(plaintext);
    let obj = js_sys::Object::new();
    set(&obj, "state", &JsValue::from_str(&state.to_json()));
    set(&obj, "plaintext", &js_sys::Uint8Array::from(&plaintext[..]).into());
    Ok(obj.into())
}

// ---------------------------------------------------------------------------
// DKG
// ---------------------------------------------------------------------------

/// A FROST(Pallas, BLAKE2b-512) DKG participant speaking frost-client's
/// frostd message protocol. Outgoing messages must be sent in the returned order
/// (they share per-recipient Noise channels); on a network error, resend the same
/// bytes rather than calling `start`/`receive` again.
#[wasm_bindgen]
pub struct FrostDkg {
    inner: frost::Dkg,
}

fn outgoing_to_js(out: Vec<frost::Outgoing>) -> js_sys::Array {
    let arr = js_sys::Array::new();
    for o in out {
        let obj = js_sys::Object::new();
        set(&obj, "recipient", &JsValue::from_str(&hex::encode(o.recipient)));
        set(&obj, "msg", &js_sys::Uint8Array::from(&o.msg[..]).into());
        arr.push(&obj);
    }
    arr
}

#[wasm_bindgen]
impl FrostDkg {
    /// `participants` are the hex comms public keys of everyone in the frostd
    /// session, including our own.
    #[wasm_bindgen(constructor)]
    pub fn new(
        secret: &[u8],
        session_id: &str,
        participants: Vec<String>,
        min_signers: u16,
    ) -> Result<FrostDkg, JsError> {
        Ok(FrostDkg {
            inner: frost::Dkg::new(secret, session_id, &participants, min_signers)?,
        })
    }

    /// Our FROST identifier (hex, as frost-core serializes it).
    pub fn identifier(&self) -> String {
        frost::identifier_hex(&self.inner.identifier())
    }

    /// The FROST identifier of the participant with the given comms public key.
    #[wasm_bindgen(js_name = "identifierOf")]
    pub fn identifier_of(&self, pubkey: &str) -> Result<String, JsError> {
        let pk = noise::parse_public_key(pubkey)?;
        Ok(frost::identifier_hex(&self.inner.identifier_of(&pk)?))
    }

    /// Runs DKG part 1 and returns the round 1 messages for every other participant.
    #[wasm_bindgen(unchecked_return_type = "DkgMessage[]")]
    pub fn start(&mut self) -> Result<js_sys::Array, JsError> {
        Ok(outgoing_to_js(self.inner.start()?))
    }

    /// Processes a message from `sender` (hex comms public key) and returns the
    /// messages it triggers (echo broadcasts, round 2 packages).
    #[wasm_bindgen(unchecked_return_type = "DkgMessage[]")]
    pub fn receive(&mut self, sender: &str, msg: &[u8]) -> Result<js_sys::Array, JsError> {
        let sender = noise::parse_public_key(sender)?;
        Ok(outgoing_to_js(self.inner.receive(&sender, msg)?))
    }

    #[wasm_bindgen(js_name = "isComplete")]
    pub fn is_complete(&self) -> bool {
        self.inner.is_complete()
    }

    /// The key material, once `isComplete()`. `keyPackage` is secret.
    #[wasm_bindgen(unchecked_return_type = "DkgResult")]
    pub fn result(&self) -> Result<JsValue, JsError> {
        let out = self.inner.output()?;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct DkgResult {
            identifier: String,
            key_package: String,
            public_key_package: String,
            group_public_key: String,
        }
        let key_package = zeroize::Zeroizing::new(
            serde_json::to_string(&out.key_package).map_err(|e| JsError::new(&e.to_string()))?,
        );
        to_js(&DkgResult {
            identifier: frost::identifier_hex(&out.identifier),
            key_package: key_package.to_string(),
            public_key_package: serde_json::to_string(&out.public_key_package)
                .map_err(|e| JsError::new(&e.to_string()))?,
            group_public_key: hex::encode(out.group_public_key),
        })
    }
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

/// Round 1: `count` nonce/commitment pairs, one per spend. `nonces` is secret and
/// single-use; `commitments` is the frost-client participant payload.
#[wasm_bindgen(js_name = "frostCommit", unchecked_return_type = "FrostCommitResult")]
pub fn frost_commit(key_package: &str, count: u32) -> Result<JsValue, JsError> {
    let (nonces, commitments) = frost::commit(key_package, count as usize)?;
    let nonces = zeroize::Zeroizing::new(nonces);
    let obj = js_sys::Object::new();
    set(&obj, "nonces", &JsValue::from_str(&nonces));
    set(&obj, "commitments", &JsValue::from_str(&commitments));
    Ok(obj.into())
}

/// Coordinator: builds frost-client's `SendSigningPackageArgs` JSON.
/// `commitments` is a JSON string of an object mapping each signer's identifier
/// hex to the `Vec<SigningCommitments>` payload it sent, e.g.
/// `JSON.stringify({ [id]: JSON.parse(payloadText) })`.
#[wasm_bindgen(js_name = "frostBuildSigningPackage")]
pub fn frost_build_signing_package(
    commitments: &str,
    sighash: &str,
    randomizers: Vec<String>,
) -> Result<String, JsError> {
    Ok(frost::build_signing_package(commitments, sighash, &randomizers)?)
}

/// Participant round 2: verifies the signing package against the expected
/// sighash, randomizers and own commitments, then returns the
/// `Vec<SignatureShare>` JSON payload.
#[wasm_bindgen(js_name = "frostSign")]
pub fn frost_sign(
    key_package: &str,
    nonces: &str,
    signing_package_args: &str,
    expected_sighash: &str,
    expected_randomizers: Vec<String>,
) -> Result<String, JsError> {
    Ok(frost::sign(
        key_package,
        nonces,
        signing_package_args,
        expected_sighash,
        &expected_randomizers,
    )?)
}

/// Coordinator: aggregates shares into one hex 64-byte RedPallas signature per
/// spend. `shares` is a JSON string of an object mapping identifier hex to the
/// `Vec<SignatureShare>` payload each signer sent.
#[wasm_bindgen(js_name = "frostAggregate")]
pub fn frost_aggregate(
    signing_package_args: &str,
    shares: &str,
    public_key_package: &str,
) -> Result<Vec<String>, JsError> {
    Ok(frost::aggregate(signing_package_args, shares, public_key_package)?
        .into_iter()
        .map(hex::encode)
        .collect())
}

// ---------------------------------------------------------------------------
// PCZT
// ---------------------------------------------------------------------------

/// Adds the missing Orchard/Ironwood proofs. Slow (the proving key is built on
/// first use and cached); call from a worker after `initThreadPool`.
#[wasm_bindgen(js_name = "provePczt")]
pub fn prove_pczt(pczt: &[u8]) -> Result<Vec<u8>, JsError> {
    let pczt = pczt_ops::parse_pczt(pczt)?;
    Ok(pczt_ops::serialize_pczt(pczt_ops::prove(pczt)?)?)
}

/// Verified summary of what a PCZT does, for signers to review. Pass the
/// treasury UFVK to make change detection cryptographic (recommended).
#[wasm_bindgen(js_name = "pcztSummary", unchecked_return_type = "PcztSummary")]
pub fn pczt_summary(pczt: &[u8], network: &str, ufvk: Option<String>) -> Result<JsValue, JsError> {
    let network = parse_network(network)?;
    let ufvk = ufvk
        .map(|s| {
            zcash_keys::keys::UnifiedFullViewingKey::decode(&network, s.trim())
                .map_err(|e| Error::new(format!("Invalid UFVK: {e}")))
        })
        .transpose()?;
    let pczt = pczt_ops::parse_pczt(pczt)?;
    to_js(&pczt_ops::summarize(&pczt, network, ufvk.as_ref())?)
}

/// The proven PCZT minus what only the coordinator needs (see
/// `pczt_ops::redact_for_signers`): this is the copy to upload.
#[wasm_bindgen(js_name = "pcztRedactForSigners")]
pub fn pczt_redact_for_signers(pczt: &[u8]) -> Result<Vec<u8>, JsError> {
    let pczt = pczt_ops::parse_pczt(pczt)?;
    Ok(pczt_ops::serialize_pczt(pczt_ops::redact_for_signers(pczt))?)
}

#[derive(Deserialize)]
struct SignatureInput {
    pool: String,
    index: u32,
    signature: String,
}

/// Applies aggregated spend authorization signatures (each verified against its
/// action's `rk` and the transaction sighash).
#[wasm_bindgen(js_name = "pcztApplySignatures")]
pub fn pczt_apply_signatures(
    pczt: &[u8],
    #[wasm_bindgen(unchecked_param_type = "PcztSignature[]")] signatures: JsValue,
) -> Result<Vec<u8>, JsError> {
    let inputs: Vec<SignatureInput> = serde_wasm_bindgen::from_value(signatures)
        .map_err(|e| JsError::new(&format!("Invalid signatures: {e}")))?;
    let sigs = inputs
        .iter()
        .map(|s| {
            Ok((
                OrchardPool::parse(&s.pool)?,
                s.index as usize,
                parse_hex_array::<64>(&s.signature, "signature")?,
            ))
        })
        .collect::<Result<Vec<_>, Error>>()?;
    let pczt = pczt_ops::parse_pczt(pczt)?;
    Ok(pczt_ops::serialize_pczt(pczt_ops::apply_signatures(pczt, &sigs)?)?)
}

// ---------------------------------------------------------------------------
// Treasury viewing key
// ---------------------------------------------------------------------------

/// Orchard-only UFVK (with `ak` = the FROST group key) and its default
/// Orchard-only unified address. Randomized: call once per treasury and store
/// the result.
#[wasm_bindgen(js_name = "treasuryViewingKey", unchecked_return_type = "TreasuryViewingKey")]
pub fn treasury_viewing_key(group_public_key: &str, network: &str) -> Result<JsValue, JsError> {
    let network = parse_network(network)?;
    let gk = parse_hex_array::<32>(group_public_key, "group public key")?;
    let key = treasury::treasury_key(&gk)?;
    let (ufvk, address, change_address) = treasury::encode(&key, network);
    let obj = js_sys::Object::new();
    set(&obj, "ufvk", &JsValue::from_str(&ufvk));
    set(&obj, "address", &JsValue::from_str(&address));
    set(&obj, "changeAddress", &JsValue::from_str(&change_address));
    Ok(obj.into())
}

/// The group key a treasury viewing key belongs to and the addresses it derives,
/// for a signer to compare with their own key share and the published
/// addresses before trusting it.
#[wasm_bindgen(js_name = "treasuryViewingKeyInfo", unchecked_return_type = "TreasuryViewingKeyInfo")]
pub fn treasury_viewing_key_info(ufvk: &str, network: &str) -> Result<JsValue, JsError> {
    let network = parse_network(network)?;
    let ufvk = zcash_keys::keys::UnifiedFullViewingKey::decode(&network, ufvk.trim())
        .map_err(|e| Error::new(format!("Invalid UFVK: {e}")))?;
    let info = treasury::viewing_key_info(&ufvk)?;
    let obj = js_sys::Object::new();
    set(&obj, "groupPublicKey", &JsValue::from_str(&hex::encode(info.group_public_key)));
    set(&obj, "address", &JsValue::from_str(&info.address.encode(&network)));
    set(&obj, "changeAddress", &JsValue::from_str(&info.change_address.encode(&network)));
    Ok(obj.into())
}

/// The group public key (hex) of a FROST key share.
#[wasm_bindgen(js_name = "frostKeyPackageGroupKey")]
pub fn frost_key_package_group_key(key_package: &str) -> Result<String, JsError> {
    Ok(hex::encode(frost::key_package_group_key(key_package)?))
}

/// The address `pcztSummary` reports for this treasury's change outputs (Orchard
/// and Ironwood pools alike): the UFVK's internal-scope Orchard address at index
/// 0, as an Orchard-only unified address. Equals `treasuryViewingKey(...).changeAddress`.
#[wasm_bindgen(js_name = "treasuryChangeAddress")]
pub fn treasury_change_address(ufvk: &str, network: &str) -> Result<String, JsError> {
    let network = parse_network(network)?;
    let ufvk = zcash_keys::keys::UnifiedFullViewingKey::decode(&network, ufvk.trim())
        .map_err(|e| Error::new(format!("Invalid UFVK: {e}")))?;
    Ok(treasury::change_address_for_ufvk(&ufvk)?.encode(&network))
}
