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
import { Progress } from "@workspace/ui/components/progress"
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react"
import {
  PayrollsForDisburseDocument,
  StartPayrollRunDocument,
} from "../../graphql/__generated__/graphql"

interface PaymentItem {
  id: string
  amountUsd: number
  amountZec: number
  status: string
  payrollName: string
  employee: {
    name: string
    walletAddress: string
  }
}

interface RunData {
  id: string
  zecPriceUsd: number
  payments: PaymentItem[]
}

type Step = "select" | "payout" | "done"

export function DisburseModal({
  open,
  onOpenChange,
  initialPayrollId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPayrollId?: string | null
}) {
  const { data } = useQuery(PayrollsForDisburseDocument, { skip: !open })
  const [startPayrollRun] = useMutation(StartPayrollRunDocument)

  const [step, setStep] = useState<Step>("select")
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<string[]>([])
  const [runs, setRuns] = useState<RunData[]>([])
  const [allPayments, setAllPayments] = useState<PaymentItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const [autoStarted, setAutoStarted] = useState(false)

  const payrolls = data?.payrolls ?? []

  // Auto-start when opened with an initialPayrollId
  useEffect(() => {
    if (!initialPayrollId || !open || !payrolls.length || autoStarted) return
    setAutoStarted(true)
    setSelectedPayrollIds([initialPayrollId])

    async function autoStart() {
      setIsStarting(true)
      try {
        const payrollName =
          (payrolls as { id: string; name: string }[]).find(
            (p) => p.id === initialPayrollId
          )?.name ?? ""
        const { data: result } = await startPayrollRun({
          variables: { payrollId: initialPayrollId! },
        })
        if (result?.startPayrollRun) {
          const run = {
            ...result.startPayrollRun,
            payments: result.startPayrollRun.payments.map((p) => ({
              ...p,
              payrollName,
            })),
          }
          setRuns([run])
          setAllPayments(run.payments)
          setCurrentIndex(0)
          setStep("payout")
        }
      } finally {
        setIsStarting(false)
      }
    }

    autoStart()
  }, [initialPayrollId, open, payrolls.length])

  function togglePayroll(id: string) {
    setSelectedPayrollIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleStartRuns() {
    setIsStarting(true)
    try {
      const newRuns: RunData[] = []
      for (const payrollId of selectedPayrollIds) {
        const payrollName =
          (payrolls as { id: string; name: string }[]).find(
            (p) => p.id === payrollId
          )?.name ?? ""
        const { data } = await startPayrollRun({ variables: { payrollId } })
        if (data?.startPayrollRun) {
          const run = {
            ...data.startPayrollRun,
            payments: data.startPayrollRun.payments.map((p) => ({
              ...p,
              payrollName,
            })),
          }
          newRuns.push(run)
        }
      }
      setRuns(newRuns)
      setAllPayments(newRuns.flatMap((r) => r.payments))
      setCurrentIndex(0)
      setStep("payout")
    } finally {
      setIsStarting(false)
    }
  }

  function handleClose() {
    setStep("select")
    setSelectedPayrollIds([])
    setRuns([])
    setAllPayments([])
    setCurrentIndex(0)
    setAutoStarted(false)
    onOpenChange(false)
  }

  const totalCount = allPayments.length
  const currentPayment = allPayments[currentIndex]
  const progressPercent =
    totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0

  function truncateAddress(addr: string): string {
    if (addr.length <= 16) return addr
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] !max-w-lg overflow-y-auto">
        {step === "select" && initialPayrollId && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-muted-foreground mt-4 text-sm">
              Preparing payment...
            </p>
          </div>
        )}

        {step === "select" && !initialPayrollId && (
          <>
            <DialogHeader>
              <DialogTitle>Disburse Payroll</DialogTitle>
              <DialogDescription>
                Select the payrolls you want to disburse.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-80 space-y-3 overflow-y-auto py-4">
              {payrolls.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payrolls available.
                </p>
              ) : (
                payrolls.map(
                  (payroll: {
                    id: string
                    name: string
                    employees: {
                      employee: { salaryAmount: number }
                    }[]
                  }) => {
                    const totalUsd = payroll.employees.reduce(
                      (sum, pe) => sum + pe.employee.salaryAmount,
                      0
                    )
                    return (
                      <div
                        key={payroll.id}
                        className="flex items-center space-x-3 rounded-lg border p-4"
                      >
                        <Checkbox
                          id={`payroll-${payroll.id}`}
                          checked={selectedPayrollIds.includes(payroll.id)}
                          onCheckedChange={() => togglePayroll(payroll.id)}
                        />
                        <Label
                          htmlFor={`payroll-${payroll.id}`}
                          className="flex flex-1 cursor-pointer items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{payroll.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {payroll.employees.length} employees
                            </p>
                          </div>
                          <span className="font-semibold">
                            ${totalUsd.toLocaleString()}
                          </span>
                        </Label>
                      </div>
                    )
                  }
                )
              )}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleStartRuns}
                disabled={selectedPayrollIds.length === 0 || isStarting}
              >
                {isStarting ? "Starting..." : "Next"}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </>
        )}

        {step === "payout" && currentPayment && (
          <>
            <DialogHeader>
              <DialogTitle>Scan to Pay</DialogTitle>
              <DialogDescription>
                Scan the QR code with your Zcash wallet to send the payment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  Payment {currentIndex + 1} of {totalCount}
                </span>
                <span className="text-muted-foreground">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <Progress value={progressPercent} />
            </div>

            <div className="flex flex-col items-center py-6">
              <div className="rounded-xl p-4">
                <QRCodeSVG
                  value={`zcash:${currentPayment.employee.walletAddress}?amount=${currentPayment.amountZec.toFixed(8)}&message=${encodeURIComponent(`Zalary: ${currentPayment.payrollName}`)}`}
                  size={200}
                  fgColor={document.documentElement.classList.contains("dark") ? "#ffffff" : "#000000"}
                  bgColor="transparent"
                />
              </div>

              <div className="mt-6 text-center">
                <p className="text-4xl font-light">
                  {currentPayment.employee.name}
                </p>
                <p className="text-muted-foreground mt-1 font-mono text-sm">
                  {truncateAddress(currentPayment.employee.walletAddress)}
                </p>
                <div className="mt-3">
                  <p className="font-mono text-2xl font-bold">
                    {currentPayment.amountZec.toFixed(4)} ZEC
                  </p>
                  <p className="text-muted-foreground text-sm">
                    ≈ $
                    {currentPayment.amountUsd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((i) => i - 1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>

              {currentIndex < totalCount - 1 ? (
                <Button onClick={() => setCurrentIndex((i) => i + 1)}>
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              ) : (
                <Button onClick={() => setStep("done")}>
                  Done
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              )}
            </div>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12">
            <PartyPopper className="text-primary mb-4 size-16" />
            <h3 className="text-xl font-bold">All Payments Sent!</h3>
            <p className="text-muted-foreground mt-2 max-w-xs text-center text-sm">
              {totalCount} payment QR codes have been shown across{" "}
              {runs.length} payroll run{runs.length > 1 ? "s" : ""}. Payments
              will be verified automatically once confirmed on-chain.
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
