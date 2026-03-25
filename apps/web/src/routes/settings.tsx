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
import { Separator } from "@workspace/ui/components/separator"
import {
  Laptop,
  Loader2,
  Monitor,
  Smartphone,
  Trash2,
  X
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  MeSettingsDocument,
  UpdateUserDocument,
} from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { tribe } from "../lib/tribe"

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
    loadDevices()
  }, [loadDevices])

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
              {devices.map((device, index) => (
                <div key={device.id} className="border border-muted px-3 py-2 rounded-lg">
                  {index > 1 && <Separator className="my-3" />}
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
