import type { SentTransaction } from "./zcash-wallet"

export interface PendingPayment {
  id: string
  amountZec: number
  createdAt: string // ISO timestamp
  payrollName: string
}

export interface MatchResult {
  paymentId: string
  txHash: string
  confidence: "high" | "medium"
}

const AMOUNT_TOLERANCE = 0.0001 // ZEC

/**
 * Match on-chain sent transactions to pending payroll payments.
 *
 * Matching criteria:
 * 1. Amount: tx.amount_zec ≈ payment.amountZec (within tolerance)
 * 2. Timing: tx.timestamp >= payment.createdAt
 * 3. Memo: tx.memo contains payroll name (from QR URI message param)
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

    // Find best matching transaction
    let bestMatch: { tx: SentTransaction; confidence: "high" | "medium" } | null = null

    for (const tx of sentTxs) {
      if (matchedTxIds.has(tx.txid)) continue

      // Must be after payment was created
      if (tx.timestamp < paymentCreatedAt) continue

      // Amount must match within tolerance
      if (Math.abs(tx.amount_zec - payment.amountZec) > AMOUNT_TOLERANCE) continue

      // Check memo for payroll name
      const memoMatch =
        tx.memo != null &&
        tx.memo.toLowerCase().includes(payment.payrollName.toLowerCase())

      const confidence = memoMatch ? "high" : "medium"

      // Prefer high confidence matches
      if (!bestMatch || confidence === "high") {
        bestMatch = { tx, confidence }
        if (confidence === "high") break // perfect match, stop searching
      }
    }

    if (bestMatch) {
      results.push({
        paymentId: payment.id,
        txHash: bestMatch.tx.txid,
        confidence: bestMatch.confidence,
      })
      matchedTxIds.add(bestMatch.tx.txid)
      matchedPaymentIds.add(payment.id)
    }
  }

  return results
}
