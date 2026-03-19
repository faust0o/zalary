import { queryField } from "nexus"

export const me = queryField("me", {
  type: "User",
  resolve(_parent, _args, ctx) {
    if (!ctx.userId) return null
    return ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
    })
  },
})
