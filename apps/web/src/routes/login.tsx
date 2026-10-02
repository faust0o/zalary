import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Navigate } from "react-router-dom"
import { AuthForm } from "../components/auth-form"
import { useAuth } from "../hooks/use-auth"
import { useTitle } from "../hooks/use-title"

export function LoginPage() {
  useTitle("Sign In")
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 to-neutral-100 p-4 dark:to-neutral-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/zalary-logo.svg"
            alt="Zalary"
            className="mx-auto mb-2 h-12"
          />
          <CardTitle className="text-2xl font-bold">Zalary</CardTitle>
          <CardDescription>Username and password</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm idPrefix="login" />
        </CardContent>
      </Card>
    </div>
  )
}
