import { booleanArg, idArg, list, nonNull, queryField } from "nexus"
import { requireUser } from "../permissions.js"

const OPEN = ["AWAITING_APPROVALS", "SIGNING", "BROADCAST"] as const

export const spendProposals = queryField("spendProposals", {
  type: nonNull(list(nonNull("SpendProposal"))),
  args: { open: booleanArg() },
  resolve(_parent, args, ctx) {
    const { accountId } = requireUser(ctx)
    return ctx.prisma.spendProposal.findMany({
      where: {
        treasury: { accountId },
        ...(args.open ? { status: { in: [...OPEN] } } : {}),
      },
      orderBy: { createdAt: "desc" },
    })
  },
})

export const spendProposal = queryField("spendProposal", {
  type: "SpendProposal",
  args: { id: nonNull(idArg()) },
  resolve(_parent, args, ctx) {
    const { accountId } = requireUser(ctx)
    return ctx.prisma.spendProposal.findFirst({
      where: { id: args.id, treasury: { accountId } },
    })
  },
})
