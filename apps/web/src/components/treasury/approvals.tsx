import { useApolloClient, useMutation } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import { Check, Loader2, ShieldAlert, ShieldCheck, X } from "lucide-react"
import { useEffect, useState } from "react"
import {
  ApproveSpendProposalDocument,
  CancelSpendProposalDocument,
  RejectSpendProposalDocument,
  SpendProposalsDocument,
  type TreasuryFieldsFragment,
} from "../../graphql/__generated__/graphql"
import { useAccountData } from "../../hooks/use-account-data"
import { useAuth } from "../../hooks/use-auth"
import {
  loadProposalInfo,
  useSpendProposals,
  type OpenedProposal,
} from "../../hooks/use-spend-proposals"
import { useVault } from "../../hooks/use-vault"
import { approveSpend, checkProposal } from "../../lib/treasury/spend"
import { getChainTip } from "../../lib/frost"
import { openViewingKey } from "../../lib/treasury/viewing-key"
import { explorerUrl, LIGHTWALLETD_URL } from "../../lib/zcash-network"
import { ApprovalsView, type ApprovalsProposal } from "../views/approvals-view"
import { useSpendAgent } from "./spend-agent-context"
import { VaultButton } from "./vault-button"
import { describePasskeyError } from "../../lib/vault"

function message(err: unknown, fallback: string): string {
  // Passkey prompts fail with DOMExceptions; say what actually happened.
  if (err instanceof DOMException) return describePasskeyError(err)
  return err instanceof Error && err.message ? err.message : fallback
}

const refetchProposals = {
  refetchQueries: [SpendProposalsDocument],
  awaitRefetchQueries: true,
}

/** How a spend shows in the list, from what this browser opened of it. */
function forView(proposal: OpenedProposal): ApprovalsProposal {
  return {
    ...proposal,
    error:
      proposal.error ??
      (proposal.details
        ? null
        : "Couldn't open this payment's details with your account key."),
    payments: (proposal.details?.payments ?? []).map((p) => ({
      id: p.paymentId,
      amountZec: p.amountZec,
      amountUsd: p.amountUsd,
      employee: { name: p.employeeName, walletAddress: p.walletAddress },
      payroll: { name: p.payrollName },
    })),
  }
}

export function TreasuryApprovals({
  treasury,
  onPay,
}: {
  treasury: TreasuryFieldsFragment
  onPay?: () => void
}) {
  const { proposals, loading } = useSpendProposals({ pollInterval: 10_000 })
  const byId = new Map(proposals.map((p) => [p.id, p]))

  return (
    <ApprovalsView
      proposals={proposals.map(forView)}
      loading={loading}
      explorerUrl={explorerUrl}
      emptyAction={
        onPay && (
          <Button className="mt-2" onClick={onPay}>
            Pay a payroll
          </Button>
        )
      }
      renderActions={(proposal) => (
        <ProposalActions
          proposal={byId.get(proposal.id)!}
          treasury={treasury}
        />
      )}
    />
  )
}

