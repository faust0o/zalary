//! Treasury viewing keys: an Orchard full viewing key whose spend validating key
//! `ak` is a FROST group public key.

use orchard::keys::{FullViewingKey, Scope, SpendingKey};
use rand_core::{OsRng, RngCore};
use zcash_keys::{address::UnifiedAddress, keys::UnifiedFullViewingKey};
use zcash_protocol::consensus::Network;

use crate::frost::spend_validating_key;
use crate::util::{ctx_dbg, Error, Result};

pub struct TreasuryKey {
    pub ufvk: UnifiedFullViewingKey,
    pub address: UnifiedAddress,
    pub change_address: UnifiedAddress,
}

/// The address `zcash_client_backend` sends Orchard-protocol change to — the
/// internal-scope Orchard address at index 0, for change in both the Orchard
/// pool (via `add_orchard_change_output` after NU6.3) and the Ironwood pool — as
/// the Orchard-only unified address `pcztSummary` reports for such outputs.
pub fn change_address(fvk: &FullViewingKey) -> UnifiedAddress {
    UnifiedAddress::from_receivers(Some(fvk.address_at(0u32, Scope::Internal)), None, None)
        .expect("an Orchard receiver makes a valid UA")
}

/// [`change_address`] for a UFVK's Orchard component.
pub fn change_address_for_ufvk(ufvk: &UnifiedFullViewingKey) -> Result<UnifiedAddress> {
    ufvk.orchard()
        .map(change_address)
        .ok_or_else(|| Error::new("Viewing key has no Orchard component"))
}

/// Like zcash-sign's `generate`: a random spending key supplies `nk` and `rivk`,
/// and the FROST group key is used as `ak`. Since orchard does not expose a
/// constructor from parts, the raw 96-byte FVK encoding (`ak || nk || rivk`) is
/// spliced and re-parsed, which re-runs all of orchard's validity checks.
///
/// The UFVK is Orchard-only (no Sapling or transparent component), and the
/// address is its default (index 0) Orchard-only unified address, so nothing can
/// be sent to a receiver the treasury cannot spend from.
pub fn treasury_key(group_public_key: &[u8; 32]) -> Result<TreasuryKey> {
    let ak = spend_validating_key(group_public_key)?;
    let fvk = loop {
        let mut seed = zeroize::Zeroizing::new([0u8; 32]);
        OsRng.fill_bytes(&mut seed[..]);
        let Some(sk) = Option::<SpendingKey>::from(SpendingKey::from_bytes(*seed)) else {
            continue;
        };
        let mut raw = zeroize::Zeroizing::new(FullViewingKey::from(&sk).to_bytes());
        raw[..32].copy_from_slice(&ak.to_bytes());
        if let Some(fvk) = FullViewingKey::from_bytes(&raw) {
            break fvk;
        }
    };
    debug_assert_eq!(
        orchard::keys::SpendValidatingKey::from(fvk.clone()).to_bytes(),
        *group_public_key
    );
    let address = UnifiedAddress::from_receivers(Some(fvk.address_at(0u64, Scope::External)), None, None)
        .ok_or_else(|| Error::new("Failed to build unified address"))?;
    let change_address = change_address(&fvk);
    let ufvk = UnifiedFullViewingKey::from_orchard_fvk(fvk).map_err(ctx_dbg("Failed to build UFVK"))?;
    Ok(TreasuryKey { ufvk, address, change_address })
}

/// What a signer checks before trusting a treasury viewing key handed to them:
/// its `ak` must be the group key from their own key share, and the treasury's
/// published addresses must be the ones it derives.
pub struct ViewingKeyInfo {
    pub group_public_key: [u8; 32],
    pub address: UnifiedAddress,
    pub change_address: UnifiedAddress,
}

/// Reads [`ViewingKeyInfo`] from a treasury UFVK, which must be Orchard-only
/// (as [`treasury_key`] makes them), so it has no receiver the group key can't
/// spend from.
pub fn viewing_key_info(ufvk: &UnifiedFullViewingKey) -> Result<ViewingKeyInfo> {
    if ufvk.sapling().is_some() || ufvk.transparent().is_some() {
        return Err(Error::new("A treasury viewing key must be Orchard-only"));
    }
    let fvk = ufvk
        .orchard()
        .ok_or_else(|| Error::new("Viewing key has no Orchard component"))?;
    let address = UnifiedAddress::from_receivers(Some(fvk.address_at(0u64, Scope::External)), None, None)
        .ok_or_else(|| Error::new("Failed to build unified address"))?;
    Ok(ViewingKeyInfo {
        group_public_key: orchard::keys::SpendValidatingKey::from(fvk.clone()).to_bytes(),
        address,
        change_address: change_address(fvk),
    })
}

/// `(ufvk, address, change_address)` encoded for `network`.
pub fn encode(key: &TreasuryKey, network: Network) -> (String, String, String) {
    (
        key.ufvk.encode(&network),
        key.address.encode(&network),
        key.change_address.encode(&network),
    )
}
