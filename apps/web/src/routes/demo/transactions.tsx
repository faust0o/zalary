import { TransactionsView } from "../../components/views/transactions-view"
import { useTitle } from "../../hooks/use-title"
import { DEMO_PAYMENTS } from "../../lib/demo-data"

export function DemoTransactionsPage() {
  useTitle("Transactions")

  return (
    <TransactionsView
      payments={DEMO_PAYMENTS}
      loading={false}
    />
  )
}
