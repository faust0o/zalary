import { useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@workspace/ui/components/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts"
import { DisburseModal } from "../components/disburse-modal/disburse-modal"
import { PayrollCard } from "../components/payroll-card"
import { DashboardStatsDocument } from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { formatZecAsUsd, useZecPrice } from "../hooks/use-zec-price"
import { getNextDueDate } from "../lib/payroll-utils"

const chartConfig = {
  monthly: {
    label: "Monthly",
    color: "var(--primary)",
  },
  accumulated: {
    label: "Accumulated",
    color: "var(--primary-dark)",
  },
} satisfies ChartConfig

export function DashboardPage() {
  useTitle("Dashboard")
  const { data, loading } = useQuery(DashboardStatsDocument)
  const navigate = useNavigate()
  const { price: zecPrice } = useZecPrice()
  const [chartRange, setChartRange] = useState<"30d" | "6m" | "All">("All")
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [disbursePayrollId, setDisbursePayrollId] = useState<string | null>(null)

  const stats = data?.dashboardStats
  const payrolls = useMemo(() => data?.payrolls ?? [], [data?.payrolls])

  const { pendingPayrolls, completedPayrolls } = useMemo(() => {
    const pending: typeof payrolls = []
    const completed: typeof payrolls = []
    for (const p of payrolls) {
      const lastRun = p.runs[0]
      if (!lastRun || lastRun.status !== "COMPLETED") {
        pending.push(p)
      } else {
        const nextDue = getNextDueDate(p.schedule, p.customDays, new Date(lastRun.createdAt))
        if (nextDue <= new Date()) {
          pending.push(p)
        } else {
          completed.push(p)
        }
      }
    }
    return { pendingPayrolls: pending, completedPayrolls: completed }
  }, [payrolls])

  const hasRealData = !!stats?.zecSpentByMonth?.length

  const allChartData = useMemo(() => {
    if (!stats?.zecSpentByMonth?.length) {
      // Static example data for empty state
      const now = new Date()
      let total = 0
      const amounts = [1.2, 2.5, 1.8, 3.1, 2.2, 2.8]
      return amounts.map((amount, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (amounts.length - 1 - i), 1)
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        total += amount
        return { month, monthly: amount, accumulated: +total.toFixed(4) }
      })
    }
    let total = 0
    return stats.zecSpentByMonth.map(
      (item: { month: string; amount: number }) => {
        total += item.amount
        return {
          month: item.month,
          monthly: item.amount,
          accumulated: total,
        }
      }
    )
  }, [stats])

  const chartData = useMemo(() => {
    if (chartRange === "All") return allChartData
    const now = new Date()
    const cutoff = new Date(now)
    if (chartRange === "30d") cutoff.setDate(cutoff.getDate() - 30)
    else if (chartRange === "6m") cutoff.setMonth(cutoff.getMonth() - 6)
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}`
    return allChartData.filter((d: { month: string }) => d.month >= cutoffStr)
  }, [allChartData, chartRange])

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-light tracking-tight">Dashboard</h2>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
            Payouts over time
          </CardTitle>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {(["30d", "6m", "All"] as const).map((range) => (
              <button
                key={range}
                type="button"
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  chartRange === range
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setChartRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading chart...</p>
            </div>
          ) : chartData.length ? (
            <div className="relative">
            {!hasRealData && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                <div className="rounded-lg bg-background/90 px-5 py-2.5 text-sm font-medium text-muted-foreground shadow-sm ring-1 ring-border/50">
                  No payment data yet
                </div>
              </div>
            )}
            <ChartContainer config={chartConfig} className={`h-[300px] w-full ${!hasRealData ? "opacity-50" : ""}`}>
              <ComposedChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-monthly)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-monthly)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                  <linearGradient
                    id="fillAccumulated"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--color-accumulated)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-accumulated)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) => {
                    const [year, month] = value.split("-")
                    const date = new Date(+year, +month - 1)
                    return date.toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })
                  }}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label: string) => {
                        const [year, month] = label.split("-")
                        return new Date(+year, +month - 1).toLocaleDateString(
                          undefined,
                          { month: "long", year: "numeric" }
                        )
                      }}
                      formatter={(value, name, item) => {
                        const color = item.color
                        const zec = `${(value as number).toFixed(4)} ZEC`
                        const usd = formatZecAsUsd(value as number, zecPrice)
                        const label =
                          name === "monthly" ? "Monthly" : "Accumulated"
                        return (
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {label}
                            </span>
                            <span className="ml-auto font-medium">
                              {usd ?? "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {zec}
                            </span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Area
                  dataKey="monthly"
                  fill="url(#fillMonthly)"
                  stroke="none"
                  tooltipType="none"
                />
                <Area
                  dataKey="accumulated"
                  fill="url(#fillAccumulated)"
                  stroke="none"
                  tooltipType="none"
                />
                <Line
                  dataKey="monthly"
                  stroke="var(--color-monthly)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="accumulated"
                  stroke="var(--color-accumulated)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Payrolls
          </h3>
          <Button
            variant="link"
            size="sm"
            className="text-muted-foreground"
            onClick={() => navigate("/payrolls")}
          >
            View All <span className="ml-1">→</span>
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : payrolls.length === 0 ? (
          <Card
            className="flex cursor-pointer flex-col items-center justify-center border-dashed py-10 transition-colors hover:border-primary/50 hover:bg-muted/30"
            onClick={() => navigate("/payrolls/new")}
          >
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <Plus className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Create your first payroll</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Set up a schedule to start paying your team
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
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
                  onClick={() => {
                    setDisbursePayrollId(payroll.id)
                    setDisburseOpen(true)
                  }}
                />
              )
            })}
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
                />
              )
            })}
          </div>
        )}
      </div>

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
