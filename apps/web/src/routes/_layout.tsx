import { useQuery } from "@apollo/client/react"
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { useState } from "react"
import { Navigate, Outlet, useSearchParams } from "react-router-dom"
import { AppSidebar } from "../components/app-sidebar"
import { OnboardingModal } from "../components/onboarding-modal"
import { MeLayoutDocument } from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"
import { ZcashWalletProvider } from "../hooks/use-zcash-wallet"

export function Layout() {
  const { user, loading } = useAuth()
  const { data: meData, loading: meLoading } = useQuery(MeLayoutDocument, { skip: !user })
  const [searchParams] = useSearchParams()
  const fromRegistration = searchParams.get("onboarding") === "1"
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)

  const meLoaded = !meLoading && meData?.me != null
  const needsOnboarding = fromRegistration ||
    (meLoaded && (!meData.me.zcashViewingKey || !meData.me.walletBirthdayHeight))
  const onboardingOpen = needsOnboarding && !onboardingDismissed

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm"><img src="/zalary-logo.svg" alt="Zalary" className="animate-pulse size-30" /></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const ufvk = meData?.me?.zcashViewingKey ?? null
  const birthdayHeight = meData?.me?.walletBirthdayHeight ?? null

  return (
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
            onOpenChange={(open) => { if (!open) setOnboardingDismissed(true) }}
            skipPasskey={fromRegistration}
          />
        </SidebarProvider>
      </TooltipProvider>
    </ZcashWalletProvider>
  )
}
