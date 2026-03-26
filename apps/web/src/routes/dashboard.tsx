import { useQuery } from "@apollo/client/react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { DisburseModal } from "../components/disburse-modal/disburse-modal"
import { DashboardView } from "../components/views/dashboard-view"
import { DashboardStatsDocument } from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { useZecPrice } from "../hooks/use-zec-price"

export function DashboardPage() {
  useTitle("Dashboard")
  const { data, loading } = useQuery(DashboardStatsDocument)
  const navigate = useNavigate()
  const { price: zecPrice } = useZecPrice()
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [disbursePayrollId, setDisbursePayrollId] = useState<string | null>(null)

  const stats = data?.dashboardStats ?? null
  const payrolls = useMemo(() => data?.payrolls ?? [], [data?.payrolls])

  return (
    <>
      <DashboardView
        payrolls={payrolls}
        stats={stats}
        loading={loading}
        zecPrice={zecPrice}
        onDisburse={(payrollId) => {
          setDisbursePayrollId(payrollId)
          setDisburseOpen(true)
        }}
        onNavigate={(path) => navigate(path)}
      />
      <DisburseModal
        open={disburseOpen}
        onOpenChange={(open) => {
          setDisburseOpen(open)
          if (!open) setDisbursePayrollId(null)
        }}
        initialPayrollId={disbursePayrollId}
      />
    </>
  )
}
