import { useMutation, useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Identicon } from "@workspace/ui/components/Identicon"
import { Loader2, Lock, ShieldAlert, UserRoundCheck } from "lucide-react"
import { useCallback, useState, type ReactNode } from "react"
import {
  AccountMembersDocument,
  ShareAccountKeyDocument,
} from "../graphql/__generated__/graphql"
import { useAccountData } from "../hooks/use-account-data"
import { useAuth } from "../hooks/use-auth"
import { useVault } from "../hooks/use-vault"
import { keyFingerprint, sealAccountKey } from "../lib/account-key"

/**
 * Share the account key with someone who has access to the account: seal it
 * to their public key in this browser.
 */
function useShareAccess() {
  const { keys } = useVault()
  const { accountKey } = useAccountData()
  const [shareAccountKey] = useMutation(ShareAccountKeyDocument, {
    refetchQueries: [AccountMembersDocument],
    awaitRefetchQueries: true,
  })
  const ready = !!keys && !!accountKey
  const share = useCallback(
    async (person: { id: string; commsPublicKey: string }) => {
      if (!keys || !accountKey) throw new Error("Unlock with your passkey first.")
      const sealedKey = await sealAccountKey(
        keys,
        accountKey,
        person.commsPublicKey
      )
      await shareAccountKey({ variables: { userId: person.id, sealedKey } })
    },
    [keys, accountKey, shareAccountKey]
  )
  return { ready, share }
}

/**
 * People in the account who set up a passkey but can't open the payroll data
 * yet, for the owner and delegates to let in. Sharing is a click, never
 * automatic, so a login slipped into the account doesn't get the key by
 * itself.
 */
export function AccessRequests() {
  const { user } = useAuth()
  const { status, canEdit } = useAccountData()
  const { data } = useQuery(AccountMembersDocument, {
    skip: status !== "ready" || !canEdit,
    pollInterval: 30_000,
  })
  const { ready, share } = useShareAccess()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const waiting = (data?.accountMembers ?? []).filter(
    (m) => m.id !== user?.id && m.commsPublicKey && !m.hasAccountKey
  )
  if (!ready || waiting.length === 0) return null

  async function handleShare(person: { id: string; commsPublicKey: string }) {
    setBusy(person.id)
    setError(null)
    try {
      await share(person)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't share access.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <div className="flex items-start gap-3">
        <UserRoundCheck className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <p className="text-sm text-amber-900 dark:text-amber-200">
          {waiting.length === 1 ? "Someone is" : `${waiting.length} people are`}{" "}
          waiting to see the payroll data. Sharing seals your account's key to
          their passkey in your browser. Only let in people you invited.
        </p>
      </div>
      <ul className="space-y-2">
        {waiting.map((person) => (
          <li
            key={person.id}
            className="flex items-center gap-3 rounded-lg bg-background/70 px-3 py-2"
          >
            <Identicon
              hash={person.commsPublicKey}
              size={28}
              className="shrink-0 rounded-md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {person.name ?? person.username}{" "}
                <span className="font-normal text-muted-foreground">
                  @{person.username}
                </span>
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                Key {keyFingerprint(person.commsPublicKey!)}
              </p>
            </div>
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() =>
                handleShare({
                  id: person.id,
                  commsPublicKey: person.commsPublicKey!,
                })
              }
            >
              {busy === person.id && <Loader2 className="animate-spin" />}
              Share access
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

/** Pages showing payroll data render once it's open in this browser. */
export function RequireAccountData({ children }: { children: ReactNode }) {
  const { status, error, ownerUsername } = useAccountData()

  if (status === "ready") return children

  if (status === "no-access") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Lock className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">Waiting for access</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Payroll data is end-to-end encrypted. {ownerUsername ? `@${ownerUsername}` : "The account owner"}{" "}
            or a delegate has to share it with you from their browser. Ask them
            to open Zalary; this page opens the data as soon as they have.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (status === "error") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ShieldAlert className="size-10 text-destructive" />
          <p className="text-lg font-medium">Couldn't open the payroll data</p>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Decrypting your payroll data...
    </p>
  )
}
