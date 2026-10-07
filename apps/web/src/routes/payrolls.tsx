import { useQuery } from "@apollo/client/react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { DisburseModal } from "../components/disburse-modal/disburse-modal"
import { PayrollsView } from "../components/views/payrolls-view"
import { MeLayoutDocument } from "../graphql/__generated__/graphql"
import { useAccountData } from "../hooks/use-account-data"
import { useTitle } from "../hooks/use-title"
import { useTreasuryWallet } from "../hooks/use-treasury-wallet"
import { useZecPrice } from "../hooks/use-zec-price"
import { payrollsWithDetails } from "../lib/payroll-records"

export function PayrollsPage() {
  useTitle("Payrolls")
  const navigate = useNavigate()
  const { payrolls, employees, runs, canEdit } = useAccountData()
  const { data: meData } = useQuery(MeLayoutDocument)
  const { displayBalance } = useTreasuryWallet()
  const { price: zecPrice } = useZecPrice()
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [disbursePayrollId, setDisbursePayrollId] = useState<string | null>(
    null
  )

  const detailed = useMemo(
    () => payrollsWithDetails(payrolls, employees, runs),
    [payrolls, employees, runs]
  )
  const hasTreasury = meData?.treasury?.status === "ACTIVE"

  return (
    <>
      <PayrollsView
        payrolls={detailed}
        treasuryBalance={hasTreasury ? displayBalance : null}
        zecPrice={zecPrice}
        loading={false}
        onDisburse={(payrollId) => {
          // The owner sets the treasury up first. Everyone else gets the
          // dialog, which says what's missing (only the coordinator can pay).
          if (!hasTreasury && meData?.me?.isAccountOwner) {
            navigate("/treasury")
            return
          }
          if (payrollId) setDisbursePayrollId(payrollId)
          setDisburseOpen(true)
        }}
        onCreatePayroll={canEdit ? () => navigate("/payrolls/new") : undefined}
        onNavigate={(path) => navigate(path)}
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
