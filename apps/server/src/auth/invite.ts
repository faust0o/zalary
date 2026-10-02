import { createHmac, timingSafeEqual } from "crypto"
import { getAuthSecret } from "./token.js"

export const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7

// Invite tokens are `<inviteId>-<hex signature>`. Only the id is stored, so
// owners can see their pending links again, but the database alone cannot mint
// one. Tokens live in /invite/<token> paths, so they must stay path-safe: a dot
// would be read as a file extension and the SPA fallback would 404. Hex never
// contains "-", so the last "-" is the separator whatever the id looks like.
const INVITE_ID_RE = /^[A-Za-z0-9_-]+$/
const TOKEN_RE = /^([A-Za-z0-9_-]+)-([0-9a-f]{64})$/

function sign(inviteId: string, secret: string): Buffer {
  return createHmac("sha256", secret)
    .update(`delegate-invite:${inviteId}`)
    .digest()
}

export function inviteToken(inviteId: string): string {
  const secret = getAuthSecret()
  if (!secret) throw new Error("AUTH_SECRET is not set")
  if (!INVITE_ID_RE.test(inviteId)) {
    throw new Error(`Invite id is not URL-path safe: ${inviteId}`)
  }
  return `${inviteId}-${sign(inviteId, secret).toString("hex")}`
}

/** The invite id a token was issued for, or null if it is not genuine. */
export function inviteIdFromToken(token: string): string | null {
  const secret = getAuthSecret()
  const match = TOKEN_RE.exec(token)
  if (!secret || !match) return null

  const [, inviteId, signature] = match
  const given = Buffer.from(signature, "hex")
  if (!timingSafeEqual(given, sign(inviteId, secret))) return null
  return inviteId
}
