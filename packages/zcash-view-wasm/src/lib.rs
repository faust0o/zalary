//! View-only Zcash light wallet for the browser.
//!
//! Scans Sapling, Orchard and, since NU6.3 (mainnet height 3,428,143), the
//! Ironwood pool. Ironwood notes are Orchard-shaped and trial-decrypted with the
//! account's Orchard viewing key; after activation no value can enter Orchard,
//! so payments to a UA's Orchard receiver arrive as Ironwood notes.

mod types;

use std::cell::UnsafeCell;
use std::collections::BTreeMap;

use futures_util::TryStreamExt;
use tonic_web_wasm_client::Client as WebClient;
use wasm_bindgen::prelude::*;

use zcash_client_backend::{
    data_api::{
        AccountPurpose, AccountBirthday, WalletRead, WalletWrite, WalletCommitmentTrees,
        chain::{BlockCache, BlockSource, CommitmentTreeRoot, error},
        scanning::ScanRange,
    },
    proto::{
        compact_formats::CompactBlock,
        service::{
            self, compact_tx_streamer_client::CompactTxStreamerClient, BlockId, ChainSpec,
            PoolType,
        },
    },
};
use zcash_client_memory::MemoryWalletDb;
use zcash_keys::keys::{
    ReceiverRequirement::{Omit, Require},
    UnifiedAddressRequest, UnifiedFullViewingKey,
};
use zcash_primitives::merkle_tree::HashSer;
use zcash_protocol::consensus::{self, BlockHeight, MainNetwork, MAIN_NETWORK};
use zip32::DiversifierIndex;

use sapling_crypto;

use types::{BalanceInfo, SyncSummary};

const MAX_CHECKPOINTS: usize = 100;
// Blocks are scanned one at a time because crossbeam_channel in BatchRunner
// deadlocks on WASM without SharedArrayBuffer. We download in larger chunks
// to reduce gRPC round-trips, then scan each block individually.
const DOWNLOAD_CHUNK: u32 = 500;
// Shielded pools requested from GetBlockRange. lightwallet-protocol v0.5 servers
// also include Ironwood when this is left empty, but older servers default to
// Sapling + Orchard only, so request every pool the wallet scans explicitly.
// Transparent data is not requested: the wallet does not track it.
const SCANNED_POOLS: [PoolType; 3] = [PoolType::Sapling, PoolType::Orchard, PoolType::Ironwood];
// Nullifier-map entries are kept this far below the fully scanned height (the
// reorg window, as in zcash_client_sqlite), and pruned once enough have piled up
const NULLIFIER_RETENTION_BLOCKS: u32 = MAX_CHECKPOINTS as u32;
const COMPACT_EVERY_BLOCKS: u32 = 1000;

pub use wasm_bindgen_rayon::init_thread_pool;

macro_rules! console_log {
    ($($t:tt)*) => {
        web_sys::console::log_1(&format!($($t)*).into())
    }
}


#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Block cache using UnsafeCell for lock-free access in single-threaded WASM.
/// No locks, no atomics — just direct mutable access.
/// Safety: WASM is single-threaded, so no data races are possible.
struct SimpleBlockCache(UnsafeCell<BTreeMap<BlockHeight, CompactBlock>>);

unsafe impl Send for SimpleBlockCache {}
unsafe impl Sync for SimpleBlockCache {}

impl SimpleBlockCache {
    fn new() -> Self {
        Self(UnsafeCell::new(BTreeMap::new()))
    }

    fn inner(&self) -> &BTreeMap<BlockHeight, CompactBlock> {
        // Safety: single-threaded WASM — no concurrent access
        unsafe { &*self.0.get() }
    }

    #[allow(clippy::mut_from_ref)]
    fn inner_mut(&self) -> &mut BTreeMap<BlockHeight, CompactBlock> {
        // Safety: single-threaded WASM — no concurrent access
        unsafe { &mut *self.0.get() }
    }
}

impl BlockSource for SimpleBlockCache {
    type Error = std::convert::Infallible;

    fn with_blocks<F, WalletErrT>(
        &self,
        from_height: Option<BlockHeight>,
        limit: Option<usize>,
        mut with_block: F,
    ) -> Result<(), error::Error<WalletErrT, Self::Error>>
    where
        F: FnMut(CompactBlock) -> Result<(), error::Error<WalletErrT, Self::Error>>,
    {
        for (_, cb) in self.inner()
            .iter()
            .filter(|(_, cb)| from_height.map_or(true, |h| cb.height() >= h))
            .take(limit.unwrap_or(usize::MAX))
        {
            with_block(cb.clone())?;
        }
        Ok(())
    }
}

