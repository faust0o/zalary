import { Navigate, createBrowserRouter } from "react-router-dom"
import { RequireAccountData } from "../components/account-access"
import { Layout } from "./_layout"
import { DemoLayout } from "./_demo-layout"
import { DashboardPage } from "./dashboard"
import { DemoDashboardPage } from "./demo/dashboard"
import { DemoEmployeesPage } from "./demo/employees"
import { DemoPayrollsPage } from "./demo/payrolls"
import { DemoTreasuryPage } from "./demo/treasury"
import { EmployeesPage } from "./employees"
import { InvitePage } from "./invite"
import { JoinTreasuryPage } from "./join"
import { LandingPage } from "./landing"
import { LoginPage } from "./login"
import { PayrollDetailPage } from "./payroll-detail"
import { PayrollsPage } from "./payrolls"
import { SettingsPage } from "./settings"
import { TreasuryPage } from "./treasury"

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
    path: "/join/:token",
    element: <JoinTreasuryPage />,
  },
  {
    path: "/demo",
    element: <DemoLayout />,
    children: [
      { path: "dashboard", element: <DemoDashboardPage /> },
      { path: "payrolls", element: <DemoPayrollsPage /> },
      { path: "employees", element: <DemoEmployeesPage /> },
      { path: "treasury", element: <DemoTreasuryPage /> },
      {
        path: "transactions",
        element: <Navigate to="/demo/treasury" replace />,
      },
      {
        path: "delegations",
        element: <Navigate to="/demo/treasury" replace />,
      },
    ],
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "dashboard",
        element: (
          <RequireAccountData>
            <DashboardPage />
          </RequireAccountData>
        ),
      },
      {
        path: "payrolls",
        element: (
          <RequireAccountData>
            <PayrollsPage />
          </RequireAccountData>
        ),
      },
      {
        path: "payrolls/:id",
        element: (
          <RequireAccountData>
            <PayrollDetailPage />
          </RequireAccountData>
        ),
      },
      {
        path: "employees",
        element: (
          <RequireAccountData>
            <EmployeesPage />
          </RequireAccountData>
        ),
      },
      { path: "treasury", element: <TreasuryPage /> },
      // Transactions and delegations moved into the treasury
      {
        path: "transactions",
        element: <Navigate to="/treasury?tab=transactions" replace />,
      },
      {
        path: "delegations",
        element: <Navigate to="/treasury?tab=members" replace />,
      },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
])
