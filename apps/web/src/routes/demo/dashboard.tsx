import { Button } from "@workspace/ui/components/button"
import { useNavigate } from "react-router-dom"
import { useDemo } from "../../components/demo-context"
import { DashboardView } from "../../components/views/dashboard-view"
import { useTitle } from "../../hooks/use-title"
import { useZecPrice } from "../../hooks/use-zec-price"
import { DEMO_PAYROLLS, DEMO_ZEC_SPENT_BY_MONTH } from "../../lib/demo-data"

export function DemoDashboardPage() {
  useTitle("Dashboard")
  const navigate = useNavigate()
  const { promptLogin } = useDemo()
  const { price: zecPrice } = useZecPrice()

  return (
    <DashboardView
      payrolls={DEMO_PAYROLLS}
      stats={{ zecSpentByMonth: DEMO_ZEC_SPENT_BY_MONTH }}
      loading={false}
      zecPrice={zecPrice}
      onDisburse={() => promptLogin()}
      onNavigate={(path) => navigate(`/demo${path}`)}
      onEditPayroll={() => promptLogin()}
      headerAction={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={() => navigate("/login")}>
            Log in
          </Button>
          <Button size="md" onClick={() => navigate("/login")}>
            Sign up
          </Button>
        </div>
      }
    />
  )
}
