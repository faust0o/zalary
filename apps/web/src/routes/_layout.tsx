import { useQuery } from "@apollo/client/react"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { AppSidebar } from "../components/app-sidebar"
import { CoiGuard } from "../components/coi-guard"
import { ConnectWalletModal } from "../components/connect-wallet-modal"
import { MobileGuard } from "../components/mobile-guard"
import { Walkthrough } from "../components/walkthrough"
import { MeLayoutDocument } from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"
import { ZcashWalletProvider } from "../hooks/use-zcash-wallet"

export function Layout() {
  const { user, loading } = useAuth()
  const {
    data: meData,
    loading: meLoading,
    refetch: refetchMe,
  } = useQuery(MeLayoutDocument, { skip: !user })
  const [connectWalletOpen, setConnectWalletOpen] = useState(false)

  const meLoaded = !meLoading && meData?.me != null
  const missingWalletConfig =
    meLoaded &&
    (!meData.me?.zcashViewingKey || !meData.me?.walletBirthdayHeight)

  // Only the owner can set the wallet up; delegates use the owner's.
  const needsWallet = missingWalletConfig && !meData.me?.owner
  const openConnectWallet = () => setConnectWalletOpen(true)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">
          <img
            src="/zalary-logo.svg"
            alt="Zalary"
            className="size-30 animate-pulse"
          />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  const ufvk = meData?.me?.zcashViewingKey ?? null
  const birthdayHeight = meData?.me?.walletBirthdayHeight ?? null

  return (
    <MobileGuard>
      <CoiGuard>
        <ZcashWalletProvider ufvk={ufvk} birthdayHeight={birthdayHeight}>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar
                onConnectWallet={needsWallet ? openConnectWallet : undefined}
              />
              <SidebarInset>
                <main className="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-neutral-900">
                  <div className="mx-auto w-full max-w-5xl">
                    <Outlet />
                  </div>
                </main>
              </SidebarInset>
              <ConnectWalletModal
                open={connectWalletOpen}
                onOpenChange={(open) => {
                  setConnectWalletOpen(open)
                  if (!open) refetchMe()
                }}
              />
              <Walkthrough onConnectWallet={openConnectWallet} />
            </SidebarProvider>
          </TooltipProvider>
        </ZcashWalletProvider>
      </CoiGuard>
    </MobileGuard>
  )
}
