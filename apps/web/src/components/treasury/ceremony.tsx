import { useMutation } from "@apollo/client/react"
import { Identicon } from "@workspace/ui/components/Identicon"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { CheckCircle2, KeyRound, Loader2, RotateCcw } from "lucide-react"
import { useEffect, useRef, useSyncExternalStore } from "react"
import {
  FinalizeTreasuryDocument,
  MeLayoutDocument,
  ResetTreasuryKeygenDocument,
  SubmitKeygenResultDocument,
  TreasuryDocument,
  type TreasuryFieldsFragment,
} from "../../graphql/__generated__/graphql"
import { useVault } from "../../hooks/use-vault"
import { toHex, utf8 } from "../../lib/bytes"
import {
  frostKeyPackageGroupKey,
  getChainTip,
  noiseEncrypt,
  treasuryViewingKey,
} from "../../lib/frost"
import {
  abortCeremonyRuns,
  ceremonyRun,
  closeCeremonySession,
  failCeremonyRun,
  runKeyCeremony,
  startCeremonyRun,
  subscribeCeremonyRuns,
} from "../../lib/treasury/ceremony"
import { sealText, unsealText, VAULT_CONTEXT } from "../../lib/vault"
import { LIGHTWALLETD_URL, ZCASH_NETWORK } from "../../lib/zcash-network"
import { StepHeading } from "./stepper"
import { VaultButton } from "./vault-button"

// The wallet scans from a little before the tip, in case lightwalletd lags.
const BIRTHDAY_MARGIN_BLOCKS = 100

