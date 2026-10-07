// Static mock data for demo mode

export interface DemoEmployee {
  id: string
  name: string
  title: string | null
  walletAddress: string
  walletVerified: boolean
  salaryAmount: number
  salaryCurrency: "USD" | "ZEC"
}

export interface DemoPayroll {
  id: string
  name: string
  schedule: string
  customDays?: number | null
  employees: {
    employeeId: string
    employee: { id: string; name: string; salaryAmount: number }
  }[]
  runs: {
    id: string
    status: string
    createdAt: string
  }[]
}

export interface DemoPayment {
  id: string
  amountUsd: number
  amountZec: number
  memo: string
  status: string
  txHash: string | null
  createdAt: string
  employee: { name: string }
  payroll: { name: string }
}

export const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    id: "demo-emp-1",
    name: "Alice Chen",
    title: "Lead Engineer",
    walletAddress:
      "zs1aq8k7cayrz6ynkj62qzlqr0tcxk4rg59jgk2ydtpqfnxz5ealqs3vev5m2qgx4ynk7h6q25r0n",
    walletVerified: true,
    salaryAmount: 8500,
    salaryCurrency: "USD",
  },
  {
    id: "demo-emp-2",
    name: "Bob Martinez",
    title: "Product Designer",
    walletAddress:
      "zs1rh8v5t4j7xwq3g9kz0yf6n2m5c8d1a4b7e0h3k6p9s2u5x8w1z4c7f0j3l6o9r2t5v8y1b4d7",
    walletVerified: true,
    salaryAmount: 7200,
    salaryCurrency: "USD",
  },
  {
    id: "demo-emp-3",
    name: "Carol Thompson",
    title: "Backend Developer",
    walletAddress:
      "zs1kx9m2n5p8q1r4t7u0v3w6y9z2a5b8c1d4e7f0g3h6i9j2k5l8m1n4o7p0q3r6s9t2u5v8w1x4",
    walletVerified: true,
    salaryAmount: 7800,
    salaryCurrency: "USD",
  },
  {
    id: "demo-emp-4",
    name: "David Kim",
    title: "DevOps Engineer",
    walletAddress:
      "zs1f7g0h3i6j9k2l5m8n1o4p7q0r3s6t9u2v5w8x1y4z7a0b3c6d9e2f5g8h1i4j7k0l3m6n9o2p5",
    walletVerified: false,
    salaryAmount: 150,
    salaryCurrency: "ZEC",
  },
  {
    id: "demo-emp-5",
    name: "Eva Novak",
    title: "Marketing Lead",
    walletAddress:
      "zs1q3r6s9t2u5v8w1x4y7z0a3b6c9d2e5f8g1h4i7j0k3l6m9n2o5p8q1r4s7t0u3v6w9x2y5z8a1",
    walletVerified: true,
    salaryAmount: 6500,
    salaryCurrency: "USD",
  },
]

const threeDaysFromNow = new Date()
threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

const twelveDaysFromNow = new Date()
twelveDaysFromNow.setDate(twelveDaysFromNow.getDate() + 12)

const twentyDaysAgo = new Date()
twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20)

const fiveDaysAgo = new Date()
fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

export const DEMO_PAYROLLS: DemoPayroll[] = [
  {
    id: "demo-payroll-1",
    name: "Core Team",
    schedule: "EVERY_MONTH",
    employees: [
      {
        employeeId: "demo-emp-1",
        employee: { id: "demo-emp-1", name: "Alice Chen", salaryAmount: 8500 },
      },
      {
        employeeId: "demo-emp-2",
        employee: {
          id: "demo-emp-2",
          name: "Bob Martinez",
          salaryAmount: 7200,
        },
      },
      {
        employeeId: "demo-emp-3",
        employee: {
          id: "demo-emp-3",
          name: "Carol Thompson",
          salaryAmount: 7800,
        },
      },
      {
        employeeId: "demo-emp-5",
        employee: { id: "demo-emp-5", name: "Eva Novak", salaryAmount: 6500 },
      },
    ],
    runs: [
      {
        id: "run-1",
        status: "COMPLETED",
        createdAt: twentyDaysAgo.toISOString(),
      },
    ],
  },
  {
    id: "demo-payroll-2",
    name: "Contractors",
    schedule: "EVERY_TWO_WEEKS",
    employees: [
      {
        employeeId: "demo-emp-4",
        employee: { id: "demo-emp-4", name: "David Kim", salaryAmount: 4000 },
      },
    ],
    runs: [
      {
        id: "run-2",
        status: "COMPLETED",
        createdAt: fiveDaysAgo.toISOString(),
      },
    ],
  },
]

