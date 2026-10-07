import { GraphQLError } from "graphql"
import { idArg, list, mutationField, nonNull, stringArg } from "nexus"
import { isUniqueViolation } from "../../auth/accounts.js"
import { requireUser } from "../permissions.js"

const BASE64URL_RE = /^[A-Za-z0-9_-]{16,1024}$/
const BASE64_RE = /^[A-Za-z0-9+/]{16,1024}={0,2}$/
const HEX32_RE = /^[0-9a-f]{64}$/
const TRANSPORT_RE = /^[a-z-]{1,20}$/

/**
 * Add a passkey to the signed-in user's vault. Every passkey wraps the same
 * vault key, so they all derive the same comms key; a mismatch means the
 * browser created a second, unrelated vault.
 */
export const registerPasskey = mutationField("registerPasskey", {
  type: nonNull("Passkey"),
  args: {
    credentialId: nonNull(stringArg()),
    prfSalt: nonNull(stringArg()),
    wrappedVaultKey: nonNull(stringArg()),
    commsPublicKey: nonNull(stringArg()),
    transports: list(nonNull(stringArg())),
  },
  async resolve(_parent, args, ctx) {
    const { userId } = requireUser(ctx)
    if (
      !BASE64URL_RE.test(args.credentialId) ||
      !BASE64URL_RE.test(args.prfSalt) ||
      !BASE64_RE.test(args.wrappedVaultKey) ||
      !HEX32_RE.test(args.commsPublicKey) ||
      (args.transports ?? []).length > 8 ||
      !(args.transports ?? []).every((t: string) => TRANSPORT_RE.test(t))
    ) {
      throw new GraphQLError("Malformed passkey registration.")
    }

    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    })
    if (user.commsPublicKey && user.commsPublicKey !== args.commsPublicKey) {
      throw new GraphQLError(
        "This passkey was set up for a different vault. Unlock with your existing passkey first."
      )
    }

    try {
      const [passkey] = await ctx.prisma.$transaction([
        ctx.prisma.passkey.create({
          data: {
            userId,
            credentialId: args.credentialId,
            prfSalt: args.prfSalt,
            wrappedVaultKey: args.wrappedVaultKey,
            transports: args.transports ?? [],
          },
        }),
        ctx.prisma.user.update({
          where: { id: userId },
          data: {
            commsPublicKey: args.commsPublicKey,
            // A new vault can't open what was sealed to an old one.
            ...(user.commsPublicKey
              ? {}
              : { sealedAccountKey: null, accountKeySealedBy: null }),
          },
        }),
      ])
      return passkey
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new GraphQLError("This passkey is already registered.")
      }
      throw err
    }
  },
})

export const removePasskey = mutationField("removePasskey", {
  type: nonNull("Passkey"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    const { userId } = requireUser(ctx)
    const passkey = await ctx.prisma.passkey.findFirst({
      where: { id: args.id, userId },
    })
    if (!passkey) throw new Error("Passkey not found")

    const remaining = await ctx.prisma.passkey.count({ where: { userId } })
    if (remaining <= 1) {
      const { accountId } = requireUser(ctx)
      const [shares, viewingKeys, me, otherKeyHolders] = await Promise.all([
        ctx.prisma.treasuryMember.count({
          where: { userId, encryptedKeyPackage: { not: null } },
        }),
        ctx.prisma.treasury.count({
          where: { accountId: userId, encryptedViewingKey: { not: null } },
        }),
        ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
        ctx.prisma.user.count({
          where: {
            OR: [{ id: accountId }, { ownerId: accountId }],
            id: { not: userId },
            sealedAccountKey: { not: null },
          },
        }),
      ])
      if (shares > 0 || viewingKeys > 0) {
        throw new GraphQLError(
          "This is the only passkey that can open your treasury keys. Add another passkey before removing it."
        )
      }
      // Without anyone else holding the account key, the payroll data would
      // be gone for good.
      if (me.sealedAccountKey && otherKeyHolders === 0) {
        throw new GraphQLError(
          "This is the only passkey that can open your payroll data. Add another passkey before removing it."
        )
      }
      // The vault key goes with its last wrapping, so the next passkey starts
      // a new vault with a new comms key, and someone has to share the
      // account key with it again.
      const [removed] = await ctx.prisma.$transaction([
        ctx.prisma.passkey.delete({ where: { id: passkey.id } }),
        ctx.prisma.user.update({
          where: { id: userId },
          data: {
            commsPublicKey: null,
            sealedAccountKey: null,
            accountKeySealedBy: null,
          },
        }),
      ])
      return removed
    }

    return ctx.prisma.passkey.delete({ where: { id: passkey.id } })
  },
})
