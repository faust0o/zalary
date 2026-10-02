import { randomBytes, scrypt, timingSafeEqual } from "crypto"
import { promisify } from "util"

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

/** Hash a password with scrypt. Format: scrypt$<salt>$<hash>, both base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url")
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `scrypt$${salt}$${derived.toString("base64url")}`
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$")
  if (parts.length !== 3 || parts[0] !== "scrypt") return false

  const [, salt, hash] = parts
  if (!salt || !hash) return false

  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  const expected = Buffer.from(hash, "base64url")
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}
