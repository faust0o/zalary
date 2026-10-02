import { allow } from "graphql-shield"

import { isAccountOwner, isAuthenticated } from "../permissions.js"

export const authPermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    me: allow,
  },
  Mutation: {
    register: allow,
    acceptDelegateInvite: allow,
    login: allow,
    changePassword: isAuthenticated,
    updateUser: isAccountOwner,
  },
}
