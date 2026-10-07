/**
 * "Export my data": the account's payroll data, opened in this browser, as
 * CSV files with a README that explains them. Nothing here goes to the
 * server; the zip is built and downloaded locally.
 */
import type { OpenedProposal } from "../hooks/use-spend-proposals"
import type { Employee, Payroll, PayrollRun } from "./payroll-records"
import { zip } from "./zip"

type Cell = string | number | boolean | null | undefined

/**
 * One CSV field. Text that a spreadsheet would run as a formula gets a
 * leading apostrophe, since names and titles are whatever someone typed.
 */
function field(value: Cell): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return String(value)
  if (typeof value === "boolean") return value ? "yes" : "no"
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(text) || text !== text.trim()
    ? `"${text.replace(/"/g, '""')}"`
    : text
}

function csv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((row) => row.map(field).join(",")).join("\r\n") + "\r\n"
}

const round = (value: number, digits: number) =>
  Number(value.toFixed(digits))

export interface ExportPerson {
  username: string
  name?: string | null
  role?: string | null
  isAccountOwner: boolean
  isSigner: boolean
  hasAccountKey: boolean
  commsPublicKey?: string | null
  createdAt: string
}

export interface ExportTreasury {
  name: string
  description?: string | null
  status: string
  threshold: number
  signerCount: number
  address?: string | null
}

export interface ExportInput {
  exportedAt: Date
  exportedBy: string
  accountOwner: string
  employees: Employee[]
  payrolls: Payroll[]
  runs: PayrollRun[]
  spends: OpenedProposal[]
  treasury: ExportTreasury | null
  treasuryBalanceZec: number | null
  treasuryBalanceAsOf: string | null
  people: ExportPerson[]
}

const SCHEDULES: Record<string, string> = {
  EVERY_TWO_WEEKS: "every 2 weeks",
  EVERY_MONTH: "every month",
  EVERY_X_DAYS: "every X days",
}

const rows = (n: number) => `${n} ${n === 1 ? "row" : "rows"}`

function readme(input: ExportInput, counts: Record<string, number>): string {
  const date = input.exportedAt.toISOString()
  return `# Zalary data export

Exported ${date} by @${input.exportedBy} from the Zalary account of
@${input.accountOwner}.

Zalary's server only stores this data encrypted with your account's key,
which only the passkeys of people you gave access can open. Your browser
decrypted it to build this export; it was never sent anywhere in readable
form. Keep these files somewhere safe: they are not encrypted.

Payments themselves are Zcash transactions on chain. They're shielded, so a
transaction id only shows that a transaction exists, not who was paid or
how much.

All files are UTF-8 CSV with a header row. Dates are ISO 8601 in UTC.
Amounts in ZEC have up to 8 decimals; amounts in USD are what a salary came to
at the ZEC price of its payroll run.

## Files

### employees.csv (${rows(counts.employees)})

Everyone you pay.

- \`id\`: Zalary's id for the employee, used in the other files
- \`name\`, \`title\`
- \`wallet_address\`: the Zcash address salaries go to
- \`salary_amount\`, \`salary_currency\`: salary per payroll run, in USD or ZEC
- \`created_at\`, \`updated_at\`

### payrolls.csv (${rows(counts.payrolls)})

Groups of employees paid together on a schedule.

- \`id\`, \`name\`
- \`schedule\`: every 2 weeks, every month, or every \`custom_days\` days
- \`employee_count\`
- \`created_at\`, \`updated_at\`

### payroll_employees.csv (${rows(counts.payrollEmployees)})

Who is on which payroll: one row per employee per payroll.

### payroll_runs.csv (${rows(counts.runs)})

Each time a payroll was paid, or is being paid.

- \`status\`: \`paid\` once its transaction was mined, \`in progress\` before
- \`zec_price_usd\`: the ZEC price when the run started, used for every
  salary in it
- \`total_usd\`, \`total_zec\`, \`payment_count\`
- \`txid\`: the Zcash transaction that paid it
- \`spend_id\`: the treasury spend (see treasury_spends.csv) that last tried to
  pay it
- \`created_at\`, \`completed_at\`

### payments.csv (${rows(counts.payments)})

Every salary of every run, with the employee's name and address as they were
when the run started.

- \`run_id\`: the run in payroll_runs.csv
- \`amount_usd\`, \`amount_zec\`
- \`memo\`: the note sent along with the payment, which the employee's wallet
  shows
- \`status\`, \`txid\`, \`paid_at\`: from the run

### treasury_spends.csv (${rows(counts.spends)})

Payments proposed from the multisig treasury and how members decided. One
spend pays one or more payroll runs in a single transaction.

- \`status\`: awaiting approvals, signing, broadcast, confirmed, failed or
  cancelled
- \`total_zec\`, \`fee_zec\`, \`payment_count\`
- \`payroll_run_ids\`: the runs it pays, separated by semicolons
- \`proposed_by\`, \`approved_by\`, \`rejected_by\`, \`signed_by\`: usernames
- \`error\`: why it failed or was cancelled, if it was
- \`created_at\`, \`broadcast_at\`, \`confirmed_at\`

### treasury.csv (${rows(counts.treasury)})

The treasury's settings: how many of its signers must approve a payment
(\`threshold\` of \`signers\`), its shielded \`address\`, and its balance as the
coordinator's wallet last saw it (\`balance_zec\` as of \`balance_as_of\`).

### people.csv (${rows(counts.people)})

Everyone with a login to the account.

- \`role\`: owner, delegate (can edit employees and payrolls) or member (can
  only look)
- \`treasury_signer\`: holds a share of the treasury's spending key
- \`data_access\`: whether they can open the payroll data: \`yes\`, \`waiting\`
  (has a passkey, nobody has shared access with them yet) or \`no passkey\`
- \`public_key\`: the key payroll data is shared with them under

## Not included

Passkeys, treasury key shares, the treasury's viewing key and your account's
data key never leave your browser in readable form and aren't part of this
export.
`
}

