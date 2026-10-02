import { randomBytes } from "crypto"
import { arg, idArg, mutationField, nonNull, stringArg } from "nexus"
import { getZecPrice } from "../../services/price.js"

function generateMemo(): string {
  return `zalary:${randomBytes(8).toString("hex")}`
}

export const startPayrollRun = mutationField("startPayrollRun", {
  type: nonNull("PayrollRun"),
  args: { payrollId: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")

    const payroll = await ctx.prisma.payroll.findFirst({
      where: { id: args.payrollId, userId: ctx.accountId },
      include: {
        employees: { include: { employee: true } },
      },
    })
    if (!payroll) throw new Error("Payroll not found")

    // Check for an existing in-progress run for this payroll
    const existingRun = await ctx.prisma.payrollRun.findFirst({
      where: {
        payrollId: payroll.id,
        status: "IN_PROGRESS",
      },
      include: { payments: true },
    })
    if (existingRun) return existingRun

    const zecPriceUsd = await getZecPrice()

    const run = await ctx.prisma.payrollRun.create({
      data: {
        payrollId: payroll.id,
        status: "IN_PROGRESS",
        zecPriceUsd,
        payments: {
          create: payroll.employees.map(
            ({
              employee,
            }: {
              employee: {
                id: string
                salaryAmount: number
              }
            }) => ({
              employeeId: employee.id,
              payrollId: payroll.id,
              amountUsd: employee.salaryAmount,
              amountZec: employee.salaryAmount / zecPriceUsd,
              memo: generateMemo(),
              status: "PENDING" as const,
            })
          ),
        },
      },
    })

    return run
  },
})

export const updatePaymentStatus = mutationField("updatePaymentStatus", {
  type: nonNull("Payment"),
  args: {
    paymentId: nonNull(idArg()),
    status: nonNull(arg({ type: "PaymentStatus" })),
    txHash: stringArg(),
  },
  async resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")

    const payment = await ctx.prisma.payment.findFirst({
      where: {
        id: args.paymentId,
        payroll: { userId: ctx.accountId },
      },
    })
    if (!payment) throw new Error("Payment not found")

    return ctx.prisma.payment.update({
      where: { id: args.paymentId },
      data: {
        status: args.status,
        ...(args.txHash ? { txHash: args.txHash } : {}),
      },
    })
  },
})

export const completePayrollRun = mutationField("completePayrollRun", {
  type: nonNull("PayrollRun"),
  args: { runId: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")

    const run = await ctx.prisma.payrollRun.findFirst({
      where: {
        id: args.runId,
        payroll: { userId: ctx.accountId },
      },
      include: { payments: true },
    })
    if (!run) throw new Error("Payroll run not found")

    const hasPending = run.payments.some(
      (p: { status: string }) => p.status === "PENDING"
    )
    if (hasPending) {
      throw new Error("Cannot complete run with pending payments")
    }

    return ctx.prisma.payrollRun.update({
      where: { id: args.runId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    })
  },
})
