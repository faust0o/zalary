import { createBrowserRouter } from "react-router-dom"
import { Layout } from "./_layout"
import { DemoLayout } from "./_demo-layout"
import { DashboardPage } from "./dashboard"
import { DelegationsPage } from "./delegations"
import { DemoDashboardPage } from "./demo/dashboard"
import { DemoDelegationsPage } from "./demo/delegations"
import { DemoEmployeesPage } from "./demo/employees"
import { DemoPayrollsPage } from "./demo/payrolls"
import { DemoTransactionsPage } from "./demo/transactions"
import { EmployeesPage } from "./employees"
import { InvitePage } from "./invite"
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
    path: "/invite/:token",
    element: <InvitePage />,
  },
  {
    path: "/demo",
    element: <DemoLayout />,
    children: [
      { path: "dashboard", element: <DemoDashboardPage /> },
      { path: "payrolls", element: <DemoPayrollsPage /> },
      { path: "employees", element: <DemoEmployeesPage /> },
      { path: "transactions", element: <DemoTransactionsPage /> },
      { path: "delegations", element: <DemoDelegationsPage /> },
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
      { path: "delegations", element: <DelegationsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
])
