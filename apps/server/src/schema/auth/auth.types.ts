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
  },
})
