import { useMutation, useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import { RefreshCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { TransactionsView } from "../components/views/transactions-view"
import type { PaymentData } from "../components/views/transactions-view"
import {
  PaymentsDocument,
  UpdatePaymentStatusDocument,
} from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { useZcashWallet } from "../hooks/use-zcash-wallet"
import { matchTransactionsToPayments } from "../lib/match-transactions"

export function TransactionsPage() {
  useTitle("Transactions")
  const { data, loading, refetch } = useQuery(PaymentsDocument)
  const [updatePaymentStatus] = useMutation(UpdatePaymentStatusDocument)
  const { sync, getSentTxs, initialized: walletReady, syncing } = useZcashWallet()
  const [resyncing, setResyncing] = useState(false)

  const allPayments: PaymentData[] = (data as { payments?: PaymentData[] })?.payments ?? []

  async function matchPayments() {
    const sentTxs = await getSentTxs()
    const pendingPayments = allPayments
      .filter((p) => p.status === "PENDING")
      .map((p) => ({
        id: p.id,
        amountZec: p.amountZec,
        createdAt: p.createdAt,
      }))

    if (!pendingPayments.length || !sentTxs.length) return 0

    const matches = matchTransactionsToPayments(sentTxs, pendingPayments)

    for (const match of matches) {
      await updatePaymentStatus({
        variables: {
          paymentId: match.paymentId,
          status: "COMPLETED" as never,
          txHash: match.txHash,
        },
      })
    }

    if (matches.length > 0) await refetch()
    return matches.length
  }

  async function handleResync() {
    setResyncing(true)
    try {
      await sync()
      await matchPayments()
    } catch (e) {
      console.error("Resync failed:", e)
    } finally {
      setResyncing(false)
    }
  }

  // Auto-match pending payments when wallet data becomes available
  const hasAutoMatched = useRef(false)
  useEffect(() => {
    if (!walletReady || syncing || !allPayments.length || hasAutoMatched.current) return
    const hasPending = allPayments.some((p) => p.status === "PENDING")
    if (!hasPending) return

    hasAutoMatched.current = true
    matchPayments().then((count) => {
      if (count > 0) {
        console.log(`[transactions] Auto-matched ${count} payments`)
      }
    })
  }, [walletReady, syncing, allPayments])

  const resyncButton = walletReady ? (
    <Button
      variant="outline"
      onClick={handleResync}
      disabled={resyncing || syncing}
    >
      <RefreshCw className={`mr-1.5 size-4 ${resyncing ? "animate-spin" : ""}`} />
      {resyncing ? "Syncing..." : "Resync Wallet"}
    </Button>
  ) : undefined

  return (
    <TransactionsView
      payments={allPayments}
      loading={loading}
      resyncButton={resyncButton}
    />
  )
}
