import { enumType, objectType } from "nexus"

// Members and delegates work in their owner's account, so the account-level fields below
// resolve against the owner.
function accountIdOf(user: { id: string; ownerId: string | null }): string {
  return user.ownerId ?? user.id
}

export const AccessRoleEnum = enumType({
  name: "AccessRole",
  members: ["MEMBER", "DELEGATE"],
})

export const AuthPayload = objectType({
  name: "AuthPayload",
  definition(t) {
    t.nonNull.string("token")
    t.nonNull.field("user", { type: "User" })
  },
})

export const User = objectType({
  name: "User",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("username")
    t.string("name")
    t.field("owner", {
      type: "User",
      resolve(parent, _args, ctx) {
        if (!parent.ownerId) return null
        return ctx.prisma.user.findUnique({ where: { id: parent.ownerId } })
      },
    })
    t.nonNull.boolean("isAccountOwner", {
      resolve(parent) {
        return !parent.ownerId
      },
    })
    // Owners always have full access; for everyone else this is their role in
    // the owner's account.
    t.field("role", {
      type: "AccessRole",
      resolve(parent) {
        return parent.ownerId ? parent.role : null
      },
    })
    t.nonNull.boolean("canEditPayroll", {
      resolve(parent) {
        return !parent.ownerId || parent.role === "DELEGATE"
      },
    })
    t.string("commsPublicKey")
    t.nonNull.boolean("hasPasskey", {
      async resolve(parent, _args, ctx) {
        const count = await ctx.prisma.passkey.count({
          where: { userId: parent.id },
          take: 1,
        })
        return count > 0
      },
    })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
    // Whether someone shared the account's data key with them.
    t.nonNull.boolean("hasAccountKey", {
      resolve(parent) {
        return parent.sealedAccountKey !== null
      },
    })
    t.nonNull.boolean("hasTreasury", {
      async resolve(parent, _args, ctx) {
        const count = await ctx.prisma.treasury.count({
          where: { accountId: accountIdOf(parent), status: "ACTIVE" },
          take: 1,
        })
        return count > 0
      },
    })
  },
})
