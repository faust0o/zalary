import { idArg, list, nonNull, queryField } from "nexus"

export const employees = queryField("employees", {
  type: nonNull(list(nonNull("Employee"))),
  resolve(_parent, _args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    return ctx.prisma.employee.findMany({
      where: { userId: ctx.accountId },
      orderBy: { name: "asc" },
    })
  },
})

export const employee = queryField("employee", {
  type: "Employee",
  args: { id: nonNull(idArg()) },
  resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    return ctx.prisma.employee.findFirst({
      where: { id: args.id, userId: ctx.accountId },
    })
  },
})
