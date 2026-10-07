import { useApolloClient, useMutation, useQuery } from "@apollo/client/react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  CancelSpendProposalDocument,
  MarkProposalBroadcastDocument,
  MarkProposalConfirmedDocument,
  MarkProposalSignedDocument,
  ReportProposalProblemDocument,
  ReportProposalProgressDocument,
  SetProposalSignersDocument,
  ShareTreasuryViewingKeyDocument,
  TreasuryDocument,
} from "../../graphql/__generated__/graphql"
import { useAccountData } from "../../hooks/use-account-data"
import { useAuth } from "../../hooks/use-auth"
import {
  loadProposalInfo,
  useSpendProposals,
  type OpenedProposal,
} from "../../hooks/use-spend-proposals"
import { useTreasuryWallet } from "../../hooks/use-treasury-wallet"
import { useVault } from "../../hooks/use-vault"
import { toHex, utf8 } from "../../lib/bytes"
import { noiseEncrypt } from "../../lib/frost"
import { FrostdError } from "../../lib/frostd"
import { markRunsPaid } from "../../lib/payroll-records"
import { sealTxid } from "../../lib/treasury/sealed-spend"
import { openViewingKey } from "../../lib/treasury/viewing-key"
import { coordinateSpend, signSpend } from "../../lib/treasury/spend"
import { getChainTip } from "../../lib/frost"
import { LIGHTWALLETD_URL } from "../../lib/zcash-network"

import { SpendAgentContext, type SpendActivity } from "./spend-agent-context"

const TICK_MS = 6000

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Moves open treasury spends forward from this browser: the coordinator
 * collects approvals, hands out signing packages and broadcasts; a picked
 * signer sends their shares. Needs the vault open; idles otherwise.
 */
