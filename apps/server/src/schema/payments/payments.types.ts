import { enumType, objectType } from "nexus"

export const PaymentStatusEnum = enumType({
  name: "PaymentStatus",
  members: ["PENDING", "COMPLETED", "SKIPPED"],
})

export const PayrollRunStatusEnum = enumType({
  name: "PayrollRunStatus",
  members: ["PENDING", "IN_PROGRESS", "COMPLETED"],
})

export const Payment = objectType({
  name: "Payment",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.float("amountUsd")
    t.nonNull.float("amountZec")
    t.nonNull.string("memo")
    t.nonNull.field("status", { type: "PaymentStatus" })
    t.string("txHash")
    t.nonNull.field("employee", {
      type: "Employee",
      resolve(parent, _args, ctx) {
        return ctx.prisma.employee.findUniqueOrThrow({
          where: { id: parent.employeeId },
        })
      },
    })
    t.nonNull.field("payroll", {
      type: "Payroll",
      resolve(parent, _args, ctx) {
        return ctx.prisma.payroll.findUniqueOrThrow({
          where: { id: parent.payrollId },
        })
      },
    })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
  },
})

export const PayrollRun = objectType({
  name: "PayrollRun",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.field("status", {
      type: "PayrollRunStatus",
      async resolve(parent, _args, ctx) {
        const pending = await ctx.prisma.payment.count({
          where: { runId: parent.id, status: "PENDING" },
        })
        if (pending === 0) return "COMPLETED"
        // At least one payment exists and some are done
        const total = await ctx.prisma.payment.count({
          where: { runId: parent.id },
        })
        if (total > pending) return "IN_PROGRESS"
        return "PENDING"
      },
    })
    t.nonNull.float("zecPriceUsd")
    t.nonNull.field("payroll", {
      type: "Payroll",
      resolve(parent, _args, ctx) {
        return ctx.prisma.payroll.findUniqueOrThrow({
          where: { id: parent.payrollId },
        })
      },
    })
    t.nonNull.list.nonNull.field("payments", {
      type: "Payment",
      resolve(parent, _args, ctx) {
        return ctx.prisma.payment.findMany({
          where: { runId: parent.id },
        })
      },
    })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
    t.string("completedAt", {
      resolve(parent) {
        return parent.completedAt?.toISOString() ?? null
      },
    })
  },
})
