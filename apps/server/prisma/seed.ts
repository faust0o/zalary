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

async function main() {
  console.log(`Seeding data for user: ${username}`)

  const passwordHash = await hashPassword(password)

  // Clean existing data for this user to avoid duplicates
  const existingUser = await prisma.user.findUnique({ where: { username } })
  if (existingUser) {
    await prisma.payment.deleteMany({
      where: { payroll: { userId: existingUser.id } },
    })
    await prisma.payrollRun.deleteMany({
      where: { payroll: { userId: existingUser.id } },
    })
    await prisma.payrollEmployee.deleteMany({
      where: { payroll: { userId: existingUser.id } },
    })
    await prisma.payroll.deleteMany({ where: { userId: existingUser.id } })
    await prisma.employee.deleteMany({ where: { userId: existingUser.id } })
    console.log("Cleaned existing data")
  }

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash },
      })
    : await prisma.user.create({
        data: {
          username,
          passwordHash,
          zcashViewingKey: null,
        },
      })
  console.log(`User: ${user.id}`)

  // Employees — diverse backgrounds, roles, and salary ranges
  const employeesData = [
    {
      name: "Alice Chen",
      title: "Lead Blockchain Engineer",
      walletAddress: "t1VpYgkRwXJBfLRkNRFaxKhcTEbzyCQxsag",
      salaryAmount: 8500,
      salaryCurrency: "USD" as const,
    },
    {
      name: "Marcus Johnson",
      title: "Protocol Architect",
      walletAddress: "t1LQ9qByNHBPo5JVT8c3T1jsFgc7GFkWB6P",
      salaryAmount: 9200,
      salaryCurrency: "USD" as const,
    },
    {
      name: "Priya Sharma",
      title: "Security Auditor",
      walletAddress: "t1KzCJSWTEjqjhR5GYStdUvrdkzRVnXY8aS",
      salaryAmount: 7800,
      salaryCurrency: "USD" as const,
    },
    {
      name: "Tomás Rivera",
      title: "UX Strategist",
      walletAddress: "t1UYsZVJkLPeMjxEtACvSxfWuNmddpWaqRM",
      salaryAmount: 6500,
      salaryCurrency: "USD" as const,
    },
    {
      name: "Yuki Tanaka",
      title: "DevOps Engineer",
      walletAddress: "t1N1GRWVjqZBTiDsa8RE7hQGSGPXxJYrZVb",
      salaryAmount: 7200,
      salaryCurrency: "USD" as const,
    },
    {
      name: "Amina Okafor",
      title: "Smart Contract Developer",
      walletAddress: "t1PHBBpXvYGfnJEa7ikFcb8M9KmKJYGqaaB",
      salaryAmount: 8000,
      salaryCurrency: "USD" as const,
    },
    {
      name: "Lena Kovač",
      title: "Community Manager",
      walletAddress: "t1RmXqE4PsYL7CkS9hNjVBGhRyoZU1uGfaR",
      salaryAmount: 150,
      salaryCurrency: "ZEC" as const,
    },
    {
      name: "David Osei",
      title: "Technical Writer",
      walletAddress: "t1SdKjL2mNpQr8vWxYz3tFgH5jB7nC9dEeA",
      salaryAmount: 5200,
      salaryCurrency: "USD" as const,
    },
    {
      name: "Sofia Petrov",
      title: "QA Lead",
      walletAddress: "t1TnMpR4sKjL6wXyZ2uFgH8jB3nC5dEeAvQ",
      salaryAmount: 6800,
      salaryCurrency: "USD" as const,
    },
    {
      name: "Kwame Mensah",
      title: "Cryptography Researcher",
      walletAddress: "t1UnNqS5tLkM7xYzA3vGhI9kC4oD6fFfBwR",
      salaryAmount: 200,
      salaryCurrency: "ZEC" as const,
    },
  ]

  const employees = []
  for (const emp of employeesData) {
    employees.push(
      await prisma.employee.create({
        data: { ...emp, userId: user.id },
      })
    )
  }
  console.log(`Seeded ${employees.length} employees`)

  // Payrolls
  const engineeringPayroll = await prisma.payroll.create({
    data: {
      name: "Engineering Team",
      schedule: "EVERY_TWO_WEEKS",
      userId: user.id,
      employees: {
        create: [
          { employeeId: employees[0].id },
          { employeeId: employees[1].id },
          { employeeId: employees[2].id },
          { employeeId: employees[4].id },
          { employeeId: employees[5].id },
        ],
      },
    },
  })

  const operationsPayroll = await prisma.payroll.create({
    data: {
      name: "Operations & Design",
      schedule: "EVERY_MONTH",
      userId: user.id,
      employees: {
        create: [
          { employeeId: employees[3].id },
          { employeeId: employees[6].id },
          { employeeId: employees[7].id },
          { employeeId: employees[8].id },
        ],
      },
    },
  })

  const researchPayroll = await prisma.payroll.create({
    data: {
      name: "Research Grants",
      schedule: "EVERY_X_DAYS",
      customDays: 45,
      userId: user.id,
      employees: {
        create: [
          { employeeId: employees[9].id },
          { employeeId: employees[2].id },
        ],
      },
    },
  })
  console.log("Seeded 3 payrolls")

  // Past payroll runs with completed payments (for dashboard chart)
  const zecPrices = [28.5, 31.2, 29.8, 34.1, 32.5, 30.9, 35.7]
  const months = [
    new Date("2025-08-15"),
    new Date("2025-09-15"),
    new Date("2025-10-15"),
    new Date("2025-11-15"),
    new Date("2025-12-15"),
    new Date("2026-01-15"),
    new Date("2026-02-15"),
  ]

  const payrollCycle = [
    engineeringPayroll,
    operationsPayroll,
    engineeringPayroll,
    operationsPayroll,
    engineeringPayroll,
    operationsPayroll,
    engineeringPayroll,
  ]

  for (let i = 0; i < months.length; i++) {
    const payroll = payrollCycle[i]
    const payrollEmployees = await prisma.payrollEmployee.findMany({
      where: { payrollId: payroll.id },
      include: { employee: true },
    })

    await prisma.payrollRun.create({
      data: {
        payrollId: payroll.id,
        status: "COMPLETED",
        zecPriceUsd: zecPrices[i],
        createdAt: months[i],
        completedAt: new Date(months[i].getTime() + 3600000),
        payments: {
          create: payrollEmployees.map((pe, j) => ({
            employeeId: pe.employeeId,
            payrollId: payroll.id,
            amountUsd:
              pe.employee.salaryCurrency === "ZEC"
                ? pe.employee.salaryAmount * zecPrices[i]
                : pe.employee.salaryAmount,
            amountZec:
              pe.employee.salaryCurrency === "ZEC"
                ? pe.employee.salaryAmount
                : pe.employee.salaryAmount / zecPrices[i],
            memo: `zalary:seed:run${i}:pay${j}`,
            status: "COMPLETED" as const,
            txHash: `tx_${pe.employeeId.substring(0, 8)}_${months[i].toISOString().substring(0, 7)}`,
            createdAt: months[i],
          })),
        },
      },
    })
    console.log(
      `Seeded run for ${payroll.name} - ${months[i].toISOString().substring(0, 7)}`
    )
  }

  // One recent in-progress run with mixed statuses
  const recentRunEmployees = await prisma.payrollEmployee.findMany({
    where: { payrollId: researchPayroll.id },
    include: { employee: true },
  })

  await prisma.payrollRun.create({
    data: {
      payrollId: researchPayroll.id,
      status: "IN_PROGRESS",
      zecPriceUsd: 33.0,
      createdAt: new Date("2026-03-10"),
      payments: {
        create: recentRunEmployees.map((pe, idx) => ({
          employeeId: pe.employeeId,
          payrollId: researchPayroll.id,
          amountUsd:
            pe.employee.salaryCurrency === "ZEC"
              ? pe.employee.salaryAmount * 33.0
              : pe.employee.salaryAmount,
          amountZec:
            pe.employee.salaryCurrency === "ZEC"
              ? pe.employee.salaryAmount
              : pe.employee.salaryAmount / 33.0,
          memo: `zalary:seed:recent:pay${idx}`,
          status: idx === 0 ? ("COMPLETED" as const) : ("SKIPPED" as const),
          txHash:
            idx === 0 ? `tx_recent_${pe.employeeId.substring(0, 8)}` : null,
          createdAt: new Date("2026-03-10"),
        })),
      },
    },
  })
  console.log("Seeded 1 in-progress run for Research Grants")

  console.log("\nSeed complete!")
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
