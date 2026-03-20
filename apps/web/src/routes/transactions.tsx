import { useMutation, useQuery } from "@apollo/client/react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { ArrowLeftRight, Download, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"
import {
  PaymentsDocument,
  UpdatePaymentStatusDocument,
} from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { useZcashWallet } from "../hooks/use-zcash-wallet"
import { matchTransactionsToPayments } from "../lib/match-transactions"

interface Payment {
  id: string
  amountUsd: number
  amountZec: number
  memo: string
  status: string
  txHash: string | null
  createdAt: string
  employee: { name: string }
  payroll: { name: string }
}

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

export function TransactionsPage() {
  useTitle("Transactions")
  const { data, loading, refetch } = useQuery(PaymentsDocument)
  const [updatePaymentStatus] = useMutation(UpdatePaymentStatusDocument)
  const { sync, getSentTxs, initialized: walletReady, syncing } = useZcashWallet()
  const [statusFilter, setStatusFilter] = useState("all")
  const [payrollFilter, setPayrollFilter] = useState("all")
  const [resyncing, setResyncing] = useState(false)
  const [matchCount, setMatchCount] = useState<number | null>(null)

  async function handleResync() {
    setResyncing(true)
    setMatchCount(null)
    try {
      await sync()
      const sentTxs = await getSentTxs()
      const pendingPayments = allPayments
        .filter((p) => p.status === "PENDING")
        .map((p) => ({
          id: p.id,
          amountZec: p.amountZec,
          memo: p.memo,
        }))

      const matches = matchTransactionsToPayments(sentTxs, pendingPayments)

      for (const match of matches) {
        await updatePaymentStatus({
          variables: {
            paymentId: match.paymentId,
            status: "COMPLETED" as never,
            txHash: match.txHash,
          },
        })
      }

      setMatchCount(matches.length)
      if (matches.length > 0) await refetch()
    } catch (e) {
      console.error("Resync failed:", e)
    } finally {
      setResyncing(false)
    }
  }

  const allPayments: Payment[] = (data as { payments?: Payment[] })?.payments ?? []

  const payrollNames = useMemo(
    () => [...new Set(allPayments.map((p) => p.payroll.name))],
    [allPayments]
  )

  const payments = useMemo(
    () =>
      allPayments.filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false
        if (payrollFilter !== "all" && p.payroll.name !== payrollFilter)
          return false
        return true
      }),
    [allPayments, statusFilter, payrollFilter]
  )

  const totalDisbursed = useMemo(
    () =>
      allPayments
        .filter((p) => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.amountZec, 0),
    [allPayments]
  )

  const totalTransactions = allPayments.length

  const successRate = useMemo(() => {
    if (!totalTransactions) return 0
    const completed = allPayments.filter(
      (p) => p.status === "COMPLETED"
    ).length
    return (completed / totalTransactions) * 100
  }, [allPayments, totalTransactions])

  const uniqueRecipients = useMemo(
    () => new Set(allPayments.map((p) => p.employee.name)).size,
    [allPayments]
  )

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-4xl font-light tracking-tight">
            Transaction History
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            All on-chain payroll executions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="!h-10 text-md w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SKIPPED">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Select value={payrollFilter} onValueChange={setPayrollFilter}>
            <SelectTrigger className="!h-10 text-md w-[160px]">
              <SelectValue placeholder="All Payrolls" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payrolls</SelectItem>
              {payrollNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {walletReady && (
            <Button
              variant="outline"
              onClick={handleResync}
              disabled={resyncing || syncing}
            >
              <RefreshCw className={`mr-1.5 size-4 ${resyncing ? "animate-spin" : ""}`} />
              {resyncing ? "Syncing..." : "Resync Wallet"}
            </Button>
          )}
          {matchCount !== null && matchCount > 0 && (
            <span className="text-sm font-medium text-green-600">
              {matchCount} payment{matchCount !== 1 ? "s" : ""} matched
            </span>
          )}
          <Button variant="outline" size="icon" className="h-10 w-10">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="py-0">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              Total Disbursed
            </p>
            <p className="mt-1 text-3xl font-bold">
              {totalDisbursed >= 1000
                ? `${(totalDisbursed / 1000).toFixed(1)}K`
                : totalDisbursed.toFixed(2)}
            </p>
            <p className="text-muted-foreground text-xs">ZEC all time</p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              Transactions
            </p>
            <p className="mt-1 text-3xl font-bold">{totalTransactions}</p>
            <p className="text-muted-foreground text-xs">Total executed</p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              Success Rate
            </p>
            <p className="mt-1 text-3xl font-bold text-green-600">
              {successRate.toFixed(1)}%
            </p>
            <p className="text-muted-foreground text-xs">On-chain finality</p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              Recipients
            </p>
            <p className="mt-1 text-3xl font-bold">{uniqueRecipients}</p>
            <p className="text-muted-foreground text-xs">Unique payees</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading transactions...</p>
      ) : payments.length === 0 && allPayments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowLeftRight className="text-muted-foreground mb-4 size-12" />
            <p className="text-muted-foreground text-lg">
              No transactions yet
            </p>
            <p className="text-muted-foreground text-sm">
              Transactions will appear here after you disburse payrolls.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">All Transactions</h3>
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                {payments.length} Transaction{payments.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground w-[150px] text-xs font-semibold uppercase tracking-wider">
                    Transaction ID
                  </TableHead>
                  <TableHead className="text-muted-foreground w-[100px] text-xs font-semibold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground w-[170px] text-xs font-semibold uppercase tracking-wider">
                    Recipient
                  </TableHead>
                  <TableHead className="text-muted-foreground w-[150px] text-xs font-semibold uppercase tracking-wider">
                    Payroll
                  </TableHead>
                  <TableHead className="text-muted-foreground w-[160px] text-right text-xs font-semibold uppercase tracking-wider">
                    Amount
                  </TableHead>
                  <TableHead className="text-muted-foreground w-[120px] text-right text-xs font-semibold uppercase tracking-wider">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {payment.txHash
                        ? truncateHash(payment.txHash)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "COMPLETED"
                            ? "default"
                            : payment.status === "SKIPPED"
                              ? "outline"
                              : "secondary"
                        }
                        className={
                          payment.status === "COMPLETED"
                            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                            : payment.status === "PENDING"
                              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                              : ""
                        }
                      >
                        {payment.status === "COMPLETED"
                          ? "Verified"
                          : payment.status === "PENDING"
                            ? "Pending"
                            : "Skipped"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.employee.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.payroll.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span className="text-base font-semibold">
                          {payment.amountZec.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>{" "}
                        <span className="text-muted-foreground text-sm">
                          ZEC
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        ≈ $
                        {payment.amountUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-sm">
                      {new Date(payment.createdAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