#[async_trait::async_trait]
impl BlockCache for SimpleBlockCache {
    fn get_tip_height(
        &self,
        range: Option<&ScanRange>,
    ) -> Result<Option<BlockHeight>, Self::Error> {
        let inner = self.inner();
        if let Some(range) = range {
            let r = range.block_range();
            for h in (u32::from(r.start)..u32::from(r.end)).rev() {
                if inner.contains_key(&BlockHeight::from_u32(h)) {
                    return Ok(Some(BlockHeight::from_u32(h)));
                }
            }
            Ok(None)
        } else {
            Ok(inner.last_key_value().map(|(h, _)| *h))
        }
    }

    async fn read(&self, range: &ScanRange) -> Result<Vec<CompactBlock>, Self::Error> {
        let r = range.block_range();
        let mut ret = Vec::new();
        for height in u32::from(r.start)..u32::from(r.end) {
            if let Some(cb) = self.inner().get(&BlockHeight::from_u32(height)) {
                ret.push(cb.clone());
            }
        }
        Ok(ret)
    }

    async fn insert(&self, compact_blocks: Vec<CompactBlock>) -> Result<(), Self::Error> {
        let inner = self.inner_mut();
        for cb in compact_blocks {
            inner.insert(cb.height(), cb);
        }
        Ok(())
    }

    async fn delete(&self, range: ScanRange) -> Result<(), Self::Error> {
        let inner = self.inner_mut();
        let r = range.block_range();
        for height in u32::from(r.start)..u32::from(r.end) {
            inner.remove(&BlockHeight::from_u32(height));
        }
        Ok(())
    }
}

#[wasm_bindgen]
pub struct ZcashViewWallet {
    db: MemoryWalletDb<MainNetwork>,
    cache: SimpleBlockCache,
    client: CompactTxStreamerClient<WebClient>,
    lightwalletd_url: String,
    /// Height below which the nullifier map was last pruned
    compacted_below: u32,
}

#[wasm_bindgen]
impl ZcashViewWallet {
    #[wasm_bindgen(js_name = "create")]
    pub async fn create(
        lightwalletd_url: &str,
        ufvk_str: &str,
        birthday_height: u64,
    ) -> Result<ZcashViewWallet, JsError> {
        console_log!("[zcash-wallet] Initializing new wallet...");

        let params = MAIN_NETWORK;
        let mut db = MemoryWalletDb::new(params, MAX_CHECKPOINTS);
        let cache = SimpleBlockCache::new();
        let web_client = WebClient::new(lightwalletd_url.to_string());
        let mut client = CompactTxStreamerClient::new(web_client);

        let ufvk = UnifiedFullViewingKey::decode(&params, ufvk_str)
            .map_err(|e| JsError::new(&format!("Invalid UFVK: {}", e)))?;

        let birthday_height = consensus::BlockHeight::from_u32(birthday_height as u32);
        let tree_state = client
            .get_tree_state(BlockId { height: u64::from(birthday_height), hash: vec![] })
            .await
            .map_err(|e| JsError::new(&format!("Failed to get tree state: {}", e)))?
            .into_inner();

        console_log!("[zcash-wallet] Got tree state at height {}", tree_state.height);

        let birthday = AccountBirthday::from_treestate(tree_state, None)
            .map_err(|_| JsError::new("Failed to parse tree state into account birthday"))?;

        db.import_account_ufvk("Zalary Wallet", &ufvk, &birthday, AccountPurpose::ViewOnly, None)
            .map_err(|e| JsError::new(&format!("Failed to import account: {:?}", e)))?;

        console_log!("[zcash-wallet] View-only account imported");
        Ok(ZcashViewWallet {
            db,
            cache,
            client,
            lightwalletd_url: lightwalletd_url.to_string(),
            compacted_below: 0,
        })
    }

    #[wasm_bindgen(js_name = "fromBytes")]
    pub async fn from_bytes(
        lightwalletd_url: &str,
        saved_state: &[u8],
    ) -> Result<ZcashViewWallet, JsError> {
        console_log!("[zcash-wallet] Restoring wallet from {} bytes", saved_state.len());
        let db = MemoryWalletDb::decode_new(saved_state, MAIN_NETWORK, MAX_CHECKPOINTS)
            .map_err(|e| JsError::new(&format!("Failed to decode wallet: {:?}", e)))?;
        let cache = SimpleBlockCache::new();
        let client = CompactTxStreamerClient::new(WebClient::new(lightwalletd_url.to_string()));
        console_log!("[zcash-wallet] Wallet restored");
        Ok(ZcashViewWallet {
            db,
            cache,
            client,
            lightwalletd_url: lightwalletd_url.to_string(),
            compacted_below: 0,
        })
    }

    #[wasm_bindgen(js_name = "getChainTip")]
    pub async fn get_chain_tip(&mut self) -> Result<u64, JsError> {
        let tip = self.client
            .get_latest_block(ChainSpec {})
            .await
            .map_err(|e| JsError::new(&format!("Failed to get chain tip: {}", e)))?
            .into_inner()
            .height;
        Ok(tip)
    }

