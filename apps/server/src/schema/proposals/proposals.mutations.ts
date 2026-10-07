import type { SpendProposal } from "@prisma/client"
import { GraphQLError } from "graphql"
import { idArg, list, mutationField, nonNull, stringArg } from "nexus"
import type { Context } from "../../context.js"
import { requireAccountOwner, requireUser } from "../permissions.js"

/** frostd drops a session after 24 idle hours; stay inside that. */
const PROPOSAL_TTL_MS = 1000 * 60 * 60 * 23
const MAX_SEALED_LENGTH = 1_000_000
const MAX_PCZT_LENGTH = 6_000_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/
const OPEN_STATUSES = ["AWAITING_APPROVALS", "SIGNING"] as const
const MAX_PROBLEM_LENGTH = 500

function isSealed(value: string, maxLength: number): boolean {
  return value.length <= maxLength && BASE64_RE.test(value)
}

/** A proposal of the caller's account treasury, with that treasury. */
async function findProposal(ctx: Context, id: string) {
  const { accountId } = requireUser(ctx)
  const proposal = await ctx.prisma.spendProposal.findFirst({
    where: { id, treasury: { accountId } },
    include: { treasury: true },
  })
  if (!proposal) throw new GraphQLError("Proposal not found.")
  return proposal
}

async function requireSigner(ctx: Context, treasuryId: string) {
  const { userId } = requireUser(ctx)
  const member = await ctx.prisma.treasuryMember.findUnique({
    where: { treasuryId_userId: { treasuryId, userId } },
  })
  if (!member?.encryptedKeyPackage) {
    throw new GraphQLError("Only treasury signers can do this.")
  }
  return member
}

function assertStatus(
  proposal: SpendProposal,
  ...statuses: SpendProposal["status"][]
): void {
  if (!statuses.includes(proposal.status)) {
    throw new GraphQLError(
      `This spend is ${proposal.status.toLowerCase().replace("_", " ")}.`
    )
  }
}

/**
 * Close an open proposal. Its payroll runs then count as unpaid again, so
 * they can be proposed again. Nobody needs its PCZT any more.
 */
function closeProposal(
  ctx: Context,
  proposal: SpendProposal,
  status: "CANCELLED" | "FAILED",
  error: string | null
) {
  return ctx.prisma.spendProposal.update({
    where: { id: proposal.id },
    data: {
      status,
      error,
      progress: null,
      progressAt: null,
      sealedPczt: null,
    },
  })
}

/**
 * Open a spend. The coordinator's browser built and proved the PCZT with the
 * treasury viewing key, sealed it and everything about what it pays under
 * the account key, and opened `frostSessionId` on frostd for every signer.
 */
export const createSpendProposal = mutationField("createSpendProposal", {
  type: nonNull("SpendProposal"),
  args: {
    id: nonNull(idArg()),
    sealed: nonNull(stringArg()),
    sealedPczt: nonNull(stringArg()),
    frostSessionId: nonNull(stringArg()),
  },
  async resolve(_parent, args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    const treasury = await ctx.prisma.treasury.findUnique({
      where: { accountId: ownerId },
    })
    if (treasury?.status !== "ACTIVE") {
      throw new GraphQLError("Set up the treasury before paying from it.")
    }

    if (
      !UUID_RE.test(args.id) ||
      !UUID_RE.test(args.frostSessionId) ||
      !isSealed(args.sealed, MAX_SEALED_LENGTH) ||
      !isSealed(args.sealedPczt, MAX_PCZT_LENGTH)
    ) {
      throw new GraphQLError("Malformed spend proposal.")
    }

    const open = await ctx.prisma.spendProposal.count({
      where: { treasuryId: treasury.id, status: { in: [...OPEN_STATUSES] } },
    })
    if (open > 0) {
      throw new GraphQLError(
        "Another spend is still collecting approvals. Finish or cancel it first."
      )
    }

    return ctx.prisma.spendProposal.create({
      data: {
        id: args.id,
        treasuryId: treasury.id,
        createdById: ownerId,
        sealed: args.sealed,
        sealedPczt: args.sealedPczt,
        frostSessionId: args.frostSessionId,
        expiresAt: new Date(Date.now() + PROPOSAL_TTL_MS),
      },
    })
  },
})

