import { useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import {
  AlertTriangle,
  Banknote,
  Calendar,
  Check,
  Pencil,
  Plus,
  Users,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { DisburseModal } from "../components/disburse-modal/disburse-modal"
import {
  PayrollsDocument,
  ZecBalanceDocument,
} from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { useZecPrice } from "../hooks/use-zec-price"

function getNextDueDate(schedule: string, customDays?: number | null): Date {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const next = new Date(startOfMonth)

  switch (schedule) {
    case "EVERY_TWO_WEEKS":
      while (next <= now) next.setDate(next.getDate() + 14)
      break
    case "EVERY_MONTH":
      while (next <= now) next.setMonth(next.getMonth() + 1)
      break
    case "EVERY_X_DAYS": {
      const days = customDays ?? 30
      while (next <= now) next.setDate(next.getDate() + days)
      break
    }
  }
  return next
}

function formatDueDate(date: Date): string {
  const now = new Date()
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays <= 0) return "today"
  if (diffDays === 1) return "in 1 day"
  return `in ${diffDays} days`
}

interface Payroll {
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

/** A payroll is "completed" for the current period if its most recent run is COMPLETED. */
function isPayrollCompleted(payroll: Payroll): boolean {
  if (payroll.runs.length === 0) return false
  return payroll.runs[0].status === "COMPLETED"
}

export function PayrollsPage() {
  useTitle("Payrolls")
  const navigate = useNavigate()
  const { data, loading } = useQuery(PayrollsDocument)
  const { data: balanceData } = useQuery(ZecBalanceDocument)
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [disbursePayrollId, setDisbursePayrollId] = useState<string | null>(
    null
  )

  const payrolls: Payroll[] = (data as { payrolls?: Payroll[] })?.payrolls ?? []
  const zecBalance = balanceData?.zecBalance?.available ?? 0

  const totalSettlementUsd = useMemo(
    () =>
      payrolls.reduce(
        (sum, p) =>
          sum + p.employees.reduce((s, pe) => s + pe.employee.salaryAmount, 0),
        0
      ),
    [payrolls]
  )

  const { price: zecPrice } = useZecPrice()

  const totalSettlementZec = useMemo(() => {
    if (!zecPrice) return null
    return totalSettlementUsd / zecPrice
  }, [totalSettlementUsd, zecPrice])

  const hasSufficientFunds =
    totalSettlementZec !== null && zecBalance >= totalSettlementZec

  const totalRecipients = useMemo(() => {
    const ids = new Set<string>()
    payrolls.forEach((p) => p.employees.forEach((pe) => ids.add(pe.employeeId)))
    return ids.size
  }, [payrolls])

  const pendingPayrolls = useMemo(
    () => payrolls.filter((p) => !isPayrollCompleted(p)),
    [payrolls]
  )
  const completedPayrolls = useMemo(
    () => payrolls.filter((p) => isPayrollCompleted(p)),
    [payrolls]
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-light tracking-tight">Payrolls</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/payrolls/new")}>
            <Plus className="mr-2 size-4" />
            Create Payroll
          </Button>
          <Button onClick={() => setDisburseOpen(true)}>
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
            <div>
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                ZEC Balance
              </p>
              <p className="mt-1 text-xl font-light">
                {zecBalance.toFixed(4)} ZEC
              </p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Status
              </p>
              <p
                className={`mt-1 text-xl font-semibold ${hasSufficientFunds ? "text-green-600" : "text-red-600"}`}
              >
                {hasSufficientFunds ? "Sufficient Funds" : "Insufficient Funds"}
              </p>
            </div>
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
                  const totalUsd = payroll.employees.reduce(
                    (sum, pe) => sum + pe.employee.salaryAmount,
                    0
                  )
                  const dueDate = getNextDueDate(payroll.schedule, payroll.customDays)
                  const diffDays = Math.ceil(
                    (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                  const urgent = diffDays < 7
                  return (
                    <Card
                      key={payroll.id}
                      className="transition-border cursor-pointer py-0 hover:border-black"
                      onClick={() => {
                        setDisbursePayrollId(payroll.id)
                        setDisburseOpen(true)
                      }}
                    >
                      <CardContent className="flex h-full flex-col justify-between p-0">
                        <div className="px-5 pt-5">
                          <p className="text-3xl font-light">{payroll.name}</p>
                          <p
                            className={`mt-2 flex items-center gap-1.5 text-sm ${urgent ? "font-medium text-primary" : "text-muted-foreground"}`}
                          >
                            {urgent ? (
                              <AlertTriangle className="size-3.5" />
                            ) : (
                              <Calendar className="size-3.5" />
                            )}
                            Due {formatDueDate(dueDate)}
                          </p>
                        </div>
                        <div className="mt-6 flex items-center justify-between border-t text-sm text-muted-foreground">
                          <span className="flex-1 text-center">${totalUsd.toLocaleString()}</span>
                          <Separator orientation="vertical" className="h-8" />
                          <span className="flex-1 flex justify-center items-center gap-1">
                            {payroll.employees.length} <Users className="size-3.5" />
                          </span>
                          <Separator orientation="vertical" className="h-8" />
                          <button
                            className="hover:bg-muted flex-1 flex justify-center items-center h-full p-0 text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/payrolls/${payroll.id}`)
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
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
                  const totalUsd = payroll.employees.reduce(
                    (sum, pe) => sum + pe.employee.salaryAmount,
                    0
                  )
                  // Advance by one period since this cycle is already paid
                  const nextDue = getNextDueDate(payroll.schedule, payroll.customDays)
                  const dueDate = new Date(nextDue)
                  switch (payroll.schedule) {
                    case "EVERY_TWO_WEEKS":
                      dueDate.setDate(dueDate.getDate() + 14)
                      break
                    case "EVERY_MONTH":
                      dueDate.setMonth(dueDate.getMonth() + 1)
                      break
                    case "EVERY_X_DAYS":
                      dueDate.setDate(dueDate.getDate() + (payroll.customDays ?? 30))
                      break
                  }
                  return (
                    <Card
                      key={payroll.id}
                      className="py-0 opacity-75"
                    >
                      <CardContent className="flex h-full flex-col justify-between p-0">
                        <div className="px-5 pt-5">
                          <p className="text-3xl font-light">{payroll.name}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
                            <Check className="size-3.5" />
                            Due again {formatDueDate(dueDate)}
                          </p>
                        </div>
                        <div className="mt-6 flex items-center justify-between border-t text-sm text-muted-foreground">
                          <span className="flex-1 text-center">${totalUsd.toLocaleString()}</span>
                          <Separator orientation="vertical" className="h-8" />
                          <span className="flex-1 flex justify-center items-center gap-1">
                            {payroll.employees.length} <Users className="size-3.5" />
                          </span>
                          <Separator orientation="vertical" className="h-8" />
                          <button
                            className="hover:bg-muted flex-1 flex justify-center items-center h-full p-0 text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/payrolls/${payroll.id}`)
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <DisburseModal
        open={disburseOpen}
        onOpenChange={(open) => {
          setDisburseOpen(open)
          if (!open) setDisbursePayrollId(null)
        }}
        initialPayrollId={disbursePayrollId}
      />
    </div>
  )
}
