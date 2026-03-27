import { objectType } from "nexus"

export const User = objectType({
  name: "User",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("email")
    t.string("zcashViewingKey")
    t.int("walletBirthdayHeight")
    t.nonNull.list.nonNull.field("employees", {
      type: "Employee",
      resolve(parent, _args, ctx) {
        return ctx.prisma.employee.findMany({
          where: { userId: parent.id },
        })
      },
    })
    t.nonNull.list.nonNull.field("payrolls", {
      type: "Payroll",
      resolve(parent, _args, ctx) {
        return ctx.prisma.payroll.findMany({
          where: { userId: parent.id },
        })
      },
    })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
    t.nonNull.boolean("hasEmployees", {
      async resolve(parent, _args, ctx) {
        const count = await ctx.prisma.employee.count({
          where: { userId: parent.id },
          take: 1,
        })
        return count > 0
      },
    })
    t.nonNull.boolean("hasPayrolls", {
      async resolve(parent, _args, ctx) {
        const count = await ctx.prisma.payroll.count({
          where: { userId: parent.id },
          take: 1,
        })
        return count > 0
      },
    })
    t.nonNull.boolean("hasVerifiedPayment", {
      async resolve(parent, _args, ctx) {
        const count = await ctx.prisma.payment.count({
          where: {
            payroll: { userId: parent.id },
            status: "COMPLETED",
            txHash: { not: null },
          },
          take: 1,
        })
        return count > 0
      },
    })
    t.nonNull.boolean("needsWalkthrough", {
      async resolve(parent, _args, ctx) {
        const [employees, payrolls, payments] = await Promise.all([
          ctx.prisma.employee.count({ where: { userId: parent.id }, take: 1 }),
          ctx.prisma.payroll.count({ where: { userId: parent.id }, take: 1 }),
          ctx.prisma.payment.count({
            where: {
              payroll: { userId: parent.id },
              status: "COMPLETED",
              txHash: { not: null },
            },
            take: 1,
          }),
        ])
        return employees === 0 || payrolls === 0 || payments === 0
      },
    })
  },
})
