import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Fingerprint, Loader2, LockKeyhole, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useAuth } from "../hooks/use-auth"
import { useVault } from "../hooks/use-vault"
import {
  describePasskeyError,
  logPasskeyFailure,
  PasskeyConfirmationNeeded,
  passkeyEnvironmentProblem,
  prfSupported,
} from "../lib/vault"

/**
 * Everything Zalary keeps about an account's payroll is sealed with keys only
 * the user's passkey opens, so the app asks for it before anything else: a
 * new passkey the first time, the existing one after every sign-in and reload.
 */
export function VaultGate() {
  const { user, logout } = useAuth()
  const vault = useVault()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noPrf, setNoPrf] = useState(false)
  const [environmentProblem] = useState(passkeyEnvironmentProblem)

  if (!user || vault.keys || vault.loading) return null
  const creating = !vault.hasPasskey

  async function handleClick() {
    setBusy(true)
    setError(null)
    try {
      if (confirming) {
        await vault.confirmSetUp()
      } else if (creating) {
        if ((await prfSupported()) === false) {
          setNoPrf(true)
          return
        }
        await vault.setUp(user?.name)
      } else {
        await vault.unlock()
      }
      setConfirming(false)
    } catch (err) {
      if (err instanceof PasskeyConfirmationNeeded) {
        setConfirming(true)
      } else {
        void logPasskeyFailure(err)
        setError(describePasskeyError(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="!max-w-md"
      >
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/15">
            {creating ? (
              <ShieldCheck className="size-7 text-[var(--primary-dark)] dark:text-primary" />
            ) : (
              <LockKeyhole className="size-7 text-[var(--primary-dark)] dark:text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">
            {creating ? "Create your passkey" : "Unlock Zalary"}
          </DialogTitle>
          <DialogDescription className="text-balance">
            {creating ? (
              <>
                Zalary encrypts your employees, payrolls and payments in this
                browser before they reach our server. Your passkey holds the
                key: without it, nobody can read them, Zalary included.
              </>
            ) : (
              <>
                Your payroll data is encrypted with your passkey. Use it to
                open the data on this device.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {creating && (
          <ul className="space-y-2 rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
            <li>
              Transactions live on the Zcash chain, shielded. Everything else
              is sealed with your key.
            </li>
            <li>
              You'll get a key of your own, so you can share payroll data with
              delegates and treasury signers without Zalary seeing it.
            </li>
            <li>
              Add a second passkey in Settings as a backup. Without a passkey,
              your data can't be recovered.
            </li>
          </ul>
        )}

        {noPrf ? (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            This browser or passkey provider can't encrypt with passkeys (no
            PRF support). Use a recent Chrome, Safari or Edge with iCloud
            Keychain, Google Password Manager or 1Password.
          </p>
        ) : (
          error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )
        )}

        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            title={environmentProblem ?? undefined}
            disabled={busy || !!environmentProblem || noPrf}
            onClick={handleClick}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Fingerprint />}
            {confirming
              ? "Confirm passkey"
              : creating
                ? "Create passkey"
                : "Unlock with passkey"}
          </Button>
          {environmentProblem && (
            <p className="text-center text-xs text-muted-foreground">
              {environmentProblem}
            </p>
          )}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            disabled={busy}
            onClick={() => void logout()}
          >
            Log out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
