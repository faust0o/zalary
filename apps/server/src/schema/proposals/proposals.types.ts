import { enumType, objectType } from "nexus"

export const SpendProposalStatusEnum = enumType({
  name: "SpendProposalStatus",
  members: [
    "AWAITING_APPROVALS",
    "SIGNING",
    "BROADCAST",
    "CONFIRMED",
    "FAILED",
    "CANCELLED",
  ],
})

export const ApprovalDecisionEnum = enumType({
  name: "ApprovalDecision",
  members: ["APPROVE", "REJECT"],
})

export const SpendProposal = objectType({
  name: "SpendProposal",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.field("status", { type: "SpendProposalStatus" })
    // What it pays, sealed under the account key.
    t.nonNull.string("sealed")
    // Large, so only fetched to act on one spend.
    t.string("sealedPczt")
    t.string("sealedTxid")
    t.nonNull.string("frostSessionId")
    t.nonNull.list.nonNull.id("signerIds")
    t.string("error")
    t.string("progress")
    t.string("progressAt", {
      resolve(parent) {
        return parent.progressAt?.toISOString() ?? null
      },
    })
    t.nonNull.int("threshold", {
      async resolve(parent, _args, ctx) {
        const treasury = await ctx.prisma.treasury.findUniqueOrThrow({
          where: { id: parent.treasuryId },
          select: { threshold: true },
        })
        return treasury.threshold
      },
    })
    t.nonNull.field("createdBy", {
      type: "User",
      resolve(parent, _args, ctx) {
        return ctx.prisma.user.findUniqueOrThrow({
          where: { id: parent.createdById },
        })
      },
    })
    t.nonNull.list.nonNull.field("approvals", {
      type: "ProposalApproval",
      resolve(parent, _args, ctx) {
        return ctx.prisma.proposalApproval.findMany({
          where: { proposalId: parent.id },
          orderBy: { createdAt: "asc" },
        })
      },
    })
    t.field("myApproval", {
      type: "ProposalApproval",
      resolve(parent, _args, ctx) {
        if (!ctx.userId) return null
        return ctx.prisma.proposalApproval.findUnique({
          where: {
            proposalId_userId: { proposalId: parent.id, userId: ctx.userId },
          },
        })
      },
    })
    t.nonNull.string("expiresAt", {
      resolve(parent) {
        return parent.expiresAt.toISOString()
      },
    })
    t.string("broadcastAt", {
      resolve(parent) {
        return parent.broadcastAt?.toISOString() ?? null
      },
    })
    t.string("confirmedAt", {
      resolve(parent) {
        return parent.confirmedAt?.toISOString() ?? null
      },
    })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
  },
})

export const ProposalApproval = objectType({
  name: "ProposalApproval",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.field("user", {
      type: "User",
      resolve(parent, _args, ctx) {
        return ctx.prisma.user.findUniqueOrThrow({
          where: { id: parent.userId },
        })
      },
    })
    t.nonNull.field("decision", { type: "ApprovalDecision" })
    t.string("signedAt", {
      resolve(parent) {
        return parent.signedAt?.toISOString() ?? null
      },
    })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
  },
})
