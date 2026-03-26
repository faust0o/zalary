import { useMutation, useQuery } from "@apollo/client/react"
import { EmployeesView } from "../components/views/employees-view"
import { CreateEmployeeDocument, DeleteEmployeeDocument, EmployeesDocument, ImportEmployeesCsvDocument, UpdateEmployeeDocument } from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"

export function EmployeesPage() {
  useTitle("Employees")
  const { data, loading, refetch } = useQuery(EmployeesDocument)
  const [createEmployee] = useMutation(CreateEmployeeDocument)
  const [updateEmployee] = useMutation(UpdateEmployeeDocument)
  const [deleteEmployee] = useMutation(DeleteEmployeeDocument)
  const [importEmployeesCsv] = useMutation(ImportEmployeesCsvDocument)

  const employees = (data?.employees ?? []).map((e) => ({
    ...e,
    title: e.title ?? null,
  }))

  return (
    <EmployeesView
      employees={employees}
      loading={loading}
      onAddEmployee={async (empData) => {
        await createEmployee({
          variables: {
            name: empData.name,
            title: empData.title,
            walletAddress: empData.walletAddress,
            salaryAmount: empData.salaryAmount,
            salaryCurrency: empData.salaryCurrency,
          },
        })
        refetch()
      }}
      onUpdateEmployee={async (id, empData) => {
        await updateEmployee({
          variables: {
            id,
            name: empData.name,
            title: empData.title,
            walletAddress: empData.walletAddress,
            salaryAmount: empData.salaryAmount,
            salaryCurrency: empData.salaryCurrency,
          },
        })
        refetch()
      }}
      onDeleteEmployee={async (id) => {
        await deleteEmployee({ variables: { id } })
        refetch()
      }}
      onImportCsv={async (csvContent) => {
        await importEmployeesCsv({ variables: { csvContent } })
        refetch()
      }}
    />
  )
}
