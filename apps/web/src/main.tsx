import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { ApolloProvider } from "@apollo/client/react"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/hooks/use-auth"
import { ZecPriceProvider } from "@/hooks/use-zec-price"
import { apolloClient } from "@/lib/apollo"
import { router } from "@/routes/index"

// Register Cross-Origin Isolation service worker so SharedArrayBuffer
// is available for the WASM wallet thread pool (required for block scanning).
if ("serviceWorker" in navigator && !window.crossOriginIsolated) {
  navigator.serviceWorker
    .register("/coi-sw.js")
    .then((reg) => {
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing
        if (!worker) return
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            // Reload once to activate cross-origin isolation
            window.location.reload()
          }
        })
      })
    })
    .catch((e) => console.warn("COI service worker registration failed:", e))
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <ZecPriceProvider>
            <RouterProvider router={router} />
          </ZecPriceProvider>
        </AuthProvider>
      </ApolloProvider>
    </ThemeProvider>
  </StrictMode>
)
