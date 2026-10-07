import type { Prisma, Treasury, TreasuryMember } from "@prisma/client"
import { GraphQLError } from "graphql"
import {
  arg,
  booleanArg,
  idArg,
  intArg,
  list,
  mutationField,
  nonNull,
  stringArg,
} from "nexus"
import {
  createAccountUser,
  isUniqueViolation,
  issueToken,
  prepareAccountUser,
  usernameTaken,
} from "../../auth/accounts.js"
import { INVITE_TTL_MS, treasuryInviteIdFromToken } from "../../auth/invite.js"
import type { Context } from "../../context.js"
import { requireAccountOwner, requireUser } from "../permissions.js"

const MAX_NAME_LENGTH = 64
const MAX_DESCRIPTION_LENGTH = 64
const MIN_SIGNERS = 2
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const HEX32_RE = /^[0-9a-f]{64}$/
const HEX_RE = /^[0-9a-f]{2,256}$/
const CIPHERTEXT_RE = /^[A-Za-z0-9+/]+={0,2}$/
const NOISE_MESSAGE_RE = /^[0-9a-f]{2,8192}$/

function cleanName(raw: string): string {
  const name = raw.trim()
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new GraphQLError(
      `Name must be between 1 and ${MAX_NAME_LENGTH} characters.`
    )
  }
  return name
}

function cleanDescription(raw: string | null | undefined): string | null {
  const description = raw?.trim() ?? ""
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new GraphQLError(
      `Description can be at most ${MAX_DESCRIPTION_LENGTH} characters.`
    )
  }
  return description || null
}

function assertCiphertext(value: string, what: string): void {
  if (value.length > 64_000 || !CIPHERTEXT_RE.test(value)) {
    throw new GraphQLError(`Malformed ${what}.`)
  }
}

/**
 * The viewing key messages for `members`, by member id. Every signer but the
 * coordinator gets exactly one; the coordinator keeps its own sealed copy.
 */
function viewingKeyMessages(
  messages: { userId: string; message: string }[],
  members: TreasuryMember[],
  coordinatorId: string
): Map<string, string> {
  const byUser = new Map<string, string>()
  for (const { userId, message } of messages) {
    if (!NOISE_MESSAGE_RE.test(message) || byUser.has(userId)) {
      throw new GraphQLError("Malformed viewing key message.")
    }
    byUser.set(userId, message)
  }
  const byMember = new Map<string, string>()
  for (const member of members) {
    if (member.userId === coordinatorId || !member.encryptedKeyPackage) continue
    const message = byUser.get(member.userId)
    if (message) byMember.set(member.id, message)
    byUser.delete(member.userId)
  }
  if (byUser.size > 0) {
    throw new GraphQLError(
      "A viewing key message is for someone who isn't a signer."
    )
  }
  return byMember
}

async function ownTreasury(
  ctx: Context,
  status?: Treasury["status"]
): Promise<Treasury> {
  const ownerId = requireAccountOwner(ctx)
  const treasury = await ctx.prisma.treasury.findUnique({
    where: { accountId: ownerId },
  })
  if (!treasury) throw new GraphQLError("No treasury yet.")
  if (status && treasury.status !== status) {
    throw new GraphQLError(
      status === "DRAFT"
        ? "The treasury's members and threshold are fixed once the key ceremony starts."
        : status === "KEYGEN"
          ? "No key ceremony is running."
          : "The treasury isn't active yet."
    )
  }
  return treasury
}

/** The account treasury and the caller's membership in it. */
async function membership(ctx: Context) {
  const { userId, accountId } = requireUser(ctx)
  const member = await ctx.prisma.treasuryMember.findFirst({
    where: { userId, treasury: { accountId } },
    include: { treasury: true },
  })
  if (!member) throw new GraphQLError("You're not a member of this treasury.")
  return member
}

