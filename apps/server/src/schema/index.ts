import { makeSchema } from "nexus"
import { applyMiddleware } from "graphql-middleware"
import { shield, type IRules } from "graphql-shield"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

// Auth
import * as AuthTypes from "./auth/auth.types.js"
import * as AuthQueries from "./auth/auth.queries.js"
import * as AuthMutations from "./auth/auth.mutations.js"
import { authPermissions } from "./auth/auth.permissions.js"

// Delegates
import * as DelegateTypes from "./delegates/delegates.types.js"
import * as DelegateQueries from "./delegates/delegates.queries.js"
import * as DelegateMutations from "./delegates/delegates.mutations.js"
import { delegatePermissions } from "./delegates/delegates.permissions.js"

// Employees
import * as EmployeeTypes from "./employees/employees.types.js"
import * as EmployeeQueries from "./employees/employees.queries.js"
import * as EmployeeMutations from "./employees/employees.mutations.js"
import { employeePermissions } from "./employees/employees.permissions.js"

// Payrolls
import * as PayrollTypes from "./payrolls/payrolls.types.js"
import * as PayrollQueries from "./payrolls/payrolls.queries.js"
import * as PayrollMutations from "./payrolls/payrolls.mutations.js"
import { payrollPermissions } from "./payrolls/payrolls.permissions.js"

// Payments
import * as PaymentTypes from "./payments/payments.types.js"
import * as PaymentQueries from "./payments/payments.queries.js"
import * as PaymentMutations from "./payments/payments.mutations.js"
import { paymentPermissions } from "./payments/payments.permissions.js"

// Dashboard
import * as DashboardTypes from "./dashboard/dashboard.types.js"
import * as DashboardQueries from "./dashboard/dashboard.queries.js"
import { dashboardPermissions } from "./dashboard/dashboard.permissions.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const baseSchema = makeSchema({
  types: [
    AuthTypes,
    AuthQueries,
    AuthMutations,
    DelegateTypes,
    DelegateQueries,
    DelegateMutations,
    EmployeeTypes,
    EmployeeQueries,
    EmployeeMutations,
    PayrollTypes,
    PayrollQueries,
    PayrollMutations,
    PaymentTypes,
    PaymentQueries,
    PaymentMutations,
    DashboardTypes,
    DashboardQueries,
  ],
  outputs: {
    schema: join(__dirname, "../../schema.graphql"),
    typegen: join(__dirname, "../../__generated__/nexus-typegen.ts"),
  },
  contextType: {
    module: join(__dirname, "../context.ts"),
    export: "Context",
  },
})

// Merge all domain permissions
const permissions = shield(
  {
    Query: {
      ...authPermissions.Query,
      ...delegatePermissions.Query,
      ...employeePermissions.Query,
      ...payrollPermissions.Query,
      ...paymentPermissions.Query,
      ...dashboardPermissions.Query,
    },
    Mutation: {
      ...authPermissions.Mutation,
      ...delegatePermissions.Mutation,
      ...employeePermissions.Mutation,
      ...payrollPermissions.Mutation,
      ...paymentPermissions.Mutation,
    },
  } as IRules,
  {
    allowExternalErrors: true,
  }
)

export const schema = applyMiddleware(baseSchema, permissions)
