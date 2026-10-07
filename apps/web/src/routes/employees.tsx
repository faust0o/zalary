import { EmployeesView } from "../components/views/employees-view"
import { useAccountData } from "../hooks/use-account-data"
import { useTitle } from "../hooks/use-title"
import { useZecPrice } from "../hooks/use-zec-price"
import {
  createEmployee,
  deleteEmployee,
  parseEmployeesCsv,
  updateEmployee,
} from "../lib/payroll-records"

export function EmployeesPage() {
  useTitle("Employees")
  const { employees, payrolls, canEdit, write } = useAccountData()
  const { price: zecPrice } = useZecPrice()

  return (
    <EmployeesView
      employees={employees}
      loading={false}
      zecPrice={zecPrice}
      readOnly={!canEdit}
      onAddEmployee={async (input) => {
        await write({ put: [createEmployee(input)] })
      }}
      onUpdateEmployee={async (id, input) => {
        const employee = employees.find((e) => e.id === id)
        if (!employee) throw new Error("Employee not found")
        await write({ put: [updateEmployee(employee, input)] })
      }}
      onDeleteEmployee={async (id) => {
        await write(deleteEmployee(id, payrolls))
      }}
      onImportCsv={async (csvContent) => {
        await write({ put: parseEmployeesCsv(csvContent).map(createEmployee) })
      }}
    />
  )
}