function generateChartData() {
  const now = new Date()
  let total = 0
  const amounts = [3.2, 5.8, 4.1, 7.3, 6.5, 8.9, 5.2, 9.1, 7.8, 6.4, 8.2, 10.5]
  return amounts.map((amount, i) => {
    const d = new Date(
      now.getFullYear(),
      now.getMonth() - (amounts.length - 1 - i),
      1
    )
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    total += amount
    return { month, monthly: amount, accumulated: +total.toFixed(4) }
  })
}

export const DEMO_CHART_DATA = generateChartData()

export const DEMO_ZEC_SPENT_BY_MONTH = DEMO_CHART_DATA.map((d) => ({
  month: d.month,
  amount: d.monthly,
}))

const paymentDates = [
  new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
  new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
  new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
]

export const DEMO_PAYMENTS: DemoPayment[] = [
  {
    id: "demo-pay-1",
    amountUsd: 8500,
    amountZec: 22.37,
    memo: "Salary - Core Team",
    status: "COMPLETED",
    txHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    createdAt: paymentDates[0].toISOString(),
    employee: { name: "Alice Chen" },
    payroll: { name: "Core Team" },
  },
  {
    id: "demo-pay-2",
    amountUsd: 7200,
    amountZec: 18.95,
    memo: "Salary - Core Team",
    status: "COMPLETED",
    txHash: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
    createdAt: paymentDates[1].toISOString(),
    employee: { name: "Bob Martinez" },
    payroll: { name: "Core Team" },
  },
  {
    id: "demo-pay-3",
    amountUsd: 4000,
    amountZec: 10.53,
    memo: "Salary - Contractors",
    status: "PENDING",
    txHash: null,
    createdAt: paymentDates[2].toISOString(),
    employee: { name: "David Kim" },
    payroll: { name: "Contractors" },
  },
  {
    id: "demo-pay-4",
    amountUsd: 8500,
    amountZec: 21.84,
    memo: "Salary - Core Team",
    status: "COMPLETED",
    txHash: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
    createdAt: paymentDates[3].toISOString(),
    employee: { name: "Alice Chen" },
    payroll: { name: "Core Team" },
  },
  {
    id: "demo-pay-5",
    amountUsd: 7200,
    amountZec: 18.51,
    memo: "Salary - Core Team",
    status: "COMPLETED",
    txHash: "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
    createdAt: paymentDates[4].toISOString(),
    employee: { name: "Bob Martinez" },
    payroll: { name: "Core Team" },
  },
  {
    id: "demo-pay-6",
    amountUsd: 7800,
    amountZec: 20.05,
    memo: "Salary - Core Team",
    status: "COMPLETED",
    txHash: "f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
    createdAt: paymentDates[5].toISOString(),
    employee: { name: "Carol Thompson" },
    payroll: { name: "Core Team" },
  },
  {
    id: "demo-pay-7",
    amountUsd: 6500,
    amountZec: 16.71,
    memo: "Salary - Core Team",
    status: "COMPLETED",
    txHash: "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
    createdAt: paymentDates[6].toISOString(),
    employee: { name: "Eva Novak" },
    payroll: { name: "Core Team" },
  },
  {
    id: "demo-pay-8",
    amountUsd: 8500,
    amountZec: 23.12,
    memo: "Salary - Core Team",
    status: "COMPLETED",
    txHash: "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
    createdAt: paymentDates[7].toISOString(),
    employee: { name: "Alice Chen" },
    payroll: { name: "Core Team" },
  },
  {
    id: "demo-pay-9",
    amountUsd: 7200,
    amountZec: 19.57,
    memo: "Salary - Core Team",
    status: "COMPLETED",
    txHash: "d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
    createdAt: paymentDates[8].toISOString(),
    employee: { name: "Bob Martinez" },
    payroll: { name: "Core Team" },
  },
  {
    id: "demo-pay-10",
    amountUsd: 7800,
    amountZec: 21.2,
    memo: "Salary - Core Team",
    status: "COMPLETED",
    txHash: "e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    createdAt: paymentDates[9].toISOString(),
    employee: { name: "Carol Thompson" },
    payroll: { name: "Core Team" },
  },
]

