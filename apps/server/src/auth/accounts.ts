import { Prisma, type AccessRole, type PrismaClient } from "@prisma/client"
import { GraphQLError } from "graphql"
import { hashPassword } from "./password.js"
import { getAuthSecret, signAuthToken } from "./token.js"

const USERNAME_RE = /^[a-z0-9_]{3,32}$/
const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128
const MAX_NAME_LENGTH = 100

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username)
}

export function assertValidUsername(username: string): void {
  if (!isValidUsername(username)) {
    throw new GraphQLError(
      "Username must be 3–32 characters and use only letters, numbers, and underscores."
    )
  }
}

export function assertValidPassword(password: string): void {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new GraphQLError(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
    )
  }
}

export function assertValidName(name: string): void {
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new GraphQLError(
      `Name must be between 1 and ${MAX_NAME_LENGTH} characters.`
    )
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  )
}

export function requireAuthSecret(): string {
  const secret = getAuthSecret()
  if (!secret) {
    throw new GraphQLError("Authentication is not configured on the server.")
  }
  return secret
}

export function issueToken(userId: string, tokenVersion: number): string {
  return signAuthToken(userId, tokenVersion, requireAuthSecret())
}

export interface NewAccountUser {
  name: string
  username: string
  password: string
}

/** Validate sign-up fields and hash the password, before any transaction. */
export async function prepareAccountUser(input: NewAccountUser) {
  const name = input.name.trim()
  assertValidName(name)
  const username = normalizeUsername(input.username)
  assertValidUsername(username)
  assertValidPassword(input.password)
  requireAuthSecret()
  return { name, username, passwordHash: await hashPassword(input.password) }
}

/** Create a member or delegate login inside `ownerId`'s account. */
export function createAccountUser(
  tx: Prisma.TransactionClient | PrismaClient,
  user: { name: string; username: string; passwordHash: string },
  ownerId: string,
  role: AccessRole
) {
  return tx.user.create({ data: { ...user, ownerId, role } })
}

export const usernameTaken = () =>
  new GraphQLError("That username is already taken.")
