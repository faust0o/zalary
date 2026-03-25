use serde::Serialize;

/// Balance information returned to JavaScript
#[derive(Serialize)]
pub struct BalanceInfo {
    /// Spendable balance in ZEC
    pub spendable: f64,
    /// Pending (unconfirmed) balance in ZEC
    pub pending: f64,
    /// Total balance in ZEC (spendable + pending)
    pub total: f64,
}

/// Sync progress/summary returned to JavaScript
#[derive(Serialize)]
pub struct SyncSummary {
    pub fully_scanned_height: u64,
    pub chain_tip_height: u64,
    pub is_synced: bool,
    pub balance: BalanceInfo,
}

/// A sent transaction, used for matching against payroll payments
#[derive(Serialize)]
pub struct SentTransaction {
    /// Transaction ID as hex string
    pub txid: String,
    /// Amount sent in ZEC (positive)
    pub amount_zec: f64,
    /// Memo text (if any)
    pub memo: Option<String>,
    /// Block height (None if unconfirmed)
    pub block_height: Option<u64>,
    /// Unix timestamp
    pub timestamp: u64,
}

/// Convert zatoshis (u64) to ZEC (f64)
pub fn u_zatoshis_to_zec(zatoshis: u64) -> f64 {
    zatoshis as f64 / 100_000_000.0
}
