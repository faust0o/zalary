import { useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useState, type FormEvent, type ReactNode } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Wordmark } from "../components/wordmark"
import { AccessInvitePreviewDocument } from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"
import { useTitle } from "../hooks/use-title"

const USERNAME_RE = /^[a-z0-9_]{3,32}$/

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function InviteShell({
  title,
  description,
  children,
}: {
  title: string
  description: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 to-neutral-100 p-4 dark:to-neutral-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Wordmark className="mx-auto mb-3 h-7" />
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
      </Card>
    </div>
  )
}

export function InvitePage() {
  useTitle("Accept Invite")
  const { token = "" } = useParams()
  const { user, loading: authLoading, acceptInvite, logout } = useAuth()
  const { data, loading: previewLoading } = useQuery(
    AccessInvitePreviewDocument,
    { variables: { token }, fetchPolicy: "network-only" }
  )
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const invite = data?.accessInvite

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const normalized = username.trim().toLowerCase()
    if (!name.trim()) {
      setError("Please enter your name.")
      return
    }
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
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    setAccepted(true)
    try {
      await acceptInvite(token, name.trim(), normalized, password)
    } catch (err) {
      setAccepted(false)
      setError(errorMessage(err, "Could not accept invite"))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (user && accepted) {
    return <Navigate to="/dashboard" replace />
  }

  if (authLoading || previewLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!invite) {
    return (
      <InviteShell
        title="Invite unavailable"
        description="This invite link is invalid, has expired, or has already been used. Ask for a new one."
      >
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </InviteShell>
    )
  }

  if (user) {
    return (
      <InviteShell
        title={`Join @${invite.ownerUsername}`}
        description={
          <>
            You're signed in as{" "}
            <span className="font-medium text-foreground">
              @{user.username}
            </span>
            . Log out to create a new account with this invite.
          </>
        }
      >
        <Button className="w-full" onClick={() => logout()}>
          Log out
        </Button>
      </InviteShell>
    )
  }

  return (
    <InviteShell
      title={`Join @${invite.ownerUsername}`}
      description={
        <>
          @{invite.ownerUsername} invited you to{" "}
          {invite.role === "DELEGATE"
            ? "help run their payroll. You'll be able to view and edit their employees and payrolls and see their payment history."
            : "their payroll as a member. You'll be able to view their employees, payrolls and payment history."}{" "}
          Expires{" "}
          {new Date(invite.expiresAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
          .
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-username">Username</Label>
            <Input
              id="invite-username"
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
            <Label htmlFor="invite-password">Password</Label>
            <Input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-confirm">Confirm password</Label>
            <Input
              id="invite-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </div>
    </InviteShell>
  )
}
