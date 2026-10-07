import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Navigate, useSearchParams } from "react-router-dom"
import { AuthForm } from "../components/auth-form"
import { Wordmark } from "../components/wordmark"
import { useAuth } from "../hooks/use-auth"
import { useTitle } from "../hooks/use-title"

export function LoginPage() {
  useTitle("Sign In")
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  // Only same-origin paths, e.g. back to a treasury invite.
  const next = params.get("next")
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to={destination} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 to-neutral-100 p-4 dark:to-neutral-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            <Wordmark className="mx-auto mb-1 h-9" />
          </CardTitle>
          <CardDescription>Username and password</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm idPrefix="login" />
        </CardContent>
      </Card>
    </div>
  )
}