    /// Sync the wallet step by step with logging and progress reporting.
    #[wasm_bindgen(js_name = "syncWithProgress")]
    pub async fn sync_with_progress(&mut self, on_progress: &js_sys::Function) -> Result<JsValue, JsError> {
        let this_js = JsValue::NULL;
        let err = |msg: String| JsError::new(&msg);

        // Step 1: Get chain tip
        let tip_height: BlockHeight = self.client
            .get_latest_block(ChainSpec::default())
            .await
            .map_err(|e| err(format!("get_latest_block: {e}")))?
            .get_ref()
            .height
            .try_into()
            .map_err(|_| err("Bad tip".into()))?;
        let tip = u64::from(tip_height);

        self.db.update_chain_tip(tip_height).map_err(|e| err(format!("{e:?}")))?;
        console_log!("[zcash-wallet] Chain tip: {}", tip);

        // Step 2: Subtree roots
        console_log!("[zcash-wallet] Fetching subtree roots (sapling, orchard, ironwood)...");
        self.update_subtree_roots().await?;
        console_log!("[zcash-wallet] Subtree roots updated");

        // Step 3: Scan loop
        // Calculate total blocks to scan for progress reporting
        let birthday_height = self.db.get_wallet_birthday()
            .map_err(|e| err(format!("{e:?}")))?
            .unwrap_or(tip_height);
        let total_to_scan = u64::from(tip_height).saturating_sub(u64::from(birthday_height));
        let mut total_scanned: u64 = 0;

        // Report initial progress
        let _ = on_progress.call2(&this_js, &JsValue::from(0.0f64), &JsValue::from(total_to_scan as f64));

        let start_time = js_sys::Date::now();
        let mut iteration = 0u32;
        loop {
            iteration += 1;
            let scan_ranges = self.db.suggest_scan_ranges().map_err(|e| err(format!("{e:?}")))?;
            if scan_ranges.is_empty() {
                console_log!("[zcash-wallet] No more scan ranges");
                break;
            }

            let first = &scan_ranges[0];
            console_log!(
                "[zcash-wallet] Iteration {}: {} ranges, first: {}..{} ({:?})",
                iteration,
                scan_ranges.len(),
                u64::from(first.block_range().start),
                u64::from(first.block_range().end),
                first.priority()
            );

            // Process ranges in download chunks
            let mut made_progress = false;
            for scan_range in scan_ranges.iter().flat_map(|r| {
                (0..).scan(r.clone(), |acc, _| {
                    if acc.is_empty() {
                        None
                    } else if let Some((cur, next)) = acc.split_at(acc.block_range().start + DOWNLOAD_CHUNK) {
                        *acc = next;
                        Some(cur)
                    } else {
                        let cur = acc.clone();
                        let end = acc.block_range().end;
                        *acc = ScanRange::from_parts(end..end, acc.priority());
                        Some(cur)
                    }
                })
            }) {
                self.download_and_scan(&scan_range).await?;
                made_progress = true;

                // Report progress based on blocks scanned so far
                total_scanned += scan_range.len() as u64;
                let _ = on_progress.call2(
                    &this_js,
                    &JsValue::from(total_scanned as f64),
                    &JsValue::from(total_to_scan as f64),
                );

                // Re-check if high priority ranges appeared
                let new_ranges = self.db.suggest_scan_ranges().map_err(|e| err(format!("{e:?}")))?;
                if !new_ranges.is_empty() && new_ranges[0].priority() == zcash_client_backend::data_api::scanning::ScanPriority::Verify {
                    console_log!("[zcash-wallet] Verify range appeared, restarting");
                    break;
                }
            }

            if !made_progress {
                break;
            }
        }

        let elapsed = js_sys::Date::now() - start_time;
        console_log!("[zcash-wallet] Sync complete in {:.1}s", elapsed / 1000.0);

        self.compact()?;
        let summary = self.build_summary()?;
        Ok(serde_wasm_bindgen::to_value(&summary)?)
    }

    #[wasm_bindgen(js_name = "getBalance")]
    pub fn get_balance(&self) -> Result<JsValue, JsError> {
        let balance = self.read_balance()?;
        Ok(serde_wasm_bindgen::to_value(&balance)?)
    }

    /// Detect outgoing transactions from a view-only wallet.
    ///
    /// Since `sent_notes` is only populated when the wallet creates a transaction
    /// itself, a view-only wallet must detect spends via nullifier tracking:
    ///
    /// 1. `received_note_spends` maps spent note IDs → spending tx IDs
    /// 2. Sum up the value of all spent received notes per spending tx
    /// 3. Subtract every note this wallet received in the same tx: change
    ///    (`is_change = true`) and outputs to its own external addresses
    /// 4. The difference (fee included) is the net amount sent
    ///
    /// All shielded pools are handled alike: notes are keyed by
    /// (pool, txid, output index), with Ironwood (NU6.3) as its own pool. After
    /// Ironwood activation a payment funded from Orchard notes reveals Orchard
    /// nullifiers while its change lands in the Ironwood pool, and an
    /// Orchard → Ironwood migration returns (almost) all value to the wallet,
    /// which is why received value is subtracted regardless of key scope.
    #[wasm_bindgen(js_name = "getSentTransactions")]
    pub fn get_sent_transactions(&self) -> Result<JsValue, JsError> {
        let wallet_proto = self.to_proto()?;
        let txs = sent_transactions_from_proto(&wallet_proto);
        console_log!("[zcash-wallet] Found {} sent transactions", txs.len());
        Ok(serde_wasm_bindgen::to_value(&txs)?)
    }

