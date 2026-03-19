import { useQuery } from "@apollo/client/react"
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { useEffect, useState } from "react"
import { Navigate, Outlet, useSearchParams } from "react-router-dom"
import { AppSidebar } from "../components/app-sidebar"
import { OnboardingModal } from "../components/onboarding-modal"
import { MeLayoutDocument } from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"

export function Layout() {
  const { user, loading } = useAuth()
  const { data: meData } = useQuery(MeLayoutDocument, { skip: !user })
  const [searchParams] = useSearchParams()
  const fromRegistration = searchParams.get("onboarding") === "1"
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  useEffect(() => {
    if (fromRegistration) {
      setOnboardingOpen(true)
    } else if (meData?.me && !meData.me.zcashViewingKey) {
      setOnboardingOpen(true)
    }
  }, [meData, fromRegistration])

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

  return (
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
          onOpenChange={setOnboardingOpen}
          skipPasskey={fromRegistration}
        />
      </SidebarProvider>
    </TooltipProvider>
  )
}
