import { useQuery } from "@apollo/client/react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { DisburseModal } from "../components/disburse-modal/disburse-modal"
import { PayrollsView } from "../components/views/payrolls-view"
import { PayrollsDocument } from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { useZcashWallet } from "../hooks/use-zcash-wallet"
import { useZecPrice } from "../hooks/use-zec-price"

export function PayrollsPage() {
  useTitle("Payrolls")
  const navigate = useNavigate()
  const { data, loading } = useQuery(PayrollsDocument)
  const { balance: walletBalance } = useZcashWallet()
  const { price: zecPrice } = useZecPrice()
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [disbursePayrollId, setDisbursePayrollId] = useState<string | null>(null)

  const payrolls = (data as { payrolls?: typeof data })?.payrolls ?? []
  const zecBalance = walletBalance?.total ?? 0

  return (
    <>
      <PayrollsView
        payrolls={payrolls as never}
        walletBalance={zecBalance}
        zecPrice={zecPrice}
        loading={loading}
        onDisburse={(payrollId) => {
          if (payrollId) setDisbursePayrollId(payrollId)
          setDisburseOpen(true)
        }}
        onCreatePayroll={() => navigate("/payrolls/new")}
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
