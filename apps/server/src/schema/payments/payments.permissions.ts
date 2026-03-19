
import { isAuthenticated } from "../permissions.js"

export const paymentPermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    payments: isAuthenticated,
    payrollRun: isAuthenticated,
  },
  Mutation: {
    startPayrollRun: isAuthenticated,
    updatePaymentStatus: isAuthenticated,
    completePayrollRun: isAuthenticated,
  },
}
