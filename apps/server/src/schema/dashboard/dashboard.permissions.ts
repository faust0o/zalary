
import { isAuthenticated } from "../permissions.js"

export const dashboardPermissions: {
  Query: Record<string, unknown>
} = {
  Query: {
    dashboardStats: isAuthenticated,
    zecBalance: isAuthenticated,
  },
}