export const createTreasury = mutationField("createTreasury", {
  type: nonNull("Treasury"),
  args: {
    name: nonNull(stringArg()),
    description: stringArg(),
  },
  async resolve(_parent, args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    const name = cleanName(args.name)
    const description = cleanDescription(args.description)

    try {
      return await ctx.prisma.treasury.create({
        data: {
          accountId: ownerId,
          name,
          description,
          threshold: MIN_SIGNERS,
          members: { create: { userId: ownerId } },
        },
      })
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new GraphQLError("This account already has a treasury.")
      }
      throw err
    }
  },
})

export const updateTreasury = mutationField("updateTreasury", {
  type: nonNull("Treasury"),
  args: {
    name: stringArg(),
    description: stringArg(),
    threshold: intArg(),
  },
  async resolve(_parent, args, ctx) {
    const treasury = await ownTreasury(ctx)
    if (args.threshold != null) {
      if (treasury.status !== "DRAFT") {
        throw new GraphQLError(
          "The threshold is fixed once the key ceremony starts."
        )
      }
      if (args.threshold < MIN_SIGNERS || args.threshold > 32) {
        throw new GraphQLError(
          `The threshold must be at least ${MIN_SIGNERS}: FROST needs two or more signers.`
        )
      }
    }
    return ctx.prisma.treasury.update({
      where: { id: treasury.id },
      data: {
        ...(args.name != null ? { name: cleanName(args.name) } : {}),
        ...(args.description !== undefined
          ? { description: cleanDescription(args.description) }
          : {}),
        ...(args.threshold != null ? { threshold: args.threshold } : {}),
      },
    })
  },
})

/** Abandon a treasury that never finished its key ceremony. */
export const deleteTreasury = mutationField("deleteTreasury", {
  type: nonNull("Boolean"),
  async resolve(_parent, _args, ctx) {
    const treasury = await ownTreasury(ctx)
    if (treasury.status === "ACTIVE") {
      throw new GraphQLError(
        "An active treasury can't be deleted: it may hold funds."
      )
    }
    await ctx.prisma.treasury.delete({ where: { id: treasury.id } })
    return true
  },
})

export const createTreasuryInvite = mutationField("createTreasuryInvite", {
  type: nonNull("TreasuryInvite"),
  async resolve(_parent, _args, ctx) {
    const treasury = await ownTreasury(ctx, "DRAFT")
    const now = new Date()
    await ctx.prisma.treasuryInvite.deleteMany({
      where: {
        treasuryId: treasury.id,
        acceptedById: null,
        expiresAt: { lte: now },
      },
    })
    return ctx.prisma.treasuryInvite.create({
      data: {
        treasuryId: treasury.id,
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
      },
    })
  },
})

export const revokeTreasuryInvite = mutationField("revokeTreasuryInvite", {
  type: nonNull("TreasuryInvite"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    const treasury = await ownTreasury(ctx, "DRAFT")
    const invite = await ctx.prisma.treasuryInvite.findFirst({
      where: { id: args.id, treasuryId: treasury.id, acceptedById: null },
    })
    if (!invite) throw new Error("Invite not found")
    return ctx.prisma.treasuryInvite.delete({ where: { id: invite.id } })
  },
})

/** Take someone off the treasury before the ceremony. Their login stays. */
export const removeTreasuryMember = mutationField("removeTreasuryMember", {
  type: nonNull("TreasuryMember"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    const treasury = await ownTreasury(ctx, "DRAFT")
    const member = await ctx.prisma.treasuryMember.findFirst({
      where: { id: args.id, treasuryId: treasury.id },
    })
    if (!member) throw new Error("Member not found")
    if (member.userId === treasury.accountId) {
      throw new GraphQLError("The coordinator can't leave the treasury.")
    }
    return ctx.prisma.treasuryMember.delete({ where: { id: member.id } })
  },
})

/**
 * Take a member slot. Someone signed out creates a member login in the
 * owner's account on the way; someone signed in to that account just joins.
 */