    #[wasm_bindgen(js_name = "toBytes")]
    pub fn to_bytes(&self) -> Result<Vec<u8>, JsError> {
        let mut buf = Vec::new();
        self.db.encode(&mut buf)
            .map_err(|e| JsError::new(&format!("Failed to encode wallet: {:?}", e)))?;
        Ok(buf)
    }
}

/// Derive a shielded unified address for a UFVK, starting the search at the given
/// 11-byte diversifier index (or index 0 for the default address). Transparent
/// receivers are omitted because the view wallet only scans Sapling and Orchard.
/// Notes sent to any diversified address are detected by the same viewing key.
#[wasm_bindgen(js_name = "deriveUnifiedAddress")]
pub fn derive_unified_address(
    ufvk_str: &str,
    diversifier_index: Option<Vec<u8>>,
) -> Result<String, JsError> {
    let ufvk = UnifiedFullViewingKey::decode(&MAIN_NETWORK, ufvk_str.trim())
        .map_err(|e| JsError::new(&format!("Invalid UFVK: {}", e)))?;
    let uivk = ufvk.to_unified_incoming_viewing_key();
    // NEAR Intents only accepts recipients with an Orchard receiver
    if !uivk.has_orchard() {
        return Err(JsError::new(
            "Viewing key has no Orchard component. Export a current unified full viewing key from your wallet.",
        ));
    }
    // Requiring Sapling (when present) makes find_address skip indices that are
    // invalid for Sapling instead of silently dropping that receiver
    let sapling = if uivk.has_sapling() { Require } else { Omit };
    let request = UnifiedAddressRequest::custom(Require, sapling, Omit)
        .map_err(|_| JsError::new("Invalid address request"))?;
    let start = match diversifier_index {
        Some(bytes) => DiversifierIndex::from(
            <[u8; 11]>::try_from(bytes.as_slice())
                .map_err(|_| JsError::new("Diversifier index must be 11 bytes"))?,
        ),
        None => DiversifierIndex::new(),
    };
    let (ua, _) = uivk
        .find_address(start, request)
        .map_err(|e| JsError::new(&format!("Failed to derive address: {:?}", e)))?;
    Ok(ua.encode(&MAIN_NETWORK))
}

/// Drops nullifier-map and tx-locator entries below `height`, returning how many
/// were removed.
fn prune_nullifier_map(
    wallet_proto: &mut zcash_client_memory::proto::memwallet::MemoryWallet,
    height: u32,
) -> usize {
    let before = wallet_proto.nullifiers.len() + wallet_proto.tx_locator.len();
    wallet_proto.nullifiers.retain(|r| r.block_height >= height);
    wallet_proto.tx_locator.retain(|r| r.block_height >= height);
    before - wallet_proto.nullifiers.len() - wallet_proto.tx_locator.len()
}

