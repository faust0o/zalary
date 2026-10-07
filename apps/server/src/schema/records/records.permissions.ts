import {
  canEditPayroll,
  isAccountOwner,
  isAuthenticated,
} from "../permissions.js"

export const recordPermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    sealedRecords: isAuthenticated,
    accountKey: isAuthenticated,
  },
  Mutation: {
    writeSealedRecords: canEditPayroll,
    createAccountKey: isAccountOwner,
    shareAccountKey: canEditPayroll,
  },
}
