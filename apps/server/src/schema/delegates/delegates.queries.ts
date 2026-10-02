import { list, nonNull, queryField, stringArg } from "nexus"
import { inviteIdFromToken } from "../../auth/invite.js"
import { requireAccountOwner } from "../permissions.js"

export const delegates = queryField("delegates", {
  type: nonNull(list(nonNull("User"))),
  resolve(_parent, _args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    return ctx.prisma.user.findMany({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
    })
  },
})

export const delegateInvites = queryField("delegateInvites", {
  type: nonNull(list(nonNull("DelegateInvite"))),
  resolve(_parent, _args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    return ctx.prisma.delegateInvite.findMany({
      where: { ownerId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    })
  },
})

export const delegateInvite = queryField("delegateInvite", {
  type: "DelegateInvitePreview",
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
      expiresAt: invite.expiresAt.toISOString(),
    }
  },
})
