import { useMutation, useQuery } from "@apollo/client/react"
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { Identicon } from "@workspace/ui/components/Identicon"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Check, Copy, Plus, Wallet } from "lucide-react"
import { useState } from "react"
import { CreateEmployeeDocument, DeleteEmployeeDocument, EmployeesDocument, UpdateEmployeeDocument } from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"

type SalaryCurrency = "USD" | "ZEC"

interface Employee {
  id: string
  name: string
  title: string | null
  walletAddress: string
  walletVerified: boolean
  salaryAmount: number
  salaryCurrency: SalaryCurrency
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

export function EmployeesPage() {
  useTitle("Employees")
  const { data, loading, refetch } = useQuery(EmployeesDocument)
  const [createEmployee] = useMutation(CreateEmployeeDocument)
  const [updateEmployee] = useMutation(UpdateEmployeeDocument)
  const [deleteEmployee] = useMutation(DeleteEmployeeDocument)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [salary, setSalary] = useState("")
  const [currency, setCurrency] = useState<SalaryCurrency>("USD")

  const [editName, setEditName] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editWallet, setEditWallet] = useState("")
  const [editSalary, setEditSalary] = useState("")
  const [editCurrency, setEditCurrency] = useState<SalaryCurrency>("USD")

  function openDrawer(emp: Employee) {
    setSelectedEmployee(emp)
    setEditName(emp.name)
    setEditTitle(emp.title ?? "")
    setEditWallet(emp.walletAddress)
    setEditSalary(emp.salaryAmount.toString())
    setEditCurrency(emp.salaryCurrency)
    setDrawerOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await createEmployee({
      variables: {
        name,
        title: title || null,
        walletAddress,
        salaryAmount: parseFloat(salary),
        salaryCurrency: currency,
      },
    })
    setName("")
    setTitle("")
    setWalletAddress("")
    setSalary("")
    setCurrency("USD")
    setAddDialogOpen(false)
    refetch()
  }

  async function handleUpdate() {
    if (!selectedEmployee) return
    await updateEmployee({
      variables: {
        id: selectedEmployee.id,
        name: editName,
        title: editTitle || null,
        walletAddress: editWallet,
        salaryAmount: parseFloat(editSalary),
        salaryCurrency: editCurrency,
      },
    })
    setDrawerOpen(false)
    refetch()
  }

  async function handleDelete() {
    if (!selectedEmployee) return
    await deleteEmployee({ variables: { id: selectedEmployee.id } })
    setDrawerOpen(false)
    refetch()
  }

  const employees: Employee[] = data?.employees ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-light tracking-tight">Employees</h2>
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
              <div className="space-y-2">
                <Label htmlFor="add-salary">Salary</Label>
                <div className="flex justify-center">
                  <div className="bg-muted inline-flex rounded-lg p-1">
                    <button
                      type="button"
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${currency === "USD" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setCurrency("USD")}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${currency === "ZEC" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setCurrency("ZEC")}
                    >
                      ZEC
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="size-8 shrink-0 p-0"
                    onClick={() =>
                      setSalary((v) => {
                        const step = currency === "ZEC" ? 10 : 100
                        return String(Math.max(0, (parseFloat(v) || 0) - step))
                      })
                    }
                  >
                    −
                  </Button>
                  <Input
                    id="add-salary"
                    type="text"
                    inputMode="decimal"
                    value={
                      salary
                        ? parseFloat(salary).toLocaleString("en-US")
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "")
                      setSalary(raw)
                    }}
                    placeholder={currency === "ZEC" ? "150" : "5,000"}
                    required
                    className="h-14 text-center font-mono !text-3xl font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="size-8 shrink-0 p-0"
                    onClick={() =>
                      setSalary((v) => {
                        const step = currency === "ZEC" ? 10 : 100
                        return String((parseFloat(v) || 0) + step)
                      })
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Employee</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>Employee Details</DrawerTitle>
              <DrawerDescription>
                Edit employee information or remove them.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 p-4">
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
              <div className="space-y-2">
                <Label htmlFor="edit-salary">Salary</Label>
                <div className="flex justify-center">
                  <div className="bg-muted inline-flex rounded-lg p-1">
                    <button
                      type="button"
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${editCurrency === "USD" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setEditCurrency("USD")}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${editCurrency === "ZEC" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setEditCurrency("ZEC")}
                    >
                      ZEC
                    </button>
                  </div>
                </div>
                <Input
                  id="edit-salary"
                  type="text"
                  inputMode="decimal"
                  value={
                    editSalary
                      ? parseFloat(editSalary).toLocaleString("en-US")
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "")
                    setEditSalary(raw)
                  }}
                  className="h-14 text-center font-mono !text-3xl font-bold"
                />
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleUpdate}>Save Changes</Button>
              <Button variant="destructive" onClick={handleDelete}>
                Remove Employee
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
