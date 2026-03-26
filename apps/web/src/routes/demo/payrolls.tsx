import { useNavigate } from "react-router-dom"
import { useDemo } from "../../components/demo-context"
import { PayrollsView } from "../../components/views/payrolls-view"
import { useTitle } from "../../hooks/use-title"
import { useZecPrice } from "../../hooks/use-zec-price"
import { DEMO_PAYROLLS, DEMO_WALLET_BALANCE } from "../../lib/demo-data"

export function DemoPayrollsPage() {
  useTitle("Payrolls")
  const navigate = useNavigate()
  const { promptLogin } = useDemo()
  const { price: zecPrice } = useZecPrice()

  return (
    <PayrollsView
      payrolls={DEMO_PAYROLLS}
      walletBalance={DEMO_WALLET_BALANCE}
      zecPrice={zecPrice}
      loading={false}
      onDisburse={() => promptLogin()}
      onCreatePayroll={() => promptLogin()}
      onNavigate={(path) => navigate(`/demo${path}`)}
      onEditPayroll={() => promptLogin()}
    />
  )
}