/// Net outgoing transactions of a serialized memory wallet; see
/// [`ZcashViewWallet::get_sent_transactions`].
fn sent_transactions_from_proto(
    wallet_proto: &zcash_client_memory::proto::memwallet::MemoryWallet,
) -> Vec<types::SentTransaction> {
    use std::collections::HashMap;

    // Build tx_id → (mined_height, block_time) from tx_table and blocks
    let mut tx_meta: HashMap<Vec<u8>, (Option<u32>, u32)> = HashMap::new();
    for record in &wallet_proto.tx_table {
        if let (Some(ref tx_id), Some(ref entry)) = (&record.tx_id, &record.tx_entry) {
            tx_meta.insert(tx_id.hash.clone(), (entry.mined_height, 0));
        }
    }
    // Add block_time from wallet blocks
    let mut height_to_time: HashMap<u32, u32> = HashMap::new();
    for block in &wallet_proto.blocks {
        height_to_time.insert(block.height, block.block_time);
    }
    for (_txid, meta) in tx_meta.iter_mut() {
        if let Some(h) = meta.0 {
            if let Some(&bt) = height_to_time.get(&h) {
                meta.1 = bt;
            }
        }
    }

    // Index received notes by note_id key (pool, tx_id, output_index) → value.
    // The pool is part of the key: a v6 transaction can carry an Orchard and an
    // Ironwood action at the same index.
    let mut received_values: HashMap<(i32, Vec<u8>, u32), u64> = HashMap::new();
    for note in &wallet_proto.received_note_table {
        if let Some(ref note_id) = note.note_id {
            if let Some(ref tx_id) = note_id.tx_id {
                let key = (note_id.pool, tx_id.hash.clone(), note_id.output_index);
                let value = note.note.as_ref().map(|n| n.value).unwrap_or(0);
                received_values.insert(key, value);
            }
        }
    }

    // Track per-spending-tx: total value of spent notes
    // spent_tx → total_spent_value
    let mut spent_per_tx: HashMap<Vec<u8>, u64> = HashMap::new();
    for spend in &wallet_proto.received_note_spends {
        if let (Some(ref note_id), Some(ref spending_tx_id)) = (&spend.note_id, &spend.tx_id) {
            let note_key = (
                note_id.pool,
                note_id.tx_id.as_ref().map(|t| t.hash.clone()).unwrap_or_default(),
                note_id.output_index,
            );
            if let Some(&value) = received_values.get(&note_key) {
                *spent_per_tx.entry(spending_tx_id.hash.clone()).or_insert(0) += value;
            }
        }
    }

    // Track per-tx: total value that came back to this wallet (change and
    // self-sends, in any pool)
    let mut returned_per_tx: HashMap<Vec<u8>, u64> = HashMap::new();
    for note in &wallet_proto.received_note_table {
        if let Some(ref tx_id) = note.tx_id {
            let value = note.note.as_ref().map(|n| n.value).unwrap_or(0);
            *returned_per_tx.entry(tx_id.hash.clone()).or_insert(0) += value;
        }
    }

    // Build sent transactions: net sent = spent - returned
    let mut txs: Vec<types::SentTransaction> = Vec::new();
    for (txid_bytes, total_spent) in &spent_per_tx {
        let returned = returned_per_tx.get(txid_bytes).copied().unwrap_or(0);
        if total_spent <= &returned {
            continue; // No net outflow (e.g. self-send or shielding)
        }
        let net_sent = total_spent - returned;
        let (mined_height, block_time) = tx_meta
            .get(txid_bytes)
            .copied()
            .unwrap_or((None, 0));

        txs.push(types::SentTransaction {
            txid: hex::encode(txid_bytes),
            amount_zec: types::u_zatoshis_to_zec(net_sent),
            memo: None, // Sender can't decrypt recipient's memo
            block_height: mined_height.map(|h| h as u64),
            timestamp: block_time as u64,
        });
    }
    txs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    txs
}

// Private helpers
impl ZcashViewWallet {
    /// Streams every completed subtree root of one shielded pool's note
    /// commitment tree from lightwalletd, starting at subtree index 0.
    async fn fetch_subtree_roots<H: HashSer>(
        &mut self,
        protocol: service::ShieldedProtocol,
    ) -> Result<Vec<CommitmentTreeRoot<H>>, JsError> {
        let name = protocol.as_str_name();
        let mut request = service::GetSubtreeRootsArg::default();
        request.set_shielded_protocol(protocol);
        self.client
            .get_subtree_roots(request)
            .await
            .map_err(|e| JsError::new(&format!("get_subtree_roots ({name}): {e}")))?
            .into_inner()
            .and_then(|root| async move {
                let root_hash = H::read(&root.root_hash[..])?;
                Ok(CommitmentTreeRoot::from_parts(
                    BlockHeight::from_u32(root.completing_block_height as u32),
                    root_hash,
                ))
            })
            .try_collect()
            .await
            .map_err(|e| JsError::new(&format!("{name} subtree roots stream: {e}")))
    }

    async fn update_subtree_roots(&mut self) -> Result<(), JsError> {
        let err = |msg: String| JsError::new(&msg);

        // Sapling
        let sapling_roots = self
            .fetch_subtree_roots::<sapling_crypto::Node>(service::ShieldedProtocol::Sapling)
            .await?;
        console_log!("[zcash-wallet]   {} sapling subtree roots", sapling_roots.len());
        self.db.put_sapling_subtree_roots(0, &sapling_roots).map_err(|e| err(format!("{e:?}")))?;

        #[cfg(feature = "orchard")]
        {
            use orchard::tree::MerkleHashOrchard;

            // Orchard
            let orchard_roots = self
                .fetch_subtree_roots::<MerkleHashOrchard>(service::ShieldedProtocol::Orchard)
                .await?;
            console_log!("[zcash-wallet]   {} orchard subtree roots", orchard_roots.len());
            self.db.put_orchard_subtree_roots(0, &orchard_roots).map_err(|e| err(format!("{e:?}")))?;

            // Ironwood (NU6.3). Its tree is Orchard-shaped and starts empty at
            // activation, so there may be no completed subtree yet.
            let ironwood_roots = self
                .fetch_subtree_roots::<MerkleHashOrchard>(service::ShieldedProtocol::Ironwood)
                .await?;
            console_log!("[zcash-wallet]   {} ironwood subtree roots", ironwood_roots.len());
            self.db.put_ironwood_subtree_roots(0, &ironwood_roots).map_err(|e| err(format!("{e:?}")))?;
        }

        Ok(())
    }

