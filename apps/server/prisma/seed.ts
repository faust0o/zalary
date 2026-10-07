import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../src/auth/password.js"

const prisma = new PrismaClient()

const username = process.argv[2]?.trim().toLowerCase()
const password = process.argv[3] ?? "dev-password"

if (!username || !/^[a-z0-9_]{3,32}$/.test(username)) {
  console.error("Usage: npx tsx prisma/seed.ts <username> [password]")
  console.error("Example: npx tsx prisma/seed.ts alice dev-password")
  console.error(
    "Username must be 3–32 characters: letters, numbers, and underscores."
  )
  process.exit(1)
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.")
  process.exit(1)
}

// Payroll data is sealed in the browser under the account's key, so the
// server can't seed any: this only sets up a login.
async function main() {
  const passwordHash = await hashPassword(password)
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  })
  console.log(`User: ${user.id}`)
  console.log(`Login with username: ${username}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