function message(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

/**
 * The key ceremony room. Every member's browser runs the DKG here; the
 * coordinator then derives the treasury's viewing key and address.
 */
export function KeyCeremony({
  treasury,
}: {
  treasury: TreasuryFieldsFragment
}) {
  const { keys } = useVault()
  const [submitResult] = useMutation(SubmitKeygenResultDocument, {
    refetchQueries: [TreasuryDocument],
  })
  const [finalize] = useMutation(FinalizeTreasuryDocument, {
    refetchQueries: [TreasuryDocument, MeLayoutDocument],
    awaitRefetchQueries: true,
  })
  const [reset, { loading: resetting }] = useMutation(
    ResetTreasuryKeygenDocument,
    { refetchQueries: [TreasuryDocument] }
  )

  const sessionId = treasury.dkgSessionId
  const mine = treasury.myMembership
  const doneCount = treasury.members.filter((m) => m.hasKeyShare).length
  const allDone = doneCount === treasury.members.length
  const run = useSyncExternalStore(subscribeCeremonyRuns, () =>
    ceremonyRun(sessionId)
  )
  const received = run?.received ?? 0
  const error = run?.error ?? null

  // A restart replaces the session; stop working on the old one.
  useEffect(() => abortCeremonyRuns(sessionId), [sessionId])

  // Run this member's side once per ceremony session.
  useEffect(() => {
    if (!sessionId || !keys || !mine || mine.hasKeyShare) return
    const participants = treasury.members.map((m) => m.user.commsPublicKey!)
    const { threshold, id: treasuryId } = treasury
    startCeremonyRun(
      sessionId,
      async ({ signal, onProgress }) => {
        const result = await runKeyCeremony({
          keys,
          sessionId,
          participants,
          threshold,
          signal,
          onProgress,
        })
        await submitResult({
          variables: {
            dkgSessionId: sessionId,
            identifier: result.identifier,
            encryptedKeyPackage: await sealText(
              keys,
              result.keyPackage,
              VAULT_CONTEXT.keyPackage(treasuryId)
            ),
            publicKeyPackage: result.publicKeyPackage,
            groupPublicKey: result.groupPublicKey,
          },
        })
      },
      (err) => message(err, "The key ceremony failed.")
    )
  }, [sessionId, keys, mine, treasury, submitResult])

  // Once everyone holds a share, the coordinator turns the group key into
  // the treasury's viewing key and address, and hands every other signer the
  // viewing key so they can check both against their own share.
  const finalizing = useRef(false)
  useEffect(() => {
    if (!treasury.isCoordinator || !keys || !allDone || !sessionId) return
    if (finalizing.current) return
    const sealedShare = mine?.encryptedKeyPackage
    if (!sealedShare) return
    finalizing.current = true
    ;(async () => {
      // The group key from this browser's own share, not the server's word.
      const groupPublicKey = await frostKeyPackageGroupKey(
        await unsealText(
          keys,
          sealedShare,
          VAULT_CONTEXT.keyPackage(treasury.id)
        )
      )
      const { ufvk, address, changeAddress } = await treasuryViewingKey(
        groupPublicKey,
        ZCASH_NETWORK
      )
      const viewingKeyMessages = await Promise.all(
        treasury.members
          .filter((m) => !m.isCoordinator)
          .map(async (m) => {
            if (!m.user.commsPublicKey) {
              throw new Error(`@${m.user.username} has no passkey set up.`)
            }
            const { ciphertext } = await noiseEncrypt(
              keys.commsSecret,
              m.user.commsPublicKey,
              null,
              utf8(ufvk)
            )
            return { userId: m.user.id, message: toHex(ciphertext) }
          })
      )
      const tip = await getChainTip(LIGHTWALLETD_URL)
      await finalize({
        variables: {
          address,
          changeAddress,
          encryptedViewingKey: await sealText(
            keys,
            ufvk,
            VAULT_CONTEXT.viewingKey(treasury.id)
          ),
          viewingKeyMessages,
          birthdayHeight: Math.max(1, tip - BIRTHDAY_MARGIN_BLOCKS),
        },
      })
      await closeCeremonySession(keys, sessionId)
    })().catch((err) => {
      finalizing.current = false
      failCeremonyRun(
        sessionId,
        message(err, "Couldn't activate the treasury.")
      )
    })
  }, [treasury, keys, allDone, sessionId, mine, finalize])

  async function handleRestart() {
    abortCeremonyRuns()
    finalizing.current = false
    await reset()
  }

  const busy =
    !!keys &&
    !error &&
    (!mine?.hasKeyShare || (treasury.isCoordinator && allDone))
  const status = mine?.hasKeyShare
    ? treasury.isCoordinator && allDone
      ? "Activating the treasury..."
      : "Your share is sealed with your passkey. Waiting for the others..."
    : !keys
      ? "Unlock your passkey to take part."
      : `Exchanging key material with the other members${received ? ` (${received} messages)` : ""}...`

  return (
    <div className="space-y-10 py-4">
      <StepHeading
        title="Key ceremony"
        description="Every member's browser creates a share of the treasury key together. Keep this page open until it finishes."
      />
      <Card className="mx-auto w-full max-w-xl">
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">{treasury.name}</h3>
            <span className="text-sm text-muted-foreground">
              {doneCount}/{treasury.members.length} shares created
            </span>
          </div>
          <Separator />
          <ul className="space-y-2">
            {treasury.members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5"
              >
                <Identicon
                  hash={member.user.username}
                  size={28}
                  className="rounded-md"
                />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {member.user.name ?? member.user.username}{" "}
                  <span className="font-normal text-muted-foreground">
                    @{member.user.username}
                  </span>
                </p>
                {member.hasKeyShare ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" /> Share created
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        member.ready
                          ? "animate-pulse bg-amber-400"
                          : member.online
                            ? "bg-amber-400/50"
                            : "bg-border"
                      )}
                    />
                    {member.ready
                      ? "In the room"
                      : member.online
                        ? "Needs to unlock"
                        : "Not here yet"}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 rounded-md border border-dashed p-3 text-sm">
            {busy ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <KeyRound className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 text-muted-foreground">{status}</span>
          </div>
          {!keys && (
            <VaultButton className="w-full" size="lg">
              Unlock to take part
            </VaultButton>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {treasury.isCoordinator ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={resetting}
              onClick={handleRestart}
            >
              <RotateCcw />
              Restart ceremony
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              If the ceremony stalls, ask @{treasury.coordinator.username} to
              restart it.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