export const acceptTreasuryInvite = mutationField("acceptTreasuryInvite", {
  type: nonNull("AuthPayload"),
  args: {
    token: nonNull(stringArg()),
    name: stringArg(),
    username: stringArg(),
    password: stringArg(),
  },
  async resolve(_parent, args, ctx) {
    const invalid = new GraphQLError(
      "This invite link is invalid, has expired, or has already been used."
    )
    const inviteId = treasuryInviteIdFromToken(args.token)
    if (!inviteId) throw invalid

    const newUser = ctx.userId
      ? null
      : await prepareAccountUser({
          name: args.name ?? "",
          username: args.username ?? "",
          password: args.password ?? "",
        })

    try {
      const user = await ctx.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const invite = await tx.treasuryInvite.findUnique({
            where: { id: inviteId },
            include: { treasury: true },
          })
          if (
            !invite ||
            invite.acceptedById ||
            invite.expiresAt <= new Date() ||
            invite.treasury.status !== "DRAFT"
          ) {
            throw invalid
          }
          const { accountId } = invite.treasury

          let user
          if (ctx.userId) {
            user = await tx.user.findUniqueOrThrow({
              where: { id: ctx.userId },
            })
            if (user.id === accountId) {
              throw new GraphQLError("You're already in this treasury.")
            }
            if (user.ownerId !== accountId) {
              const theirTreasury = await tx.treasury.findUnique({
                where: { accountId: user.ownerId ?? user.id },
              })
              throw new GraphQLError(
                theirTreasury
                  ? "Your account is already connected to a treasury. You cannot join multiple treasuries."
                  : "You're signed in to a different account. Log out to join with a new login."
              )
            }
          } else {
            user = await createAccountUser(tx, newUser!, accountId, "MEMBER")
          }

          // Only one concurrent accept can claim the slot.
          const { count } = await tx.treasuryInvite.updateMany({
            where: { id: invite.id, acceptedById: null },
            data: { acceptedById: user.id },
          })
          if (count !== 1) throw invalid

          const existing = await tx.treasuryMember.findUnique({
            where: {
              treasuryId_userId: {
                treasuryId: invite.treasuryId,
                userId: user.id,
              },
            },
          })
          if (existing) {
            throw new GraphQLError("You're already in this treasury.")
          }
          await tx.treasuryMember.create({
            data: { treasuryId: invite.treasuryId, userId: user.id },
          })
          return user
        }
      )
      return { token: issueToken(user.id, user.tokenVersion), user }
    } catch (err) {
      if (isUniqueViolation(err)) throw usernameTaken()
      throw err
    }
  },
})

/** Presence in the ceremony room, and whether the member's vault is open. */
export const treasuryHeartbeat = mutationField("treasuryHeartbeat", {
  type: nonNull("TreasuryMember"),
  args: { ready: nonNull(booleanArg()) },
  async resolve(_parent, args, ctx) {
    const member = await membership(ctx)
    return ctx.prisma.treasuryMember.update({
      where: { id: member.id },
      data: { lastSeenAt: new Date(), ready: args.ready },
    })
  },
})

/**
 * Lock the member set and threshold and open the key ceremony. The
 * coordinator's browser has already created `dkgSessionId` on frostd with
 * every member's comms key; the others join it from the ceremony room.
 */