    async fn download_and_scan(
        &mut self,
        scan_range: &ScanRange,
    ) -> Result<(), JsError> {
        use zcash_client_backend::data_api::chain::scan_cached_blocks;
        let err = |msg: String| JsError::new(&msg);
        let range_start = scan_range.block_range().start;
        let range_end = scan_range.block_range().end;

        // Fetch chain state BEFORE the streaming download (gRPC client can stall
        // on unary calls after a streaming response with tonic-web-wasm-client)
        let chain_state = self.download_chain_state(range_start - 1).await?;

        // Download all blocks in one gRPC streaming call
        let mut start_id = service::BlockId::default();
        start_id.height = range_start.into();
        let mut end_id = service::BlockId::default();
        end_id.height = (range_end - 1).into();

        let all_blocks: Vec<CompactBlock> = self.client
            .get_block_range(service::BlockRange {
                start: Some(start_id),
                end: Some(end_id),
                pool_types: SCANNED_POOLS.iter().map(|p| *p as i32).collect(),
            })
            .await
            .map_err(|e| err(format!("get_block_range: {e}")))?
            .into_inner()
            .try_collect()
            .await
            .map_err(|e| err(format!("block stream: {e}")))?;

        if all_blocks.is_empty() {
            return Ok(());
        }

        let (orchard_actions, ironwood_actions) = all_blocks
            .iter()
            .flat_map(|b| b.vtx.iter())
            .fold((0usize, 0usize), |(o, i), tx| {
                (o + tx.actions.len(), i + tx.ironwood_actions.len())
            });
        console_log!(
            "[zcash-wallet]   Downloaded {} blocks ({}..{}), {} orchard / {} ironwood actions",
            all_blocks.len(),
            u64::from(range_start),
            u64::from(range_end - 1),
            orchard_actions,
            ironwood_actions
        );

        // Insert all blocks into cache and scan as a batch
        let num_blocks = all_blocks.len();
        let _ = self.cache.insert(all_blocks).await;

        let scan_start = js_sys::Date::now();
        scan_cached_blocks(
            &MAIN_NETWORK,
            &self.cache,
            &mut self.db,
            range_start,
            &chain_state,
            scan_range.len(),
        )
        .map_err(|e| err(format!("scan_cached_blocks: {e:?}")))?;

        let elapsed = js_sys::Date::now() - scan_start;
        console_log!(
            "[zcash-wallet]   Scanned {} blocks in {:.1}s ({:.0} blocks/s)",
            num_blocks,
            elapsed / 1000.0,
            num_blocks as f64 / (elapsed / 1000.0).max(0.001)
        );

        // Clean up cache
        let _ = self.cache.delete(scan_range.clone()).await;

        Ok(())
    }

    async fn download_chain_state(&self, block_height: BlockHeight) -> Result<zcash_client_backend::data_api::chain::ChainState, JsError> {
        // Use a fresh gRPC client — tonic-web-wasm-client can stall on unary calls
        // after a streaming response (get_block_range) on the same client.
        let mut client = CompactTxStreamerClient::new(
            WebClient::new(self.lightwalletd_url.clone())
        );
        let tree_state = client
            .get_tree_state(BlockId { height: block_height.into(), hash: vec![] })
            .await
            .map_err(|e| JsError::new(&format!("get_tree_state({}): {e}", u64::from(block_height))))?;
        tree_state
            .into_inner()
            .to_chain_state()
            .map_err(|_| JsError::new("Bad tree state"))
    }

    fn read_balance(&self) -> Result<BalanceInfo, JsError> {
        use zcash_client_backend::data_api::wallet::ConfirmationsPolicy;
        let summary = self.db
            .get_wallet_summary(ConfirmationsPolicy::default())
            .map_err(|e| JsError::new(&format!("{e:?}")))?;

        if let Some(summary) = summary {
            // AccountBalance's aggregate accessors sum the Sapling, Orchard and
            // Ironwood pools (zcash_client_backend 0.24).
            let mut spendable: u64 = 0;
            let mut pending: u64 = 0;
            let mut locked: u64 = 0;
            for (_account_id, balance) in summary.account_balances() {
                spendable += u64::from(balance.spendable_value());
                pending += u64::from(balance.change_pending_confirmation())
                    + u64::from(balance.value_pending_spendability());
                // Value committed to an in-flight proposal. Always zero for this
                // view-only wallet, but `Balance::total` counts it since 0.24.
                locked += u64::from(balance.locked_value());
            }
            let total = spendable + pending + locked;
            Ok(BalanceInfo {
                spendable: types::u_zatoshis_to_zec(spendable),
                pending: types::u_zatoshis_to_zec(pending),
                total: types::u_zatoshis_to_zec(total),
            })
        } else {
            Ok(BalanceInfo { spendable: 0.0, pending: 0.0, total: 0.0 })
        }
    }