function ProposalActions({
  proposal,
  treasury,
}: {
  proposal: OpenedProposal
  treasury: TreasuryFieldsFragment
}) {
  const { user } = useAuth()
  const client = useApolloClient()
  const vault = useVault()
  const { accountKey } = useAccountData()
  const { activity, poke } = useSpendAgent()
  const [busy, setBusy] = useState<"approve" | "reject" | "cancel" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [verified, setVerified] = useState(false)
  const [approve] = useMutation(ApproveSpendProposalDocument, refetchProposals)
  const [reject] = useMutation(RejectSpendProposalDocument, refetchProposals)
  const [cancel] = useMutation(CancelSpendProposalDocument, refetchProposals)

  const me = user?.id
  const isSigner = !!treasury.myMembership?.hasKeyShare
  const isCoordinator = treasury.isCoordinator
  const decision = proposal.myApproval?.decision
  const live = activity[proposal.id]
  const awaiting = proposal.status === "AWAITING_APPROVALS"
  const signing = proposal.status === "SIGNING"
  const pickedToSign = !!me && proposal.signerIds.includes(me)

  async function handleApprove() {
    setBusy("approve")
    setError(null)
    setProblems([])
    try {
      const keys = await vault.unlock()
      if (!accountKey || !proposal.details) {
        throw new Error("Couldn't open this payment's details.")
      }
      const full = await loadProposalInfo(
        client,
        accountKey,
        proposal,
        "network-only"
      )

      // Check what is actually being signed before committing to it, with
      // the viewing key this browser checked against its own key share.
      const [viewingKey, chainTip] = await Promise.all([
        openViewingKey(treasury, keys),
        getChainTip(LIGHTWALLETD_URL),
      ])
      const check = await checkProposal(
        full,
        proposal.details.payments.map((p) => ({
          address: p.walletAddress,
          amountZec: p.amountZec,
          label: p.employeeName,
        })),
        viewingKey,
        chainTip
      )
      if (check.problems.length > 0) {
        setProblems(check.problems)
        return
      }
      setVerified(true)

      await approveSpend(full, treasury, keys, isCoordinator)
      await approve({ variables: { id: proposal.id } })
      poke()
    } catch (err) {
      setError(message(err, "Couldn't approve the payment."))
    } finally {
      setBusy(null)
    }
  }

  async function handleReject() {
    setBusy("reject")
    setError(null)
    try {
      await reject({ variables: { id: proposal.id } })
    } catch (err) {
      setError(message(err, "Couldn't reject the payment."))
    } finally {
      setBusy(null)
    }
  }

  async function handleCancel() {
    setBusy("cancel")
    setError(null)
    try {
      await cancel({ variables: { id: proposal.id } })
    } catch (err) {
      setError(message(err, "Couldn't cancel the payment."))
    } finally {
      setBusy(null)
    }
  }

  const progress = live?.progress
  let status: string | null = null
  // When the step in `status` started, to show how long it has been running.
  let since: number | null = null
  if (
    signing &&
    pickedToSign &&
    !proposal.myApproval?.signedAt &&
    !isCoordinator
  ) {
    status = !vault.keys
      ? "You were picked to sign. Unlock to send your signature."
      : live?.waitingForPackage
        ? "Waiting for the coordinator's signing package..."
        : "Signing..."
  } else if (isCoordinator && (awaiting || signing)) {
    if (!vault.keys) {
      status = "Unlock to collect approvals and send the payment."
    } else if (live?.stage) {
      status = `${live.stage}...`
      since = live.stageSince ?? null
    } else if (progress?.stage === "signing") {
      status = `Collecting signatures (${progress.shares}/${progress.signers})...`
    } else if (progress?.stage === "collecting") {
      status = `Waiting for approvals (${progress.commitments}/${proposal.threshold})...`
    } else {
      status = "Checking on the payment..."
    }
  } else if (signing && proposal.progress) {
    status = `@${treasury.coordinator.username}'s browser: ${proposal.progress}...`
    since = proposal.progressAt ? Date.parse(proposal.progressAt) : null
  } else if (signing) {
    status = `Waiting for @${treasury.coordinator.username} to send it. Zalary needs to be open and unlocked in their browser.`
  } else if (decision === "APPROVE" && awaiting) {
    status = "You approved. Waiting for the others..."
  } else if (proposal.status === "BROADCAST") {
    status = "Sent. Waiting for the network to confirm it..."
  }

  const needsUnlock =
    !vault.keys &&
    ((isCoordinator && (awaiting || signing)) ||
      (signing && pickedToSign && !proposal.myApproval?.signedAt))

  return (
    <div className="space-y-3">
      {verified && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-3.5" />
          Checked in your browser: the transaction pays exactly these
          recipients.
        </p>
      )}
      {problems.length > 0 && (
        <div className="space-y-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p className="flex items-center gap-1.5 font-medium">
            <ShieldAlert className="size-4" /> Don't approve: the transaction
            doesn't match the payroll.
          </p>
          <ul className="list-disc pl-5 text-xs">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {status && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />
          <span>
            {status}
            {since !== null && <Elapsed since={since} />}
          </span>
        </p>
      )}
      {/* The coordinator's errors also come back as proposal.error. */}
      {(error || (live?.error && live.error !== proposal.error)) && (
        <p className="text-sm text-destructive">{error ?? live?.error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {awaiting && isSigner && !decision && (
          <>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={busy !== null}
              onClick={handleReject}
            >
              {busy === "reject" ? <Loader2 className="animate-spin" /> : <X />}
              Reject
            </Button>
            <Button
              className="flex-1"
              disabled={busy !== null}
              onClick={handleApprove}
            >
              {busy === "approve" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check />
              )}
              {busy === "approve" ? "Checking & approving..." : "Approve"}
            </Button>
          </>
        )}
        {needsUnlock && (
          <VaultButton className="flex-1">
            {isCoordinator ? "Unlock to coordinate" : "Unlock to sign"}
          </VaultButton>
        )}
        {isCoordinator && (awaiting || signing) && (
          <Button
            variant="ghost"
            disabled={busy !== null}
            onClick={handleCancel}
          >
            Cancel payment
          </Button>
        )}
      </div>
    </div>
  )
}

/** How long a step has been running, e.g. " · 1:05". */
function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const seconds = Math.max(0, Math.floor((now - since) / 1000))
  if (seconds < 3) return null
  const label =
    seconds < 3600
      ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
      : `over ${Math.floor(seconds / 3600)} h`
  return <span className="tabular-nums opacity-70"> · {label}</span>
}
