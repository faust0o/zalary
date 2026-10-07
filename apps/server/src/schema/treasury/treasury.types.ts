import type { TreasuryMember as TreasuryMemberRow } from "@prisma/client"
import { enumType, inputObjectType, objectType } from "nexus"
import { treasuryInviteToken } from "../../auth/invite.js"

/** Presence heartbeats arrive every few seconds while the room is open. */
export const ONLINE_WINDOW_MS = 20_000

export const TreasuryStatusEnum = enumType({
  name: "TreasuryStatus",
  members: ["DRAFT", "KEYGEN", "ACTIVE"],
})

export const Treasury = objectType({
  name: "Treasury",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("name")
    t.string("description")
    t.nonNull.int("threshold")
    t.nonNull.field("status", { type: "TreasuryStatus" })
    t.string("dkgSessionId")
    t.string("keygenStartedAt", {
      resolve(parent) {
        return parent.keygenStartedAt?.toISOString() ?? null
      },
    })
    t.string("groupPublicKey")
    t.string("publicKeyPackage")
    t.string("address")
    t.string("changeAddress")
    t.int("birthdayHeight")
    // Only the coordinator can open it, so nobody else gets the ciphertext.
    t.string("encryptedViewingKey", {
      resolve(parent, _args, ctx) {
        return ctx.userId === parent.accountId
          ? parent.encryptedViewingKey
          : null
      },
    })
    // Sealed under the account key, so everyone with access can open it.
    t.string("sealedBalance")
    t.nonNull.boolean("isCoordinator", {
      resolve(parent, _args, ctx) {
        return ctx.userId === parent.accountId
      },
    })
    t.nonNull.field("coordinator", {
      type: "User",
      resolve(parent, _args, ctx) {
        return ctx.prisma.user.findUniqueOrThrow({
          where: { id: parent.accountId },
        })
      },
    })
    t.nonNull.list.nonNull.field("members", {
      type: "TreasuryMember",
      async resolve(parent, _args, ctx) {
        const members: TreasuryMemberRow[] =
          await ctx.prisma.treasuryMember.findMany({
            where: { treasuryId: parent.id },
            orderBy: { createdAt: "asc" },
          })
        // The coordinator is always member 1.
        return members.sort(
          (a, b) =>
            Number(b.userId === parent.accountId) -
            Number(a.userId === parent.accountId)
        )
      },
    })
    t.field("myMembership", {
      type: "TreasuryMember",
      resolve(parent, _args, ctx) {
        if (!ctx.userId) return null
        return ctx.prisma.treasuryMember.findUnique({
          where: {
            treasuryId_userId: { treasuryId: parent.id, userId: ctx.userId },
          },
        })
      },
    })
    t.nonNull.int("signerCount", {
      resolve(parent, _args, ctx) {
        return ctx.prisma.treasuryMember.count({
          where: {
            treasuryId: parent.id,
            encryptedKeyPackage: { not: null },
          },
        })
      },
    })
    // Open member-slot links. Only the coordinator hands them out.
    t.nonNull.list.nonNull.field("invites", {
      type: "TreasuryInvite",
      resolve(parent, _args, ctx) {
        if (ctx.userId !== parent.accountId) return []
        return ctx.prisma.treasuryInvite.findMany({
          where: {
            treasuryId: parent.id,
            acceptedById: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "asc" },
        })
      },
    })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
  },
})

/** The treasury viewing key, encrypted by the coordinator for one signer. */
export const ViewingKeyMessageInput = inputObjectType({
  name: "ViewingKeyMessageInput",
  definition(t) {
    t.nonNull.id("userId")
    t.nonNull.string("message")
  },
})

export const TreasuryMember = objectType({
  name: "TreasuryMember",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.field("user", {
      type: "User",
      resolve(parent, _args, ctx) {
        return ctx.prisma.user.findUniqueOrThrow({
          where: { id: parent.userId },
        })
      },
    })
    t.string("identifier")
    t.nonNull.boolean("hasKeyShare", {
      resolve(parent) {
        return parent.encryptedKeyPackage !== null
      },
    })
    // Only the member themselves can open it.
    t.string("encryptedKeyPackage", {
      resolve(parent, _args, ctx) {
        return parent.userId === ctx.userId ? parent.encryptedKeyPackage : null
      },
    })
    // Only the member themselves can open it.
    t.string("viewingKeyMessage", {
      resolve(parent, _args, ctx) {
        return parent.userId === ctx.userId ? parent.viewingKeyMessage : null
      },
    })
    t.nonNull.boolean("hasViewingKey", {
      resolve(parent) {
        return parent.viewingKeyMessage !== null
      },
    })
    t.string("groupPublicKey")
    t.nonNull.boolean("isCoordinator", {
      async resolve(parent, _args, ctx) {
        const treasury = await ctx.prisma.treasury.findUniqueOrThrow({
          where: { id: parent.treasuryId },
          select: { accountId: true },
        })
        return treasury.accountId === parent.userId
      },
    })
    t.nonNull.boolean("online", {
      resolve(parent) {
        return (
          parent.lastSeenAt !== null &&
          Date.now() - parent.lastSeenAt.getTime() < ONLINE_WINDOW_MS
        )
      },
    })
    t.nonNull.boolean("ready", {
      resolve(parent) {
        return (
          parent.ready &&
          parent.lastSeenAt !== null &&
          Date.now() - parent.lastSeenAt.getTime() < ONLINE_WINDOW_MS
        )
      },
    })
    t.nonNull.string("joinedAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
  },
})

/** A member-slot link handed out while setting the treasury up. */
export const TreasuryInvite = objectType({
  name: "TreasuryInvite",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("token", {
      resolve(parent) {
        return treasuryInviteToken(parent.id)
      },
    })
    t.nonNull.string("expiresAt", {
      resolve(parent) {
        return parent.expiresAt.toISOString()
      },
    })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
  },
})

/** What someone holding a treasury invite may see before accepting it. */
export const TreasuryInvitePreview = objectType({
  name: "TreasuryInvitePreview",
  definition(t) {
    t.nonNull.string("treasuryName")
    t.string("treasuryDescription")
    t.nonNull.string("ownerUsername")
    t.nonNull.int("threshold")
    t.nonNull.int("memberCount")
    t.nonNull.string("expiresAt")
  },
})
