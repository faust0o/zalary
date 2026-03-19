import { enumType, objectType } from "nexus"

export const ScheduleEnum = enumType({
  name: "Schedule",
  members: ["EVERY_TWO_WEEKS", "EVERY_MONTH", "EVERY_X_DAYS"],
})

export const Payroll = objectType({
  name: "Payroll",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("name")
    t.nonNull.field("schedule", { type: "Schedule" })
    t.int("customDays")
    t.nonNull.list.nonNull.field("employees", {
      type: "PayrollEmployee",
      resolve(parent, _args, ctx) {
        return ctx.prisma.payrollEmployee.findMany({
          where: { payrollId: parent.id },
          include: { employee: true },
        })
      },
    })
    t.nonNull.list.nonNull.field("runs", {
      type: "PayrollRun",
      resolve(parent, _args, ctx) {
        return ctx.prisma.payrollRun.findMany({
          where: { payrollId: parent.id },
          orderBy: { createdAt: "desc" },
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

export const PayrollEmployee = objectType({
  name: "PayrollEmployee",
  definition(t) {
    t.nonNull.string("payrollId")
    t.nonNull.string("employeeId")
    t.nonNull.field("employee", {
      type: "Employee",
      resolve(parent, _args, ctx) {
        return ctx.prisma.employee.findUniqueOrThrow({
          where: { id: parent.employeeId },
        })
      },
    })
  },
})
