import { useEffect, useState } from "react"
import { Wordmark } from "./wordmark"

const MOBILE_BREAKPOINT = 768

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

export function MobileGuard({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-8 text-center">
        <Wordmark className="h-10" />
        <h1 className="text-2xl font-semibold">Desktop Only</h1>
        <p className="text-muted-foreground">
          Zalary is currently only available on desktop. Please visit us on a
          larger screen.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
