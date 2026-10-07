import { Identicon } from "@workspace/ui/components/Identicon"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

export interface ApprovalsProposal {
  id: string
  status: string
  totalZec: number
  feeZec: number
  txid?: string | null
  error?: string | null
  threshold: number
  signerIds: string[]
  createdAt: string
  createdBy: { name?: string | null; username: string }
  approvals: {
    id: string
    decision: string
    signedAt?: string | null
    user: { id: string; name?: string | null; username: string }
  }[]
  payments: {
    id: string
    amountZec: number
    amountUsd: number
    employee: { name: string; walletAddress: string }
    payroll: { name: string }
  }[]
}

export interface ApprovalsViewProps {
  proposals: ApprovalsProposal[]
  loading: boolean
  /** Buttons and live status for a proposal, below its progress. */
  renderActions?: (proposal: ApprovalsProposal) => ReactNode
  explorerUrl?: (txid: string) => string
  emptyAction?: ReactNode
}

const STATUS: Record<string, { label: string; className: string }> = {
  AWAITING_APPROVALS: {
    label: "Awaiting approvals",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
  },
  SIGNING: {
    label: "Signing",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-400",
  },
  BROADCAST: {
    label: "Sent",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  },
  FAILED: { label: "Failed", className: "bg-destructive/10 text-destructive" },
  CANCELLED: { label: "Cancelled", className: "" },
}

const OPEN = new Set(["AWAITING_APPROVALS", "SIGNING", "BROADCAST"])

// Payments read as one column of cards, not a full-width table.
const COLUMN = "mx-auto w-full max-w-[60ch]"

