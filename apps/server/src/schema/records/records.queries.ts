import { list, nonNull, queryField } from "nexus"
import { requireUser } from "../permissions.js"

/** All of the account's sealed payroll data. The browser sorts it out. */
export const sealedRecords = queryField("sealedRecords", {
  type: nonNull(list(nonNull("SealedRecord"))),
  resolve(_parent, _args, ctx) {
    const { accountId } = requireUser(ctx)
    return ctx.prisma.sealedRecord.findMany({
      where: { accountId },
      orderBy: { id: "asc" },
    })
  },
})

export const accountKey = queryField("accountKey", {
  type: nonNull("AccountKey"),
  async resolve(_parent, _args, ctx) {
    const { userId, accountId } = requireUser(ctx)
    const [me, holders] = await Promise.all([
      ctx.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { sealedAccountKey: true, accountKeySealedBy: true },
      }),
      ctx.prisma.user.count({
        where: {
          OR: [{ id: accountId }, { ownerId: accountId }],
          sealedAccountKey: { not: null },
        },
      }),
    ])
    return {
      sealedKey: me.sealedAccountKey,
      sealedBy: me.accountKeySealedBy,
      exists: holders > 0,
    }
  },
})
