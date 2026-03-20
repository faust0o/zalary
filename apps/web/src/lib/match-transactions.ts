import type { SentTransaction } from "./zcash-wallet"

export interface PendingPayment {
  id: string
  amountZec: number
  memo: string
}

export interface MatchResult {
  paymentId: string
  txHash: string
}

/**
 * Match on-chain sent transactions to pending payroll payments by memo.
 *
 * Each payment carries a unique memo (e.g. "zalary:abc123") that is embedded
 * in the Zcash transaction. A match requires the transaction memo to contain
 * the payment memo exactly.
 *
 * Each transaction and payment are matched at most once.
 */
export function matchTransactionsToPayments(
  sentTxs: SentTransaction[],
  pendingPayments: PendingPayment[]
): MatchResult[] {
  const results: MatchResult[] = []
  const matchedTxIds = new Set<string>()

  for (const payment of pendingPayments) {
    for (const tx of sentTxs) {
      if (matchedTxIds.has(tx.txid)) continue
      if (!tx.memo) continue

      if (tx.memo.includes(payment.memo)) {
        results.push({
          paymentId: payment.id,
          txHash: tx.txid,
        })
        matchedTxIds.add(tx.txid)
        break
      }
    }
  }

  return results
}
