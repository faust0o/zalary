import { GraphQLError } from "graphql"
import { booleanArg, mutationField, nonNull, stringArg } from "nexus"
import {
  assertValidPassword,
  assertValidUsername,
  isUniqueViolation,
  isValidUsername,
  issueToken,
  MAX_PASSWORD_LENGTH,
  normalizeUsername,
  usernameTaken,
} from "../../auth/accounts.js"
import { hashPassword, verifyPassword } from "../../auth/password.js"

export const register = mutationField("register", {
  type: nonNull("AuthPayload"),
  args: {
    username: nonNull(stringArg()),
    password: nonNull(stringArg()),
  },
  async resolve(_parent, args, ctx) {
    const username = normalizeUsername(args.username)
    assertValidUsername(username)
    assertValidPassword(args.password)

    const passwordHash = await hashPassword(args.password)

    try {
      const user = await ctx.prisma.user.create({
        data: { username, passwordHash },
      })
      return { token: issueToken(user.id, user.tokenVersion), user }
    } catch (err) {
      if (isUniqueViolation(err)) throw usernameTaken()
      throw err
    }
  },
})

export const login = mutationField("login", {
  type: nonNull("AuthPayload"),
  args: {
    username: nonNull(stringArg()),
    password: nonNull(stringArg()),
  },
  async resolve(_parent, args, ctx) {
    const username = normalizeUsername(args.username)
    const invalid = new GraphQLError("Invalid username or password.")

    if (
      !isValidUsername(username) ||
      args.password.length === 0 ||
      args.password.length > MAX_PASSWORD_LENGTH
    ) {
      // Spend a hash so missing/invalid accounts don't return faster.
      await hashPassword(
        args.password.slice(0, MAX_PASSWORD_LENGTH) || "invalid"
      )
      throw invalid
    }

    const user = await ctx.prisma.user.findUnique({ where: { username } })
    if (!user) {
      await hashPassword(args.password)
      throw invalid
    }

    const matches = await verifyPassword(args.password, user.passwordHash)
    if (!matches) throw invalid

    return { token: issueToken(user.id, user.tokenVersion), user }
  },
})

export const changePassword = mutationField("changePassword", {
  type: nonNull("AuthPayload"),
  args: {
    currentPassword: nonNull(stringArg()),
    newPassword: nonNull(stringArg()),
  },
  async resolve(_parent, args, ctx) {
    if (!ctx.userId) throw new GraphQLError("Not authenticated")

    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
    })
    if (!user) throw new GraphQLError("Not authenticated")

    const matches = await verifyPassword(
      args.currentPassword,
      user.passwordHash
    )
    if (!matches) throw new GraphQLError("Current password is incorrect.")

    assertValidPassword(args.newPassword)

    const passwordHash = await hashPassword(args.newPassword)
    const updated = await ctx.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    })

    return {
      token: issueToken(updated.id, updated.tokenVersion),
      user: updated,
    }
  },
})

/**
 * Delete the signed-in user. For an account owner this also deletes all of the
 * account's payroll data, its treasury and its members and delegates; anyone
 * else only deletes their own login.
 */
export const deleteAccount = mutationField("deleteAccount", {
  type: nonNull("Boolean"),
  args: {
    // Only browsers can open the treasury's balance, so the owner's says it's
    // empty.
    treasuryEmpty: booleanArg(),
  },
  async resolve(_parent, args, ctx) {
    const { userId, accountId } = ctx
    if (!userId) throw new GraphQLError("Not authenticated")

    if (accountId !== userId) {
      // A signer's key share goes with their login; refuse while that would
      // leave the treasury unable to spend.
      await assertNotLastNeededSigner(ctx.prisma, userId)
      await ctx.prisma.user.delete({ where: { id: userId } })
      return true
    }

    // Deleting the account deletes every key share with it, so funds still in
    // the treasury would be locked for good.
    const treasury = await ctx.prisma.treasury.findUnique({
      where: { accountId: userId },
    })
    if (treasury?.status === "ACTIVE" && !args.treasuryEmpty) {
      throw new GraphQLError(
        "Your treasury may still hold funds. Pay them out before deleting the account."
      )
    }

    // Cascades to sealed records, the treasury, members, delegates and
    // invites.
    await ctx.prisma.user.delete({ where: { id: userId } })
    return true
  },
})

/**
 * Throw if removing `userId` would leave an active treasury with fewer key
 * shares than its threshold, which would lock its funds for good.
 */
export async function assertNotLastNeededSigner(
  prisma: import("@prisma/client").PrismaClient,
  userId: string
): Promise<void> {
  const memberships = await prisma.treasuryMember.findMany({
    where: { userId, encryptedKeyPackage: { not: null } },
    include: {
      treasury: {
        include: {
          _count: {
            select: {
              members: { where: { encryptedKeyPackage: { not: null } } },
            },
          },
        },
      },
    },
  })
  for (const { treasury } of memberships) {
    if (treasury.status === "KEYGEN") {
      throw new GraphQLError(
        "A key ceremony is running for this treasury. Wait for it to finish or be reset."
      )
    }
    if (
      treasury.status === "ACTIVE" &&
      treasury._count.members - 1 < treasury.threshold
    ) {
      throw new GraphQLError(
        `The treasury needs ${treasury.threshold} signers to spend. Removing this signer would lock its funds.`
      )
    }
  }
}
