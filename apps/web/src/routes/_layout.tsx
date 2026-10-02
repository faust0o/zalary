import { useQuery } from "@apollo/client/react"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { AppSidebar } from "../components/app-sidebar"
import { CoiGuard } from "../components/coi-guard"
import { MobileGuard } from "../components/mobile-guard"
import { OnboardingModal } from "../components/onboarding-modal"
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
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)

  const meLoaded = !meLoading && meData?.me != null
  const missingWalletConfig =
    meLoaded &&
    (!meData.me?.zcashViewingKey || !meData.me?.walletBirthdayHeight)

  // Only the owner can set the wallet up; delegates use the owner's.
  const needsOnboarding = missingWalletConfig && !meData.me?.owner
  const onboardingOpen = needsOnboarding && !onboardingDismissed

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
              <AppSidebar />
              <SidebarInset>
                <main className="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-neutral-900">
                  <div className="mx-auto w-full max-w-5xl">
                    <Outlet />
                  </div>
                </main>
              </SidebarInset>
              <OnboardingModal
                open={onboardingOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    setOnboardingDismissed(true)
                    refetchMe()
                  }
                }}
              />
              <Walkthrough />
            </SidebarProvider>
          </TooltipProvider>
        </ZcashWalletProvider>
      </CoiGuard>
    </MobileGuard>
  )
}
