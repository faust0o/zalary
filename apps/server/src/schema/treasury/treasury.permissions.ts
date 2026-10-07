import { allow } from "graphql-shield"

import { isAccountOwner, isAuthenticated } from "../permissions.js"

export const treasuryPermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    treasury: isAuthenticated,
    treasuryInvite: allow,
  },
  Mutation: {
    createTreasury: isAccountOwner,
    updateTreasury: isAccountOwner,
    deleteTreasury: isAccountOwner,
    createTreasuryInvite: isAccountOwner,
    revokeTreasuryInvite: isAccountOwner,
    removeTreasuryMember: isAccountOwner,
    acceptTreasuryInvite: allow,
    treasuryHeartbeat: isAuthenticated,
    startTreasuryKeygen: isAccountOwner,
    submitKeygenResult: isAuthenticated,
    finalizeTreasury: isAccountOwner,
    shareTreasuryViewingKey: isAccountOwner,
    resetTreasuryKeygen: isAccountOwner,
    reportTreasuryBalance: isAccountOwner,
  },
}
