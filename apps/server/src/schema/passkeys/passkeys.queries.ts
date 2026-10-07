import { list, nonNull, queryField } from "nexus"
import { requireUser } from "../permissions.js"

export const myPasskeys = queryField("myPasskeys", {
  type: nonNull(list(nonNull("Passkey"))),
  resolve(_parent, _args, ctx) {
    const { userId } = requireUser(ctx)
    return ctx.prisma.passkey.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })
  },
})
