import { arg, idArg, intArg, list, mutationField, nonNull, stringArg } from "nexus"

export const createPayroll = mutationField("createPayroll", {
  type: nonNull("Payroll"),
  args: {
    name: nonNull(stringArg()),
    schedule: nonNull(arg({ type: "Schedule" })),
    customDays: intArg(),
    employeeIds: nonNull(list(nonNull(idArg()))),
  },
  async resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")

    return ctx.prisma.payroll.create({
      data: {
        name: args.name,
        schedule: args.schedule,
        customDays: args.customDays,
        userId: ctx.accountId,
        employees: {
          create: args.employeeIds.map((employeeId: string) => ({
            employeeId,
          })),
        },
      },
    })
  },
})

export const updatePayroll = mutationField("updatePayroll", {
  type: nonNull("Payroll"),
  args: {
    id: nonNull(idArg()),
    name: stringArg(),
    schedule: arg({ type: "Schedule" }),
    customDays: intArg(),
    employeeIds: list(nonNull(idArg())),
  },
  async resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    const payroll = await ctx.prisma.payroll.findFirst({
      where: { id: args.id, userId: ctx.accountId },
    })
    if (!payroll) throw new Error("Payroll not found")

    if (args.employeeIds) {
      await ctx.prisma.payrollEmployee.deleteMany({
        where: { payrollId: args.id },
      })
      await ctx.prisma.payrollEmployee.createMany({
        data: args.employeeIds.map((employeeId: string) => ({
          payrollId: args.id,
          employeeId,
        })),
      })
    }

    return ctx.prisma.payroll.update({
      where: { id: args.id },
      data: {
        ...(args.name != null ? { name: args.name } : {}),
        ...(args.schedule != null ? { schedule: args.schedule } : {}),
        ...(args.customDays !== undefined
          ? { customDays: args.customDays }
          : {}),
      },
    })
  },
})

export const deletePayroll = mutationField("deletePayroll", {
  type: nonNull("Payroll"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    const payroll = await ctx.prisma.payroll.findFirst({
      where: { id: args.id, userId: ctx.accountId },
    })
    if (!payroll) throw new Error("Payroll not found")

    await ctx.prisma.payment.deleteMany({ where: { payrollId: args.id } })
    await ctx.prisma.payrollRun.deleteMany({ where: { payrollId: args.id } })
    await ctx.prisma.payrollEmployee.deleteMany({ where: { payrollId: args.id } })

    return ctx.prisma.payroll.delete({ where: { id: args.id } })
  },
})
