import { useQuery } from "@apollo/client/react"
import { Identicon } from "@workspace/ui/components/Identicon"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import {
  ArrowLeftRight,
  Calendar,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { MeSidebarDocument } from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"
import { useZecPrice } from "../hooks/use-zec-price"

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Payrolls", icon: Calendar, path: "/payrolls" },
  { title: "Employees", icon: Users, path: "/employees" },
  { title: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { data } = useQuery(MeSidebarDocument, { skip: !user })

  const email = (data as { me?: { email: string } })?.me?.email ?? user?.email
  const balance =
    (data as { zecBalance?: { available: number } })?.zecBalance?.available ?? 0
  const { price: zecPrice } = useZecPrice()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
          <img src="/zalary-logo.svg" alt="Zalary" className="size-10" />
          <span className="text-xl font-medium tracking-wide">Zalary</span>
        </div>
        <div className="inset-0 flex items-center gap-3 rounded-lg border border-gray-200 px-2 py-1 shadow-sm dark:border-gray-700">
          <Identicon hash={email ?? ""} size={40} className="rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {email}
            </p>
            <p className="text-xl font-medium">
              {balance >= 1_000
                ? `${(balance / 1_000).toFixed(1)}K`
                : balance.toFixed(2)}{" "}
              ZEC
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    size="lg"
                    isActive={location.pathname.startsWith(item.path)}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "my-1 cursor-pointer",
                      location.pathname.startsWith(item.path)
                        ? "!text-[var(--primary-dark)] shadow-xs dark:!text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="!size-5" />
                    <span className="text-sm">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  isActive={location.pathname === "/settings"}
                  onClick={() => navigate("/settings")}
                  className={cn(
                    "my-1 cursor-pointer",
                    location.pathname === "/settings"
                      ? "!text-[var(--primary-dark)] shadow-xs dark:!text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <Settings className="!size-5" />
                  <span className="text-sm">Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  onClick={async () => {
                    await logout()
                    navigate("/login")
                  }}
                  className="my-1 cursor-pointer text-muted-foreground"
                >
                  <LogOut className="!size-5" />
                  <span className="text-sm">Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {zecPrice && (
            <p className="mx-auto mt-1 text-xs text-muted-foreground">
              ZEC/USD{" "}
              {zecPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
