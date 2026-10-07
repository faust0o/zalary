import { useMutation, useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import { ArrowRight, Fingerprint, Loader2, ShieldCheck } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import {
  ApproveSpendProposalDocument,
  CreateSpendProposalDocument,
  SpendProposalsDocument,
  TreasuryDocument,
} from "../../graphql/__generated__/graphql"
import { useAccountData } from "../../hooks/use-account-data"
import { useSpendProposals } from "../../hooks/use-spend-proposals"
import { useTreasuryWallet } from "../../hooks/use-treasury-wallet"
import { useVault } from "../../hooks/use-vault"
import { useZecPrice } from "../../hooks/use-zec-price"
import {
  linkRunsToSpend,
  salaryAmounts,
  startPayrollRun,
  type PayrollRun,
} from "../../lib/payroll-records"
import { zecToZat } from "../../lib/treasury/payment-request"
import {
  sealPczt,
  sealSpendDetails,
  type SpendDetails,
} from "../../lib/treasury/sealed-spend"
import {
  approveSpend,
  buildSpend,
  keepProposedPczt,
} from "../../lib/treasury/spend"
import { useSpendAgent } from "../treasury/spend-agent-context"
import { VaultButton } from "../treasury/vault-button"
import { describePasskeyError } from "../../lib/vault"

type Step = "select" | "building" | "proposed"

function message(err: unknown, fallback: string): string {
  // Passkey prompts fail with DOMExceptions; say what actually happened.
  if (err instanceof DOMException) return describePasskeyError(err)
  return err instanceof Error && err.message ? err.message : fallback
}

/**
 * Pay payrolls from the treasury: every payment of the selected runs goes
 * into one transaction, which the treasury's members then approve.
 */
export function DisburseModal({
  open,
  onOpenChange,
  initialPayrollId,
  onProposed,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPayrollId?: string | null
  onProposed?: () => void
}) {
  const account = useAccountData()
  // Which runs already went out is only known here, so wait for the spends.
  const { proposals, loading: proposalsLoading } = useSpendProposals({
    skip: !open,
  })
  const { data: treasuryData } = useQuery(TreasuryDocument, { skip: !open })
  const [createProposal] = useMutation(CreateSpendProposalDocument, {
    refetchQueries: [SpendProposalsDocument],
  })
  const [approveProposal] = useMutation(ApproveSpendProposalDocument, {
    refetchQueries: [SpendProposalsDocument],
  })
  const wallet = useTreasuryWallet()
  const vault = useVault()
  const { poke } = useSpendAgent()
  const { price } = useZecPrice()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>("select")
  const [selected, setSelected] = useState<string[]>([])
  const [status, setStatus] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    payments: number
    totalZec: number
    threshold: number
  } | null>(null)

  const treasury = treasuryData?.treasury
  const employeesById = new Map(account.employees.map((e) => [e.id, e]))
  const payrolls = account.payrolls.map((payroll) => {
    const employees = payroll.employeeIds.flatMap((id) => {
      const employee = employeesById.get(id)
      return employee ? [employee] : []
    })
    return {
      ...payroll,
      employeeCount: employees.length,
      // Salaries in ZEC count at today's price.
      totalUsd: employees.reduce(
        (sum, e) =>
          sum +
          (e.salaryCurrency === "ZEC"
            ? price
              ? salaryAmounts(e, price).amountUsd
              : 0
            : e.salaryAmount),
        0
      ),
    }
  })

  useEffect(() => {
    if (open && initialPayrollId) setSelected([initialPayrollId])
  }, [open, initialPayrollId])

  const totalUsd = payrolls
    .filter((p) => selected.includes(p.id))
    .reduce((sum, p) => sum + p.totalUsd, 0)
  const estimatedZec = price ? totalUsd / price : null
  const spendable = wallet.balance?.spendable ?? null
  const confirming = wallet.balance?.pending ?? 0
  const short =
    estimatedZec !== null && spendable !== null && spendable < estimatedZec
  // Enough is there, but some of it hasn't had enough confirmations yet.
  const waitForConfirmations = short && spendable + confirming >= estimatedZec

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function handleClose(next: boolean) {
    if (!next && step === "building") return
    if (!next) {
      setStep("select")
      setSelected([])
      setError(null)
      setSummary(null)
    }
    onOpenChange(next)
  }

  async function handlePropose() {
    const accountKey = account.accountKey
    if (!treasury || !accountKey || proposalsLoading) return
    setError(null)
    try {
      if (!price) throw new Error("Waiting for the ZEC price.")
      const keys = await vault.unlock()
      setStep("building")
      setStatus("Starting payroll runs...")

      // A run that hasn't been paid yet is paid now, unless its payment is
      // already on its way.
      const runs: PayrollRun[] = []
      const started: PayrollRun[] = []
      for (const payrollId of selected) {
        const payroll = account.payrolls.find((p) => p.id === payrollId)
        if (!payroll) continue
        const unpaid = account.runs.find(
          (r) => r.payrollId === payrollId && r.status !== "COMPLETED"
        )
        const spend = unpaid?.proposalId
          ? proposals.find((p) => p.id === unpaid.proposalId)
          : undefined
        if (spend?.status === "BROADCAST" || spend?.status === "CONFIRMED") {
          throw new Error(
            `${payroll.name} was already sent. Wait for it to confirm.`
          )
        }
        if (unpaid) {
          runs.push(unpaid)
        } else {
          const run = startPayrollRun(payroll, account.employees, price)
          runs.push(run)
          started.push(run)
        }
      }
      const payments = runs.flatMap((run) =>
        run.payments.map((payment) => ({ ...payment, run }))
      )
      if (payments.length === 0) {
        throw new Error("These payrolls have nothing left to pay.")
      }
      if (started.length > 0) {
        await account.write({
          put: started.map((run) => ({ kind: "payrollRun" as const, ...run })),
        })
      }

      const built = await buildSpend({
        keys,
        treasury,
        payments: payments.map((p) => ({
          address: p.walletAddress,
          amountZat: zecToZat(p.amountZec),
          memo: p.memo,
          label: p.employeeName,
        })),
        onStatus: setStatus,
      })

      // Everything about the payment is sealed before it leaves the browser.
      setStatus("Proposing the payment...")
      const id = crypto.randomUUID()
      const details: SpendDetails = {
        ...built.transaction,
        runIds: runs.map((r) => r.id),
        payments: payments.map((p) => ({
          runId: p.run.id,
          paymentId: p.id,
          payrollName: p.run.payrollName,
          employeeName: p.employeeName,
          walletAddress: p.walletAddress,
          amountUsd: p.amountUsd,
          amountZec: p.amountZec,
        })),
      }
      const [sealed, sealedPczt] = await Promise.all([
        sealSpendDetails(accountKey, id, details),
        sealPczt(accountKey, id, built.pczt),
      ])
      await createProposal({
        variables: {
          id,
          sealed,
          sealedPczt,
          frostSessionId: built.frostSessionId,
        },
      })
      // Signatures go on this browser's full copy, never the server's.
      await keepProposedPczt(keys, id, built.fullPczt)
      await account.write({ put: linkRunsToSpend(runs, id) })

      // Proposing counts as the coordinator's own approval.
      setStatus("Approving it yourself...")
      await approveSpend(
        {
          id,
          status: "AWAITING_APPROVALS",
          pczt: built.pczt,
          sighash: details.sighash,
          spends: details.spends,
          frostSessionId: built.frostSessionId,
          signerIds: [],
          approvals: [],
        },
        treasury,
        keys,
        true
      )
      await approveProposal({ variables: { id } })
      poke()

      setSummary({
        payments: payments.length,
        totalZec: Number(details.totalZat) / 1e8,
        threshold: treasury.threshold,
      })
      setStep("proposed")
    } catch (err) {
      setError(message(err, "Couldn't build the payment."))
      setStep("select")
    }
  }

  // Spends are built from what the last completed sync saw.
  const walletReady = wallet.initialized && wallet.syncCount > 0
  const blocksLeft =
    wallet.chainTipHeight !== null && wallet.lastSyncedHeight !== null
      ? wallet.chainTipHeight - wallet.lastSyncedHeight
      : null

  // Why the payment can't be proposed from here, if it can't.
  let blocker: ReactNode = null
  if (treasuryData && treasury?.status !== "ACTIVE") {
    blocker = (
      <Notice
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/treasury")}
          >
            Open Treasury
          </Button>
        }
      >
        The treasury isn't set up yet.
      </Notice>
    )
  } else if (treasury && !treasury.isCoordinator) {
    blocker = (
      <Notice>
        Only @{treasury.coordinator.username} can start a payment, since their
        browser holds the treasury's viewing key. Once they propose it, you
        approve it under Treasury → Approvals.
      </Notice>
    )
  } else if (treasury && wallet.needsUnlock) {
    blocker = (
      <Notice action={<VaultButton size="sm" variant="outline" />}>
        Unlock the treasury on this device so it can see its funds.
      </Notice>
    )
  } else if (treasury && !walletReady && wallet.error) {
    blocker = (
      <Notice
        tone="error"
        action={
          wallet.initialized && (
            <Button
              size="sm"
              variant="outline"
              disabled={wallet.syncing}
              onClick={() => void wallet.sync()}
            >
              {wallet.syncing && <Loader2 className="animate-spin" />}
              Retry
            </Button>
          )
        }
      >
        Couldn't sync the treasury: {wallet.error}
      </Notice>
    )
  } else if (treasury && !walletReady) {
    blocker = (
      <Notice>
        <Loader2 className="mr-1.5 inline size-3.5 animate-spin" />
        Syncing the treasury
        {blocksLeft !== null && blocksLeft > 0
          ? `, ${blocksLeft.toLocaleString()} blocks to go...`
          : "..."}
      </Notice>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-h-[85vh] !max-w-lg overflow-y-auto"
        showCloseButton={step !== "building"}
      >
        {step === "select" && (
          <>
            <DialogHeader>
              <DialogTitle>Pay from the treasury</DialogTitle>
              <DialogDescription>
                Every salary in the selected payrolls goes out in one shielded
                transaction once {treasury?.threshold ?? "enough"} members
                approve.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-80 space-y-3 overflow-y-auto py-2">
              {payrolls.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payrolls available.
                </p>
              ) : (
                payrolls.map((payroll) => {
                  return (
                    <div
                      key={payroll.id}
                      className="flex items-center space-x-3 rounded-lg border p-4"
                    >
                      <Checkbox
                        id={`payroll-${payroll.id}`}
                        checked={selected.includes(payroll.id)}
                        onCheckedChange={() => toggle(payroll.id)}
                      />
                      <Label
                        htmlFor={`payroll-${payroll.id}`}
                        className="flex flex-1 cursor-pointer items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{payroll.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payroll.employeeCount} employees
                          </p>
                        </div>
                        <span className="font-semibold">
                          $
                          {payroll.totalUsd.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </Label>
                    </div>
                  )
                })
              )}
            </div>
            {selected.length > 0 &&
              (estimatedZec !== null || spendable !== null) && (
                <p className="text-sm text-muted-foreground">
                  {estimatedZec !== null && (
                    <>
                      About{" "}
                      <span className="font-medium text-foreground">
                        {estimatedZec.toFixed(4)} ZEC
                      </span>{" "}
                      plus network fee
                    </>
                  )}
                  {estimatedZec !== null && spendable !== null && " · "}
                  {spendable !== null && (
                    <>{spendable.toFixed(4)} ZEC spendable</>
                  )}
                </p>
              )}
            {blocker}
            {waitForConfirmations ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {confirming.toFixed(4)} ZEC is still confirming. Received funds
                can be spent after 10 confirmations, about 12 minutes.
              </p>
            ) : (
              short && (
                <p className="text-sm text-destructive">
                  The treasury doesn't hold enough spendable ZEC. Top it up
                  first.
                </p>
              )
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                onClick={handlePropose}
                disabled={
                  selected.length === 0 ||
                  !!blocker ||
                  short ||
                  !treasury ||
                  proposalsLoading
                }
              >
                <Fingerprint />
                Propose payment
                <ArrowRight />
              </Button>
            </div>
          </>
        )}

        {step === "building" && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="max-w-xs text-sm text-muted-foreground">{status}</p>
          </div>
        )}

        {step === "proposed" && summary && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/15">
              <ShieldCheck className="size-8 text-[var(--primary-dark)] dark:text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Payment proposed</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {summary.payments} payment{summary.payments !== 1 && "s"}{" "}
              totalling {summary.totalZec.toFixed(4)} ZEC. It goes out once{" "}
              {summary.threshold} members approve, and your approval already
              counts.
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                handleClose(false)
                onProposed?.()
              }}
            >
              View approvals
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Notice({
  tone = "info",
  action,
  children,
}: {
  tone?: "info" | "error"
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md p-3 text-sm ${
        tone === "error"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <p className="flex-1">{children}</p>
      {action}
    </div>
  )
}
