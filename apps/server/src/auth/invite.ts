import { createHmac, timingSafeEqual } from "crypto"
import { getAuthSecret } from "./token.js"

export const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7

// Invite tokens are `<inviteId>.<signature>`. Only the id is stored, so owners
// can see their pending links again, but the database alone cannot mint one.
function sign(inviteId: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`delegate-invite:${inviteId}`)
    .digest("base64url")
}

export function inviteToken(inviteId: string): string {
  const secret = getAuthSecret()
  if (!secret) throw new Error("AUTH_SECRET is not set")
  return `${inviteId}.${sign(inviteId, secret)}`
}

/** The invite id a token was issued for, or null if it is not genuine. */
export function inviteIdFromToken(token: string): string | null {
  const secret = getAuthSecret()
  const dot = token.indexOf(".")
  if (!secret || dot <= 0) return null

  const inviteId = token.slice(0, dot)
  const given = Buffer.from(token.slice(dot + 1), "base64url")
  const expected = Buffer.from(sign(inviteId, secret), "base64url")
  if (given.length !== expected.length) return null
  if (!timingSafeEqual(given, expected)) return null
  return inviteId
}
