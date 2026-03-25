import { useMutation, useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ArrowLeft, Trash2, X } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTitle } from "../hooks/use-title"
import { PayrollDocument, PayrollsDocument, AllEmployeesDocument, CreatePayrollDocument, UpdatePayrollDocument, DeletePayrollDocument } from "../graphql/__generated__/graphql"
import type { Schedule } from "../graphql/__generated__/graphql"

export function PayrollDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === "new"
  useTitle(isNew ? "Create Payroll" : "Edit Payroll")

  const { data: payrollData } = useQuery(PayrollDocument, {
    variables: { id: id! },
    skip: isNew || !id,
  })
  const { data: employeesData } = useQuery(AllEmployeesDocument)

  const refetchPayrolls = { refetchQueries: [{ query: PayrollsDocument }] }
  const [createPayroll] = useMutation(CreatePayrollDocument, refetchPayrolls)
  const [updatePayroll] = useMutation(UpdatePayrollDocument, refetchPayrolls)
  const [deletePayroll] = useMutation(DeletePayrollDocument, refetchPayrolls)

  const payroll = payrollData?.payroll
  const [name, setName] = useState("")
  const [schedule, setSchedule] = useState<Schedule>("EVERY_MONTH")
  const [customDays, setCustomDays] = useState("")
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)

  if (payroll && !initialized) {
    setName(payroll.name ?? "")
    setSchedule((payroll.schedule as Schedule) ?? "EVERY_MONTH")
    setCustomDays(payroll.customDays?.toString() ?? "")
    setSelectedEmployeeIds(
      (payroll.employees ?? []).map((pe) => pe.employeeId ?? "").filter(Boolean)
    )
    setInitialized(true)
  }

  const allEmployees = useMemo(() => employeesData?.employees ?? [], [employeesData])

  const [employeeSearch, setEmployeeSearch] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const filteredEmployees = useMemo(
    () =>
      allEmployees.filter(
        (emp: { id: string; name: string }) =>
          !selectedEmployeeIds.includes(emp.id) &&
          emp.name.toLowerCase().includes(employeeSearch.toLowerCase())
      ),
    [allEmployees, selectedEmployeeIds, employeeSearch]
  )

  function addEmployee(empId: string) {
    setSelectedEmployeeIds((prev) => [...prev, empId])
    setEmployeeSearch("")
    setDropdownOpen(false)
    searchRef.current?.focus()
  }

  function removeEmployee(empId: string) {
    setSelectedEmployeeIds((prev) => prev.filter((id) => id !== empId))
  }

  async function handleSave() {
    const variables = {
      name,
      schedule,
      customDays: schedule === "EVERY_X_DAYS" ? parseInt(customDays) : null,
      employeeIds: selectedEmployeeIds,
    }

    if (isNew) {
      await createPayroll({ variables })
    } else {
      await updatePayroll({ variables: { id: id!, ...variables } })
    }
    navigate("/payrolls")
  }

  async function handleDelete() {
    if (!isNew && id) {
      await deletePayroll({ variables: { id } })
      navigate("/payrolls")
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/payrolls")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-4xl font-light tracking-tight">
          {isNew ? "Create Payroll" : "Edit Payroll"}
        </h2>
      </div>

      <Card className="overflow-visible">
        <CardContent className="space-y-6 overflow-visible">
          <div className="space-y-2">
            <Label htmlFor="payroll-name">Payroll Name</Label>
            <Input
              id="payroll-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering Team"
            />
          </div>

          <div className="space-y-2">
            <Label>Schedule</Label>
            <div className="flex gap-3">
              <Select value={schedule} onValueChange={(v) => setSchedule(v as Schedule)}>
                <SelectTrigger className="!h-10 flex-1">
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EVERY_TWO_WEEKS">Every 2 weeks</SelectItem>
                  <SelectItem value="EVERY_MONTH">Every month</SelectItem>
                  <SelectItem value="EVERY_X_DAYS">Every X days</SelectItem>
                </SelectContent>
              </Select>
              {schedule === "EVERY_X_DAYS" && (
                <Input
                  type="number"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="Days"
                  className="w-24 shrink-0"
                />
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Employees</Label>
            <div className="relative w-full">
              <Input
                ref={searchRef}
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value)
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                placeholder="Search employees..."
              />
              {dropdownOpen && filteredEmployees.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
                  {filteredEmployees.map(
                    (emp: {
                      id: string
                      name: string
                      salaryAmount: number
                    }) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addEmployee(emp.id)}
                      >
                        <span>{emp.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ${emp.salaryAmount.toLocaleString()}
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}
              {dropdownOpen &&
                filteredEmployees.length === 0 &&
                employeeSearch && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover p-3 shadow-md">
                    <p className="text-sm text-muted-foreground">
                      No matching employees
                    </p>
                  </div>
                )}
            </div>
            {selectedEmployeeIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedEmployeeIds.map((empId) => {
                  const emp = allEmployees.find(
                    (e: { id: string }) => e.id === empId
                  )
                  if (!emp) return null
                  return (
                    <span
                      key={empId}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-secondary py-1.5 pr-2 pl-3 text-sm text-secondary-foreground"
                    >
                      <span className="flex flex-col leading-tight">
                        <span className="font-medium">{emp.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ${emp.salaryAmount.toLocaleString()}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEmployee(empId)}
                        className="rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!name || selectedEmployeeIds.length === 0}
            >
              {isNew ? "Create Payroll" : "Save Changes"}
            </Button>
            {!isNew && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 size-4" />
                Delete Payroll
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
