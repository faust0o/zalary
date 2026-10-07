//! Treasury spending from the memory wallet: ZIP 321 request → proposal → PCZT,
//! and PCZT → stored transaction.

use pczt::Pczt;
use zcash_client_backend::{
    data_api::{
        error::Error as BackendError,
        wallet::{
            create_pczt_from_proposal, extract_and_store_transaction_from_pczt,
            input_selection::{GreedyInputSelector, SpendPolicy},
            propose_transfer, ConfirmationsPolicy,
        },
        WalletCommitmentTrees, WalletRead,
    },
    fees::{standard::SingleOutputChangeStrategy, DustOutputPolicy, StandardFeeRule},
    wallet::OvkPolicy,
};
use zcash_client_memory::MemoryWalletDb;
use zcash_keys::{address::Address, keys::UnifiedFullViewingKey};
use zcash_primitives::transaction::{builder::BundlePadding, Transaction};
use zcash_protocol::{consensus::Network, PoolType, ShieldedPool, TxId};

use crate::pczt_ops;
use crate::util::{ctx_dbg, Error, Result};

pub const SAPLING_UNSUPPORTED: &str = "Sapling recipients are not supported by treasuries yet";

type Db = MemoryWalletDb<Network>;

fn single_account(db: &Db) -> Result<<Db as WalletRead>::AccountId> {
    let ids = db.get_account_ids().map_err(ctx_dbg("Failed to read accounts"))?;
    match ids.as_slice() {
        [id] => Ok(*id),
        [] => Err(Error::new("Wallet has no account")),
        _ => Err(Error::new("Wallet has more than one account")),
    }
}

/// Formats a `zcash_client_backend` error, spelling out the common user-facing
/// cases (its `Display` impl needs every type parameter to be `Display`).
fn backend_error<DE, TE, SE, FE, CE, N>(context: &str, e: BackendError<DE, TE, SE, FE, CE, N>) -> Error
where
    BackendError<DE, TE, SE, FE, CE, N>: std::fmt::Debug,
{
    let detail = match &e {
        BackendError::InsufficientFunds { available, required } => format!(
            "Insufficient balance (have {} zat, need {} zat including fee)",
            u64::from(*available),
            u64::from(*required)
        ),
        BackendError::ScanRequired => "The wallet must be synced first".to_string(),
        other => format!("{other:?}"),
    };
    Error::new(format!("{context}: {detail}"))
}

/// Rejects recipients the treasury flow cannot pay before any proposal is made.
fn check_recipient(network: &Network, payment: &zip321::Payment) -> Result<()> {
    let addr = Address::try_from_zcash_address(network, payment.recipient_address().clone())
        .map_err(|e| Error::new(format!("Unsupported recipient address: {e}")))?;
    match addr {
        Address::Sapling(_) => Err(Error::new(SAPLING_UNSUPPORTED)),
        Address::Unified(ua) if ua.orchard().is_none() && ua.transparent().is_none() => {
            Err(Error::new(SAPLING_UNSUPPORTED))
        }
        Address::Unified(_) | Address::Transparent(_) => Ok(()),
        Address::Tex(_) => Err(Error::new(
            "TEX recipients are not supported by treasuries yet (they need a two-step transaction)",
        )),
    }
}

/// zcash_client_memory's `EPHEMERAL_GAP_LIMIT`.
const EPHEMERAL_GAP_LIMIT: u32 = 5;

/// Placeholder "ephemeral" transparent addresses for accounts without a
/// transparent key: P2SH to a hash nobody knows a script for, so nothing can be
/// sent to or spent from them.
fn ephemeral_placeholder(index: u32) -> zcash_transparent::address::TransparentAddress {
    use blake2::{Blake2s256, Digest};
    let h = Blake2s256::new()
        .chain_update(b"zcash-view-wasm: accounts without a transparent key have no ephemeral addresses")
        .chain_update(index.to_le_bytes())
        .finalize();
    zcash_transparent::address::TransparentAddress::ScriptHash(h[..20].try_into().expect("20 bytes"))
}

