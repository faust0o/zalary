import { allow } from "graphql-shield"

import { isAccountOwner } from "../permissions.js"

export const delegatePermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    delegates: isAccountOwner,
    delegateInvites: isAccountOwner,
    delegateInvite: allow,
  },
  Mutation: {
    createDelegateInvite: isAccountOwner,
    revokeDelegateInvite: isAccountOwner,
    removeDelegate: isAccountOwner,
  },
}
