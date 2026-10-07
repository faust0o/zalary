import { useQuery } from "@apollo/client/react"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { Navigate, Outlet, useNavigate } from "react-router-dom"
import { AccessRequests } from "../components/account-access"
import { AppSidebar } from "../components/app-sidebar"
import { CoiGuard } from "../components/coi-guard"
import { MobileGuard } from "../components/mobile-guard"
import { SpendAgentProvider } from "../components/treasury/spend-agent"
import { VaultGate } from "../components/vault-gate"
import { Walkthrough } from "../components/walkthrough"
import { Wordmark } from "../components/wordmark"
import { MeLayoutDocument } from "../graphql/__generated__/graphql"
import { AccountDataProvider } from "../hooks/use-account-data"
import { useAuth } from "../hooks/use-auth"
import { TreasuryWalletProvider } from "../hooks/use-treasury-wallet"

export function Layout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { data: meData } = useQuery(MeLayoutDocument, {
    skip: !user,
    // Picks up the treasury going live after its key ceremony.
    pollInterval: 30_000,
  })

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Wordmark className="h-10 animate-pulse" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  const me = meData?.me
  const treasury = meData?.treasury ?? null
  // Only the owner can create the treasury; everyone else waits for it.
  const needsTreasury =
    !!me?.isAccountOwner && (!treasury || treasury.status !== "ACTIVE")
  const openTreasury = () => navigate("/treasury")

  return (
    <MobileGuard>
      <CoiGuard>
        <AccountDataProvider>
          <TreasuryWalletProvider treasury={treasury}>
            <SpendAgentProvider>
              <TooltipProvider>
                <SidebarProvider>
                  <AppSidebar
                    onCreateTreasury={needsTreasury ? openTreasury : undefined}
                  />
                  <SidebarInset>
                    <main className="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-neutral-900">
                      <div className="mx-auto w-full max-w-5xl">
                        <AccessRequests />
                        <Outlet />
                      </div>
                    </main>
                  </SidebarInset>
                  <Walkthrough />
                </SidebarProvider>
              </TooltipProvider>
              <VaultGate />
            </SpendAgentProvider>
          </TreasuryWalletProvider>
        </AccountDataProvider>
      </CoiGuard>
    </MobileGuard>
  )
}
