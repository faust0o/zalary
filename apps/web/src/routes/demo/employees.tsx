import { useDemo } from "../../components/demo-context"
import { EmployeesView } from "../../components/views/employees-view"
import { useTitle } from "../../hooks/use-title"
import { DEMO_EMPLOYEES } from "../../lib/demo-data"

export function DemoEmployeesPage() {
  useTitle("Employees")
  const { promptLogin } = useDemo()

  return (
    <EmployeesView
      employees={DEMO_EMPLOYEES}
      loading={false}
      onAddEmployee={async () => { promptLogin() }}
      onUpdateEmployee={async () => { promptLogin() }}
      onDeleteEmployee={async () => { promptLogin() }}
      onImportCsv={async () => { promptLogin() }}
    />
  )
}
