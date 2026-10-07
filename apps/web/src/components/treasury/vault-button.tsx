import { Button } from "@workspace/ui/components/button"
import { Fingerprint, Loader2 } from "lucide-react"
import { useState, type ComponentProps, type ReactNode } from "react"
import { useAuth } from "../../hooks/use-auth"
import { useVault } from "../../hooks/use-vault"
import {
  logPasskeyFailure,
  PasskeyConfirmationNeeded,
  passkeyEnvironmentProblem,
  type VaultKeys,
} from "../../lib/vault"

/**
 * Opens the user's passkey vault, creating it with a first passkey if they
 * have none. Renders nothing once the vault is open. Failures go to the
 * console; the button just becomes clickable again.
 */
export function VaultButton({
  children,
  setUpLabel = "Set up passkey",
  onUnlocked,
  ...props
}: {
  children?: ReactNode
  setUpLabel?: ReactNode
  onUnlocked?: (keys: VaultKeys) => void | Promise<void>
} & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const { user } = useAuth()
  const vault = useVault()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [environmentProblem] = useState(passkeyEnvironmentProblem)

  if (vault.keys && !onUnlocked) return null

  async function handleClick() {
    setBusy(true)
    try {
      const keys = confirming
        ? await vault.confirmSetUp()
        : vault.hasPasskey
          ? await vault.unlock()
          : await vault.setUp(user?.name)
      setConfirming(false)
      await onUnlocked?.(keys)
    } catch (err) {
      if (err instanceof PasskeyConfirmationNeeded) setConfirming(true)
      else void logPasskeyFailure(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      {...props}
      title={environmentProblem ?? undefined}
      onClick={handleClick}
      disabled={busy || vault.loading || !!environmentProblem || props.disabled}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Fingerprint />}
      {confirming
        ? "Confirm passkey"
        : vault.hasPasskey
          ? (children ?? "Unlock with passkey")
          : setUpLabel}
    </Button>
  )
}