function formatZec(zec: number): string {
  return zec.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

function truncate(value: string, head = 8, tail = 6): string {
  return value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`
}

/**
 * Heading for payments proposed at `iso`, the way moment.js reads dates:
 * "a few seconds ago", "2 hours ago", "Yesterday", "3. September 2026".
 */
function dateHeading(iso: string, now: number): string {
  const date = new Date(iso)
  const minutes = (now - date.getTime()) / 60_000
  if (minutes < 0.75) return "A few seconds ago"
  if (minutes < 1.5) return "A minute ago"
  if (minutes < 45) return `${Math.round(minutes)} minutes ago`
  if (minutes < 90) return "An hour ago"
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  if (date >= today) return `${Math.round(minutes / 60)} hours ago`
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date >= yesterday) return "Yesterday"
  const month = date.toLocaleDateString("en-US", { month: "long" })
  return `${date.getDate()}. ${month} ${date.getFullYear()}`
}

/** The current time, refreshed every minute so relative dates move on. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function Person({
  user,
  signed,
}: {
  user: { id: string; name?: string | null; username: string }
  signed?: boolean
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <Identicon hash={user.username} size={16} className="rounded-full" />
      <span className="truncate">{user.name ?? `@${user.username}`}</span>
      {signed && (
        <Check
          className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-label="Signed"
        >
          <title>Signed</title>
        </Check>
      )}
    </li>
  )
}

function ProposalCard({
  proposal,
  renderActions,
  explorerUrl,
}: {
  proposal: ApprovalsProposal
  renderActions?: (proposal: ApprovalsProposal) => ReactNode
  explorerUrl?: (txid: string) => string
}) {
  const [showRecipients, setShowRecipients] = useState(false)
  const approved = proposal.approvals.filter((a) => a.decision === "APPROVE")
  const rejected = proposal.approvals.filter((a) => a.decision === "REJECT")
  const status = STATUS[proposal.status] ?? {
    label: proposal.status,
    className: "",
  }
  const payrolls = [...new Set(proposal.payments.map((p) => p.payroll.name))]
  const totalUsd = proposal.payments.reduce((sum, p) => sum + p.amountUsd, 0)
  const progress = Math.min(1, approved.length / proposal.threshold)

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[var(--primary-dark)] dark:text-primary">
            <ArrowUpRight className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {payrolls.join(", ") || "Payment"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Proposed by{" "}
              {proposal.createdBy.name ?? `@${proposal.createdBy.username}`} ·{" "}
              {timeAgo(proposal.createdAt)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            {formatZec(proposal.totalZec)}{" "}
            <span className="font-normal text-muted-foreground">ZEC</span>
          </p>
          <p className="text-xs text-muted-foreground">
            ≈ $
            {totalUsd.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}{" "}
            · fee {formatZec(proposal.feeZec)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("h-6 px-2.5 text-xs", status.className)}
        >
          {status.label}
        </Badge>
      </div>

      <div className="mx-3 mb-3 space-y-4 rounded-lg bg-muted/60 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              Threshold{" "}
              <span className="font-medium text-foreground">
                {approved.length}/{proposal.threshold}
              </span>
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="flex justify-between text-xs text-muted-foreground">
              Approved <span>{approved.length}</span>
            </p>
            <ul className="space-y-1.5">
              {approved.map((a) => (
                <Person
                  key={a.id}
                  user={a.user}
                  signed={
                    !!a.signedAt && proposal.signerIds.includes(a.user.id)
                  }
                />
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="flex justify-between text-xs text-muted-foreground">
              Rejected <span>{rejected.length}</span>
            </p>
            <ul className="space-y-1.5">
              {rejected.map((a) => (
                <Person key={a.id} user={a.user} />
              ))}
            </ul>
          </div>
        </div>
        {proposal.error && (
          <p className="text-sm text-destructive">{proposal.error}</p>
        )}
        {proposal.txid && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            Transaction{" "}
            {explorerUrl ? (
              <a
                href={explorerUrl(proposal.txid)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-foreground hover:underline"
              >
                {truncate(proposal.txid)}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="font-mono">{truncate(proposal.txid)}</span>
            )}
          </p>
        )}
        {renderActions?.(proposal)}
      </div>

      <button
        type="button"
        onClick={() => setShowRecipients((open) => !open)}
        className="flex cursor-pointer items-center gap-1.5 border-t px-5 py-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            showRecipients && "rotate-180"
          )}
        />
        Recipients ({proposal.payments.length})
      </button>
      {showRecipients && (
        <ul className="divide-y border-t px-5">
          {proposal.payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center gap-4 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                {payment.employee.name}
              </span>
              <span className="hidden font-mono text-xs text-muted-foreground sm:block">
                {truncate(payment.employee.walletAddress, 10, 8)}
              </span>
              <span className="w-28 text-right font-medium">
                {formatZec(payment.amountZec)} ZEC
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function ApprovalsView({
  proposals,
  loading,
  renderActions,
  explorerUrl,
  emptyAction,
}: ApprovalsViewProps) {
  const now = useNow()

  if (loading) {
    return (
      <p className={cn(COLUMN, "text-sm text-muted-foreground")}>
        Loading payments...
      </p>
    )
  }

  if (proposals.length === 0) {
    return (
      <Card className={COLUMN}>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <ShieldCheck className="size-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No payments yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            When the coordinator pays a payroll from the treasury, it shows up
            here for members to approve.
          </p>
          {emptyAction}
        </CardContent>
      </Card>
    )
  }

  // Newest first, under one heading per relative date.
  const groups: { heading: string; proposals: ApprovalsProposal[] }[] = []
  for (const proposal of [...proposals].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  )) {
    const heading = dateHeading(proposal.createdAt, now)
    const last = groups.at(-1)
    if (last?.heading === heading) last.proposals.push(proposal)
    else groups.push({ heading, proposals: [proposal] })
  }

  return (
    <div className={cn(COLUMN, "space-y-6")}>
      {groups.map((group) => (
        <section key={group.heading} className="space-y-3">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {group.heading}
          </h3>
          {group.proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              renderActions={
                OPEN.has(proposal.status) ? renderActions : undefined
              }
              explorerUrl={explorerUrl}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
