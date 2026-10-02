import { createHmac, timingSafeEqual } from "crypto"

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

export interface AuthTokenPayload {
  sub: string
  tv: number
  iat: number
  exp: number
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

export function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET
  return secret && secret.length > 0 ? secret : null
}

export function signAuthToken(
  userId: string,
  tokenVersion: number,
  secret: string
): string {
  const header = encode({ alg: "HS256", typ: "JWT" })
  const now = Math.floor(Date.now() / 1000)
  const payload = encode({
    sub: userId,
    tv: tokenVersion,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  } satisfies AuthTokenPayload)
  const data = `${header}.${payload}`
  const signature = createHmac("sha256", secret)
    .update(data)
    .digest("base64url")
  return `${data}.${signature}`
}

export function verifyAuthToken(
  token: string,
  secret: string
): AuthTokenPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, signatureB64] = parts
  const data = `${headerB64}.${payloadB64}`
  const expectedSig = createHmac("sha256", secret)
    .update(data)
    .digest("base64url")

  const sigBuffer = Buffer.from(signatureB64, "base64url")
  const expectedBuffer = Buffer.from(expectedSig, "base64url")
  if (sigBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null

  let payload: AuthTokenPayload
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as AuthTokenPayload
  } catch {
    return null
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null
  if (typeof payload.tv !== "number") return null
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null

  return payload
}