/**
 * Record a signer's approval. Their browser has already checked the PCZT and
 * sent its FROST commitments to the coordinator through frostd.
 */
export const approveSpendProposal = mutationField("approveSpendProposal", {
  type: nonNull("SpendProposal"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    const proposal = await findProposal(ctx, args.id)
    assertStatus(proposal, "AWAITING_APPROVALS")
    const member = await requireSigner(ctx, proposal.treasuryId)

    const existing = await ctx.prisma.proposalApproval.findUnique({
      where: {
        proposalId_userId: { proposalId: proposal.id, userId: member.userId },
      },
    })
    if (existing) throw new GraphQLError("You already decided on this spend.")

    await ctx.prisma.proposalApproval.create({
      data: {
        proposalId: proposal.id,
        userId: member.userId,
        decision: "APPROVE",
      },
    })
    return proposal
  },
})

export const rejectSpendProposal = mutationField("rejectSpendProposal", {
  type: nonNull("SpendProposal"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    const proposal = await findProposal(ctx, args.id)
    assertStatus(proposal, "AWAITING_APPROVALS")
    const member = await requireSigner(ctx, proposal.treasuryId)

    const existing = await ctx.prisma.proposalApproval.findUnique({
      where: {
        proposalId_userId: { proposalId: proposal.id, userId: member.userId },
      },
    })
    if (existing) throw new GraphQLError("You already decided on this spend.")

    await ctx.prisma.proposalApproval.create({
      data: {
        proposalId: proposal.id,
        userId: member.userId,
        decision: "REJECT",
      },
    })

    // Once too many signers said no, the threshold can't be met any more.
    const [signers, rejections] = await Promise.all([
      ctx.prisma.treasuryMember.count({
        where: {
          treasuryId: proposal.treasuryId,
          encryptedKeyPackage: { not: null },
        },
      }),
      ctx.prisma.proposalApproval.count({
        where: { proposalId: proposal.id, decision: "REJECT" },
      }),
    ])
    if (signers - rejections < proposal.treasury.threshold) {
      return closeProposal(ctx, proposal, "CANCELLED", "Rejected by members.")
    }
    return proposal
  },
})

/**
 * The coordinator picked which approvers sign and sent them the signing
 * package through frostd.
 */
export const setProposalSigners = mutationField("setProposalSigners", {
  type: nonNull("SpendProposal"),
  args: { id: nonNull(idArg()), userIds: nonNull(list(nonNull(idArg()))) },
  async resolve(_parent, args, ctx) {
    requireAccountOwner(ctx)
    const proposal = await findProposal(ctx, args.id)
    assertStatus(proposal, "AWAITING_APPROVALS")

    const signerIds = [...new Set(args.userIds)]
    if (signerIds.length !== proposal.treasury.threshold) {
      throw new GraphQLError(
        `Pick exactly ${proposal.treasury.threshold} signers.`
      )
    }
    const approvals = await ctx.prisma.proposalApproval.count({
      where: {
        proposalId: proposal.id,
        decision: "APPROVE",
        userId: { in: signerIds },
      },
    })
    if (approvals !== signerIds.length) {
      throw new GraphQLError("Only members who approved can sign.")
    }

    return ctx.prisma.spendProposal.update({
      where: { id: proposal.id },
      data: { status: "SIGNING", signerIds },
    })
  },
})

/** A picked signer sent their signature shares to the coordinator. */
export const markProposalSigned = mutationField("markProposalSigned", {
  type: nonNull("SpendProposal"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    const { userId } = requireUser(ctx)
    const proposal = await findProposal(ctx, args.id)
    assertStatus(proposal, "SIGNING")
    if (!proposal.signerIds.includes(userId)) {
      throw new GraphQLError("You weren't picked to sign this spend.")
    }
    await ctx.prisma.proposalApproval.update({
      where: { proposalId_userId: { proposalId: proposal.id, userId } },
      data: { signedAt: new Date() },
    })
    return proposal
  },
})

