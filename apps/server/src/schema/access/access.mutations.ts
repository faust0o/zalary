import type { Prisma } from "@prisma/client"
import { GraphQLError } from "graphql"
import { arg, idArg, mutationField, nonNull, stringArg } from "nexus"
import {
  createAccountUser,
  isUniqueViolation,
  issueToken,
  prepareAccountUser,
  usernameTaken,
} from "../../auth/accounts.js"
import { INVITE_TTL_MS, inviteIdFromToken } from "../../auth/invite.js"
import { assertNotLastNeededSigner } from "../auth/auth.mutations.js"
import { requireAccountOwner } from "../permissions.js"

export const createAccessInvite = mutationField("createAccessInvite", {
  type: nonNull("AccessInvite"),
  args: { role: arg({ type: "AccessRole" }) },
  async resolve(_parent, args, ctx) {
    const ownerId = requireAccountOwner(ctx)

    const now = new Date()
    await ctx.prisma.delegateInvite.deleteMany({
      where: { ownerId, expiresAt: { lte: now } },
    })

    return ctx.prisma.delegateInvite.create({
      data: {
        ownerId,
        role: args.role ?? "DELEGATE",
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
      },
    })
  },
})

export const revokeAccessInvite = mutationField("revokeAccessInvite", {
  type: nonNull("AccessInvite"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    const invite = await ctx.prisma.delegateInvite.findFirst({
      where: { id: args.id, ownerId },
    })
    if (!invite) throw new Error("Invite not found")

    return ctx.prisma.delegateInvite.delete({ where: { id: args.id } })
  },
})

/** Create a member or delegate login for the owner who issued the invite. */
export const acceptAccessInvite = mutationField("acceptAccessInvite", {
  type: nonNull("AuthPayload"),
  args: {
    token: nonNull(stringArg()),
    name: nonNull(stringArg()),
    username: nonNull(stringArg()),
    password: nonNull(stringArg()),
  },
  async resolve(_parent, args, ctx) {
    const newUser = await prepareAccountUser(args)

    const invalid = new GraphQLError(
      "This invite link is invalid or has expired."
    )
    const inviteId = inviteIdFromToken(args.token)
    if (!inviteId) throw invalid

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

          return createAccountUser(tx, newUser, invite.ownerId, invite.role)
        }
      )
      return { token: issueToken(user.id, user.tokenVersion), user }
    } catch (err) {
      if (isUniqueViolation(err)) throw usernameTaken()
      throw err
    }
  },
})

/** Switch someone between member (read-only payroll) and delegate. */
export const setMemberAccess = mutationField("setMemberAccess", {
  type: nonNull("User"),
  args: {
    userId: nonNull(idArg()),
    role: nonNull(arg({ type: "AccessRole" })),
  },
  async resolve(_parent, args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    const user = await ctx.prisma.user.findFirst({
      where: { id: args.userId, ownerId },
    })
    if (!user) throw new Error("Member not found")

    return ctx.prisma.user.update({
      where: { id: user.id },
      data: { role: args.role },
    })
  },
})

export const removeAccountMember = mutationField("removeAccountMember", {
  type: nonNull("User"),
  args: { userId: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    const user = await ctx.prisma.user.findFirst({
      where: { id: args.userId, ownerId },
    })
    if (!user) throw new Error("Member not found")

    await assertNotLastNeededSigner(ctx.prisma, user.id)
    // Deleting the user invalidates their session on the next request.
    return ctx.prisma.user.delete({ where: { id: user.id } })
  },
})