    fn to_proto(&self) -> Result<zcash_client_memory::proto::memwallet::MemoryWallet, JsError> {
        use prost::Message;
        let mut buf = Vec::new();
        self.db.encode(&mut buf)
            .map_err(|e| JsError::new(&format!("Failed to encode wallet: {:?}", e)))?;
        zcash_client_memory::proto::memwallet::MemoryWallet::decode(&buf[..])
            .map_err(|e| JsError::new(&format!("Failed to decode proto: {:?}", e)))
    }

    /// Prunes the nullifier map, which is most of the wallet's size.
    ///
    /// The memory wallet records every nullifier revealed in every scanned
    /// block (about 600 bytes per block since NU6.3) and never drops them. They
    /// are only consulted when a newly scanned note may have been spent in a
    /// block scanned earlier, which can't happen below the fully scanned height,
    /// so zcash_client_sqlite prunes them there too.
    fn compact(&mut self) -> Result<(), JsError> {
        let fully_scanned = self.db
            .block_fully_scanned()
            .map_err(|e| JsError::new(&format!("{e:?}")))?;
        let Some(fully_scanned) = fully_scanned else { return Ok(()) };
        let below = u32::from(fully_scanned.block_height())
            .saturating_sub(NULLIFIER_RETENTION_BLOCKS);
        if below < self.compacted_below + COMPACT_EVERY_BLOCKS {
            return Ok(());
        }

        let start = js_sys::Date::now();
        let mut wallet_proto = self.to_proto()?;
        let pruned = prune_nullifier_map(&mut wallet_proto, below);
        if pruned > 0 {
            self.db = MemoryWalletDb::new_from_proto(wallet_proto, MAIN_NETWORK, MAX_CHECKPOINTS)
                .map_err(|e| JsError::new(&format!("Failed to rebuild wallet: {e:?}")))?;
        }
        self.compacted_below = below;
        console_log!(
            "[zcash-wallet] Pruned {} nullifier map entries below {} in {:.0} ms",
            pruned,
            below,
            js_sys::Date::now() - start
        );
        Ok(())
    }

    fn build_summary(&self) -> Result<SyncSummary, JsError> {
        use zcash_client_backend::data_api::wallet::ConfirmationsPolicy;
        let balance = self.read_balance()?;
        let summary = self.db
            .get_wallet_summary(ConfirmationsPolicy::default())
            .map_err(|e| JsError::new(&format!("{e:?}")))?;
        let (fully_scanned_height, chain_tip_height, is_synced) = if let Some(ref s) = summary {
            (u64::from(s.fully_scanned_height()), u64::from(s.chain_tip_height()),
             s.fully_scanned_height() >= s.chain_tip_height())
        } else {
            (0, 0, false)
        };
        Ok(SyncSummary { fully_scanned_height, chain_tip_height, is_synced, balance })
    }
}

#[cfg(test)]
mod tests {
    use super::{prune_nullifier_map, sent_transactions_from_proto};
    use zcash_client_memory::proto::memwallet as proto;

    const SAPLING: i32 = proto::PoolType::ShieldedSapling as i32;
    const ORCHARD: i32 = proto::PoolType::ShieldedOrchard as i32;
    const IRONWOOD: i32 = proto::PoolType::ShieldedIronwood as i32;

    fn txid(n: u8) -> proto::TxId {
        proto::TxId { hash: vec![n; 32] }
    }

    fn note_id(pool: i32, tx: u8, idx: u32) -> proto::NoteId {
        proto::NoteId { tx_id: Some(txid(tx)), pool, output_index: idx }
    }

    fn received(pool: i32, tx: u8, idx: u32, value: u64, is_change: bool) -> proto::ReceivedNote {
        proto::ReceivedNote {
            note_id: Some(note_id(pool, tx, idx)),
            tx_id: Some(txid(tx)),
            output_index: idx,
            note: Some(proto::Note { value, ..Default::default() }),
            is_change,
            ..Default::default()
        }
    }

    fn spend(pool: i32, tx: u8, idx: u32, spending_tx: u8) -> proto::ReceivedNoteSpendRecord {
        proto::ReceivedNoteSpendRecord { note_id: Some(note_id(pool, tx, idx)), tx_id: Some(txid(spending_tx)) }
    }

    fn mined(tx: u8, height: u32) -> proto::TransactionTableRecord {
        proto::TransactionTableRecord {
            tx_id: Some(txid(tx)),
            tx_entry: Some(proto::TransactionEntry { mined_height: Some(height), ..Default::default() }),
        }
    }

    fn block(height: u32, time: u32) -> proto::WalletBlock {
        proto::WalletBlock { height, block_time: time, ..Default::default() }
    }

    fn amounts(wallet: &proto::MemoryWallet) -> Vec<(u8, u64, Option<u64>, u64)> {
        let mut v: Vec<_> = sent_transactions_from_proto(wallet)
            .into_iter()
            .map(|t| {
                let id = hex::decode(&t.txid).unwrap()[0];
                (id, (t.amount_zec * 1e8).round() as u64, t.block_height, t.timestamp)
            })
            .collect();
        v.sort();
        v
    }

