import { createBrowserRouter } from "react-router-dom"
import { Layout } from "./_layout"
import { DemoLayout } from "./_demo-layout"
import { DashboardPage } from "./dashboard"
import { DemoDashboardPage } from "./demo/dashboard"
import { DemoEmployeesPage } from "./demo/employees"
import { DemoPayrollsPage } from "./demo/payrolls"
import { DemoTransactionsPage } from "./demo/transactions"
import { EmployeesPage } from "./employees"
import { LandingPage } from "./landing"
import { LoginPage } from "./login"
import { PayrollDetailPage } from "./payroll-detail"
import { PayrollsPage } from "./payrolls"
import { SettingsPage } from "./settings"
import { TransactionsPage } from "./transactions"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/demo",
    element: <DemoLayout />,
    children: [
      { path: "dashboard", element: <DemoDashboardPage /> },
      { path: "payrolls", element: <DemoPayrollsPage /> },
      { path: "employees", element: <DemoEmployeesPage /> },
      { path: "transactions", element: <DemoTransactionsPage /> },
    ],
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "payrolls", element: <PayrollsPage /> },
      { path: "payrolls/:id", element: <PayrollDetailPage /> },
      { path: "employees", element: <EmployeesPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
])
