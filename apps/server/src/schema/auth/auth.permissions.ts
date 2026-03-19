import { allow } from "graphql-shield"

import { isAuthenticated } from "../permissions.js"

export const authPermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    me: allow,
  },
  Mutation: {
    registerUser: allow,
    updateUser: isAuthenticated,
  },
}
