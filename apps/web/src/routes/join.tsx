import { useMutation, useQuery } from "@apollo/client/react"
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
import { ShieldCheck } from "lucide-react"
import { useState, type FormEvent, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { VaultButton } from "../components/treasury/vault-button"
import { Wordmark } from "../components/wordmark"
import {
  AcceptTreasuryInviteDocument,
  TreasuryInvitePreviewDocument,
} from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"
import { useTitle } from "../hooks/use-title"
import { useVault } from "../hooks/use-vault"
import { prfSupported } from "../lib/vault"

const USERNAME_RE = /^[a-z0-9_]{3,32}$/

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function JoinShell({
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

/** Taking a member slot in a treasury that's being set up. */
export function JoinTreasuryPage() {
  useTitle("Join Treasury")
  const { token = "" } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, adoptSession, logout } = useAuth()
  const vault = useVault()
  const { data, loading: previewLoading } = useQuery(
    TreasuryInvitePreviewDocument,
    { variables: { token }, fetchPolicy: "network-only" }
  )
  const [acceptInvite] = useMutation(AcceptTreasuryInviteDocument)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [joined, setJoined] = useState(false)
  const [noPrf, setNoPrf] = useState(false)

  const invite = data?.treasuryInvite

  async function accept(credentials?: {
    name: string
    username: string
    password: string
  }) {
    setError(null)
    setSubmitting(true)
    try {
      // Passkeys must be able to seal the key share; check before joining.
      if ((await prfSupported()) === false) {
        setNoPrf(true)
        return
      }
      const { data: result } = await acceptInvite({
        variables: { token, ...credentials },
      })
      const payload = result?.acceptTreasuryInvite
      if (!payload) throw new Error("Could not join the treasury")
      await adoptSession(payload.token, payload.user)
      setJoined(true)
    } catch (err) {
      setError(errorMessage(err, "Could not join the treasury"))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = username.trim().toLowerCase()
    if (!name.trim()) return setError("Please enter your name.")
    if (!USERNAME_RE.test(normalized)) {
      return setError(
        "Username must be 3–32 characters and use only letters, numbers, and underscores."
      )
    }
    if (password.length < 8) {
      return setError("Password must be at least 8 characters.")
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match.")
    }
    accept({ name: name.trim(), username: normalized, password })
  }

  if (joined) {
    const ready = vault.hasPasskey
    return (
      <JoinShell
        title={ready ? "You're in" : "Protect your key share"}
        description={
          ready
            ? `When the coordinator starts the key ceremony, keep the Treasury page open. Your share of the key is created in your browser and sealed with your passkey.`
            : "Your share of the treasury key is sealed with a passkey on this device, so only you can use it. Zalary only ever stores it encrypted."
        }
      >
        <div className="space-y-4">
          {!ready && (
            <VaultButton size="lg" className="w-full">
              Unlock passkey
            </VaultButton>
          )}
          <Button
            className="w-full"
            variant={ready ? "default" : "outline"}
            disabled={!ready}
            onClick={() => navigate("/treasury")}
          >
            <ShieldCheck />
            Go to the treasury
          </Button>
        </div>
      </JoinShell>
    )
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
      <JoinShell
        title="Invite unavailable"
        description="This link is invalid, has expired, has already been used, or the treasury's keys have already been created. Ask for a new one."
      >
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </JoinShell>
    )
  }

  const title = `Join ${invite.treasuryName}`
  const description = (
    <>
      @{invite.ownerUsername} invited you to co-sign payroll payments from their
      treasury. Payments need {invite.threshold} approvals. You'll be able to
      view their employees, payrolls and payment history.
    </>
  )

  if (noPrf) {
    return (
      <JoinShell
        title="This browser can't hold a key share"
        description="Treasury keys are sealed with your passkey's PRF extension, which this browser or passkey provider doesn't support. Open the link in a recent Chrome, Safari or Edge with iCloud Keychain, Google Password Manager or 1Password."
      />
    )
  }

  if (user) {
    return (
      <JoinShell title={title} description={description}>
        <div className="space-y-3">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button
            className="w-full"
            disabled={submitting}
            onClick={() => accept()}
          >
            {submitting ? "Joining..." : `Join as @${user.username}`}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => logout()}>
            Use a new login instead
          </Button>
        </div>
      </JoinShell>
    )
  }

  return (
    <JoinShell title={title} description={description}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-name">Name</Label>
            <Input
              id="join-name"
              autoComplete="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-username">Username</Label>
            <Input
              id="join-username"
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
            <Label htmlFor="join-password">Password</Label>
            <Input
              id="join-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-confirm">Confirm password</Label>
            <Input
              id="join-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Joining..." : "Create login & join"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Already have a login in this account?{" "}
          <Link to={`/login?next=/join/${token}`} className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </JoinShell>
  )
}
