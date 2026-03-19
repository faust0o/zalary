
import { isAuthenticated } from "../permissions.js"

export const employeePermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    employees: isAuthenticated,
    employee: isAuthenticated,
  },
  Mutation: {
    createEmployee: isAuthenticated,
    updateEmployee: isAuthenticated,
    deleteEmployee: isAuthenticated,
  },
}
