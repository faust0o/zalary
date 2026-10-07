import { list, nonNull, queryField, stringArg } from "nexus"
import { inviteIdFromToken } from "../../auth/invite.js"
import { requireAccountOwner, requireUser } from "../permissions.js"

/** Everyone with access to the account: the owner first, then the others. */
export const accountMembers = queryField("accountMembers", {
  type: nonNull(list(nonNull("User"))),
  resolve(_parent, _args, ctx) {
    const { accountId } = requireUser(ctx)
    return ctx.prisma.user.findMany({
      where: { OR: [{ id: accountId }, { ownerId: accountId }] },
      // The owner has no ownerId, so nulls first puts them on top.
      orderBy: [
        { ownerId: { sort: "asc", nulls: "first" } },
        { createdAt: "asc" },
      ],
    })
  },
})

export const accessInvites = queryField("accessInvites", {
  type: nonNull(list(nonNull("AccessInvite"))),
  resolve(_parent, _args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    return ctx.prisma.delegateInvite.findMany({
      where: { ownerId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    })
  },
})

export const accessInvite = queryField("accessInvite", {
  type: "AccessInvitePreview",
  args: { token: nonNull(stringArg()) },
  async resolve(_parent, args, ctx) {
    const inviteId = inviteIdFromToken(args.token)
    if (!inviteId) return null
    const invite = await ctx.prisma.delegateInvite.findUnique({
      where: { id: inviteId },
      include: { owner: { select: { username: true } } },
    })
    if (!invite || invite.expiresAt <= new Date()) return null
    return {
      ownerUsername: invite.owner.username,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    }
  },
})
