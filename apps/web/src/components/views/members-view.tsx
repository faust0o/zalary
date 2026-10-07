import { Identicon } from "@workspace/ui/components/Identicon"
import { Badge } from "@workspace/ui/components/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"
import { Check, Copy, Link2, Plus } from "lucide-react"
import { useState } from "react"

export type AccessRole = "MEMBER" | "DELEGATE"

export interface MembersPerson {
  id: string
  name?: string | null
  username: string
  role?: AccessRole | null
  isAccountOwner: boolean
  /** Holds a share of the treasury key. */
  isSigner: boolean
  /** Can open the account's payroll data. */
  hasDataAccess?: boolean
  createdAt: string
}

export interface MembersInvite {
  id: string
  token: string
  role: AccessRole
  expiresAt: string
}

export interface MembersViewProps {
  people: MembersPerson[]
  invites: MembersInvite[]
  loading: boolean
  /** Only the account owner manages access. */
  canManage: boolean
  /** Hand out invite links. Defaults to `canManage`. */
  canInvite?: boolean
  creating?: boolean
  onCreateInvite?: (role: AccessRole) => void
  /** Replaces copying the link to the clipboard. */
  onCopyInvite?: (url: string) => void
  onRevokeInvite?: (id: string) => void
  onChangeRole?: (userId: string, role: AccessRole) => Promise<void>
  onRemove?: (userId: string) => Promise<void>
}

// A readable column, like the approvals list.
const COLUMN = "mx-auto w-full max-w-[60ch]"

const ROLE_LABEL: Record<AccessRole, string> = {
  MEMBER: "Member",
  DELEGATE: "Delegate",
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

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: AccessRole
  onChange: (role: AccessRole) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(role) => onChange(role as AccessRole)}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="w-[110px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="MEMBER">Member</SelectItem>
        <SelectItem value="DELEGATE">Delegate</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function MembersView({
  people,
  invites,
  loading,
  canManage,
  canInvite = canManage,
  creating,
  onCreateInvite,
  onCopyInvite,
  onRevokeInvite,
  onChangeRole,
  onRemove,
}: MembersViewProps) {
  const [inviteRole, setInviteRole] = useState<AccessRole>("MEMBER")
  const [pendingRemoval, setPendingRemoval] = useState<MembersPerson | null>(
    null
  )
  const [removing, setRemoving] = useState(false)
  const [changing, setChanging] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRemove() {
    if (!pendingRemoval) return
    setRemoving(true)
    setError(null)
    try {
      await onRemove?.(pendingRemoval.id)
      setPendingRemoval(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove them.")
    } finally {
      setRemoving(false)
    }
  }

  async function handleRole(userId: string, role: AccessRole) {
    setChanging(userId)
    try {
      await onChangeRole?.(userId, role)
    } finally {
      setChanging(null)
    }
  }

  if (loading) {
    return (
      <p className={cn(COLUMN, "text-sm text-muted-foreground")}>Loading...</p>
    )
  }

  return (
    <div className={cn(COLUMN, "space-y-6")}>
      <Card>
        <CardHeader>
          <CardTitle>People with access</CardTitle>
          <CardDescription>
            Members can see employees, payrolls and payments, and approve
            treasury payments if they hold a key share. Delegates can also edit
            employees and payrolls. Nobody else ever sees the treasury's viewing
            key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {people.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Identicon
                  hash={person.username}
                  size={36}
                  className="shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {person.name ?? person.username}
                    {person.isSigner && (
                      <Badge variant="outline" className="h-5">
                        Signer
                      </Badge>
                    )}
                    {person.hasDataAccess === false && (
                      <Badge
                        variant="outline"
                        className="h-5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                      >
                        No data access yet
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{person.username} · Joined {formatDate(person.createdAt)}
                  </p>
                </div>
                {person.isAccountOwner ? (
                  <span className="text-xs text-muted-foreground">
                    Owner · Coordinator
                  </span>
                ) : canManage ? (
                  <>
                    <RoleSelect
                      value={person.role ?? "DELEGATE"}
                      disabled={changing === person.id}
                      onChange={(role) => handleRole(person.id, role)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingRemoval(person)}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABEL[person.role ?? "DELEGATE"]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Invite links</CardTitle>
            <CardDescription>
              Each link creates one login in your account and expires after 7
              days. To add a signer, invite them while setting up a treasury.
            </CardDescription>
            <CardAction className="flex items-center gap-2">
              <RoleSelect value={inviteRole} onChange={setInviteRole} />
              <Button
                size="sm"
                disabled={creating}
                onClick={() => onCreateInvite?.(inviteRole)}
              >
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
                      {ROLE_LABEL[invite.role]} · Expires{" "}
                      {formatDate(invite.expiresAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoval(null)
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove {pendingRemoval?.name ?? pendingRemoval?.username}?
            </DialogTitle>
            <DialogDescription>
              @{pendingRemoval?.username} will be signed out and their login
              deleted.
              {pendingRemoval?.isSigner &&
                " Their key share is deleted with it, but a share they already opened can't be revoked without creating a new treasury."}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
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
