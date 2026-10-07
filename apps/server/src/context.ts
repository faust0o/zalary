import { PrismaClient, type AccessRole } from "@prisma/client"
import type { Request } from "express"
import { getAuthSecret, verifyAuthToken } from "./auth/token.js"

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
  /** The signed-in user. */
  userId: string | null
  /**
   * The account whose payroll data this request reads and writes: the user's
   * own, or their owner's when the user is a member or delegate.
   */
  accountId: string | null
  /** The user's role in `accountId`, or null when it is their own account. */
  role: AccessRole | null
}

export interface Session {
  userId: string
  accountId: string
  role: AccessRole | null
}

/** Resolve a bearer token to its session, or null if it isn't valid. */
export async function authenticate(
  token: string | undefined
): Promise<Session | null> {
  const secret = getAuthSecret()
  if (!token || !secret) return null

  const payload = verifyAuthToken(token, secret)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, tokenVersion: true, ownerId: true, role: true },
  })
  if (!user || user.tokenVersion !== payload.tv) return null

  return {
    userId: user.id,
    accountId: user.ownerId ?? user.id,
    role: user.ownerId ? user.role : null,
  }
}

export async function createContext({
  req,
}: {
  req: Request
}): Promise<Context> {
  const token = req.headers.authorization?.replace("Bearer ", "")
  const session = await authenticate(token)

  return {
    prisma,
    userId: session?.userId ?? null,
    accountId: session?.accountId ?? null,
    role: session?.role ?? null,
  }
}

export { prisma }
