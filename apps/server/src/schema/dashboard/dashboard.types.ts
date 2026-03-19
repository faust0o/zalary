import { objectType } from "nexus"

export const ZecSpentByMonth = objectType({
  name: "ZecSpentByMonth",
  definition(t) {
    t.nonNull.string("month")
    t.nonNull.float("amount")
  },
})

export const NextPayrollDue = objectType({
  name: "NextPayrollDue",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("name")
    t.nonNull.string("dueDate")
    t.nonNull.int("employeeCount")
    t.nonNull.float("totalUsd")
  },
})

export const DashboardStats = objectType({
  name: "DashboardStats",
  definition(t) {
    t.nonNull.list.nonNull.field("zecSpentByMonth", {
      type: "ZecSpentByMonth",
    })
    t.field("nextPayrollDue", { type: "NextPayrollDue" })
    t.nonNull.list.nonNull.field("recentRuns", { type: "PayrollRun" })
  },
})

export const ZecBalance = objectType({
  name: "ZecBalance",
  definition(t) {
    t.nonNull.float("available")
  },
})
