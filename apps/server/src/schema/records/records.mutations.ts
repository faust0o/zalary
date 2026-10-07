import type { Prisma } from "@prisma/client"
import { GraphQLError } from "graphql"
import { arg, idArg, list, mutationField, nonNull, stringArg } from "nexus"
import { isUniqueViolation } from "../../auth/accounts.js"
import {
  isPayrollEditor,
  requireAccountOwner,
  requireUser,
} from "../permissions.js"

const RECORD_ID_RE = /^[A-Za-z0-9_-]{8,64}$/
const CIPHERTEXT_RE = /^[A-Za-z0-9+/]+={0,2}$/
const MAX_RECORD_LENGTH = 1_000_000
const MAX_RECORDS_PER_WRITE = 1000
const NOISE_MESSAGE_RE = /^[0-9a-f]{64,4096}$/

const conflict = () =>
  new GraphQLError(
    "Someone else changed this payroll data just now. Try again."
  )

function assertRecordId(id: string): void {
  if (!RECORD_ID_RE.test(id)) throw new GraphQLError("Malformed record id.")
}

function assertSealed(data: string): void {
  if (data.length > MAX_RECORD_LENGTH || !CIPHERTEXT_RE.test(data)) {
    throw new GraphQLError("Malformed sealed record.")
  }
}

function assertSealedKey(sealedKey: string): void {
  if (!NOISE_MESSAGE_RE.test(sealedKey)) {
    throw new GraphQLError("Malformed account key.")
  }
}

/**
 * Create, replace and delete sealed records in one go. Each write names the
 * version it replaces (0 to create), so a stale write fails instead of
 * overwriting someone else's change.
 */
export const writeSealedRecords = mutationField("writeSealedRecords", {
  type: nonNull(list(nonNull("SealedRecord"))),
  args: {
    writes: nonNull(list(nonNull(arg({ type: "SealedRecordWrite" })))),
    deletes: list(nonNull(arg({ type: "SealedRecordDelete" }))),
  },
  async resolve(_parent, args, ctx) {
    const { accountId } = requireUser(ctx)
    const deletes = args.deletes ?? []
    if (args.writes.length + deletes.length > MAX_RECORDS_PER_WRITE) {
      throw new GraphQLError("Too many records at once.")
    }
    for (const write of args.writes) {
      assertRecordId(write.id)
      assertSealed(write.data)
      if (write.version < 0) throw new GraphQLError("Malformed version.")
    }
    for (const del of deletes) assertRecordId(del.id)

    try {
      return await ctx.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const written = []
          for (const write of args.writes) {
            if (write.version === 0) {
              written.push(
                await tx.sealedRecord.create({
                  data: { id: write.id, accountId, data: write.data },
                })
              )
              continue
            }
            const { count } = await tx.sealedRecord.updateMany({
              where: { id: write.id, accountId, version: write.version },
              data: { data: write.data, version: { increment: 1 } },
            })
            if (count !== 1) throw conflict()
            written.push(
              await tx.sealedRecord.findUniqueOrThrow({
                where: { id: write.id },
              })
            )
          }
          for (const del of deletes) {
            const { count } = await tx.sealedRecord.deleteMany({
              where: { id: del.id, accountId, version: del.version },
            })
            if (count !== 1) throw conflict()
          }
          return written
        }
      )
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict()
      throw err
    }
  },
})

/**
 * Start the account's data key: the owner's browser made it and sealed it to
 * the owner. Only while nobody in the account holds one, so there is only
 * ever one.
 */
export const createAccountKey = mutationField("createAccountKey", {
  type: nonNull("AccountKey"),
  args: { sealedKey: nonNull(stringArg()) },
  async resolve(_parent, args, ctx) {
    const ownerId = requireAccountOwner(ctx)
    assertSealedKey(args.sealedKey)
    const owner = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
    })
    if (!owner.commsPublicKey) {
      throw new GraphQLError("Set up a passkey first.")
    }

    const exists = new GraphQLError(
      "Your account already has a data key. Reload to use it."
    )
    await ctx.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const holders = await tx.user.count({
        where: { ownerId, sealedAccountKey: { not: null } },
      })
      if (holders > 0) throw exists
      const { count } = await tx.user.updateMany({
        where: { id: ownerId, sealedAccountKey: null },
        data: {
          sealedAccountKey: args.sealedKey,
          accountKeySealedBy: owner.commsPublicKey,
        },
      })
      if (count !== 1) throw exists
    })
    return {
      sealedKey: args.sealedKey,
      sealedBy: owner.commsPublicKey,
      exists: true,
    }
  },
})

/**
 * Give someone with access to the account its data key, sealed to their
 * comms key in the caller's browser. Only the owner and delegates share it,
 * by hand, so a login slipped into the account doesn't get it on its own.
 */
export const shareAccountKey = mutationField("shareAccountKey", {
  type: nonNull("User"),
  args: { userId: nonNull(idArg()), sealedKey: nonNull(stringArg()) },
  async resolve(_parent, args, ctx) {
    const { userId, accountId } = requireUser(ctx)
    if (!isPayrollEditor(ctx)) {
      throw new GraphQLError("Only the owner and delegates can share access.")
    }
    assertSealedKey(args.sealedKey)

    const me = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    })
    if (!me.sealedAccountKey || !me.commsPublicKey) {
      throw new GraphQLError("You don't hold the account's data key yet.")
    }
    const grantee = await ctx.prisma.user.findFirst({
      where: {
        id: args.userId,
        OR: [{ id: accountId }, { ownerId: accountId }],
      },
    })
    if (!grantee) throw new GraphQLError("Member not found.")
    if (!grantee.commsPublicKey) {
      throw new GraphQLError("They need to set up a passkey first.")
    }

    const { count } = await ctx.prisma.user.updateMany({
      where: { id: grantee.id, sealedAccountKey: null },
      data: {
        sealedAccountKey: args.sealedKey,
        accountKeySealedBy: me.commsPublicKey,
      },
    })
    if (count !== 1) throw new GraphQLError("They already have access.")
    return ctx.prisma.user.findUniqueOrThrow({ where: { id: grantee.id } })
  },
})
