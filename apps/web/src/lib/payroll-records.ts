/**
 * The account's payroll data as it is sealed into records: what each record
 * holds once opened, and the record changes behind each edit. Records are
 * opened and sealed in hooks/use-account-data.ts.
 */
import { randomBytes, toHex } from "./bytes"

export type SalaryCurrency = "USD" | "ZEC"
export type Schedule = "EVERY_TWO_WEEKS" | "EVERY_MONTH" | "EVERY_X_DAYS"

export interface Employee {
  id: string
  name: string
  title: string | null
  walletAddress: string
  walletVerified: boolean
  salaryAmount: number
  salaryCurrency: SalaryCurrency
  createdAt: string
  updatedAt: string
}

export interface Payroll {
  id: string
  name: string
  schedule: Schedule
  customDays: number | null
  employeeIds: string[]
  createdAt: string
  updatedAt: string
}

/** One salary in a payroll run, as it was when the run started. */
export interface Payment {
  id: string
  employeeId: string
  employeeName: string
  walletAddress: string
  amountUsd: number
  amountZec: number
  /** Sent along on chain, so the recipient can tell what it's for. */
  memo: string
}

export interface PayrollRun {
  id: string
  payrollId: string
  payrollName: string
  zecPriceUsd: number
  /** COMPLETED once its transaction was mined. */
  status: "IN_PROGRESS" | "COMPLETED"
  /** The treasury spend that last tried to pay it. */
  proposalId: string | null
  txid: string | null
  createdAt: string
  completedAt: string | null
  payments: Payment[]
}

export type PayrollRecord =
  | ({ kind: "employee" } & Employee)
  | ({ kind: "payroll" } & Payroll)
  | ({ kind: "payrollRun" } & PayrollRun)

/** Records to create or replace, and ids of records to delete. */
export interface RecordChanges {
  put: PayrollRecord[]
  remove: string[]
}

export function newRecordId(): string {
  return crypto.randomUUID()
}

const now = () => new Date().toISOString()

export type EmployeeInput = Pick<
  Employee,
  "name" | "title" | "walletAddress" | "salaryAmount" | "salaryCurrency"
>

export function createEmployee(input: EmployeeInput): PayrollRecord {
  const at = now()
  return {
    kind: "employee",
    id: newRecordId(),
    ...input,
    walletVerified: false,
    createdAt: at,
    updatedAt: at,
  }
}

export function updateEmployee(
  employee: Employee,
  input: EmployeeInput
): PayrollRecord {
  return { kind: "employee", ...employee, ...input, updatedAt: now() }
}

/** Deleting an employee takes them off every payroll too. */
export function deleteEmployee(
  id: string,
  payrolls: Payroll[]
): RecordChanges {
  return {
    put: payrolls
      .filter((p) => p.employeeIds.includes(id))
      .map((p) => ({
        kind: "payroll" as const,
        ...p,
        employeeIds: p.employeeIds.filter((e) => e !== id),
        updatedAt: now(),
      })),
    remove: [id],
  }
}

export type PayrollInput = Pick<
  Payroll,
  "name" | "schedule" | "customDays" | "employeeIds"
>

export function createPayroll(input: PayrollInput): PayrollRecord {
  const at = now()
  return {
    kind: "payroll",
    id: newRecordId(),
    ...input,
    createdAt: at,
    updatedAt: at,
  }
}

export function updatePayroll(
  payroll: Payroll,
  input: PayrollInput
): PayrollRecord {
  return { kind: "payroll", ...payroll, ...input, updatedAt: now() }
}

/** A payroll goes with its runs, as it always has. */
export function deletePayroll(id: string, runs: PayrollRun[]): RecordChanges {
  return {
    put: [],
    remove: [id, ...runs.filter((r) => r.payrollId === id).map((r) => r.id)],
  }
}

/** What an employee's salary comes to in ZEC and USD at `zecPriceUsd`. */
export function salaryAmounts(
  employee: Pick<Employee, "salaryAmount" | "salaryCurrency">,
  zecPriceUsd: number
): { amountUsd: number; amountZec: number } {
  return employee.salaryCurrency === "ZEC"
    ? {
        amountZec: employee.salaryAmount,
        amountUsd: employee.salaryAmount * zecPriceUsd,
      }
    : {
        amountUsd: employee.salaryAmount,
        amountZec: employee.salaryAmount / zecPriceUsd,
      }
}