    #[test]
    fn nets_spends_across_sapling_orchard_and_ironwood() {
        let wallet = proto::MemoryWallet {
            received_note_table: vec![
                // tx 1 (pre-NU6.3): Orchard note 1.0 ZEC, spent in tx 11 with 0.3 Orchard change
                received(ORCHARD, 1, 0, 100_000_000, false),
                received(ORCHARD, 11, 1, 30_000_000, true),
                // tx 2 (post-NU6.3 payout): Orchard note 0.5 spent in tx 12, change lands in Ironwood
                received(ORCHARD, 2, 0, 50_000_000, false),
                received(IRONWOOD, 12, 0, 20_000_000, true),
                // tx 3: Orchard and Ironwood outputs at the same index; both spent in tx 13
                received(ORCHARD, 3, 0, 10_000_000, false),
                received(IRONWOOD, 3, 0, 20_000_000, false),
                received(IRONWOOD, 13, 1, 5_000_000, true),
                // tx 4: Ironwood note spent in tx 14 without change
                received(IRONWOOD, 4, 2, 80_000_000, false),
                // tx 5: Sapling note spent in tx 15, Ironwood change
                received(SAPLING, 5, 0, 7_000_000, false),
                received(IRONWOOD, 15, 0, 1_000_000, true),
            ],
            received_note_spends: vec![
                spend(ORCHARD, 1, 0, 11),
                spend(ORCHARD, 2, 0, 12),
                spend(ORCHARD, 3, 0, 13),
                spend(IRONWOOD, 3, 0, 13),
                spend(IRONWOOD, 4, 2, 14),
                spend(SAPLING, 5, 0, 15),
            ],
            tx_table: vec![mined(12, 3_430_000), mined(14, 3_431_000)],
            blocks: vec![block(3_430_000, 1_785_000_000), block(3_431_000, 1_785_100_000)],
            ..Default::default()
        };
        assert_eq!(
            amounts(&wallet),
            vec![
                (11, 70_000_000, None, 0),
                (12, 30_000_000, Some(3_430_000), 1_785_000_000),
                (13, 25_000_000, None, 0),
                (14, 80_000_000, Some(3_431_000), 1_785_100_000),
                (15, 6_000_000, None, 0),
            ]
        );
    }

    #[test]
    fn orchard_to_ironwood_migration_is_not_a_payout() {
        let wallet = proto::MemoryWallet {
            received_note_table: vec![
                received(ORCHARD, 1, 0, 40_000_000, false),
                received(ORCHARD, 2, 0, 60_000_000, false),
                // Migration tx 21 re-shields everything to the wallet's own
                // *external* Ironwood address (is_change = false), minus the fee.
                received(IRONWOOD, 21, 0, 99_985_000, false),
                // A second migration tx 22 that moves 0.6 with an exact
                // self-output and no fee accounted to the wallet
                received(ORCHARD, 3, 0, 60_000_000, false),
                received(IRONWOOD, 22, 0, 60_000_000, true),
            ],
            received_note_spends: vec![
                spend(ORCHARD, 1, 0, 21),
                spend(ORCHARD, 2, 0, 21),
                spend(ORCHARD, 3, 0, 22),
            ],
            ..Default::default()
        };
        // Only the fee remains as net outflow; it can no longer masquerade as a
        // 1 ZEC payment (the previous change-only netting reported 1.0 ZEC).
        assert_eq!(amounts(&wallet), vec![(21, 15_000, None, 0)]);
    }

    #[test]
    fn prunes_nullifier_map_below_height() {
        let nullifier = |height| proto::NullifierRecord { block_height: height, ..Default::default() };
        let locator = |height| proto::TxLocatorRecord { block_height: height, ..Default::default() };
        let mut wallet = proto::MemoryWallet {
            nullifiers: vec![nullifier(99), nullifier(100), nullifier(150)],
            tx_locator: vec![locator(50), locator(100)],
            received_note_spends: vec![spend(ORCHARD, 1, 0, 2)],
            blocks: vec![block(99, 1), block(100, 2)],
            ..Default::default()
        };

        assert_eq!(prune_nullifier_map(&mut wallet, 100), 2);
        let heights = |w: &proto::MemoryWallet| -> (Vec<u32>, Vec<u32>) {
            (
                w.nullifiers.iter().map(|r| r.block_height).collect(),
                w.tx_locator.iter().map(|r| r.block_height).collect(),
            )
        };
        assert_eq!(heights(&wallet), (vec![100, 150], vec![100]));
        // Recorded spends and blocks are wallet history, not lookup tables
        assert_eq!(wallet.received_note_spends.len(), 1);
        assert_eq!(wallet.blocks.len(), 2);
        assert_eq!(prune_nullifier_map(&mut wallet, 100), 0);
    }
}
