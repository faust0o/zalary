import { allow } from "graphql-shield"

import { isAccountOwner, isAuthenticated } from "../permissions.js"

export const accessPermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    accountMembers: isAuthenticated,
    accessInvites: isAccountOwner,
    accessInvite: allow,
  },
  Mutation: {
    createAccessInvite: isAccountOwner,
    revokeAccessInvite: isAccountOwner,
    acceptAccessInvite: allow,
    setMemberAccess: isAccountOwner,
    removeAccountMember: isAccountOwner,
  },
}
