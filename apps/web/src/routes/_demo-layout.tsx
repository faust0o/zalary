import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import {
  ArrowLeftRight,
  Calendar,
  LayoutDashboard,
  UserPlus,
  Users,
} from "lucide-react"
import { Outlet } from "react-router-dom"
import { AppSidebar } from "../components/app-sidebar"
import { AuthModal } from "../components/auth-modal"
import { MobileGuard } from "../components/mobile-guard"
import { DemoProvider, useDemo } from "../components/demo-context"
import { DEMO_EMAIL, DEMO_WALLET_BALANCE } from "../lib/demo-data"

const demoNavItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/demo/dashboard" },
  { title: "Payrolls", icon: Calendar, path: "/demo/payrolls" },
  { title: "Employees", icon: Users, path: "/demo/employees" },
  { title: "Transactions", icon: ArrowLeftRight, path: "/demo/transactions" },
]

function DemoLayoutInner() {
  const { authModalOpen, setAuthModalOpen, promptLogin } = useDemo()

  return (
    <MobileGuard>
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          overrideEmail={DEMO_EMAIL}
          overrideBalance={DEMO_WALLET_BALANCE}
          navItems={demoNavItems}
          footerAction={{
            label: "Sign up",
            icon: UserPlus,
            onClick: () => promptLogin(),
          }}
          hideWalletSync
          hideSettings
        />
        <SidebarInset>
          <main className="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-neutral-900">
            <div className="mx-auto w-full max-w-5xl">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </SidebarProvider>
    </TooltipProvider>
    </MobileGuard>
  )
}

export function DemoLayout() {
  return (
    <DemoProvider>
      <DemoLayoutInner />
    </DemoProvider>
  )
}