export function exportFiles(input: ExportInput): { name: string; content: string }[] {
  const employeesById = new Map(input.employees.map((e) => [e.id, e]))
  const usernames = new Map<string, string>()
  for (const spend of input.spends) {
    usernames.set(spend.createdBy.id, spend.createdBy.username)
    for (const a of spend.approvals) usernames.set(a.user.id, a.user.username)
  }
  const runStatus = (run: PayrollRun) =>
    run.status === "COMPLETED" ? "paid" : "in progress"

  const payrollEmployees = input.payrolls.flatMap((p) =>
    p.employeeIds.map((employeeId) => [
      p.id,
      p.name,
      employeeId,
      employeesById.get(employeeId)?.name,
    ])
  )
  const payments = input.runs.flatMap((run) =>
    run.payments.map((p) => [
      p.id,
      run.id,
      run.payrollName,
      p.employeeId,
      p.employeeName,
      p.walletAddress,
      round(p.amountUsd, 2),
      round(p.amountZec, 8),
      p.memo,
      runStatus(run),
      run.txid,
      run.createdAt,
      run.completedAt,
    ])
  )

  const files = [
    {
      name: "employees.csv",
      content: csv(
        [
          "id",
          "name",
          "title",
          "wallet_address",
          "salary_amount",
          "salary_currency",
          "created_at",
          "updated_at",
        ],
        input.employees.map((e) => [
          e.id,
          e.name,
          e.title,
          e.walletAddress,
          e.salaryAmount,
          e.salaryCurrency,
          e.createdAt,
          e.updatedAt,
        ])
      ),
    },
    {
      name: "payrolls.csv",
      content: csv(
        [
          "id",
          "name",
          "schedule",
          "custom_days",
          "employee_count",
          "created_at",
          "updated_at",
        ],
        input.payrolls.map((p) => [
          p.id,
          p.name,
          SCHEDULES[p.schedule] ?? p.schedule,
          p.customDays,
          p.employeeIds.length,
          p.createdAt,
          p.updatedAt,
        ])
      ),
    },
    {
      name: "payroll_employees.csv",
      content: csv(
        ["payroll_id", "payroll_name", "employee_id", "employee_name"],
        payrollEmployees
      ),
    },
    {
      name: "payroll_runs.csv",
      content: csv(
        [
          "id",
          "payroll_id",
          "payroll_name",
          "status",
          "zec_price_usd",
          "payment_count",
          "total_usd",
          "total_zec",
          "txid",
          "spend_id",
          "created_at",
          "completed_at",
        ],
        input.runs.map((run) => [
          run.id,
          run.payrollId,
          run.payrollName,
          runStatus(run),
          run.zecPriceUsd,
          run.payments.length,
          round(
            run.payments.reduce((sum, p) => sum + p.amountUsd, 0),
            2
          ),
          round(
            run.payments.reduce((sum, p) => sum + p.amountZec, 0),
            8
          ),
          run.txid,
          run.proposalId,
          run.createdAt,
          run.completedAt,
        ])
      ),
    },
    {
      name: "payments.csv",
      content: csv(
        [
          "id",
          "run_id",
          "payroll_name",
          "employee_id",
          "employee_name",
          "wallet_address",
          "amount_usd",
          "amount_zec",
          "memo",
          "status",
          "txid",
          "created_at",
          "paid_at",
        ],
        payments
      ),
    },
    {
      name: "treasury_spends.csv",
      content: csv(
        [
          "id",
          "status",
          "total_zec",
          "fee_zec",
          "payment_count",
          "payroll_run_ids",
          "txid",
          "proposed_by",
          "approved_by",
          "rejected_by",
          "signed_by",
          "error",
          "created_at",
          "broadcast_at",
          "confirmed_at",
        ],
        input.spends.map((s) => {
          const who = (pick: (a: (typeof s.approvals)[number]) => boolean) =>
            s.approvals
              .filter(pick)
              .map((a) => a.user.username)
              .join(";")
          return [
            s.id,
            s.status.toLowerCase().replace(/_/g, " "),
            s.details ? round(s.totalZec, 8) : null,
            s.details ? round(s.feeZec, 8) : null,
            s.details?.payments.length,
            s.details?.runIds.join(";"),
            s.txid,
            s.createdBy.username,
            who((a) => a.decision === "APPROVE"),
            who((a) => a.decision === "REJECT"),
            who((a) => !!a.signedAt),
            s.error,
            s.createdAt,
            s.broadcastAt,
            s.confirmedAt,
          ]
        })
      ),
    },
    {
      name: "treasury.csv",
      content: csv(
        [
          "name",
          "description",
          "status",
          "threshold",
          "signers",
          "address",
          "balance_zec",
          "balance_as_of",
        ],
        input.treasury
          ? [
              [
                input.treasury.name,
                input.treasury.description,
                input.treasury.status.toLowerCase(),
                input.treasury.threshold,
                input.treasury.signerCount,
                input.treasury.address,
                input.treasuryBalanceZec === null
                  ? null
                  : round(input.treasuryBalanceZec, 8),
                input.treasuryBalanceAsOf,
              ],
            ]
          : []
      ),
    },
    {
      name: "people.csv",
      content: csv(
        [
          "username",
          "name",
          "role",
          "treasury_signer",
          "data_access",
          "public_key",
          "joined_at",
        ],
        input.people.map((p) => [
          p.username,
          p.name,
          p.isAccountOwner ? "owner" : (p.role ?? "delegate").toLowerCase(),
          p.isSigner,
          p.hasAccountKey ? "yes" : p.commsPublicKey ? "waiting" : "no passkey",
          p.commsPublicKey,
          p.createdAt,
        ])
      ),
    },
  ]

  const counts = {
    employees: input.employees.length,
    payrolls: input.payrolls.length,
    payrollEmployees: payrollEmployees.length,
    runs: input.runs.length,
    payments: payments.length,
    spends: input.spends.length,
    treasury: input.treasury ? 1 : 0,
    people: input.people.length,
  }
  return [{ name: "README.md", content: readme(input, counts) }, ...files]
}

/** The export as one zip, in a folder named after the account and date. */
export function exportZip(input: ExportInput): { blob: Blob; filename: string } {
  // YYYY-MM-DD, in the user's time zone.
  const day = input.exportedAt.toLocaleDateString("en-CA")
  const folder = `zalary-${input.accountOwner}-${day}`
  return {
    blob: zip(
      exportFiles(input).map((f) => ({ ...f, name: `${folder}/${f.name}` })),
      input.exportedAt
    ),
    filename: `${folder}.zip`,
  }
}
