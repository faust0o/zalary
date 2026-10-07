import { makeSchema } from "nexus"
import { applyMiddleware } from "graphql-middleware"
import { shield, type IRules } from "graphql-shield"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

// Auth
import * as AuthTypes from "./auth/auth.types.js"
import * as AuthQueries from "./auth/auth.queries.js"
import * as AuthMutations from "./auth/auth.mutations.js"
import { authPermissions } from "./auth/auth.permissions.js"

// Access (members and delegates)
import * as AccessTypes from "./access/access.types.js"
import * as AccessQueries from "./access/access.queries.js"
import * as AccessMutations from "./access/access.mutations.js"
import { accessPermissions } from "./access/access.permissions.js"

// Passkeys
import * as PasskeyTypes from "./passkeys/passkeys.types.js"
import * as PasskeyQueries from "./passkeys/passkeys.queries.js"
import * as PasskeyMutations from "./passkeys/passkeys.mutations.js"
import { passkeyPermissions } from "./passkeys/passkeys.permissions.js"

// Treasury
import * as TreasuryTypes from "./treasury/treasury.types.js"
import * as TreasuryQueries from "./treasury/treasury.queries.js"
import * as TreasuryMutations from "./treasury/treasury.mutations.js"
import { treasuryPermissions } from "./treasury/treasury.permissions.js"

// Spend proposals
import * as ProposalTypes from "./proposals/proposals.types.js"
import * as ProposalQueries from "./proposals/proposals.queries.js"
import * as ProposalMutations from "./proposals/proposals.mutations.js"
import { proposalPermissions } from "./proposals/proposals.permissions.js"

// Sealed payroll data and the account key
import * as RecordTypes from "./records/records.types.js"
import * as RecordQueries from "./records/records.queries.js"
import * as RecordMutations from "./records/records.mutations.js"
import { recordPermissions } from "./records/records.permissions.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const baseSchema = makeSchema({
  types: [
    AuthTypes,
    AuthQueries,
    AuthMutations,
    AccessTypes,
    AccessQueries,
    AccessMutations,
    PasskeyTypes,
    PasskeyQueries,
    PasskeyMutations,
    TreasuryTypes,
    TreasuryQueries,
    TreasuryMutations,
    ProposalTypes,
    ProposalQueries,
    ProposalMutations,
    RecordTypes,
    RecordQueries,
    RecordMutations,
  ],
  outputs: {
    schema: join(__dirname, "../../schema.graphql"),
    typegen: join(__dirname, "../../__generated__/nexus-typegen.ts"),
  },
  contextType: {
    module: join(__dirname, "../context.ts"),
    export: "Context",
  },
})

// Merge all domain permissions
const permissions = shield(
  {
    Query: {
      ...authPermissions.Query,
      ...accessPermissions.Query,
      ...passkeyPermissions.Query,
      ...treasuryPermissions.Query,
      ...proposalPermissions.Query,
      ...recordPermissions.Query,
    },
    Mutation: {
      ...authPermissions.Mutation,
      ...accessPermissions.Mutation,
      ...passkeyPermissions.Mutation,
      ...treasuryPermissions.Mutation,
      ...proposalPermissions.Mutation,
      ...recordPermissions.Mutation,
    },
  } as IRules,
  {
    allowExternalErrors: true,
  }
)

export const schema = applyMiddleware(baseSchema, permissions)
