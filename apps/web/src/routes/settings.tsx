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
import { useEffect, useState, type FormEvent } from "react"
import {
  ChangePasswordDocument,
  DeleteAccountDocument,
  MeSettingsDocument,
  UpdateUserDocument,
} from "../graphql/__generated__/graphql"
import { useAuth } from "../hooks/use-auth"
import { useTitle } from "../hooks/use-title"
import { saveActiveSwap } from "../lib/near-intents"
import { setSessionToken } from "../lib/session"

const DELETE_CONFIRMATION = "I want to delete all my data"

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

export function SettingsPage() {
  useTitle("Settings")
  const { data, loading } = useQuery(MeSettingsDocument)
  const [updateUser] = useMutation(UpdateUserDocument)
  const [changePassword] = useMutation(ChangePasswordDocument)
  const [viewingKey, setViewingKey] = useState("")
  const [saved, setSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const { logout } = useAuth()
  const [deleteAccount] = useMutation(DeleteAccountDocument)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (data?.me?.zcashViewingKey) {
      setViewingKey(data.me.zcashViewingKey)
    }
  }, [data])

  async function handleSave() {
    await updateUser({ variables: { zcashViewingKey: viewingKey } })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

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
      await deleteAccount()
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

      {!owner && (
        <Card>
          <CardHeader>
            <CardTitle>Viewing Key</CardTitle>
            <CardDescription>
              Your Zcash viewing key allows Zalary to track your balance and
              transaction history. This is read-only access and cannot be used
              to spend funds.
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
              <Button onClick={handleSave}>Save Viewing Key</Button>
              {saved && (
                <span className="text-sm text-green-600">
                  Saved successfully
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            {owner ? (
              <>
                Permanently delete your delegate login. @{owner.username}
                &apos;s payroll data is not affected.
              </>
            ) : (
              <>
                Permanently delete your account and all of its data: employees,
                payrolls, payment history, your viewing key and any delegate
                logins. This cannot be undone.
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
                {owner
                  ? "your delegate login"
                  : "your account and all of its data"}
                . There is no way to recover it.
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
