import { nonNull, queryField } from "nexus"
import { getZecBalance } from "../../services/zcash.js"

function getNextDueDate(
  schedule: string,
  customDays: number | null,
  lastRunDate: Date | null
): Date {
  const base = lastRunDate ?? new Date()
  const next = new Date(base)
  switch (schedule) {
    case "EVERY_TWO_WEEKS":
      next.setDate(next.getDate() + 14)
      break
    case "EVERY_MONTH":
      next.setMonth(next.getMonth() + 1)
      break
    case "EVERY_X_DAYS":
      next.setDate(next.getDate() + (customDays ?? 30))
      break
  }
  return next
}

export const dashboardStats = queryField("dashboardStats", {
  type: nonNull("DashboardStats"),
  async resolve(_parent, _args, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated")

    // ZEC spent by month
    const completedPayments = await ctx.prisma.payment.findMany({
      where: {
        payroll: { userId: ctx.userId },
        status: "COMPLETED",
      },
      select: { amountZec: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    const monthMap = new Map<string, number>()
    for (const p of completedPayments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`
      monthMap.set(key, (monthMap.get(key) ?? 0) + p.amountZec)
    }
    const zecSpentByMonth = Array.from(monthMap.entries()).map(
      ([month, amount]) => ({ month, amount })
    )

    // Next payroll due
    const payrolls = await ctx.prisma.payroll.findMany({
      where: { userId: ctx.userId },
      include: {
        employees: true,
        runs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    let nextPayrollDue: {
      id: string
      name: string
      dueDate: string
      employeeCount: number
      totalUsd: number
    } | null = null
    let earliestDue = new Date("9999-12-31")

    for (const payroll of payrolls) {
      const lastRun = payroll.runs[0]
      const dueDate = getNextDueDate(
        payroll.schedule,
        payroll.customDays,
        lastRun?.createdAt ?? null
      )
      if (dueDate < earliestDue) {
        earliestDue = dueDate
        const employees = await ctx.prisma.employee.findMany({
          where: {
            payrolls: { some: { payrollId: payroll.id } },
          },
        })
        nextPayrollDue = {
          id: payroll.id,
          name: payroll.name,
          dueDate: dueDate.toISOString(),
          employeeCount: employees.length,
          totalUsd: employees.reduce(
            (sum: number, e: { salaryAmount: number }) =>
              sum + e.salaryAmount,
            0
          ),
        }
      }
    }

    // Recent runs
    const recentRuns = await ctx.prisma.payrollRun.findMany({
      where: { payroll: { userId: ctx.userId } },
      orderBy: { createdAt: "desc" },
      take: 3,
    })

    return { zecSpentByMonth, nextPayrollDue, recentRuns }
  },
})

export const zecBalance = queryField("zecBalance", {
  type: "ZecBalance",
  async resolve(_parent, _args, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated")
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    })
    if (!user.zcashViewingKey) {
      return { available: 0 }
    }
    const balance = await getZecBalance(user.zcashViewingKey)
    return { available: balance }
  },
})
