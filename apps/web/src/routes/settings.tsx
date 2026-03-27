import { useMutation, useQuery } from "@apollo/client/react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Laptop,
  Loader2,
  Monitor,
  Smartphone,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  MeSettingsDocument,
  UpdateUserDocument,
} from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { tribe } from "../lib/tribe"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "google":
      return <GoogleIcon className="size-5" />
    case "twitter":
      return <XIcon className="size-5" />
    case "discord":
      return <DiscordIcon className="size-5" />
    default:
      return <span className="size-5 text-xs font-medium uppercase">{provider[0]}</span>
  }
}

function providerName(provider: string) {
  switch (provider) {
    case "google": return "Google"
    case "twitter": return "X"
    case "discord": return "Discord"
    default: return provider
  }
}

interface LinkedCredential {
  id: string
  provider: string
  walletAddress?: string | null
  createdAt: string
}

interface ActiveDevice {
  id: string
  browser: string
  os: string
  deviceType: string
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
}

function DeviceIcon({ deviceType }: { deviceType: string }) {
  switch (deviceType.toLowerCase()) {
    case "mobile":
      return <Smartphone className="size-5" />
    case "tablet":
      return <Laptop className="size-5" />
    default:
      return <Monitor className="size-5" />
  }
}

export function SettingsPage() {
  useTitle("Settings")
  const { data, loading } = useQuery(MeSettingsDocument)
  const [updateUser] = useMutation(UpdateUserDocument)
  const [viewingKey, setViewingKey] = useState("")
  const [saved, setSaved] = useState(false)

  // Recovery methods
  const [credentials, setCredentials] = useState<LinkedCredential[]>([])
  const [credentialsLoading, setCredentialsLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const [credentialError, setCredentialError] = useState<string | null>(null)

  // Sessions
  const [devices, setDevices] = useState<ActiveDevice[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [invalidatingAll, setInvalidatingAll] = useState(false)

  useEffect(() => {
    if (data?.me?.zcashViewingKey) {
      setViewingKey(data.me.zcashViewingKey)
    }
  }, [data])

  const loadCredentials = useCallback(async () => {
    try {
      const result = await tribe.getLinkedCredentials()
      setCredentials(result as LinkedCredential[])
    } catch {
      // Tribe session may not exist yet
    } finally {
      setCredentialsLoading(false)
    }
  }, [])

  const loadDevices = useCallback(async () => {
    try {
      const result = await tribe.getActiveDevices()
      setDevices(result as ActiveDevice[])
    } catch {
      // Tribe session may not exist yet
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCredentials()
    loadDevices()
  }, [loadCredentials, loadDevices])

  async function handleSave() {
    await updateUser({ variables: { zcashViewingKey: viewingKey } })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleRevokeSession(sessionId: string) {
    setRevoking(sessionId)
    try {
      await tribe.revokeSession(sessionId)
      setDevices((d) => d.filter((dev) => dev.id !== sessionId))
    } catch {
      // ignore
    } finally {
      setRevoking(null)
    }
  }

  async function handleLinkGoogle() {
    setCredentialError(null)
    setLinking("google")
    try {
      const updated = await tribe.linkGoogle()
      setCredentials(updated as LinkedCredential[])
    } catch (err) {
      setCredentialError(err instanceof Error ? err.message : "Failed to link Google")
    } finally {
      setLinking(null)
    }
  }

  function handleLinkOAuth(provider: "discord" | "twitter") {
    setCredentialError(null)
    tribe.linkOAuth(provider)
  }

  async function handleUnlink(credentialId: string) {
    setCredentialError(null)
    setUnlinking(credentialId)
    try {
      const updated = await tribe.unlinkCredential(credentialId)
      setCredentials(updated as LinkedCredential[])
    } catch (err) {
      setCredentialError(err instanceof Error ? err.message : "Failed to unlink account")
    } finally {
      setUnlinking(null)
    }
  }

  async function handleInvalidateAll() {
    setInvalidatingAll(true)
    try {
      await tribe.invalidateAllSessions()
      await tribe.logout()
      window.location.href = "/login"
    } catch {
      setInvalidatingAll(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-4xl font-light tracking-tight">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Viewing Key</CardTitle>
          <CardDescription>
            Your Zcash viewing key allows Zalary to track your balance and
            transaction history. This is read-only access and cannot be used to
            spend funds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="viewing-key"
            value={viewingKey}
            onChange={(e) => setViewingKey(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="zxviews1..."
            className="h-12 font-mono !text-lg"
          />
          <div className="flex items-center gap-2">
            <Button onClick={handleSave}>
              Save Viewing Key
            </Button>
            {saved && (
              <span className="text-sm text-green-600">Saved successfully</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recovery Methods</CardTitle>
          <CardDescription>
            Link social accounts to recover access if you lose your passkey.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {credentialError && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {credentialError}
            </div>
          )}

          {credentialsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading recovery methods...</p>
            </div>
          ) : credentials.length > 0 ? (
            <div className="space-y-1">
              {credentials.map((cred) => (
                <div key={cred.id} className="border border-muted px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      <ProviderIcon provider={cred.provider} />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <p className="text-sm font-medium">{providerName(cred.provider)}</p>
                      <p className="text-xs text-muted-foreground">
                        Linked{" "}
                        {new Date(cred.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(cred.id)}
                      disabled={unlinking === cred.id}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      {unlinking === cred.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recovery methods linked yet.</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleLinkGoogle}
              disabled={linking === "google"}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-muted bg-white text-foreground shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {linking === "google" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <GoogleIcon className="size-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleLinkOAuth("twitter")}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg bg-black text-white shadow-sm transition-colors hover:bg-black/80"
            >
              <XIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => handleLinkOAuth("discord")}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg bg-[#5865F2] text-white shadow-sm transition-colors hover:bg-[#4752C4]"
            >
              <DiscordIcon className="size-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Manage your logged-in devices and sessions.
            </CardDescription>
          </div>
          {devices.length > 1 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleInvalidateAll}
              disabled={invalidatingAll}
            >
              {invalidatingAll ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Revoke All
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Loading sessions...
              </p>
            </div>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active sessions found.
            </p>
          ) : (
            <div className="space-y-1">
              {devices.map((device) => (
                <div key={device.id} className="border border-muted px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      <DeviceIcon deviceType={device.deviceType} />
                    </div>
                    <div className="min-w-0 flex-1 gap-1 flex flex-col">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {device.browser} on {device.os}
                        </p>
                        {device.isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last active{" "}
                        {new Date(device.lastActiveAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    {!device.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(device.id)}
                        disabled={revoking === device.id}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        {revoking === device.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
