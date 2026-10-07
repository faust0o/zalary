import { useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
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
  Calendar,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Settings,
  Sun,
  Users,
  Vault,
} from "lucide-react"
import { useCallback, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { MeSidebarDocument } from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"
import { useTreasuryWallet } from "../hooks/use-treasury-wallet"
import { useZecPrice } from "../hooks/use-zec-price"
import { useTheme } from "./theme-provider"
import { TopUpModal } from "./top-up-modal"
import { Wordmark } from "./wordmark"

const defaultNavItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Payrolls", icon: Calendar, path: "/payrolls" },
  { title: "Employees", icon: Users, path: "/employees" },
  { title: "Treasury", icon: Vault, path: "/treasury" },
]

export interface AppSidebarProps {
  /** Override the displayed username */
  overrideUsername?: string
  /** Override the displayed ZEC balance */
  overrideBalance?: number
  /** Override nav item paths (e.g. prefix with /demo) */
  navItems?: { title: string; icon: typeof LayoutDashboard; path: string }[]
  /** Override the logout button label and action */
  footerAction?: { label: string; icon: typeof LogOut; onClick: () => void }
  /** Hide treasury sync status */
  hideTreasurySync?: boolean
  /** Hide settings nav item */
  hideSettings?: boolean
  /** Override the Top Up button action (defaults to the swap dialog) */
  onTopUp?: () => void
  /** Set while the account has no treasury: replaces the balance with a prompt */
  onCreateTreasury?: () => void
}

export function AppSidebar({
  overrideUsername,
  overrideBalance,
  navItems,
  footerAction,
  hideTreasurySync,
  hideSettings,
  onTopUp,
  onCreateTreasury,
}: AppSidebarProps = {}) {
  const location = useLocation()
  const navigate = useNavigate()

  const { user, logout } = useAuth()
  const { data } = useQuery(MeSidebarDocument, { skip: !user })
  // Members and delegates have an owner, whose treasury they share.
  const owner = data?.me?.owner
  const items = navItems ?? defaultNavItems
  const hasTreasury = data?.treasury?.status === "ACTIVE"

  const username =
    overrideUsername ??
    (data as { me?: { username: string } })?.me?.username ??
    user?.username
  const {
    displayBalance,
    catchingUp,
    lastSyncedHeight,
    syncProgress,
    initialized: treasuryInitialized,
    error: treasuryError,
  } = useTreasuryWallet()
  const balance = overrideBalance ?? displayBalance ?? 0
  const { theme, setTheme } = useTheme()
  const { price: zecPrice, priceHistory } = useZecPrice()
  const [hoverPrice, setHoverPrice] = useState<number | null>(null)
  const [topUpOpen, setTopUpOpen] = useState(false)

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
          <Wordmark className="h-6" />
          <div className="ml-auto flex items-center rounded-full border border-border p-0.5">
            {[
              {
                value: "system" as const,
                Icon: Monitor,
                label: "System theme",
              },
              { value: "light" as const, Icon: Sun, label: "Light theme" },
              { value: "dark" as const, Icon: Moon, label: "Dark theme" },
            ].map(({ value, Icon, label }) => (
              <button
                key={value}
                type="button"
                title={label}
                onClick={() => setTheme(value)}
                className={cn(
                  "cursor-pointer rounded-full p-1 transition-colors",
                  theme === value
                    ? "bg-border text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        </div>
        <div className="inset-0 rounded-lg border border-border px-2 py-1 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Keyed by username, which is unique and known right away */}
            <Identicon
              hash={username}
              size={40}
              className="rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {username}
              </p>
              {owner && !hasTreasury && overrideBalance === undefined ? (
                <p className="truncate text-sm font-medium">
                  for @{owner.username}
                </p>
              ) : onCreateTreasury ? (
                <button
                  type="button"
                  onClick={onCreateTreasury}
                  className="flex cursor-pointer items-center gap-1.5 text-lg font-medium text-[var(--primary-dark)] hover:underline dark:text-primary"
                >
                  <Vault className="size-4" />
                  Create treasury
                </button>
              ) : (
                <p className="text-xl font-medium">
                  {balance >= 1_000
                    ? `${(balance / 1_000).toFixed(1)}K`
                    : balance.toFixed(2)}{" "}
                  ZEC
                </p>
              )}
            </div>
          </div>
          {/* Treasury sync status */}
          {!hideTreasurySync && (
            <>
              {treasuryError ? (
                <p className="mt-1.5 truncate text-xs text-red-500">
                  {treasuryError}
                </p>
              ) : catchingUp ? (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block size-1.5 animate-pulse rounded-full bg-amber-400" />
                      <span className="text-shimmer">Syncing treasury...</span>
                    </span>
                    {syncProgress !== null && <span>{syncProgress}%</span>}
                  </div>
                  {syncProgress !== null && (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${syncProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : treasuryInitialized && lastSyncedHeight !== null ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Synced to block {lastSyncedHeight.toLocaleString()}
                </p>
              ) : null}
            </>
          )}
        </div>
        {!owner && (
          <>
            <Button
              className="w-full"
              onClick={
                onTopUp ?? onCreateTreasury ?? (() => setTopUpOpen(true))
              }
            >
              <Plus />
              Top Up
            </Button>
            {!onTopUp && (
              <TopUpModal open={topUpOpen} onOpenChange={setTopUpOpen} />
            )}
          </>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
              {!hideSettings && (
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
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  onClick={
                    footerAction?.onClick ??
                    (async () => {
                      await logout()
                      navigate("/login")
                    })
                  }
                  className="my-1 cursor-pointer text-muted-foreground"
                >
                  {footerAction ? (
                    <footerAction.icon className="!size-5" />
                  ) : (
                    <LogOut className="!size-5" />
                  )}
                  <span className="text-sm">
                    {footerAction?.label ?? "Log out"}
                  </span>
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
                {!hoverPrice &&
                  priceHistory.length > 1 &&
                  (() => {
                    const first = priceHistory[0].price
                    const change = ((zecPrice - first) / first) * 100
                    const isUp = change >= 0
                    return (
                      <span
                        className={`text-xs font-medium ${isUp ? "text-green-600" : "text-red-500"}`}
                      >
                        {isUp ? "+" : ""}
                        {change.toFixed(2)}%
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
                  const color = isUp ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"
                  const fillPoints = `0,40 ${points} 200,40`
                  return (
                    <>
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        points={points}
                      />
                      <polygon fill={color} opacity="0.1" points={fillPoints} />
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
