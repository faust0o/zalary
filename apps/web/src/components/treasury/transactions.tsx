import { Button } from "@workspace/ui/components/button"
import { RefreshCw } from "lucide-react"
import { useMemo } from "react"
import { useAccountData } from "../../hooks/use-account-data"
import { useTreasuryWallet } from "../../hooks/use-treasury-wallet"
import { TransactionsView, type PaymentData } from "../views/transactions-view"

/** Payroll payments, settled by treasury spends. */
export function TreasuryTransactions() {
  const { runs } = useAccountData()
  const { sync, syncing, initialized, isCoordinator } = useTreasuryWallet()

  const payments = useMemo(
    () =>
      runs.flatMap((run) =>
        run.payments.map(
          (payment): PaymentData => ({
            id: payment.id,
            amountUsd: payment.amountUsd,
            amountZec: payment.amountZec,
            memo: payment.memo,
            status: run.status === "COMPLETED" ? "COMPLETED" : "PENDING",
            txHash: run.txid,
            createdAt: run.createdAt,
            employee: { name: payment.employeeName },
            payroll: { name: run.payrollName },
          })
        )
      ),
    [runs]
  )

  return (
    <TransactionsView
      payments={payments}
      loading={false}
      embedded
      resyncButton={
        isCoordinator && initialized ? (
          <Button variant="outline" onClick={() => sync()} disabled={syncing}>
            <RefreshCw
              className={`mr-1.5 size-4 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Resync Treasury"}
          </Button>
        ) : undefined
      }
    />
  )
}