export const startTreasuryKeygen = mutationField("startTreasuryKeygen", {
  type: nonNull("Treasury"),
  args: { dkgSessionId: nonNull(stringArg()) },
  async resolve(_parent, args, ctx) {
    const treasury = await ownTreasury(ctx, "DRAFT")
    if (!UUID_RE.test(args.dkgSessionId)) {
      throw new GraphQLError("Malformed session id.")
    }

    const [members, openInvites] = await Promise.all([
      ctx.prisma.treasuryMember.findMany({
        where: { treasuryId: treasury.id },
        include: { user: { select: { username: true, commsPublicKey: true } } },
      }),
      ctx.prisma.treasuryInvite.count({
        where: {
          treasuryId: treasury.id,
          acceptedById: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ])
    if (openInvites > 0) {
      throw new GraphQLError(
        "Some invite links haven't been used yet. Wait for them or revoke them."
      )
    }
    if (members.length < MIN_SIGNERS) {
      throw new GraphQLError("A treasury needs at least two members.")
    }
    if (
      treasury.threshold < MIN_SIGNERS ||
      treasury.threshold > members.length
    ) {
      throw new GraphQLError(
        `The threshold must be between ${MIN_SIGNERS} and ${members.length}.`
      )
    }
    type Candidate = {
      user: { username: string; commsPublicKey: string | null }
    }
    const withoutPasskey = members.filter(
      (m: Candidate) => !m.user.commsPublicKey
    )
    if (withoutPasskey.length > 0) {
      throw new GraphQLError(
        `Waiting for ${withoutPasskey.map((m: Candidate) => `@${m.user.username}`).join(", ")} to set up a passkey.`
      )
    }

    const [, started] = await ctx.prisma.$transaction([
      ctx.prisma.treasuryMember.updateMany({
        where: { treasuryId: treasury.id },
        data: {
          identifier: null,
          encryptedKeyPackage: null,
          groupPublicKey: null,
          publicKeyPackage: null,
        },
      }),
      ctx.prisma.treasury.update({
        where: { id: treasury.id },
        data: {
          status: "KEYGEN",
          dkgSessionId: args.dkgSessionId,
          keygenStartedAt: new Date(),
        },
      }),
    ])
    return started
  },
})

/** A member's outcome of the key ceremony, their share already encrypted. */
export const submitKeygenResult = mutationField("submitKeygenResult", {
  type: nonNull("TreasuryMember"),
  args: {
    dkgSessionId: nonNull(stringArg()),
    identifier: nonNull(stringArg()),
    encryptedKeyPackage: nonNull(stringArg()),
    publicKeyPackage: nonNull(stringArg()),
    groupPublicKey: nonNull(stringArg()),
  },
  async resolve(_parent, args, ctx) {
    const member = await membership(ctx)
    if (
      member.treasury.status !== "KEYGEN" ||
      member.treasury.dkgSessionId !== args.dkgSessionId
    ) {
      throw new GraphQLError("This key ceremony is no longer running.")
    }
    if (!HEX_RE.test(args.identifier) || !HEX32_RE.test(args.groupPublicKey)) {
      throw new GraphQLError("Malformed key ceremony result.")
    }
    assertCiphertext(args.encryptedKeyPackage, "key share")
    if (args.publicKeyPackage.length > 64_000) {
      throw new GraphQLError("Malformed public key package.")
    }
    JSON.parse(args.publicKeyPackage)

    return ctx.prisma.treasuryMember.update({
      where: { id: member.id },
      data: {
        identifier: args.identifier,
        encryptedKeyPackage: args.encryptedKeyPackage,
        publicKeyPackage: args.publicKeyPackage,
        groupPublicKey: args.groupPublicKey,
      },
    })
  },
})

/**
 * Activate the treasury once every member reported the same group key. The
 * coordinator derived the viewing key and address from it in their browser.
 */
export const finalizeTreasury = mutationField("finalizeTreasury", {
  type: nonNull("Treasury"),
  args: {
    address: nonNull(stringArg()),
    changeAddress: nonNull(stringArg()),
    encryptedViewingKey: nonNull(stringArg()),
    viewingKeyMessages: nonNull(
      list(nonNull(arg({ type: "ViewingKeyMessageInput" })))
    ),
    birthdayHeight: nonNull(intArg()),
  },
  async resolve(_parent, args, ctx) {
    const treasury = await ownTreasury(ctx, "KEYGEN")
    assertCiphertext(args.encryptedViewingKey, "viewing key")
    if (
      !/^[a-z0-9]{10,1000}$/.test(args.address) ||
      !/^[a-z0-9]{10,1000}$/.test(args.changeAddress)
    ) {
      throw new GraphQLError("Malformed address.")
    }
    if (args.birthdayHeight < 1) {
      throw new GraphQLError("Malformed birthday height.")
    }

    const members: TreasuryMember[] = await ctx.prisma.treasuryMember.findMany({
      where: { treasuryId: treasury.id },
    })
    if (members.some((m) => !m.encryptedKeyPackage)) {
      throw new GraphQLError("Not every member has finished the ceremony.")
    }
    const [first] = members
    const agree = members.every(
      (m) =>
        m.groupPublicKey === first.groupPublicKey &&
        m.publicKeyPackage === first.publicKeyPackage
    )
    const identifiers = new Set(members.map((m) => m.identifier))
    if (!agree || identifiers.size !== members.length) {
      throw new GraphQLError(
        "Members ended the ceremony with different keys. Restart the ceremony."
      )
    }
    const messages = viewingKeyMessages(
      args.viewingKeyMessages,
      members,
      treasury.accountId
    )
    if (messages.size !== members.length - 1) {
      throw new GraphQLError("Every signer needs the treasury's viewing key.")
    }

    const results = await ctx.prisma.$transaction([
      ...[...messages].map(([id, viewingKeyMessage]) =>
        ctx.prisma.treasuryMember.update({
          where: { id },
          data: { viewingKeyMessage },
        })
      ),
      ctx.prisma.treasury.update({
        where: { id: treasury.id },
        data: {
          status: "ACTIVE",
          groupPublicKey: first.groupPublicKey,
          publicKeyPackage: first.publicKeyPackage,
          address: args.address,
          changeAddress: args.changeAddress,
          encryptedViewingKey: args.encryptedViewingKey,
          birthdayHeight: args.birthdayHeight,
          dkgSessionId: null,
        },
      }),
    ])
    // The treasury update goes last.
    return results.at(-1) as Treasury
  },
})

/**
 * Give signers who don't have it yet the treasury's viewing key, e.g. for
 * treasuries activated before signers got one. Never replaces a key a signer
 * already holds: they checked that one against the treasury's addresses.
 */
export const shareTreasuryViewingKey = mutationField(
  "shareTreasuryViewingKey",
  {
    type: nonNull("Treasury"),
    args: {
      viewingKeyMessages: nonNull(
        list(nonNull(arg({ type: "ViewingKeyMessageInput" })))
      ),
    },
    async resolve(_parent, args, ctx) {
      const treasury = await ownTreasury(ctx, "ACTIVE")
      const members: TreasuryMember[] =
        await ctx.prisma.treasuryMember.findMany({
          where: { treasuryId: treasury.id },
        })
      const messages = viewingKeyMessages(
        args.viewingKeyMessages,
        members,
        treasury.accountId
      )
      await ctx.prisma.$transaction(
        [...messages].map(([id, viewingKeyMessage]) =>
          ctx.prisma.treasuryMember.updateMany({
            where: { id, viewingKeyMessage: null },
            data: { viewingKeyMessage },
          })
        )
      )
      return treasury
    },
  }
)

/** Abort a stuck ceremony and go back to setup. */
export const resetTreasuryKeygen = mutationField("resetTreasuryKeygen", {
  type: nonNull("Treasury"),
  async resolve(_parent, _args, ctx) {
    const treasury = await ownTreasury(ctx, "KEYGEN")
    const [, reset] = await ctx.prisma.$transaction([
      ctx.prisma.treasuryMember.updateMany({
        where: { treasuryId: treasury.id },
        data: {
          identifier: null,
          encryptedKeyPackage: null,
          groupPublicKey: null,
          publicKeyPackage: null,
          ready: false,
        },
      }),
      ctx.prisma.treasury.update({
        where: { id: treasury.id },
        data: { status: "DRAFT", dkgSessionId: null, keygenStartedAt: null },
      }),
    ])
    return reset
  },
})

/**
 * The coordinator's wallet reports what it synced, sealed under the account
 * key, for everyone else with access.
 */
export const reportTreasuryBalance = mutationField("reportTreasuryBalance", {
  type: nonNull("Treasury"),
  args: { sealedBalance: nonNull(stringArg()) },
  async resolve(_parent, args, ctx) {
    const treasury = await ownTreasury(ctx, "ACTIVE")
    assertCiphertext(args.sealedBalance, "balance")
    return ctx.prisma.treasury.update({
      where: { id: treasury.id },
      data: { sealedBalance: args.sealedBalance },
    })
  },
})
