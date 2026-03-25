mod types;

use std::cell::UnsafeCell;
use std::collections::BTreeMap;

use futures_util::TryStreamExt;
use tonic_web_wasm_client::Client as WebClient;
use wasm_bindgen::prelude::*;

use zcash_client_backend::{
    data_api::{
        AccountPurpose, AccountBirthday, WalletRead, WalletWrite, WalletCommitmentTrees,
        chain::{BlockCache, BlockSource, error},
        scanning::ScanRange,
    },
    proto::{
        compact_formats::CompactBlock,
        service::{
            self, compact_tx_streamer_client::CompactTxStreamerClient, BlockId, ChainSpec,
        },
    },
};
use zcash_client_memory::MemoryWalletDb;
use zcash_keys::keys::UnifiedFullViewingKey;
use zcash_primitives::merkle_tree::HashSer;
use zcash_protocol::consensus::{self, BlockHeight, MainNetwork, MAIN_NETWORK};

use sapling_crypto;

use types::{BalanceInfo, SyncSummary};

const MAX_CHECKPOINTS: usize = 100;
// Blocks are scanned one at a time because crossbeam_channel in BatchRunner
// deadlocks on WASM without SharedArrayBuffer. We download in larger chunks
// to reduce gRPC round-trips, then scan each block individually.
const DOWNLOAD_CHUNK: u32 = 500;

macro_rules! console_log {
    ($($t:tt)*) => {
        web_sys::console::log_1(&format!($($t)*).into())
    }
}

pub use wasm_bindgen_rayon::init_thread_pool;

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
        Ok(ZcashViewWallet { db, cache, client, lightwalletd_url: lightwalletd_url.to_string() })
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
        Ok(ZcashViewWallet { db, cache, client, lightwalletd_url: lightwalletd_url.to_string() })
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
        console_log!("[zcash-wallet] Fetching sapling subtree roots...");
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
    /// 3. Subtract change notes (`is_change = true`) received in the same tx
    /// 4. The difference (minus fee) is the net amount sent
    #[wasm_bindgen(js_name = "getSentTransactions")]
    pub fn get_sent_transactions(&self) -> Result<JsValue, JsError> {
        use prost::Message;
        use std::collections::HashMap;
        use zcash_client_memory::proto::memwallet as proto;

        let mut buf = Vec::new();
        self.db.encode(&mut buf)
            .map_err(|e| JsError::new(&format!("Failed to encode wallet: {:?}", e)))?;

        let wallet_proto = proto::MemoryWallet::decode(&buf[..])
            .map_err(|e| JsError::new(&format!("Failed to decode proto: {:?}", e)))?;

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

        // Index received notes by note_id key (pool, tx_id, output_index) → value
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

        // Track per-tx: total change received back
        let mut change_per_tx: HashMap<Vec<u8>, u64> = HashMap::new();
        for note in &wallet_proto.received_note_table {
            if note.is_change {
                if let Some(ref tx_id) = note.tx_id {
                    let value = note.note.as_ref().map(|n| n.value).unwrap_or(0);
                    *change_per_tx.entry(tx_id.hash.clone()).or_insert(0) += value;
                }
            }
        }

        // Build sent transactions: net sent = spent - change
        let mut txs: Vec<types::SentTransaction> = Vec::new();
        for (txid_bytes, total_spent) in &spent_per_tx {
            let change = change_per_tx.get(txid_bytes).copied().unwrap_or(0);
            if total_spent <= &change {
                continue; // No net outflow (e.g. self-send or shielding)
            }
            let net_sent = total_spent - change;
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

// Private helpers
impl ZcashViewWallet {
    async fn update_subtree_roots(&mut self) -> Result<(), JsError> {
        let err = |msg: String| JsError::new(&msg);

        // Sapling
        let mut request = service::GetSubtreeRootsArg::default();
        request.set_shielded_protocol(service::ShieldedProtocol::Sapling);
        let sapling_roots: Vec<zcash_client_backend::data_api::chain::CommitmentTreeRoot<sapling_crypto::Node>> = self.client
            .get_subtree_roots(request)
            .await
            .map_err(|e| err(format!("get_subtree_roots (sapling): {e}")))?
            .into_inner()
            .and_then(|root| async move {
                let root_hash = sapling_crypto::Node::read(&root.root_hash[..])?;
                Ok(zcash_client_backend::data_api::chain::CommitmentTreeRoot::from_parts(
                    BlockHeight::from_u32(root.completing_block_height as u32),
                    root_hash,
                ))
            })
            .try_collect()
            .await
            .map_err(|e| err(format!("sapling roots stream: {e}")))?;
        console_log!("[zcash-wallet]   {} sapling subtree roots", sapling_roots.len());
        self.db.put_sapling_subtree_roots(0, &sapling_roots).map_err(|e| err(format!("{e:?}")))?;

        // Orchard
        #[cfg(feature = "orchard")]
        {
            use orchard::tree::MerkleHashOrchard;
            let mut request = service::GetSubtreeRootsArg::default();
            request.set_shielded_protocol(service::ShieldedProtocol::Orchard);
            let orchard_roots: Vec<zcash_client_backend::data_api::chain::CommitmentTreeRoot<MerkleHashOrchard>> = self.client
                .get_subtree_roots(request)
                .await
                .map_err(|e| err(format!("get_subtree_roots (orchard): {e}")))?
                .into_inner()
                .and_then(|root| async move {
                    let root_hash = MerkleHashOrchard::read(&root.root_hash[..])?;
                    Ok(zcash_client_backend::data_api::chain::CommitmentTreeRoot::from_parts(
                        BlockHeight::from_u32(root.completing_block_height as u32),
                        root_hash,
                    ))
                })
                .try_collect()
                .await
                .map_err(|e| err(format!("orchard roots stream: {e}")))?;
            console_log!("[zcash-wallet]   {} orchard subtree roots", orchard_roots.len());
            self.db.put_orchard_subtree_roots(0, &orchard_roots).map_err(|e| err(format!("{e:?}")))?;
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
                pool_types: vec![],
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

        console_log!(
            "[zcash-wallet]   Downloaded {} blocks ({}..{})",
            all_blocks.len(),
            u64::from(range_start),
            u64::from(range_end - 1)
        );

        // Insert all blocks into cache
        let _ = self.cache.insert(all_blocks).await;
        console_log!("[zcash-wallet]   Scanning...");

        // Scan entire batch at once
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
            scan_range.len(),
            elapsed / 1000.0,
            scan_range.len() as f64 / (elapsed / 1000.0).max(0.001)
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
            let mut spendable: u64 = 0;
            let mut pending: u64 = 0;
            for (_account_id, balance) in summary.account_balances() {
                spendable += u64::from(balance.spendable_value());
                pending += u64::from(balance.change_pending_confirmation())
                    + u64::from(balance.value_pending_spendability());
            }
            let total = spendable + pending;
            Ok(BalanceInfo {
                spendable: types::u_zatoshis_to_zec(spendable),
                pending: types::u_zatoshis_to_zec(pending),
                total: types::u_zatoshis_to_zec(total),
            })
        } else {
            Ok(BalanceInfo { spendable: 0.0, pending: 0.0, total: 0.0 })
        }
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