/// Works around a zcash_client_memory limitation. With `transparent-inputs`
/// (required by `zcash_client_backend/pczt`) it assumes every account has at
/// least `EPHEMERAL_GAP_LIMIT` reserved ZIP 320 ephemeral addresses, which it
/// only creates for accounts with a transparent key. For an Orchard-only
/// treasury account the set is empty, and the `reserve_next_n_ephemeral_addresses(account, 0)`
/// call every proposal build makes fails with "ephemeral_addresses corrupted".
/// Recording unpayable placeholders makes the zero-length reservation succeed;
/// nothing else uses them (TEX recipients, the only use of ephemeral addresses,
/// are rejected by [`check_recipient`]).
fn ensure_ephemeral_placeholders(db: &mut Db, network: Network) -> Result<()> {
    use prost::Message;
    use zcash_client_memory::proto::memwallet as proto;
    // The memory wallet encodes keys and addresses with mainnet encodings
    // regardless of its network.
    let enc = Network::MainNetwork;

    let mut buf = Vec::new();
    db.encode(&mut buf).map_err(ctx_dbg("Failed to encode wallet"))?;
    let mut wallet = proto::MemoryWallet::decode(&buf[..]).map_err(ctx_dbg("Failed to decode wallet"))?;
    let mut changed = false;
    for acc in wallet.accounts.iter_mut().flat_map(|a| a.accounts.iter_mut()) {
        let ufvk = UnifiedFullViewingKey::decode(&enc, &acc.viewing_key)
            .map_err(|e| Error::new(format!("Invalid account UFVK: {e}")))?;
        if ufvk.transparent().is_none() && acc.ephemeral_addresses.is_empty() {
            acc.ephemeral_addresses = (0..EPHEMERAL_GAP_LIMIT)
                .map(|index| proto::EphemeralAddressRecord {
                    index,
                    ephemeral_address: Some(proto::EphemeralAddress {
                        address: Address::Transparent(ephemeral_placeholder(index)).encode(&enc),
                        used_in_tx: None,
                        seen_in_tx: None,
                    }),
                })
                .collect();
            changed = true;
        }
    }
    if changed {
        *db = MemoryWalletDb::new_from_proto(wallet, network, crate::MAX_CHECKPOINTS)
            .map_err(ctx_dbg("Failed to rebuild wallet"))?;
    }
    Ok(())
}

/// Builds an unproven, unsigned PCZT paying a ZIP 321 request from the wallet's
/// single account.
pub fn create_pczt(db: &mut Db, network: Network, uri: &str, expiry_delta: u32) -> Result<Pczt> {
    if expiry_delta == 0 {
        return Err(Error::new("expiryDelta must be at least 1 block"));
    }
    let request = zip321::TransactionRequest::from_uri(uri.trim())
        .map_err(|e| Error::new(format!("Invalid ZIP 321 payment request: {e}")))?;
    if request.payments().is_empty() {
        return Err(Error::new("Payment request has no payments"));
    }
    for payment in request.payments().values() {
        check_recipient(&network, payment)?;
    }
    let account = single_account(db)?;
    ensure_ephemeral_placeholders(db, network)?;

    let input_selector = GreedyInputSelector::<Db>::new();
    let change_strategy = SingleOutputChangeStrategy::<Db>::new(
        StandardFeeRule::Zip317,
        None,
        ShieldedPool::Orchard,
        DustOutputPolicy::default(),
    );
    let proposal = propose_transfer::<_, _, _, _, <Db as WalletCommitmentTrees>::Error>(
        db,
        &network,
        account,
        &input_selector,
        &change_strategy,
        request,
        ConfirmationsPolicy::default(),
        &SpendPolicy::default(),
        None,
        None,
    )
    .map_err(|e| backend_error("Failed to propose transfer", e))?;

    for step in proposal.steps().iter() {
        if step.payment_pools().values().any(|p| *p == PoolType::SAPLING)
            || step
                .balance()
                .proposed_change()
                .iter()
                .any(|c| c.output_pool() == PoolType::SAPLING)
        {
            return Err(Error::new(SAPLING_UNSUPPORTED));
        }
    }

    let target = zcash_protocol::consensus::BlockHeight::from(proposal.min_target_height());
    let expiry = target + expiry_delta;
    let create = |db: &mut Db, expiry| {
        create_pczt_from_proposal::<_, _, std::convert::Infallible, _, std::convert::Infallible, _>(
            db,
            &network,
            account,
            OvkPolicy::Sender,
            &proposal,
            expiry,
            BundlePadding::DEFAULT,
        )
    };
    match create(db, Some(expiry)) {
        Ok(pczt) => Ok(pczt),
        // A single canonical-denomination payment across the Orchard → Ironwood
        // turnstile is built as a ZIP 318 crossing, which must carry the ZIP 318
        // rolling expiry (one to two months out) instead of ours.
        Err(BackendError::ExpiryHeightConflictsWithCanonicalCrossing { .. }) => {
            create(db, None).map_err(|e| backend_error("Failed to create PCZT", e))
        }
        Err(e) => Err(backend_error("Failed to create PCZT", e)),
    }
}

/// Extracts the finished transaction from a proven, fully signed PCZT (verifying
/// proofs and signatures), records it in the wallet, and returns it.
pub fn extract_and_store(db: &mut Db, pczt: Pczt) -> Result<(TxId, Transaction)> {
    let vk = pczt_ops::verifying_key(pczt_ops::circuit_version_for(&pczt)?);
    let txid = extract_and_store_transaction_from_pczt::<_, ()>(db, pczt, None, Some(vk))
        .map_err(|e| backend_error("Failed to extract transaction from PCZT", e))?;
    let tx = db
        .get_transaction(txid)
        .map_err(ctx_dbg("Failed to read stored transaction"))?
        .ok_or_else(|| Error::new("Stored transaction not found"))?;
    Ok((txid, tx))
}
