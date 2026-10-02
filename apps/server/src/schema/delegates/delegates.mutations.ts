import { idArg, mutationField, nonNull } from "nexus"
import { INVITE_TTL_MS } from "../../auth/invite.js"
import { requireAccountOwner } from "../permissions.js"

export const createDelegateInvite = mutationField("createDelegateInvite", {
  type: nonNull("DelegateInvite"),
  async resolve(_parent, _args, ctx) {
    const ownerId = requireAccountOwner(ctx)

    const now = new Date()
    await ctx.prisma.delegateInvite.deleteMany({
      where: { ownerId, expiresAt: { lte: now } },
    })

    return ctx.prisma.delegateInvite.create({
      data: {
        ownerId,
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
      },
    })
  },
})

export const revokeDelegateInvite = mutationField("revokeDelegateInvite", {
  type: nonNull("DelegateInvite"),
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

export const removeDelegate = mutationField("removeDelegate", {
  type: nonNull("User"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    const delegate = await ctx.prisma.user.findFirst({
      where: { id: args.id, ownerId },
    })
    if (!delegate) throw new Error("Delegate not found")

    // Deleting the user invalidates their session on the next request.
    return ctx.prisma.user.delete({ where: { id: args.id } })
  },
})
