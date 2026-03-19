import { PrismaClient } from "@prisma/client"
import { createHmac, timingSafeEqual } from "crypto"
import type { Request } from "express"

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
  userId: string | null
}

interface TribeJwtPayload {
  sub: string
  email: string | null
  pseudonymousId: string
  authMethod: string
  role: string | null
  siteId: string
  iat: number
  exp: number
}

function verifyTribeToken(token: string, secret: string): TribeJwtPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, signatureB64] = parts

  // Verify HMAC-SHA256 signature
  const data = `${headerB64}.${payloadB64}`
  const expectedSig = createHmac("sha256", secret)
    .update(data)
    .digest("base64url")

  const sigBuffer = Buffer.from(signatureB64, "base64url")
  const expectedBuffer = Buffer.from(expectedSig, "base64url")

  if (sigBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null

  // Decode payload
  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf-8")
  ) as TribeJwtPayload

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}

export async function createContext({
  req,
}: {
  req: Request
}): Promise<Context> {
  const token = req.headers.authorization?.replace("Bearer ", "")
  const tribeKey =
    process.env.TRIBE_KEY || process.env.TRIBE_SECRET_KEY || ""

  let userId: string | null = null

  if (token && tribeKey) {
    const payload = verifyTribeToken(token, tribeKey)

    if (payload) {
      // Look up or auto-create local user from Tribe JWT
      const user = await prisma.user.findUnique({
        where: { tribeUserId: payload.sub },
      })

      if (user) {
        userId = user.id
      } else if (payload.email) {
        // Auto-create user on first verified login
        const newUser = await prisma.user.upsert({
          where: { email: payload.email },
          update: { tribeUserId: payload.sub },
          create: {
            email: payload.email,
            tribeUserId: payload.sub,
          },
        })
        userId = newUser.id
      }
    }
  }

  return { prisma, userId }
}

export { prisma }
