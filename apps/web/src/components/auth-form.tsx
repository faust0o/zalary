import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useState, type FormEvent } from "react"
import { useAuth } from "../hooks/use-auth"

const USERNAME_RE = /^[a-z0-9_]{3,32}$/

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

export function AuthForm({
  idPrefix,
  onAuthenticated,
}: {
  idPrefix: string
  onAuthenticated?: () => void
}) {
  const { login, register } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const normalized = username.trim().toLowerCase()
    if (!USERNAME_RE.test(normalized)) {
      setError(
        "Username must be 3–32 characters and use only letters, numbers, and underscores."
      )
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (isRegistering && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      if (isRegistering) {
        await register(normalized, password)
      } else {
        await login(normalized, password)
      }
      onAuthenticated?.()
    } catch (err) {
      setError(
        errorMessage(
          err,
          isRegistering ? "Registration failed" : "Login failed"
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-username`}>Username</Label>
          <Input
            id={`${idPrefix}-username`}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="yourname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-password`}>Password</Label>
          <Input
            id={`${idPrefix}-password`}
            type="password"
            autoComplete={isRegistering ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {isRegistering && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-confirm`}>Confirm password</Label>
            <Input
              id={`${idPrefix}-confirm`}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? isRegistering
              ? "Creating account..."
              : "Signing in..."
            : isRegistering
              ? "Create Account"
              : "Sign In"}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering)
            setError(null)
          }}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {isRegistering
            ? "Already have an account? Sign in"
            : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  )
}
