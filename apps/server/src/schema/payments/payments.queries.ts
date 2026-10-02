import { idArg, list, nonNull, queryField } from "nexus"

export const payments = queryField("payments", {
  type: nonNull(list(nonNull("Payment"))),
  args: {
    payrollId: idArg(),
    employeeId: idArg(),
  },
  resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    return ctx.prisma.payment.findMany({
      where: {
        payroll: { userId: ctx.accountId },
        ...(args.payrollId ? { payrollId: args.payrollId } : {}),
        ...(args.employeeId ? { employeeId: args.employeeId } : {}),
      },
      orderBy: { createdAt: "desc" },
    })
  },
})

export const payrollRun = queryField("payrollRun", {
  type: "PayrollRun",
  args: { id: nonNull(idArg()) },
  resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    return ctx.prisma.payrollRun.findFirst({
      where: {
        id: args.id,
        payroll: { userId: ctx.accountId },
      },
    })
  },
})
