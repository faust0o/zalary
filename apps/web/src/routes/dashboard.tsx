import { useQuery } from "@apollo/client/react"
import { Badge } from "@workspace/ui/components/badge"
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
import { toHeaderCase } from "js-convert-case"
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
import { DashboardStatsDocument } from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { formatZecAsUsd, useZecPrice } from "../hooks/use-zec-price"

function relativeDate(dateStr: string, isFuture: boolean): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = isFuture ? date.getTime() - now.getTime() : now.getTime() - date.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (days <= 0) return isFuture ? "Due today" : "Today"
  if (days === 1) return isFuture ? "Due in 1 day" : "1 day ago"
  return isFuture ? `Due in ${days} days` : `${days} days ago`
}

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

  const stats = data?.dashboardStats

  const allChartData = useMemo(() => {
    if (!stats?.zecSpentByMonth?.length) return []
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
  }, [stats?.zecSpentByMonth])

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
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No payment data yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {stats?.nextPayrollDue && (
        <div>
          <h3 className="mb-4 text-lg font-semibold">Next Payroll Due</h3>
          <Card
            className="cursor-pointer py-0 transition-shadow hover:shadow-md"
            onClick={() => navigate(`/payrolls/${stats.nextPayrollDue!.id}`)}
          >
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xl font-bold">
                  {stats.nextPayrollDue.name}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {relativeDate(stats.nextPayrollDue.dueDate, true)}
                  {" · "}
                  {stats.nextPayrollDue.employeeCount} employees
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  ${stats.nextPayrollDue.totalUsd.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">Total payout</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Payouts</h3>
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
        ) : stats?.recentRuns?.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {stats.recentRuns.map(
              (
                run: {
                  id: string
                  status: string
                  createdAt: string
                  payroll: { name: string }
                  payments: { status: string; amountZec: number }[]
                },
                index: number
              ) => {
                const opacity = index === 0 ? 1 : index === 1 ? 0.6 : 0.3
                const totalZec = run.payments.reduce(
                  (sum: number, p: { amountZec: number }) =>
                    sum + p.amountZec,
                  0
                )
                return (
                  <Card
                    key={run.id}
                    className="py-0 transition-opacity"
                    style={{ opacity }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <p className="text-base font-bold">
                          {run.payroll.name}
                        </p>
                        <Badge
                          variant={
                            run.status === "COMPLETED" ? "default" : "secondary"
                          }
                        >
                          {toHeaderCase(run.status)}
                        </Badge>
                      </div>
                      <p className="mt-3 font-mono text-lg font-semibold">
                        {totalZec.toFixed(4)} ZEC
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {run.status === "COMPLETED"
                          ? `Completed ${relativeDate(run.createdAt, false)}`
                          : relativeDate(run.createdAt, false)}
                      </p>
                    </CardContent>
                  </Card>
                )
              }
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No payroll runs yet</p>
        )}
      </div>
    </div>
  )
}
