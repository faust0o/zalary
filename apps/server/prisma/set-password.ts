import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../src/auth/password.js"

const prisma = new PrismaClient()

const username = process.argv[2]?.trim().toLowerCase()
const password = process.argv[3]

if (!username || !/^[a-z0-9_]{3,32}$/.test(username) || !password) {
  console.error("Usage: npx tsx prisma/set-password.ts <username> <password>")
  console.error("Example: npx tsx prisma/set-password.ts dev dev-password")
  process.exit(1)
}

if (password.length < 8 || password.length > 128) {
  console.error("Password must be between 8 and 128 characters.")
  process.exit(1)
}

async function main() {
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    console.error(`No user named ${username}`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      tokenVersion: { increment: 1 },
    },
  })

  console.log(`Password updated for ${username}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
