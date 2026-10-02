import { Identicon } from "@workspace/ui/components/Identicon"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Check, Copy, Link2, Plus } from "lucide-react"
import { useState } from "react"

export interface DelegationsInvite {
  id: string
  token: string
  expiresAt: string
}

export interface DelegationsDelegate {
  id: string
  name?: string | null
  username: string
  createdAt: string
}

export interface DelegationsViewProps {
  invites: DelegationsInvite[]
  delegates: DelegationsDelegate[]
  loading: boolean
  creating?: boolean
  onCreateInvite?: () => void
  /** Replaces copying the link to the clipboard. */
  onCopyInvite?: (url: string) => void
  onRevokeInvite?: (id: string) => void
  onRemoveDelegate?: (id: string) => Promise<void>
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function inviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`
}

function CopyLinkButton({
  url,
  onCopy,
}: {
  url: string
  onCopy?: (url: string) => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (onCopy) {
          onCopy(url)
          return
        }
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="text-green-500" /> : <Copy />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

export function DelegationsView({
  invites,
  delegates,
  loading,
  creating,
  onCreateInvite,
  onCopyInvite,
  onRevokeInvite,
  onRemoveDelegate,
}: DelegationsViewProps) {
  const [pendingRemoval, setPendingRemoval] =
    useState<DelegationsDelegate | null>(null)
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    if (!pendingRemoval) return
    setRemoving(true)
    try {
      await onRemoveDelegate?.(pendingRemoval.id)
      setPendingRemoval(null)
    } finally {
      setRemoving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-4xl font-light tracking-tight">Delegations</h2>
        <p className="text-sm text-muted-foreground">
          People you delegate to can see your employees, payrolls, and payment
          history, and can edit employees and payrolls. They never see your
          viewing key, and they can't invite anyone else.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite links</CardTitle>
          <CardDescription>
            Each link creates one account and expires after 7 days.
          </CardDescription>
          <CardAction>
            <Button size="sm" disabled={creating} onClick={onCreateInvite}>
              <Plus />
              {creating ? "Creating..." : "New Link"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open invite links.
            </p>
          ) : (
            <ul className="space-y-3">
              {invites.map((invite) => (
                <li key={invite.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-muted px-3 py-2">
                      <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {inviteUrl(invite.token)}
                      </span>
                    </div>
                    <CopyLinkButton
                      url={inviteUrl(invite.token)}
                      onCopy={onCopyInvite}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRevokeInvite?.(invite.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDate(invite.expiresAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People with access</CardTitle>
          <CardDescription>
            Removing someone signs them out and deletes their account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delegates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one yet. Send an invite link to someone you trust.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {delegates.map((delegate) => (
                <li
                  key={delegate.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Identicon
                    hash={delegate.id}
                    size={36}
                    className="shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {delegate.name ?? delegate.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{delegate.username} · Joined{" "}
                      {formatDate(delegate.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPendingRemoval(delegate)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove {pendingRemoval?.name ?? pendingRemoval?.username}?
            </DialogTitle>
            <DialogDescription>
              @{pendingRemoval?.username} will be signed out and their account
              deleted. They'll need a new invite link to get access again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRemoval(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={handleRemove}
            >
              {removing ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
