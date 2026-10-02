import { objectType } from "nexus"

// Delegates work in their owner's account, so the account-level fields below
// resolve against the owner.
function accountIdOf(user: { id: string; ownerId: string | null }): string {
  return user.ownerId ?? user.id
}

export const AuthPayload = objectType({
  name: "AuthPayload",
  definition(t) {
    t.nonNull.string("token")
    t.nonNull.field("user", { type: "User" })
  },
})

export const User = objectType({
  name: "User",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("username")
    t.string("name")
    t.field("owner", {
      type: "User",
      resolve(parent, _args, ctx) {
        if (!parent.ownerId) return null
        return ctx.prisma.user.findUnique({ where: { id: parent.ownerId } })
      },
    })
    // Only readable by the user it belongs to. Delegates never see their
    // owner's key, including through `owner`.
    t.string("zcashViewingKey", {
      resolve(parent, _args, ctx) {
        return parent.id === ctx.userId ? parent.zcashViewingKey : null
      },
    })
    t.int("walletBirthdayHeight")
    t.nonNull.list.nonNull.field("employees", {
      type: "Employee",
      resolve(parent, _args, ctx) {
        return ctx.prisma.employee.findMany({
          where: { userId: accountIdOf(parent) },
        })
      },
    })
    t.nonNull.list.nonNull.field("payrolls", {
      type: "Payroll",
      resolve(parent, _args, ctx) {
        return ctx.prisma.payroll.findMany({
          where: { userId: accountIdOf(parent) },
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
          where: { userId: accountIdOf(parent) },
          take: 1,
        })
        return count > 0
      },
    })
    t.nonNull.boolean("hasPayrolls", {
      async resolve(parent, _args, ctx) {
        const count = await ctx.prisma.payroll.count({
          where: { userId: accountIdOf(parent) },
          take: 1,
        })
        return count > 0
      },
    })
    t.nonNull.boolean("hasVerifiedPayment", {
      async resolve(parent, _args, ctx) {
        const count = await ctx.prisma.payment.count({
          where: {
            payroll: { userId: accountIdOf(parent) },
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
          ctx.prisma.employee.count({
            where: { userId: accountIdOf(parent) },
            take: 1,
          }),
          ctx.prisma.payroll.count({
            where: { userId: accountIdOf(parent) },
            take: 1,
          }),
          ctx.prisma.payment.count({
            where: {
              payroll: { userId: accountIdOf(parent) },
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
