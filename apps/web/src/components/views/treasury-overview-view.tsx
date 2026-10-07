import { Identicon } from "@workspace/ui/components/Identicon"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  ArrowDown,
  ArrowRight,
  Check,
  Copy,
  Plus,
  Send,
  ShieldCheck,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useState, type ReactNode } from "react"

export interface TreasuryOverviewMember {
  id: string
  name: string
  username: string
  isCoordinator: boolean
  hasKeyShare: boolean
}

export interface TreasuryOverviewViewProps {
  address: string | null
  /** Under the address, e.g. whether this browser checked it. */
  addressNote?: ReactNode
  balanceZec: number | null
  /** e.g. sync progress, or how old a reported balance is */
  balanceNote?: ReactNode
  zecPrice: number | null
  threshold: number
  members: TreasuryOverviewMember[]
  pendingApprovals: number
  /** Some of them can't move until this user unlocks their passkey. */
  pendingNeedsUnlock?: boolean
  /** Shown above everything, e.g. a prompt to unlock this device. */
  notice?: ReactNode
  onTopUp?: () => void
  onPay?: () => void
  onViewApprovals?: () => void
  /** Replaces copying the address to the clipboard. */
  onCopyAddress?: () => void
}

function formatZec(zec: number): string {
  return zec.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: zec < 1 ? 4 : 2,
  })
}

function truncateAddress(address: string): string {
  return address.length <= 24
    ? address
    : `${address.slice(0, 12)}…${address.slice(-10)}`
}

export function TreasuryOverviewView({
  address,
  addressNote,
  balanceZec,
  balanceNote,
  zecPrice,
  threshold,
  members,
  pendingApprovals,
  pendingNeedsUnlock,
  notice,
  onTopUp,
  onPay,
  onViewApprovals,
  onCopyAddress,
}: TreasuryOverviewViewProps) {
  const [depositOpen, setDepositOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const signers = members.filter((m) => m.hasKeyShare)

  function copyAddress() {
    if (onCopyAddress) return onCopyAddress()
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      {notice}

      {pendingApprovals > 0 && (
        <button
          type="button"
          onClick={onViewApprovals}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900/60"
        >
          <span className="size-2 animate-pulse rounded-full bg-amber-500" />
          <span className="flex-1">
            {pendingApprovals} payment{pendingApprovals > 1 ? "s" : ""} waiting
            for approval
            {pendingNeedsUnlock && (
              <span className="font-medium">
                {" "}
                · Unlock to keep {pendingApprovals > 1 ? "them" : "it"} moving
              </span>
            )}
          </span>
          <ArrowRight className="size-4" />
        </button>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardDescription>Total balance</CardDescription>
            <CardTitle className="text-5xl font-light tracking-tight">
              {balanceZec === null ? "—" : formatZec(balanceZec)}{" "}
              <span className="text-2xl text-muted-foreground">ZEC</span>
            </CardTitle>
            <div className="space-y-0.5 text-sm text-muted-foreground">
              {balanceZec !== null && zecPrice && (
                <p>
                  ≈ $
                  {(balanceZec * zecPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
              {balanceNote && <div className="text-xs">{balanceNote}</div>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <Button size="lg" onClick={onPay} disabled={!onPay}>
                <Send />
                Pay
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setDepositOpen(true)}
                disabled={!address}
              >
                <ArrowDown />
                Deposit
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={onTopUp}
                disabled={!onTopUp}
              >
                <Plus />
                Top Up
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Security</CardDescription>
            <CardTitle className="text-5xl font-light tracking-tight">
              {threshold}
              <span className="text-2xl text-muted-foreground">
                /{signers.length}
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              signatures needed per payment
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex -space-x-2">
              {signers.map((member) => (
                <Identicon
                  key={member.id}
                  hash={member.username}
                  size={32}
                  className="rounded-full ring-2 ring-card"
                />
              ))}
            </div>
            <p className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              FROST threshold signatures. Every share is sealed by its member's
              passkey; no one, including Zalary, can move funds alone.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signers</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Identicon
                    hash={member.username}
                    size={32}
                    className="rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{member.username}
                    </p>
                  </div>
                  {member.isCoordinator && (
                    <span className="text-xs text-muted-foreground">
                      Coordinator
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Treasury address</CardTitle>
            <CardDescription>
              A shielded address. Anything sent here is private on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* In full, so it can be checked character by character. */}
            <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed break-all text-muted-foreground">
              {address ?? "—"}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAddress}
              disabled={!address}
            >
              {copied ? <Check className="text-green-500" /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
            {addressNote}
          </CardContent>
        </Card>
      </div>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deposit to the treasury</DialogTitle>
            <DialogDescription>
              Send ZEC from any wallet to this shielded address.
            </DialogDescription>
          </DialogHeader>
          {address && (
            <div className="flex flex-col items-center gap-4 py-2">
              <QRCodeSVG
                value={`zcash:${address}`}
                size={200}
                fgColor={
                  document.documentElement.classList.contains("dark")
                    ? "#ffffff"
                    : "#000000"
                }
                bgColor="transparent"
              />
              <code className="font-mono text-xs text-muted-foreground">
                {truncateAddress(address)}
              </code>
              <Button variant="outline" onClick={copyAddress}>
                {copied ? <Check className="text-green-500" /> : <Copy />}
                {copied ? "Copied" : "Copy address"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
