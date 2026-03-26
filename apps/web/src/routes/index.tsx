import { createBrowserRouter } from "react-router-dom"
import { Layout } from "./_layout"
import { DashboardPage } from "./dashboard"
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
