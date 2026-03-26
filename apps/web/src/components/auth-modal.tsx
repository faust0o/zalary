import { useMutation } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Fingerprint } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { RegisterUserDocument } from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"

export function AuthModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { login, loginWithEmail, register } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [registerUser] = useMutation(RegisterUserDocument)

  async function handlePasskeyLogin() {
    setError(null)
    setIsSubmitting(true)
    try {
      await login()
      onOpenChange(false)
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
      onOpenChange(false)
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
      onOpenChange(false)
      navigate("/dashboard?onboarding=1")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <img
            src="/zalary-logo.svg"
            alt="Zalary"
            className="mx-auto mb-2 h-12"
          />
          <DialogTitle className="text-2xl font-bold">Zalary</DialogTitle>
          <DialogDescription>
            {isRegistering
              ? "Create your account"
              : "Sign in to your account"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-email">Email</Label>
                <Input
                  id="modal-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-password">Password</Label>
                <Input
                  id="modal-password"
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
                  <Label htmlFor="modal-login-email">Email</Label>
                  <Input
                    id="modal-login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-login-password">Password</Label>
                  <Input
                    id="modal-login-password"
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
