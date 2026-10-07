import { isAuthenticated } from "../permissions.js"

export const passkeyPermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    myPasskeys: isAuthenticated,
  },
  Mutation: {
    registerPasskey: isAuthenticated,
    removePasskey: isAuthenticated,
  },
}
