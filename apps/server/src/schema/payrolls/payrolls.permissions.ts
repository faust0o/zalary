
import { isAuthenticated } from "../permissions.js"

export const payrollPermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    payrolls: isAuthenticated,
    payroll: isAuthenticated,
  },
  Mutation: {
    createPayroll: isAuthenticated,
    updatePayroll: isAuthenticated,
    deletePayroll: isAuthenticated,
  },
}