export function SpendAgentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const client = useApolloClient()
  const { keys } = useVault()
  const account = useAccountData()
  const { accountKey } = account
  const wallet = useTreasuryWallet()
  const { data: treasuryData } = useQuery(TreasuryDocument, { skip: !user })
  const treasury = treasuryData?.treasury
  const active = treasury?.status === "ACTIVE"
  const { proposals, refetch } = useSpendProposals({
    open: true,
    skip: !active,
    pollInterval: 10_000,
  })

  const [setSigners] = useMutation(SetProposalSignersDocument)
  const [markSigned] = useMutation(MarkProposalSignedDocument)
  const [markBroadcast] = useMutation(MarkProposalBroadcastDocument)
  const [markConfirmed] = useMutation(MarkProposalConfirmedDocument)
  const [cancel] = useMutation(CancelSpendProposalDocument)
  const [reportProblem] = useMutation(ReportProposalProblemDocument)
  const [reportProgress] = useMutation(ReportProposalProgressDocument)
  const [shareViewingKey] = useMutation(ShareTreasuryViewingKeyDocument, {
    refetchQueries: [TreasuryDocument],
  })

  // Signers of a treasury set up before signers got the viewing key get it
  // from the coordinator's browser, once it has checked the key itself.
  const sharing = useRef(false)
  useEffect(() => {
    if (!treasury || !active || !treasury.isCoordinator || !keys) return
    const missing = treasury.members.filter(
      (m) =>
        m.hasKeyShare &&
        !m.isCoordinator &&
        !m.hasViewingKey &&
        m.user.commsPublicKey
    )
    if (missing.length === 0 || sharing.current) return
    sharing.current = true
    ;(async () => {
      const { ufvk } = await openViewingKey(treasury, keys)
      const viewingKeyMessages = await Promise.all(
        missing.map(async (m) => {
          const { ciphertext } = await noiseEncrypt(
            keys.commsSecret,
            m.user.commsPublicKey!,
            null,
            utf8(ufvk)
          )
          return { userId: m.user.id, message: toHex(ciphertext) }
        })
      )
      await shareViewingKey({ variables: { viewingKeyMessages } })
    })()
      .catch((err) =>
        console.error("[treasury] couldn't share the viewing key", err)
      )
      .finally(() => {
        sharing.current = false
      })
  }, [treasury, active, keys, shareViewingKey])

  const [activity, setActivity] = useState<Record<string, SpendActivity>>({})
  const [pokes, setPokes] = useState(0)
  const running = useRef(false)

  const record = useCallback((id: string, next: SpendActivity) => {
    setActivity((prev) => ({ ...prev, [id]: next }))
  }, [])
  const update = useCallback((id: string, patch: Partial<SpendActivity>) => {
    setActivity((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }, [])

  // Members can't see this browser's progress; share it when it changes.
  const shared = useRef(new Map<string, string | null>())
  const shareProgress = useCallback(
    (proposal: OpenedProposal, progress: string | null) => {
      const last = shared.current.has(proposal.id)
        ? shared.current.get(proposal.id)
        : (proposal.progress ?? null)
      if (last === progress) return
      shared.current.set(proposal.id, progress)
      reportProgress({ variables: { id: proposal.id, progress } }).catch(
        () => {}
      )
    },
    [reportProgress]
  )

  const withPczt = useCallback(
    (proposal: OpenedProposal) => {
      if (!accountKey) throw new Error("Payroll data isn't open.")
      return loadProposalInfo(client, accountKey, proposal)
    },
    [client, accountKey]
  )

  const tick = useCallback(async () => {
    if (!treasury || !user || !active || running.current) return
    running.current = true
    let changed = false
    try {
      for (const proposal of proposals) {
        const isCoordinator = treasury.isCoordinator
        const pending =
          proposal.status === "AWAITING_APPROVALS" ||
          proposal.status === "SIGNING"

        if (
          isCoordinator &&
          pending &&
          new Date(proposal.expiresAt) < new Date()
        ) {
          await cancel({
            variables: {
              id: proposal.id,
              reason:
                "Expired before enough members signed. Propose the payment again.",
            },
          })
          changed = true
          continue
        }

        if (!keys) continue
        try {
          if (isCoordinator && pending) {
            const progress = await coordinateSpend(
              await withPczt(proposal),
              treasury,
              keys,
              {
                setSigners: async (userIds) => {
                  await setSigners({ variables: { id: proposal.id, userIds } })
                  changed = true
                },
                markSigned: async () => {
                  await markSigned({ variables: { id: proposal.id } })
                },
                markBroadcast: async (txid) => {
                  if (!accountKey) throw new Error("Payroll data isn't open.")
                  await markBroadcast({
                    variables: {
                      id: proposal.id,
                      sealedTxid: await sealTxid(accountKey, proposal.id, txid),
                    },
                  })
                  changed = true
                },
                onStage: (stage) => {
                  update(proposal.id, { stage, stageSince: Date.now() })
                  shareProgress(proposal, stage)
                },
              }
            )
            record(proposal.id, { progress })
            if (progress.stage !== "broadcast") {
              shareProgress(
                proposal,
                progress.stage === "signing"
                  ? `Waiting for signatures (${progress.shares}/${progress.signers})`
                  : `Waiting for approvals (${progress.commitments}/${proposal.threshold})`
              )
            }
            if (proposal.error && progress.stage !== "broadcast") {
              await reportProblem({
                variables: { id: proposal.id, problem: null },
              }).catch(() => {})
            }
          } else if (
            !isCoordinator &&
            proposal.status === "SIGNING" &&
            proposal.signerIds.includes(user.id) &&
            !proposal.myApproval?.signedAt
          ) {
            const outcome = await signSpend(
              await withPczt(proposal),
              treasury,
              keys
            )
            if (outcome === "signed") {
              await markSigned({ variables: { id: proposal.id } })
              changed = true
              record(proposal.id, {})
            } else if (outcome === "waiting") {
              record(proposal.id, { waitingForPackage: true })
            } else {
              record(proposal.id, {
                error: "Sign from the browser you approved this payment in.",
              })
            }
          }
        } catch (err) {
          if (isCoordinator && err instanceof FrostdError && err.sessionGone) {
            await cancel({
              variables: {
                id: proposal.id,
                reason:
                  "The signing session on the FROST relay is gone (it expired or the relay restarted). Propose the payment again.",
              },
            })
            changed = true
          } else {
            console.error("[treasury] spend step failed", err)
            update(proposal.id, {
              error: message(err),
              stage: undefined,
              stageSince: undefined,
            })
            // Only this browser sees the error; tell the other members why
            // the payment isn't moving.
            if (isCoordinator && message(err) !== proposal.error) {
              await reportProblem({
                variables: { id: proposal.id, problem: message(err) },
              }).catch(() => {})
            }
          }
        }
      }
    } finally {
      running.current = false
      if (changed) await refetch()
    }
  }, [
    treasury,
    user,
    active,
    proposals,
    keys,
    withPczt,
    accountKey,
    setSigners,
    markSigned,
    markBroadcast,
    cancel,
    reportProblem,
    shareProgress,
    record,
    update,
    refetch,
  ])

  useEffect(() => {
    const hasWork = proposals.some(
      (p) => p.status === "AWAITING_APPROVALS" || p.status === "SIGNING"
    )
    if (!hasWork) return
    tick()
    const timer = setInterval(tick, TICK_MS)
    return () => clearInterval(timer)
  }, [tick, proposals, pokes])

  // After each treasury sync, settle broadcast spends: mined, or expired.
  const broadcast = useMemo(
    () => proposals.filter((p) => p.status === "BROADCAST" && p.txid),
    [proposals]
  )
  // The runs a mined spend paid are marked paid in the sealed payroll data
  // before the spend is, so a failure in between is retried.
  const { runs, write } = account
  const runsRef = useRef(runs)
  useEffect(() => {
    runsRef.current = runs
  }, [runs])
  const broadcastRef = useRef(broadcast)
  useEffect(() => {
    broadcastRef.current = broadcast
  }, [broadcast])
  const hasBroadcast = broadcast.length > 0
  const confirming = useRef(false)
  const { isCoordinator, initialized, syncCount, getSentTxs } = wallet

  useEffect(() => {
    if (!isCoordinator || !initialized || !hasBroadcast) return
    if (confirming.current) return
    confirming.current = true
    ;(async () => {
      try {
        const sent = await getSentTxs()
        const tip = await getChainTip(LIGHTWALLETD_URL).catch(() => null)
        for (const proposal of broadcastRef.current) {
          const tx = sent.find((t) => t.txid === proposal.txid)
          if (tx?.block_height != null) {
            const runIds = proposal.details?.runIds ?? []
            const paid = markRunsPaid(
              runsRef.current.filter((r) => runIds.includes(r.id)),
              proposal.txid!
            )
            if (paid.length > 0) await write({ put: paid })
            await markConfirmed({ variables: { id: proposal.id } })
          } else if (
            tip !== null &&
            proposal.details &&
            tip > proposal.details.expiryHeight
          ) {
            await cancel({
              variables: {
                id: proposal.id,
                reason:
                  "The transaction expired without being mined. Propose the payment again.",
              },
            })
          }
        }
        await refetch()
      } catch (err) {
        console.warn("[treasury] confirmation check failed", err)
      } finally {
        confirming.current = false
      }
    })()
    // syncCount re-runs this after every sync.
  }, [
    isCoordinator,
    initialized,
    syncCount,
    hasBroadcast,
    getSentTxs,
    markConfirmed,
    cancel,
    refetch,
    write,
  ])

  const poke = useCallback(() => setPokes((n) => n + 1), [])

  // Spends that can't move until this user unlocks their passkey.
  const needsUnlock =
    !keys &&
    !!user &&
    proposals.some((p) =>
      treasury?.isCoordinator
        ? p.status === "AWAITING_APPROVALS" || p.status === "SIGNING"
        : p.status === "SIGNING" &&
          p.signerIds.includes(user.id) &&
          !p.myApproval?.signedAt
    )

  return (
    <SpendAgentContext.Provider value={{ activity, poke, needsUnlock }}>
      {children}
    </SpendAgentContext.Provider>
  )
}
