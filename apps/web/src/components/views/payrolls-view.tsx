import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Banknote, Calendar, Plus } from "lucide-react"
import { useMemo } from "react"
import { PayrollCard } from "../payroll-card"
import { getNextDueDate } from "../../lib/payroll-utils"

export interface PayrollsPayroll {
  id: string
  name: string
  schedule: string
  customDays?: number | null
  employees: {
    employeeId: string
    employee: { id: string; name: string; salaryAmount: number }
  }[]
  runs: {
    id: string
    status: string
    createdAt: string
  }[]
}

export interface PayrollsViewProps {
  payrolls: PayrollsPayroll[]
  /** Null when unknown, e.g. for delegates, who have no wallet. */
  walletBalance: number | null
  zecPrice: number | null
  loading: boolean
  onDisburse?: (payrollId: string | null) => void
  onCreatePayroll?: () => void
  onNavigate: (path: string) => void
  onEditPayroll?: (payrollId: string) => void
}

export function PayrollsView({
  payrolls,
  walletBalance,
  zecPrice,
  loading,
  onDisburse,
  onCreatePayroll,
  onEditPayroll,
}: PayrollsViewProps) {
  const totalSettlementUsd = useMemo(
    () =>
      payrolls.reduce(
        (sum, p) =>
          sum + p.employees.reduce((s, pe) => s + pe.employee.salaryAmount, 0),
        0
      ),
    [payrolls]
  )

  const totalSettlementZec = useMemo(() => {
    if (!zecPrice) return null
    return totalSettlementUsd / zecPrice
  }, [totalSettlementUsd, zecPrice])

  const hasSufficientFunds =
    totalSettlementZec !== null &&
    walletBalance !== null &&
    walletBalance >= totalSettlementZec

  const totalRecipients = useMemo(() => {
    const ids = new Set<string>()
    payrolls.forEach((p) => p.employees.forEach((pe) => ids.add(pe.employeeId)))
    return ids.size
  }, [payrolls])

  const pendingPayrolls = useMemo(
    () => payrolls.filter((p) => {
      const lastRun = p.runs[0]
      if (!lastRun || lastRun.status !== "COMPLETED") return true
      const nextDue = getNextDueDate(p.schedule, p.customDays, new Date(lastRun.createdAt))
      return nextDue <= new Date()
    }),
    [payrolls]
  )
  const completedPayrolls = useMemo(
    () => payrolls.filter((p) => {
      const lastRun = p.runs[0]
      if (!lastRun || lastRun.status !== "COMPLETED") return false
      const nextDue = getNextDueDate(p.schedule, p.customDays, new Date(lastRun.createdAt))
      return nextDue > new Date()
    }),
    [payrolls]
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-light tracking-tight">Payrolls</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCreatePayroll}>
            <Plus className="mr-2 size-4" />
            Create Payroll
          </Button>
          <Button onClick={() => onDisburse?.(null)}>
            <Banknote className="mr-2 size-4" />
            Disburse
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-8">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Total Settlement Required
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-6xl font-light tracking-tight">
              {totalSettlementUsd.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-2xl font-light text-muted-foreground">
              USD
            </span>
          </div>
          <Separator className="my-6" />
          <div className="flex gap-12">
            <div>
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Recipients
              </p>
              <p className="mt-1 text-xl font-light">
                {totalRecipients}
              </p>
            </div>
            {walletBalance !== null && (
              <>
                <div>
                  <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    ZEC Balance
                  </p>
                  <p className="mt-1 text-xl font-light">
                    {walletBalance.toFixed(4)} ZEC
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Status
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold ${hasSufficientFunds ? "text-green-600" : "text-red-600"}`}
                  >
                    {hasSufficientFunds
                      ? "Sufficient Funds"
                      : "Insufficient Funds"}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading payrolls...</p>
      ) : payrolls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No payrolls yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first payroll schedule.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pendingPayrolls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Pending
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {pendingPayrolls.map((payroll) => {
                  const lastRun = payroll.runs[0]
                  return (
                    <PayrollCard
                      key={payroll.id}
                      payrollId={payroll.id}
                      name={payroll.name}
                      totalUsd={payroll.employees.reduce((sum, pe) => sum + pe.employee.salaryAmount, 0)}
                      employeeCount={payroll.employees.length}
                      dueDate={getNextDueDate(payroll.schedule, payroll.customDays, lastRun ? new Date(lastRun.createdAt) : null)}
                      completed={false}
                      onClick={() => onDisburse?.(payroll.id)}
                      onEdit={onEditPayroll ? () => onEditPayroll(payroll.id) : undefined}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {completedPayrolls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Completed
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {completedPayrolls.map((payroll) => {
                  const lastRun = payroll.runs[0]
                  return (
                    <PayrollCard
                      key={payroll.id}
                      payrollId={payroll.id}
                      name={payroll.name}
                      totalUsd={payroll.employees.reduce((sum, pe) => sum + pe.employee.salaryAmount, 0)}
                      employeeCount={payroll.employees.length}
                      dueDate={getNextDueDate(payroll.schedule, payroll.customDays, lastRun ? new Date(lastRun.createdAt) : null)}
                      completed={true}
                      onEdit={onEditPayroll ? () => onEditPayroll(payroll.id) : undefined}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
