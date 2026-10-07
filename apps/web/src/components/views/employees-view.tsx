import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Identicon } from "@workspace/ui/components/Identicon"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Check, Copy, FileUp, Plus, Wallet } from "lucide-react"
import { useRef, useState } from "react"

export type SalaryCurrency = "USD" | "ZEC"

export interface EmployeeData {
  id: string
  name: string
  title: string | null
  walletAddress: string
  walletVerified: boolean
  salaryAmount: number
  salaryCurrency: SalaryCurrency
}

export interface EmployeesViewProps {
  employees: EmployeeData[]
  loading: boolean
  onAddEmployee?: (data: { name: string; title: string | null; walletAddress: string; salaryAmount: number; salaryCurrency: SalaryCurrency }) => Promise<void>
  onUpdateEmployee?: (id: string, data: { name: string; title: string | null; walletAddress: string; salaryAmount: number; salaryCurrency: SalaryCurrency }) => Promise<void>
  onDeleteEmployee?: (id: string) => Promise<void>
  onImportCsv?: (csvContent: string) => Promise<void>
  /** Converts the salary when switching between USD and ZEC. */
  zecPrice: number | null
  /** Members can look but not change anything. */
  readOnly?: boolean
}

const SALARY_DECIMALS: Record<SalaryCurrency, number> = { USD: 2, ZEC: 8 }

/** Rounds to the currency's precision and drops trailing zeros: 5000 → "5000". */
function toSalaryInput(value: number, currency: SalaryCurrency): string {
  return value.toFixed(SALARY_DECIMALS[currency]).replace(/0+$/, "").replace(/\.$/, "")
}

/** Keeps digits and a single dot, with no more decimals than the currency has. */
function sanitizeSalaryInput(text: string, currency: SalaryCurrency): string {
  const [whole, ...fraction] = text.replace(/[^0-9.]/g, "").split(".")
  if (!fraction.length) return whole
  return `${whole}.${fraction.join("").slice(0, SALARY_DECIMALS[currency])}`
}

/** Groups the whole part with commas and leaves a half-typed fraction ("5." or "5.0") alone. */
function formatSalaryInput(amount: string): string {
  const [whole, fraction] = amount.split(".")
  const grouped = whole ? Number(whole).toLocaleString("en-US") : ""
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
}

