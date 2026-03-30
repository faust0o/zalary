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
