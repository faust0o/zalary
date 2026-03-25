import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { useMutation } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { useAuth } from "../hooks/use-auth"
import { useTitle } from "../hooks/use-title"
import { Fingerprint } from "lucide-react"
import { RegisterUserDocument } from "../graphql/__generated__/graphql"

export function LoginPage() {
  useTitle("Sign In")
  const navigate = useNavigate()
  const { user, loading, login, loginWithEmail, register, registerPasskey } =
    useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [registerUser] = useMutation(RegisterUserDocument)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handlePasskeyLogin() {
    setError(null)
    setIsSubmitting(true)
    try {
      await login()
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey login failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await loginWithEmail(email, password)
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const tribeUser = await register(email, password)
      await registerUser({
        variables: {
          email,
          tribeUserId: tribeUser.id,
        },
      })
      navigate("/dashboard?onboarding=1")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-950 to-neutral-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
              src="/zalary-logo.svg"
              alt="Zalary"
              className="mx-auto mb-2 h-12"
            />
            <CardTitle className="text-2xl font-bold">Zalary</CardTitle>
          <CardDescription>
            {isRegistering
              ? "Create your account"
              : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                After registration, you'll be prompted to set up a passkey for
                secure login.
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card text-muted-foreground px-2">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handlePasskeyLogin}
                className="w-full"
                disabled={isSubmitting}
              >
                <Fingerprint className="mr-2 size-4" />
                Sign in with Passkey
              </Button>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setError(null)
              }}
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              {isRegistering
                ? "Already have an account? Sign in"
                : "Don't have an account? Register"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
