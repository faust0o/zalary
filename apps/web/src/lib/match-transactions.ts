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

// A tx's net outflow includes its fee: 5,000 zats per logical action (ZIP 317),
// at least 10,000. Since NU6.3 a payment funded from Orchard notes pays for both
// its Orchard spends and its Ironwood outputs, so 20,000+ is common. This allows
// up to 20 actions.
const MAX_FEE_ZATS = 100_000
// Block times may trail wall-clock time
const BLOCK_TIME_SLACK_SECONDS = 30 * 60

const toZats = (zec: number) => Math.round(zec * 1e8)

/**
 * Match on-chain sent transactions to pending payroll payments.
 *
 * With a view-only wallet we cannot decrypt the recipient's memo, so
 * matching is based on:
 * 1. Amount: tx net outflow = payment.amountZec + a fee of at most MAX_FEE_ZATS
 * 2. Timing: tx.timestamp >= payment.createdAt (with some slack)
 *
 * Each payment takes the tx whose amount fits best, and each transaction and
 * payment are matched at most once.
 */
export function matchTransactionsToPayments(
  sentTxs: SentTransaction[],
  pendingPayments: PendingPayment[]
): MatchResult[] {
  console.log(
    `[match] Matching ${sentTxs.length} sent txs against ${pendingPayments.length} pending payments`
  )
  for (const tx of sentTxs) {
    console.log(
      `[match]   tx: ${tx.txid.slice(0, 12)}... amount=${tx.amount_zec} timestamp=${tx.timestamp} height=${tx.block_height}`
    )
  }
  for (const p of pendingPayments) {
    console.log(
      `[match]   payment: ${p.id.slice(0, 8)}... amount=${p.amountZec} created=${p.createdAt}`
    )
  }

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
    const paymentZats = toZats(payment.amountZec)

    let best: { tx: SentTransaction; feeZats: number } | null = null
    for (const tx of sentTxs) {
      if (matchedTxIds.has(tx.txid)) continue

      const timeDiff = tx.timestamp - paymentCreatedAt
      const feeZats = toZats(tx.amount_zec) - paymentZats

      // Must be after payment was created
      if (timeDiff < -BLOCK_TIME_SLACK_SECONDS) {
        console.log(
          `[match]   SKIP ${tx.txid.slice(0, 8)} for ${payment.id.slice(0, 8)}: tx too early (diff=${timeDiff.toFixed(0)}s)`
        )
        continue
      }

      // Amount must be the payment plus a plausible fee
      if (feeZats < 0 || feeZats > MAX_FEE_ZATS) {
        console.log(
          `[match]   SKIP ${tx.txid.slice(0, 8)} for ${payment.id.slice(0, 8)}: amount mismatch (tx=${tx.amount_zec} payment=${payment.amountZec} fee=${feeZats} zats)`
        )
        continue
      }

      if (!best || feeZats < best.feeZats) best = { tx, feeZats }
    }

    if (best) {
      console.log(
        `[match]   MATCH ${best.tx.txid.slice(0, 8)} -> ${payment.id.slice(0, 8)} (amount=${best.tx.amount_zec}, fee=${best.feeZats} zats)`
      )
      results.push({
        paymentId: payment.id,
        txHash: best.tx.txid,
      })
      matchedTxIds.add(best.tx.txid)
      matchedPaymentIds.add(payment.id)
    }
  }

  console.log(`[match] Result: ${results.length} matches`)
  return results
}
