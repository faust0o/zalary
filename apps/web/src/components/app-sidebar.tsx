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
import { useCallback, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { MeSidebarDocument } from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"
import { useZcashWallet } from "../hooks/use-zcash-wallet"
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
  const { balance: walletBalance, syncing, lastSyncedHeight, syncProgress, initialized: walletInitialized, error: walletError } = useZcashWallet()
  const graphqlBalance =
    (data as { zecBalance?: { available: number } })?.zecBalance?.available ?? 0
  // Use wallet balance once a sync has completed; otherwise fall back to GraphQL.
  const balance =
    lastSyncedHeight !== null && walletBalance !== null
      ? walletBalance.total
      : graphqlBalance
  const { price: zecPrice, priceHistory } = useZecPrice()
  const [hoverPrice, setHoverPrice] = useState<number | null>(null)

  const handleChartHover = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!priceHistory.length) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const index = Math.round(x * (priceHistory.length - 1))
      const clamped = Math.max(0, Math.min(priceHistory.length - 1, index))
      setHoverPrice(priceHistory[clamped].price)
    },
    [priceHistory]
  )

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
          <img src="/zalary-logo.svg" alt="Zalary" className="size-10" />
          <span className="text-xl font-medium tracking-wide">Zalary</span>
        </div>
        <div className="inset-0 rounded-lg border border-gray-200 px-2 py-1 shadow-sm dark:border-gray-700">
          <div className="flex items-center gap-3">
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
          {/* Wallet sync status */}
          {walletError ? (
            <p className="mt-1.5 truncate text-xs text-red-500">{walletError}</p>
          ) : syncing ? (
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-1.5 animate-pulse rounded-full bg-amber-400" />
                  Syncing wallet...
                </span>
                {syncProgress !== null && (
                  <span>{syncProgress}%</span>
                )}
              </div>
              {syncProgress !== null && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : walletInitialized && lastSyncedHeight !== null ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Synced to block {lastSyncedHeight.toLocaleString()}
            </p>
          ) : null}
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
      <SidebarFooter className="p-0">
        {zecPrice && (
          <div>
            <div className="flex items-baseline justify-between px-3 pb-1">
              <span className="text-xs font-medium text-muted-foreground">
                ZEC/USD
              </span>
              <div className="flex items-baseline gap-1.5">
                {!hoverPrice && priceHistory.length > 1 && (() => {
                  const first = priceHistory[0].price
                  const change = ((zecPrice - first) / first) * 100
                  const isUp = change >= 0
                  return (
                    <span className={`text-xs font-medium ${isUp ? "text-green-600" : "text-red-500"}`}>
                      {isUp ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  )
                })()}
                <span className="text-xs font-semibold">
                  $
                  {(hoverPrice ?? zecPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
            {priceHistory.length > 1 && (
              <svg
                viewBox="0 0 200 40"
                className="mt-1 h-10 w-full cursor-crosshair"
                preserveAspectRatio="none"
                onMouseMove={handleChartHover}
                onMouseLeave={() => setHoverPrice(null)}
              >
                {(() => {
                  const prices = priceHistory.map((p) => p.price)
                  const len = prices.length
                  const min = Math.min(...prices)
                  const max = Math.max(...prices)
                  const range = max - min || 1
                  const xScale = 200 / (len - 1)
                  const points = prices
                    .map(
                      (p, i) =>
                        `${(i * xScale).toFixed(1)},${(40 - ((p - min) / range) * 36 - 2).toFixed(1)}`
                    )
                    .join(" ")
                  const isUp = prices[len - 1] >= prices[0]
                  const color = isUp
                    ? "rgb(34, 197, 94)"
                    : "rgb(239, 68, 68)"
                  const fillPoints = `0,40 ${points} 200,40`
                  return (
                    <>
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        points={points}
                      />
                      <polygon
                        fill={color}
                        opacity="0.1"
                        points={fillPoints}
                      />
                    </>
                  )
                })()}
              </svg>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
