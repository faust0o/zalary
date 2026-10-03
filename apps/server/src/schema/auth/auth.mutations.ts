import { Prisma } from "@prisma/client"
import { GraphQLError } from "graphql"
import { intArg, mutationField, nonNull, stringArg } from "nexus"
import { inviteIdFromToken } from "../../auth/invite.js"
import { hashPassword, verifyPassword } from "../../auth/password.js"
import { getAuthSecret, signAuthToken } from "../../auth/token.js"
import { requireAccountOwner } from "../permissions.js"

const USERNAME_RE = /^[a-z0-9_]{3,32}$/
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128
const MAX_NAME_LENGTH = 100

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

function assertValidUsername(username: string): void {
  if (!USERNAME_RE.test(username)) {
    throw new GraphQLError(
      "Username must be 3–32 characters and use only letters, numbers, and underscores."
    )
  }
}

function assertValidPassword(password: string): void {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new GraphQLError(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
    )
  }
}

function assertValidName(name: string): void {
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new GraphQLError(
      `Name must be between 1 and ${MAX_NAME_LENGTH} characters.`
    )
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  )
}

function requireAuthSecret(): string {
  const secret = getAuthSecret()
  if (!secret) {
    throw new GraphQLError("Authentication is not configured on the server.")
  }
  return secret
}

function issueToken(userId: string, tokenVersion: number): string {
  return signAuthToken(userId, tokenVersion, requireAuthSecret())
}

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
      if (isUniqueViolation(err)) {
        throw new GraphQLError("That username is already taken.")
      }
      throw err
    }
  },
})

/** Create a delegate account for the owner who issued the invite. */
export const acceptDelegateInvite = mutationField("acceptDelegateInvite", {
  type: nonNull("AuthPayload"),
  args: {
    token: nonNull(stringArg()),
    name: nonNull(stringArg()),
    username: nonNull(stringArg()),
    password: nonNull(stringArg()),
  },
  async resolve(_parent, args, ctx) {
    const name = args.name.trim()
    assertValidName(name)
    const username = normalizeUsername(args.username)
    assertValidUsername(username)
    assertValidPassword(args.password)
    requireAuthSecret()

    const invalid = new GraphQLError(
      "This invite link is invalid or has expired."
    )
    const inviteId = inviteIdFromToken(args.token)
    if (!inviteId) throw invalid

    const passwordHash = await hashPassword(args.password)

    try {
      const user = await ctx.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const invite = await tx.delegateInvite.findUnique({
            where: { id: inviteId },
          })
          if (!invite || invite.expiresAt <= new Date()) throw invalid

          // Only one concurrent accept can delete the row, so each invite
          // creates at most one account. A failed create rolls this back.
          const { count } = await tx.delegateInvite.deleteMany({
            where: { id: invite.id },
          })
          if (count !== 1) throw invalid

          return tx.user.create({
            data: { username, name, passwordHash, ownerId: invite.ownerId },
          })
        }
      )
      return { token: issueToken(user.id, user.tokenVersion), user }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new GraphQLError("That username is already taken.")
      }
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
      !USERNAME_RE.test(username) ||
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
 * account's payroll data and its delegates; a delegate only deletes their own
 * login.
 */
export const deleteAccount = mutationField("deleteAccount", {
  type: nonNull("Boolean"),
  async resolve(_parent, _args, ctx) {
    const { userId, accountId } = ctx
    if (!userId) throw new GraphQLError("Not authenticated")

    if (accountId !== userId) {
      await ctx.prisma.user.delete({ where: { id: userId } })
      return true
    }

    // Payments, runs, payrolls and employees don't cascade from User, so they
    // go first, children before parents. Deleting the user then cascades to
    // delegates and invites.
    await ctx.prisma.$transaction([
      ctx.prisma.payment.deleteMany({
        where: {
          OR: [{ payroll: { userId } }, { employee: { userId } }],
        },
      }),
      ctx.prisma.payrollRun.deleteMany({ where: { payroll: { userId } } }),
      ctx.prisma.payroll.deleteMany({ where: { userId } }),
      ctx.prisma.employee.deleteMany({ where: { userId } }),
      ctx.prisma.user.delete({ where: { id: userId } }),
    ])
    return true
  },
})

export const updateUser = mutationField("updateUser", {
  type: nonNull("User"),
  args: {
    zcashViewingKey: stringArg(),
    walletBirthdayHeight: intArg(),
  },
  async resolve(_parent, args, ctx) {
    // The viewing key belongs to the account, so delegates cannot change it.
    const ownerId = requireAccountOwner(ctx)
    return ctx.prisma.user.update({
      where: { id: ownerId },
      data: {
        ...(args.zcashViewingKey !== undefined
          ? { zcashViewingKey: args.zcashViewingKey }
          : {}),
        ...(args.walletBirthdayHeight !== undefined
          ? { walletBirthdayHeight: args.walletBirthdayHeight }
          : {}),
      },
    })
  },
})
