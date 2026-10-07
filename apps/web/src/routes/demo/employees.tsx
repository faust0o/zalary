import { useDemo } from "../../components/demo-context"
import { EmployeesView } from "../../components/views/employees-view"
import { useTitle } from "../../hooks/use-title"
import { useZecPrice } from "../../hooks/use-zec-price"
import { DEMO_EMPLOYEES } from "../../lib/demo-data"

export function DemoEmployeesPage() {
  useTitle("Employees")
  const { promptLogin } = useDemo()
  const { price: zecPrice } = useZecPrice()

  return (
    <EmployeesView
      employees={DEMO_EMPLOYEES}
      loading={false}
      zecPrice={zecPrice}
      onAddEmployee={async () => { promptLogin() }}
      onUpdateEmployee={async () => { promptLogin() }}
      onDeleteEmployee={async () => { promptLogin() }}
      onImportCsv={async () => { promptLogin() }}
    />
  )
}
