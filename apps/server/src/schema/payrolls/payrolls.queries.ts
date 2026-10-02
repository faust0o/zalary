import { idArg, list, nonNull, queryField } from "nexus"

export const payrolls = queryField("payrolls", {
  type: nonNull(list(nonNull("Payroll"))),
  resolve(_parent, _args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    return ctx.prisma.payroll.findMany({
      where: { userId: ctx.accountId },
      orderBy: { createdAt: "desc" },
    })
  },
})

export const payroll = queryField("payroll", {
  type: "Payroll",
  args: { id: nonNull(idArg()) },
  resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    return ctx.prisma.payroll.findFirst({
      where: { id: args.id, userId: ctx.accountId },
    })
  },
})
