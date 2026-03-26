import { createBrowserRouter, Navigate } from "react-router-dom"
import { Layout } from "./_layout"
import { LandingPage } from "./landing"
import { LoginPage } from "./login"
import { DashboardPage } from "./dashboard"
import { PayrollsPage } from "./payrolls"
import { PayrollDetailPage } from "./payroll-detail"
import { EmployeesPage } from "./employees"
import { TransactionsPage } from "./transactions"
import { SettingsPage } from "./settings"

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
