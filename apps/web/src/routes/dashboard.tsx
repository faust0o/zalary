import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { DisburseModal } from "../components/disburse-modal/disburse-modal"
import { DashboardView } from "../components/views/dashboard-view"
import { WalkthroughCard } from "../components/walkthrough"
import { useAccountData } from "../hooks/use-account-data"
import { useTitle } from "../hooks/use-title"
import { useWalkthrough } from "../hooks/use-walkthrough"
import { useZecPrice } from "../hooks/use-zec-price"
import { payrollsWithDetails, zecSpentByMonth } from "../lib/payroll-records"

export function DashboardPage() {
  useTitle("Dashboard")
  const { payrolls, employees, runs } = useAccountData()
  const navigate = useNavigate()
  const { price: zecPrice } = useZecPrice()
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [disbursePayrollId, setDisbursePayrollId] = useState<string | null>(null)
  // The layout's floating Walkthrough is always mounted and polls for us
  const walkthrough = useWalkthrough()

  const detailed = useMemo(
    () => payrollsWithDetails(payrolls, employees, runs),
    [payrolls, employees, runs]
  )
  const stats = useMemo(
    () => ({ zecSpentByMonth: zecSpentByMonth(runs) }),
    [runs]
  )

  return (
    <>
      <DashboardView
        payrolls={detailed}
        stats={stats}
        loading={false}
        zecPrice={zecPrice}
        onDisburse={(payrollId) => {
          setDisbursePayrollId(payrollId)
          setDisburseOpen(true)
        }}
        onNavigate={(path) => navigate(path)}
        tutorial={
          walkthrough?.onDashboard ? (
            <WalkthroughCard
              steps={walkthrough.steps}
              completedCount={walkthrough.completedCount}
            />
          ) : undefined
        }
      />
      <DisburseModal
        open={disburseOpen}
        onOpenChange={(open) => {
          setDisburseOpen(open)
          if (!open) setDisbursePayrollId(null)
        }}
        initialPayrollId={disbursePayrollId}
        onProposed={() => navigate("/treasury?tab=approvals")}
      />
    </>
  )
}