export const DEMO_TREASURY_BALANCE = 42.85
export const DEMO_USERNAME = "demo"

export const DEMO_TREASURY = {
  name: "Core Treasury",
  description: "Payroll for the core team",
  address:
    "u1demotreasury8q3x0k5n2v7c4m9w1z6r3t8y5u2i7o4p9a6s3d8f5g2h7j4k9l6z3x8c5v2b7n4m1q8w5e2r9t6y3",
  threshold: 2,
}

export interface DemoPerson {
  id: string
  name: string
  username: string
  role: "MEMBER" | "DELEGATE" | null
  isAccountOwner: boolean
  isSigner: boolean
  createdAt: string
}

export const DEMO_PEOPLE: DemoPerson[] = [
  {
    id: "demo-owner-0000000001",
    name: "Demo Founder",
    username: DEMO_USERNAME,
    role: null,
    isAccountOwner: true,
    isSigner: true,
    createdAt: twentyDaysAgo.toISOString(),
  },
  {
    id: "demo-member-000000001",
    name: "Maya Patel",
    username: "maya_ops",
    role: "MEMBER",
    isAccountOwner: false,
    isSigner: true,
    createdAt: twentyDaysAgo.toISOString(),
  },
  {
    id: "demo-delegate-0000001",
    name: "Jordan Reyes",
    username: "jordan_books",
    role: "DELEGATE",
    isAccountOwner: false,
    isSigner: true,
    createdAt: fiveDaysAgo.toISOString(),
  },
]

export const DEMO_ACCESS_INVITES = [
  {
    id: "demo-invite-1",
    token:
      "cmdemo4f8k0001x7l2p9q3r5t-4a1f0c9e2b7d6a3f8e1c5b9d2a7f4e0c3b8d1a6f9e2c7b4d0a5f8e3c6b9d2a7f",
    role: "DELEGATE" as const,
    expiresAt: threeDaysFromNow.toISOString(),
  },
]

const [owner, maya, jordan] = DEMO_PEOPLE

export const DEMO_PROPOSALS = [
  {
    id: "demo-proposal-1",
    status: "AWAITING_APPROVALS",
    totalZec: 31.42,
    feeZec: 0.0004,
    threshold: 2,
    signerIds: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    createdBy: owner,
    approvals: [
      {
        id: "demo-approval-1",
        decision: "APPROVE",
        signedAt: null,
        user: owner,
      },
    ],
    payments: DEMO_EMPLOYEES.slice(0, 4).map((employee, i) => ({
      id: `demo-proposal-1-payment-${i}`,
      amountZec: [9.8, 8.1, 7.42, 6.1][i],
      amountUsd: [3600, 2980, 2730, 2240][i],
      employee: {
        name: employee.name,
        walletAddress: employee.walletAddress,
      },
      payroll: { name: "Core Team" },
    })),
  },
  {
    id: "demo-proposal-2",
    status: "CONFIRMED",
    totalZec: 21.2,
    feeZec: 0.0003,
    threshold: 2,
    signerIds: [owner.id, jordan.id],
    txid: "e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    createdAt: paymentDates[9].toISOString(),
    createdBy: owner,
    approvals: [
      {
        id: "demo-approval-2",
        decision: "APPROVE",
        signedAt: paymentDates[9].toISOString(),
        user: owner,
      },
      {
        id: "demo-approval-3",
        decision: "APPROVE",
        signedAt: paymentDates[9].toISOString(),
        user: jordan,
      },
      {
        id: "demo-approval-4",
        decision: "REJECT",
        signedAt: null,
        user: maya,
      },
    ],
    payments: [
      {
        id: "demo-proposal-2-payment-0",
        amountZec: 21.2,
        amountUsd: 7800,
        employee: {
          name: "Carol Thompson",
          walletAddress: DEMO_EMPLOYEES[2].walletAddress,
        },
        payroll: { name: "Core Team" },
      },
    ],
  },
]
