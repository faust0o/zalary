import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { useEffect, useState } from "react"

type Status = "checking" | "registering" | "activating" | "reloading" | "ready" | "failed"

const STATUS_LABELS: Record<Status, string> = {
  checking: "Checking browser capabilities...",
  registering: "Installing security worker...",
  activating: "Activating secure context...",
  reloading: "Applying changes...",
  ready: "",
  failed: "Setup failed",
}

export function CoiGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Already isolated — nothing to do
    if (window.crossOriginIsolated) {
      sessionStorage.removeItem("coi-reload-count")
      setStatus("ready")
      return
    }

    // No service worker support — can't fix it
    if (!("serviceWorker" in navigator)) {
      setStatus("failed")
      setError("Your browser does not support service workers.")
      return
    }

    // Prevent infinite reload loops: track how many times we've reloaded
    // for COI setup and bail after a few attempts.
    const RELOAD_KEY = "coi-reload-count"
    const MAX_RELOADS = 3
    const reloadCount = parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10)

    let cancelled = false

    async function setup() {
      try {
        // Check if already registered and active
        const existing = await navigator.serviceWorker.getRegistration("/coi-sw.js")
        if (existing?.active) {
          // SW is active but page isn't isolated — needs a reload,
          // but give up if we've already tried multiple times (e.g. mobile
          // browsers that don't support cross-origin isolation via SW).
          if (reloadCount >= MAX_RELOADS) {
            setStatus("failed")
            setError("Your browser could not enable cross-origin isolation. Try a desktop browser like Chrome or Edge.")
            return
          }
          setStatus("reloading")
          sessionStorage.setItem(RELOAD_KEY, String(reloadCount + 1))
          window.location.reload()
          return
        }

        setStatus("registering")
        const reg = await navigator.serviceWorker.register("/coi-sw.js")

        // Wait for activation
        const sw = reg.installing || reg.waiting
        if (sw) {
          setStatus("activating")
          await new Promise<void>((resolve) => {
            sw.addEventListener("statechange", () => {
              if (sw.state === "activated") resolve()
            })
            // Already activated
            if (sw.state === "activated") resolve()
          })
        }

        if (cancelled) return

        // Reload to apply cross-origin isolation
        if (reloadCount >= MAX_RELOADS) {
          setStatus("failed")
          setError("Your browser could not enable cross-origin isolation. Try a desktop browser like Chrome or Edge.")
          return
        }
        setStatus("reloading")
        sessionStorage.setItem(RELOAD_KEY, String(reloadCount + 1))
        window.location.reload()
      } catch (e) {
        if (cancelled) return
        setStatus("failed")
        setError(e instanceof Error ? e.message : "Unknown error")
      }
    }

    setup()
    return () => { cancelled = true }
  }, [])

  if (status === "ready") return <>{children}</>

  const isRetryable = status === "failed"

  return (
    <>
      {children}
      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Setting up Zalary</DialogTitle>
            <DialogDescription>
              Preparing your browser for secure treasury operations.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            {!isRetryable && (
              <div className="flex items-center gap-3">
                <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                <span className="text-sm text-muted-foreground">
                  {STATUS_LABELS[status]}
                </span>
              </div>
            )}
            {isRetryable && (
              <div className="text-center">
                <p className="text-sm text-red-500 mb-3">
                  {error || "Could not enable secure context."}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