/** A run paying everyone on the payroll at today's price. */
export function startPayrollRun(
  payroll: Payroll,
  employees: Employee[],
  zecPriceUsd: number
): PayrollRun & { kind: "payrollRun" } {
  const byId = new Map(employees.map((e) => [e.id, e]))
  return {
    kind: "payrollRun",
    id: newRecordId(),
    payrollId: payroll.id,
    payrollName: payroll.name,
    zecPriceUsd,
    status: "IN_PROGRESS",
    proposalId: null,
    txid: null,
    createdAt: now(),
    completedAt: null,
    payments: payroll.employeeIds.flatMap((employeeId) => {
      const employee = byId.get(employeeId)
      if (!employee) return []
      return [
        {
          id: newRecordId(),
          employeeId,
          employeeName: employee.name,
          walletAddress: employee.walletAddress,
          ...salaryAmounts(employee, zecPriceUsd),
          memo: `zalary:${toHex(randomBytes(8))}`,
        },
      ]
    }),
  }
}

/** The runs a treasury spend pays now point at it. */
export function linkRunsToSpend(
  runs: PayrollRun[],
  proposalId: string
): PayrollRecord[] {
  return runs.map((run) => ({ kind: "payrollRun" as const, ...run, proposalId }))
}

/** The spend paying these runs was mined. */
export function markRunsPaid(
  runs: PayrollRun[],
  txid: string
): PayrollRecord[] {
  const at = now()
  return runs
    .filter((run) => run.status !== "COMPLETED")
    .map((run) => ({
      kind: "payrollRun" as const,
      ...run,
      status: "COMPLETED" as const,
      txid,
      completedAt: at,
    }))
}

/**
 * Employees from a CSV with columns name, walletAddress and usdSalary, and
 * optionally title. Throws on the first bad row.
 */
export function parseEmployeesCsv(csv: string): EmployeeInput[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row")
  }

  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim())
  const nameIdx = header.indexOf("name")
  const walletIdx = header.indexOf("walletaddress")
  const salaryIdx = header.indexOf("usdsalary")
  const titleIdx = header.indexOf("title")
  if (nameIdx === -1 || walletIdx === -1 || salaryIdx === -1) {
    throw new Error(
      "CSV must have columns: name, walletAddress, usdSalary (title is optional)"
    )
  }

  return lines.slice(1).map((line, i) => {
    const cols = line.split(",").map((c) => c.trim())
    const name = cols[nameIdx]
    const walletAddress = cols[walletIdx]
    const salaryRaw = cols[salaryIdx]
    if (!name || !walletAddress || !salaryRaw) {
      throw new Error(
        `Row ${i + 2}: name, walletAddress, and usdSalary are required`
      )
    }
    const salaryAmount = parseFloat(salaryRaw)
    if (isNaN(salaryAmount) || salaryAmount < 0) {
      throw new Error(`Row ${i + 2}: usdSalary must be a valid positive number`)
    }
    return {
      name,
      title: titleIdx !== -1 ? cols[titleIdx] || null : null,
      walletAddress,
      salaryAmount,
      salaryCurrency: "USD" as const,
    }
  })
}

/** Payrolls with their employees and runs (newest first), as views show them. */
export function payrollsWithDetails(
  payrolls: Payroll[],
  employees: Employee[],
  runs: PayrollRun[]
) {
  const byId = new Map(employees.map((e) => [e.id, e]))
  return payrolls.map((payroll) => ({
    ...payroll,
    employees: payroll.employeeIds.flatMap((employeeId) => {
      const employee = byId.get(employeeId)
      return employee ? [{ employeeId, employee }] : []
    }),
    runs: runs.filter((r) => r.payrollId === payroll.id),
  }))
}

/** ZEC paid out per month ("2026-10"), from runs whose payment was mined. */
export function zecSpentByMonth(
  runs: PayrollRun[]
): { month: string; amount: number }[] {
  const months = new Map<string, number>()
  for (const run of runs) {
    if (run.status !== "COMPLETED") continue
    const month = (run.completedAt ?? run.createdAt).slice(0, 7)
    const amount = run.payments.reduce((sum, p) => sum + p.amountZec, 0)
    months.set(month, (months.get(month) ?? 0) + amount)
  }
  return [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }))
}
