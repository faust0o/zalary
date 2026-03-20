import type { SentTransaction } from "./zcash-wallet"

export interface PendingPayment {
  id: string
  amountZec: number
  createdAt: string // ISO timestamp
}

export interface MatchResult {
  paymentId: string
  txHash: string
}

const AMOUNT_TOLERANCE = 0.0001 // ZEC

/**
 * Match on-chain sent transactions to pending payroll payments.
 *
 * With a view-only wallet we cannot decrypt the recipient's memo, so
 * matching is based on:
 * 1. Amount: tx net outflow ≈ payment.amountZec (within tolerance)
 * 2. Timing: tx.timestamp >= payment.createdAt
 *
 * Each transaction and payment are matched at most once.
 */
export function matchTransactionsToPayments(
  sentTxs: SentTransaction[],
  pendingPayments: PendingPayment[]
): MatchResult[] {
  const results: MatchResult[] = []
  const matchedTxIds = new Set<string>()
  const matchedPaymentIds = new Set<string>()

  // Sort payments by creation time (oldest first) for deterministic matching
  const sortedPayments = [...pendingPayments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  for (const payment of sortedPayments) {
    if (matchedPaymentIds.has(payment.id)) continue

    const paymentCreatedAt = new Date(payment.createdAt).getTime() / 1000 // unix seconds

    for (const tx of sentTxs) {
      if (matchedTxIds.has(tx.txid)) continue

      // Must be after payment was created
      if (tx.timestamp < paymentCreatedAt) continue

      // Amount must match within tolerance
      if (Math.abs(tx.amount_zec - payment.amountZec) > AMOUNT_TOLERANCE) continue

      results.push({
        paymentId: payment.id,
        txHash: tx.txid,
      })
      matchedTxIds.add(tx.txid)
      matchedPaymentIds.add(payment.id)
      break
    }
  }

  return results
}