export const markProposalBroadcast = mutationField("markProposalBroadcast", {
  type: nonNull("SpendProposal"),
  args: { id: nonNull(idArg()), sealedTxid: nonNull(stringArg()) },
  async resolve(_parent, args, ctx) {
    requireAccountOwner(ctx)
    const proposal = await findProposal(ctx, args.id)
    assertStatus(proposal, "SIGNING")
    if (!isSealed(args.sealedTxid, 1000)) {
      throw new GraphQLError("Malformed txid.")
    }
    return ctx.prisma.spendProposal.update({
      where: { id: proposal.id },
      data: {
        status: "BROADCAST",
        sealedTxid: args.sealedTxid,
        broadcastAt: new Date(),
        error: null,
        progress: null,
        progressAt: null,
      },
    })
  },
})

/**
 * The coordinator's browser couldn't move an open spend forward, so members
 * see why it's stuck. Null clears it once it moves again.
 */
export const reportProposalProblem = mutationField("reportProposalProblem", {
  type: nonNull("SpendProposal"),
  args: { id: nonNull(idArg()), problem: stringArg() },
  async resolve(_parent, args, ctx) {
    requireAccountOwner(ctx)
    const proposal = await findProposal(ctx, args.id)
    assertStatus(proposal, ...OPEN_STATUSES)
    const problem = args.problem?.trim().slice(0, MAX_PROBLEM_LENGTH) || null
    return ctx.prisma.spendProposal.update({
      where: { id: proposal.id },
      data: { error: problem },
    })
  },
})

/**
 * What the coordinator's browser is doing with an open spend right now, for
 * members watching it. Null clears it.
 */
export const reportProposalProgress = mutationField("reportProposalProgress", {
  type: nonNull("SpendProposal"),
  args: { id: nonNull(idArg()), progress: stringArg() },
  async resolve(_parent, args, ctx) {
    requireAccountOwner(ctx)
    const proposal = await findProposal(ctx, args.id)
    assertStatus(proposal, ...OPEN_STATUSES)
    const progress = args.progress?.trim().slice(0, MAX_PROBLEM_LENGTH) || null
    return ctx.prisma.spendProposal.update({
      where: { id: proposal.id },
      data: { progress, progressAt: progress ? new Date() : null },
    })
  },
})

/**
 * The coordinator's wallet saw the transaction mined, and its browser marked
 * the spend's payroll runs paid.
 */
export const markProposalConfirmed = mutationField("markProposalConfirmed", {
  type: nonNull("SpendProposal"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    requireAccountOwner(ctx)
    const proposal = await findProposal(ctx, args.id)
    assertStatus(proposal, "BROADCAST")
    return ctx.prisma.spendProposal.update({
      where: { id: proposal.id },
      data: { status: "CONFIRMED", confirmedAt: new Date(), sealedPczt: null },
    })
  },
})

/**
 * Stop a spend. With a reason it counts as failed (e.g. the frostd session
 * expired, or a broadcast transaction expired unmined); otherwise cancelled.
 */
export const cancelSpendProposal = mutationField("cancelSpendProposal", {
  type: nonNull("SpendProposal"),
  args: { id: nonNull(idArg()), reason: stringArg() },
  async resolve(_parent, args, ctx) {
    requireAccountOwner(ctx)
    const proposal = await findProposal(ctx, args.id)
    assertStatus(proposal, "AWAITING_APPROVALS", "SIGNING", "BROADCAST")
    const reason = args.reason?.trim().slice(0, 500) || null
    if (proposal.status === "BROADCAST" && !reason) {
      throw new GraphQLError(
        "This spend was already sent. Mark it failed only if it expired unmined."
      )
    }
    return closeProposal(ctx, proposal, reason ? "FAILED" : "CANCELLED", reason)
  },
})
