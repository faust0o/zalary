import { intArg, mutationField, nonNull, stringArg } from "nexus"

export const registerUser = mutationField("registerUser", {
  type: nonNull("User"),
  args: {
    email: nonNull(stringArg()),
    tribeUserId: nonNull(stringArg()),
    zcashViewingKey: stringArg(),
  },
  async resolve(_parent, args, ctx) {
    const existing = await ctx.prisma.user.findUnique({
      where: { tribeUserId: args.tribeUserId },
    })
    if (existing) return existing

    return ctx.prisma.user.create({
      data: {
        email: args.email,
        tribeUserId: args.tribeUserId,
        zcashViewingKey: args.zcashViewingKey,
      },
    })
  },
})

export const updateUser = mutationField("updateUser", {
  type: nonNull("User"),
  args: {
    zcashViewingKey: stringArg(),
    walletBirthdayHeight: intArg(),
  },
  async resolve(_parent, args, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated")
    return ctx.prisma.user.update({
      where: { id: ctx.userId },
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
