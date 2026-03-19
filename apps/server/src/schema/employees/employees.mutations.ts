import { arg, floatArg, idArg, mutationField, nonNull, stringArg } from "nexus"

export const createEmployee = mutationField("createEmployee", {
  type: nonNull("Employee"),
  args: {
    name: nonNull(stringArg()),
    title: stringArg(),
    walletAddress: nonNull(stringArg()),
    salaryAmount: nonNull(floatArg()),
    salaryCurrency: arg({ type: "SalaryCurrency" }),
  },
  resolve(_parent, args, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated")
    return ctx.prisma.employee.create({
      data: {
        name: args.name,
        title: args.title,
        walletAddress: args.walletAddress,
        salaryAmount: args.salaryAmount,
        salaryCurrency: args.salaryCurrency ?? "USD",
        userId: ctx.userId,
      },
    })
  },
})

export const updateEmployee = mutationField("updateEmployee", {
  type: nonNull("Employee"),
  args: {
    id: nonNull(idArg()),
    name: stringArg(),
    title: stringArg(),
    walletAddress: stringArg(),
    salaryAmount: floatArg(),
    salaryCurrency: arg({ type: "SalaryCurrency" }),
  },
  async resolve(_parent, args, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated")
    const employee = await ctx.prisma.employee.findFirst({
      where: { id: args.id, userId: ctx.userId },
    })
    if (!employee) throw new Error("Employee not found")

    return ctx.prisma.employee.update({
      where: { id: args.id },
      data: {
        ...(args.name != null ? { name: args.name } : {}),
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.walletAddress != null
          ? { walletAddress: args.walletAddress }
          : {}),
        ...(args.salaryAmount != null
          ? { salaryAmount: args.salaryAmount }
          : {}),
        ...(args.salaryCurrency != null
          ? { salaryCurrency: args.salaryCurrency }
          : {}),
      },
    })
  },
})

export const deleteEmployee = mutationField("deleteEmployee", {
  type: nonNull("Employee"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated")
    const employee = await ctx.prisma.employee.findFirst({
      where: { id: args.id, userId: ctx.userId },
    })
    if (!employee) throw new Error("Employee not found")

    return ctx.prisma.employee.delete({ where: { id: args.id } })
  },
})
