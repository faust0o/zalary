import { PrismaClient } from "@prisma/client"
import type { Request } from "express"
import { getAuthSecret, verifyAuthToken } from "./auth/token.js"

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
  /** The signed-in user. */
  userId: string | null
  /**
   * The account whose payroll data this request reads and writes: the user's
   * own, or their owner's when the user is a delegate.
   */
  accountId: string | null
}

export async function createContext({
  req,
}: {
  req: Request
}): Promise<Context> {
  const token = req.headers.authorization?.replace("Bearer ", "")
  const secret = getAuthSecret()

  let userId: string | null = null
  let accountId: string | null = null

  if (token && secret) {
    const payload = verifyAuthToken(token, secret)
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, tokenVersion: true, ownerId: true },
      })
      if (user && user.tokenVersion === payload.tv) {
        userId = user.id
        accountId = user.ownerId ?? user.id
      }
    }
  }

  return { prisma, userId, accountId }
}

export { prisma }
