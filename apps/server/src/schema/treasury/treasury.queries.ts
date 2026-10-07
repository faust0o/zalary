import { nonNull, queryField, stringArg } from "nexus"
import { treasuryInviteIdFromToken } from "../../auth/invite.js"
import { requireUser } from "../permissions.js"

/** The signed-in user's account treasury, if one has been started. */
export const treasury = queryField("treasury", {
  type: "Treasury",
  resolve(_parent, _args, ctx) {
    const { accountId } = requireUser(ctx)
    return ctx.prisma.treasury.findUnique({ where: { accountId } })
  },
})

export const treasuryInvite = queryField("treasuryInvite", {
  type: "TreasuryInvitePreview",
  args: { token: nonNull(stringArg()) },
  async resolve(_parent, args, ctx) {
    const inviteId = treasuryInviteIdFromToken(args.token)
    if (!inviteId) return null
    const invite = await ctx.prisma.treasuryInvite.findUnique({
      where: { id: inviteId },
      include: {
        treasury: {
          include: {
            account: { select: { username: true } },
            _count: { select: { members: true } },
          },
        },
      },
    })
    if (
      !invite ||
      invite.acceptedById ||
      invite.expiresAt <= new Date() ||
      invite.treasury.status !== "DRAFT"
    ) {
      return null
    }
    return {
      treasuryName: invite.treasury.name,
      treasuryDescription: invite.treasury.description,
      ownerUsername: invite.treasury.account.username,
      threshold: invite.treasury.threshold,
      memberCount: invite.treasury._count.members,
      expiresAt: invite.expiresAt.toISOString(),
    }
  },
})
