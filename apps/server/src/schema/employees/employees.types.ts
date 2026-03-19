import { enumType, objectType } from "nexus"

export const SalaryCurrencyEnum = enumType({
  name: "SalaryCurrency",
  members: ["USD", "ZEC"],
})

export const Employee = objectType({
  name: "Employee",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("name")
    t.string("title")
    t.nonNull.string("walletAddress")
    t.nonNull.boolean("walletVerified")
    t.nonNull.float("salaryAmount")
    t.nonNull.field("salaryCurrency", { type: "SalaryCurrency" })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
    t.nonNull.string("updatedAt", {
      resolve(parent) {
        return parent.updatedAt.toISOString()
      },
    })
  },
})
