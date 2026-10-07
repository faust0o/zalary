import { useMutation, useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
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
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Download, Fingerprint, KeyRound, Loader2 } from "lucide-react"
import { useState, type FormEvent } from "react"
import {
  AccountMembersDocument,
  ChangePasswordDocument,
  DeleteAccountDocument,
  MeSettingsDocument,
  MyPasskeysDocument,
  RemovePasskeyDocument,
  TreasuryDocument,
} from "../graphql/__generated__/graphql"
import { useAccountData } from "../hooks/use-account-data"
import { useAuth } from "../hooks/use-auth"
import { useSpendProposals } from "../hooks/use-spend-proposals"
import { useTitle } from "../hooks/use-title"
import { useTreasuryWallet } from "../hooks/use-treasury-wallet"
import { useVault } from "../hooks/use-vault"
import { keyFingerprint } from "../lib/account-key"
import { exportZip } from "../lib/export-data"
import {
  logPasskeyFailure,
  PasskeyConfirmationNeeded,
  passkeyEnvironmentProblem,
} from "../lib/vault"
import { saveActiveSwap } from "../lib/near-intents"
import { setSessionToken } from "../lib/session"

const DELETE_CONFIRMATION = "I want to delete all my data"

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

export function SettingsPage() {
  useTitle("Settings")
  const { data, loading } = useQuery(MeSettingsDocument)
  const [changePassword] = useMutation(ChangePasswordDocument)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const { logout } = useAuth()
  const { displayBalance } = useTreasuryWallet()
  const [deleteAccount] = useMutation(DeleteAccountDocument)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSaved(false)

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.")
      return
    }

    setChangingPassword(true)
    try {
      const result = await changePassword({
        variables: { currentPassword, newPassword },
      })
      const token = result.data?.changePassword.token
      if (!token) throw new Error("Password change failed")
      setSessionToken(token)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordSaved(true)
    } catch (err) {
      setPasswordError(errorMessage(err, "Password change failed"))
    } finally {
      setChangingPassword(false)
    }
  }

  function handleDeleteOpenChange(open: boolean) {
    if (deleting) return
    setDeleteOpen(open)
    if (!open) {
      setDeleteConfirmation("")
      setDeleteError(null)
    }
  }

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault()
    if (deleteConfirmation.trim() !== DELETE_CONFIRMATION) return

    setDeleteError(null)
    setDeleting(true)
    try {
      // Only this browser can open the treasury's balance.
      await deleteAccount({
        variables: { treasuryEmpty: displayBalance === 0 },
      })
      saveActiveSwap(null)
      // Clears the session; the layout then redirects to the landing page.
      await logout()
    } catch (err) {
      setDeleteError(errorMessage(err, "Account deletion failed"))
      setDeleting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  const owner = data?.me?.owner

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-4xl font-light tracking-tight">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {data?.me?.username}
            </span>
            {owner && (
              <>
                , managing payroll for{" "}
                <span className="font-medium text-foreground">
                  @{owner.username}
                </span>
              </>
            )}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {passwordError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Updating..." : "Change Password"}
              </Button>
              {passwordSaved && (
                <span className="text-sm text-green-600">Password updated</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <PasskeysCard />

      <ExportDataCard />

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            {owner ? (
              <>
                Permanently delete your login. @{owner.username}
                &apos;s payroll data is not affected.
              </>
            ) : (
              <>
                Permanently delete your account and all of its data: employees,
                payrolls, payment history, your treasury and every member and
                delegate login. Pay out the treasury first: its keys go too.
                This cannot be undone.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent>
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently deletes{" "}
                {owner ? "your login" : "your account and all of its data"}.
                There is no way to recover it.
              </DialogDescription>
            </DialogHeader>
            {deleteError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {deleteError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Type{" "}
                <span className="font-semibold select-all">
                  {DELETE_CONFIRMATION}
                </span>{" "}
                to confirm.
              </Label>
              <Input
                id="delete-confirmation"
                autoComplete="off"
                spellCheck={false}
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                disabled={deleting}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => handleDeleteOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  deleting || deleteConfirmation.trim() !== DELETE_CONFIRMATION
                }
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Passkeys open the vault holding the user's treasury secrets. */
function PasskeysCard() {
  const { user } = useAuth()
  const vault = useVault()
  const [removePasskey] = useMutation(RemovePasskeyDocument, {
    refetchQueries: [MyPasskeysDocument],
    awaitRefetchQueries: true,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [environmentProblem] = useState(passkeyEnvironmentProblem)

  async function handleAdd() {
    setBusy("add")
    try {
      if (confirming) {
        await vault.confirmSetUp()
        setConfirming(false)
      } else if (vault.hasPasskey && !vault.keys) {
        // A new passkey wraps the same vault key, so open the vault first.
        // Browsers want a separate click for each passkey request.
        await vault.unlock()
      } else {
        await vault.setUp(user?.name)
      }
    } catch (err) {
      if (err instanceof PasskeyConfirmationNeeded) setConfirming(true)
      else void logPasskeyFailure(err)
    } finally {
      setBusy(null)
    }
  }

  async function handleRemove(id: string) {
    setBusy(id)
    setRemoveError(null)
    try {
      await removePasskey({ variables: { id } })
    } catch (err) {
      setRemoveError(errorMessage(err, "Couldn't remove the passkey."))
    } finally {
      setBusy(null)
    }
  }

  const addLabel = confirming
    ? "Confirm passkey"
    : !vault.hasPasskey
      ? "Set up passkey"
      : vault.keys
        ? "Add backup passkey"
        : "Unlock to add a backup passkey"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Your passkey opens your keys: the one your account's payroll data is
          encrypted with, your share of the treasury key and, for the owner,
          the treasury's viewing key. Zalary only stores them encrypted. Add a
          second passkey as a backup: without one, they're gone if you lose
          this one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {vault.loading ? null : vault.passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {vault.passkeys.map((passkey, i) => (
              <li
                key={passkey.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <KeyRound className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Passkey {i + 1}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Added{" "}
                    {new Date(passkey.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {passkey.credentialId.slice(0, 12)}…
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => handleRemove(passkey.id)}
                >
                  {busy === passkey.id ? "Removing..." : "Remove"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {removeError && (
          <p className="text-sm text-destructive">{removeError}</p>
        )}
        {vault.keys && (
          <p className="text-xs text-muted-foreground">
            Your public key:{" "}
            <span className="font-mono text-foreground">
              {keyFingerprint(vault.keys.commsPublicKey)}
            </span>
            . Whoever shares payroll data with you sees the same.
          </p>
        )}
        <Button
          variant="outline"
          title={environmentProblem ?? undefined}
          disabled={busy !== null || vault.loading || !!environmentProblem}
          onClick={handleAdd}
        >
          {busy === "add" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Fingerprint />
          )}
          {addLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Everything this user can see of the account's payroll data, decrypted here
 * and downloaded as CSV files with a README.
 */
function ExportDataCard() {
  const { user } = useAuth()
  const account = useAccountData()
  const ready = account.status === "ready"
  const { proposals, loading: proposalsLoading } = useSpendProposals({
    skip: !ready,
  })
  const { data: meData } = useQuery(MeSettingsDocument)
  const { data: treasuryData } = useQuery(TreasuryDocument, { skip: !ready })
  const { data: membersData } = useQuery(AccountMembersDocument, {
    skip: !ready,
  })
  const wallet = useTreasuryWallet()
  const [error, setError] = useState<string | null>(null)

  const loading = proposalsLoading || !treasuryData || !membersData

  function handleExport() {
    setError(null)
    try {
      const exportedAt = new Date()
      const treasury = treasuryData?.treasury ?? null
      const signers = new Set(
        (treasury?.members ?? [])
          .filter((m) => m.hasKeyShare)
          .map((m) => m.user.id)
      )
      const live = wallet.balance && wallet.lastSyncedHeight !== null
      const { blob, filename } = exportZip({
        exportedAt,
        exportedBy: user?.username ?? "",
        accountOwner:
          meData?.me?.owner?.username ?? meData?.me?.username ?? "account",
        employees: account.employees,
        payrolls: account.payrolls,
        runs: account.runs,
        spends: proposals,
        treasury: treasury && {
          name: treasury.name,
          description: treasury.description,
          status: treasury.status,
          threshold: treasury.threshold,
          signerCount: treasury.signerCount,
          address: wallet.address ?? treasury.address,
        },
        treasuryBalanceZec: wallet.displayBalance,
        treasuryBalanceAsOf: live
          ? exportedAt.toISOString()
          : wallet.reportedAt,
        people: (membersData?.accountMembers ?? []).map((m) => ({
          ...m,
          isSigner: signers.has(m.id),
        })),
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(errorMessage(err, "Couldn't export the data."))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export my data</CardTitle>
        <CardDescription>
          Download your employees, payrolls, payments, treasury payments and
          who has access as CSV files, with a README explaining each one. Your
          browser decrypts them; Zalary never sees them unencrypted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {account.status === "no-access" && (
          <p className="text-sm text-muted-foreground">
            Nobody has shared the payroll data with you yet.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          variant="outline"
          disabled={!ready || loading}
          onClick={handleExport}
        >
          {ready && loading ? <Loader2 className="animate-spin" /> : <Download />}
          Export my data
        </Button>
      </CardContent>
    </Card>
  )
}