function SalaryField({
  id,
  amount,
  currency,
  zecPrice,
  onAmountChange,
  onCurrencyChange,
  steppers = false,
}: {
  id: string
  amount: string
  currency: SalaryCurrency
  zecPrice: number | null
  onAmountChange: (amount: string) => void
  onCurrencyChange: (currency: SalaryCurrency) => void
  steppers?: boolean
}) {
  const step = currency === "ZEC" ? 10 : 100

  function switchCurrency(next: SalaryCurrency) {
    if (next === currency) return
    const value = parseFloat(amount)
    onAmountChange(
      zecPrice && Number.isFinite(value)
        ? toSalaryInput(next === "ZEC" ? value / zecPrice : value * zecPrice, next)
        : sanitizeSalaryInput(amount, next)
    )
    onCurrencyChange(next)
  }

  const input = (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={formatSalaryInput(amount)}
      onChange={(e) => onAmountChange(sanitizeSalaryInput(e.target.value, currency))}
      placeholder={currency === "ZEC" ? "150" : "5,000"}
      required
      className="h-14 text-center font-mono !text-3xl font-bold"
    />
  )

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Salary</Label>
      <div className="flex justify-center">
        <div className="bg-muted inline-flex rounded-lg p-1">
          {(["USD", "ZEC"] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${currency === c ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => switchCurrency(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {steppers ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-8 shrink-0 p-0"
            onClick={() =>
              onAmountChange(toSalaryInput(Math.max(0, (parseFloat(amount) || 0) - step), currency))
            }
          >
            −
          </Button>
          {input}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-8 shrink-0 p-0"
            onClick={() => onAmountChange(toSalaryInput((parseFloat(amount) || 0) + step, currency))}
          >
            +
          </Button>
        </div>
      ) : (
        input
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function EmployeesView({
  employees,
  loading,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onImportCsv,
  zecPrice,
  readOnly = false,
}: EmployeesViewProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [salary, setSalary] = useState("")
  const [currency, setCurrency] = useState<SalaryCurrency>("USD")

  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleCsvImport(file: File) {
    setCsvError(null)
    setCsvImporting(true)
    try {
      const text = await file.text()
      await onImportCsv?.(text)
      setCsvDialogOpen(false)
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Failed to import CSV")
    } finally {
      setCsvImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const [editName, setEditName] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editWallet, setEditWallet] = useState("")
  const [editSalary, setEditSalary] = useState("")
  const [editCurrency, setEditCurrency] = useState<SalaryCurrency>("USD")

  function openDrawer(emp: EmployeeData) {
    setSelectedEmployee(emp)
    setEditName(emp.name)
    setEditTitle(emp.title ?? "")
    setEditWallet(emp.walletAddress)
    setEditSalary(toSalaryInput(emp.salaryAmount, emp.salaryCurrency))
    setEditCurrency(emp.salaryCurrency)
    setDrawerOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await onAddEmployee?.({
      name,
      title: title || null,
      walletAddress,
      salaryAmount: parseFloat(salary),
      salaryCurrency: currency,
    })
    setName("")
    setTitle("")
    setWalletAddress("")
    setSalary("")
    setCurrency("USD")
    setAddDialogOpen(false)
  }

  async function handleUpdate() {
    if (!selectedEmployee) return
    await onUpdateEmployee?.(selectedEmployee.id, {
      name: editName,
      title: editTitle || null,
      walletAddress: editWallet,
      salaryAmount: parseFloat(editSalary),
      salaryCurrency: editCurrency,
    })
    setDrawerOpen(false)
  }

  async function handleDelete() {
    if (!selectedEmployee) return
    await onDeleteEmployee?.(selectedEmployee.id)
    setDrawerOpen(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-light tracking-tight">Employees</h2>
        {!readOnly && (
        <div className="flex gap-2">
          <Dialog open={csvDialogOpen} onOpenChange={(open) => { setCsvDialogOpen(open); if (!open) setCsvError(null) }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileUp className="mr-2 size-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Employees from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with employee data. The file must include these columns (title is optional):
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted rounded-md p-3">
                  <p className="mb-2 text-sm font-medium">Expected format:</p>
                  <pre className="text-muted-foreground text-xs">
{`name,walletAddress,usdSalary,title
Alice Johnson,zs1abc...def,5000,Lead Engineer
Bob Smith,zs1ghi...jkl,4500,Designer`}
                  </pre>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Select CSV file</Label>
                  <Input
                    id="csv-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCsvImport(file)
                    }}
                    disabled={csvImporting}
                  />
                </div>
                {csvError && (
                  <p className="text-destructive text-sm">{csvError}</p>
                )}
                {csvImporting && (
                  <p className="text-muted-foreground text-sm">Importing...</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Add Employee
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>
                Add a new employee to your payroll.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-title">Title</Label>
                <Input
                  id="add-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Lead Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-wallet">Wallet Address</Label>
                <Input
                  id="add-wallet"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="zs1..."
                  required
                />
              </div>
              <SalaryField
                id="add-salary"
                amount={salary}
                currency={currency}
                zecPrice={zecPrice}
                onAmountChange={setSalary}
                onCurrencyChange={setCurrency}
                steppers
              />
              <DialogFooter>
                <Button type="submit">Add Employee</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading employees...</p>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="text-muted-foreground mb-4 size-12" />
            <p className="text-muted-foreground text-lg">No employees yet</p>
            <p className="text-muted-foreground text-sm">
              Add your first employee to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <Card
              key={emp.id}
              className="cursor-pointer py-0 transition-transform hover:translate-y-[-2px]"
              onClick={() => openDrawer(emp)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Identicon
                    hash={emp.walletAddress}
                    size={52}
                    className="shrink-0 rounded-xl"
                  />
                  <Badge
                    variant={emp.walletVerified ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {emp.walletVerified ? "Active" : "Pending"}
                  </Badge>
                </div>

                <div className="mt-4">
                  <p className="text-2xl font-light">{emp.name}</p>
                  {emp.title && (
                    <p className="text-muted-foreground text-sm">{emp.title}</p>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Salary
                  </span>
                  <span className="text-lg font-light">
                    {emp.salaryCurrency === "ZEC"
                      ? `${emp.salaryAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ZEC`
                      : `$${emp.salaryAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>

                <div className="bg-muted mt-3 flex items-center justify-between rounded-md px-3 py-2">
                  <span className="text-muted-foreground font-mono text-xs">
                    {truncateAddress(emp.walletAddress)}
                  </span>
                  <CopyButton text={emp.walletAddress} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Employee Details</SheetTitle>
            <SheetDescription>
              {readOnly
                ? "Members can view employees. Ask the account owner to make you a delegate to change them."
                : "Edit employee information or remove them."}
            </SheetDescription>
          </SheetHeader>
          <fieldset disabled={readOnly} className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-wallet">Wallet Address</Label>
              <Input
                id="edit-wallet"
                value={editWallet}
                onChange={(e) => setEditWallet(e.target.value)}
              />
            </div>
            <SalaryField
              id="edit-salary"
              amount={editSalary}
              currency={editCurrency}
              zecPrice={zecPrice}
              onAmountChange={setEditSalary}
              onCurrencyChange={setEditCurrency}
            />
          </fieldset>
          {!readOnly && (
            <SheetFooter>
              <Button onClick={handleUpdate}>Save Changes</Button>
              <Button variant="destructive" onClick={handleDelete}>
                Remove Employee
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
