import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  Copy,
  ExternalLink,
  PartyPopper,
  ShieldCheck,
  Undo2,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useRef, useState } from "react"
import { useTreasuryWallet } from "../hooks/use-treasury-wallet"
import {
  FINAL_STATUSES,
  SOL,
  ZEC_DECIMALS,
  fromBaseUnits,
  getSwapStatus,
  loadActiveSwap,
  requestQuote,
  saveActiveSwap,
  toBaseUnits,
  type ActiveSwap,
  type QuoteResponse,
  type StatusResponse,
} from "../lib/near-intents"

const asset = SOL
const STATUS_POLL_MS = 5_000
const BACKGROUND_POLL_MS = 30_000
// SUCCESS means the ZEC tx was broadcast; sync again once it's likely mined
const RESYNC_AFTER_SUCCESS_MS = 150_000
// Swap fees are almost entirely a flat ZEC withdrawal fee (~$0.45), so small
// top-ups lose a large share to it. The minimum is $10, raised whenever fees
// are high enough to take more than MAX_FEE_SHARE of that.
const MIN_TOP_UP_USD = 10
const MAX_FEE_SHARE = 0.05
// The refund address doesn't affect pricing, so dry quotes use a placeholder
const PREVIEW_REFUND_ADDRESS = "So11111111111111111111111111111111111111112"

const STATUS_LABELS: Record<string, string> = {
  PENDING_DEPOSIT: `Waiting for your ${asset.symbol}...`,
  KNOWN_DEPOSIT_TX: "Payment received, waiting for confirmation...",
  PROCESSING: "Swapping to ZEC...",
  INCOMPLETE_DEPOSIT:
    "Received less than expected. Send the rest before the deadline or it will be refunded.",
}

function truncate(value: string, chars = 8) {
  return value.length > chars * 2 + 3
    ? `${value.slice(0, chars)}...${value.slice(-chars)}`
    : value
}

/** Round up to two significant digits, so the suggested minimum clears it */
function ceilToTwoDigits(value: number) {
  const step = 10 ** (Math.floor(Math.log10(value)) - 1)
  return Number((Math.ceil(value / step) * step).toPrecision(2))
}

function formatUsd(value: string) {
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="text-green-600" /> : <Copy />}
    </Button>
  )
}

export function TopUpModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { address, addressError, sync } = useTreasuryWallet()

  const [amount, setAmount] = useState("")
  const [refundTo, setRefundTo] = useState("")
  const [preview, setPreview] = useState<QuoteResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [swap, setSwap] = useState<ActiveSwap | null>(null)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [expired, setExpired] = useState(false)

  const amountUnits = toBaseUnits(amount, asset.decimals)
  const refundValid = asset.addressPattern.test(refundTo.trim())
  // Treats the quote's fee as flat, which it nearly is
  const feeUsd = preview
    ? Math.max(
        0,
        Number(preview.quote.amountInUsd) - Number(preview.quote.amountOutUsd)
      )
    : 0
  const minUsd = Math.max(MIN_TOP_UP_USD, Math.ceil(feeUsd / MAX_FEE_SHARE))
  // Minimum in the origin asset, derived from the quote's own USD price
  const minAmount =
    preview && Number(preview.quote.amountInUsd) < minUsd
      ? (minUsd * Number(amount)) / Number(preview.quote.amountInUsd)
      : null
  const settled =
    status && FINAL_STATUSES.includes(status.status) ? status : null

  // Resume a swap that was started earlier for this treasury
  useEffect(() => {
    if (!address) return
    const saved = loadActiveSwap()
    if (saved && saved.recipient === address) setSwap(saved)
  }, [address])

  // Price the swap as the user types
  useEffect(() => {
    if (!open || swap || !address || !amountUnits) {
      setPreview(null)
      setPreviewError(null)
      setPreviewLoading(false)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    const timer = setTimeout(() => {
      requestQuote({
        asset,
        amount: amountUnits,
        recipient: address,
        refundTo: PREVIEW_REFUND_ADDRESS,
        dry: true,
      })
        .then((res) => {
          if (cancelled) return
          setPreview(res)
          setPreviewError(null)
        })
        .catch((e) => {
          if (cancelled) return
          setPreview(null)
          setPreviewError(e instanceof Error ? e.message : "Quote failed")
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false)
        })
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, swap, address, amountUnits])

  // Track the swap until it settles, also while the dialog is closed so the
  // balance refreshes once the ZEC lands
  const depositAddress = swap?.quote.depositAddress
  const sendBy = swap?.sendBy
  const inactiveAt = swap?.quote.deadline
  const resyncTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(resyncTimer.current), [])
  useEffect(() => {
    if (!depositAddress) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      try {
        const res = await getSwapStatus(depositAddress!)
        if (cancelled) return
        const unfunded = res.status === "PENDING_DEPOSIT"
        if (unfunded && inactiveAt && Date.parse(inactiveAt) < Date.now()) {
          // Never funded and the deposit address is gone; stop tracking
          saveActiveSwap(null)
          setSwap(null)
          setStatus(null)
          return
        }
        setExpired(unfunded && !!sendBy && Date.parse(sendBy) < Date.now())
        setStatus(res)
        if (FINAL_STATUSES.includes(res.status)) {
          saveActiveSwap(null)
          if (res.status === "SUCCESS") {
            sync()
            resyncTimer.current = setTimeout(sync, RESYNC_AFTER_SUCCESS_MS)
          }
          return
        }
      } catch (e) {
        console.warn("[top-up] Status check failed:", e)
      }
      if (!cancelled) {
        timer = setTimeout(poll, open ? STATUS_POLL_MS : BACKGROUND_POLL_MS)
      }
    }

    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, depositAddress, sendBy, inactiveAt, sync])

  const reset = () => {
    saveActiveSwap(null)
    setSwap(null)
    setStatus(null)
    setExpired(false)
    setAmount("")
    setCreateError(null)
  }

  const handleOpenChange = (next: boolean) => {
    // Settled swaps don't need to be shown again
    if (!next && settled) reset()
    onOpenChange(next)
  }

  const createSwap = async () => {
    if (!address || !amountUnits || !refundValid) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await requestQuote({
        asset,
        amount: amountUnits,
        recipient: address,
        refundTo: refundTo.trim(),
        dry: false,
      })
      const { depositAddress } = res.quote
      if (!depositAddress) throw new Error("No deposit address returned")
      const active: ActiveSwap = {
        assetSymbol: asset.symbol,
        quote: { ...res.quote, depositAddress },
        recipient: address,
        refundTo: refundTo.trim(),
        sendBy: res.quoteRequest.deadline,
      }
      saveActiveSwap(active)
      setStatus(null)
      setSwap(active)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not start swap")
    } finally {
      setCreating(false)
    }
  }

  const sendAmount = swap && fromBaseUnits(swap.quote.amountIn, asset.decimals)
  // The QR code is only useful until the payment has arrived
  const awaitingPayment = !status || status.status === "PENDING_DEPOSIT"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] !max-w-md overflow-y-auto">
        {!swap && (
          <>
            <DialogHeader>
              <DialogTitle>Top up with {asset.symbol}</DialogTitle>
              <DialogDescription>
                Swap {asset.symbol} for shielded ZEC through NEAR Intents. It
                arrives straight in your treasury.
              </DialogDescription>
            </DialogHeader>

            {addressError ? (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>Couldn't get the treasury's address: {addressError}</p>
              </div>
            ) : !address ? (
              <div className="flex flex-col items-center py-10">
                <p className="text-sm text-muted-foreground">
                  Top-ups go to your treasury. Set one up first.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="top-up-amount">You send</Label>
                  <div className="relative">
                    <Input
                      id="top-up-amount"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-14 text-base"
                      autoFocus
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                      {asset.symbol}
                    </span>
                  </div>
                  {amount && !amountUnits && (
                    <p className="text-xs text-red-500">
                      Enter a valid amount.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    You receive (estimated)
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xl font-medium",
                      previewLoading && "text-shimmer"
                    )}
                  >
                    {preview
                      ? `${preview.quote.amountOutFormatted} ZEC`
                      : previewLoading
                        ? "0.00000000 ZEC"
                        : "- ZEC"}
                  </p>
                  {preview && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Value</span>
                        <span>{formatUsd(preview.quote.amountOutUsd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Minimum received</span>
                        <span>
                          {fromBaseUnits(
                            preview.quote.minAmountOut,
                            ZEC_DECIMALS
                          )}{" "}
                          ZEC
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Arrives</span>
                        <span>
                          ~
                          {Math.max(
                            1,
                            Math.round(preview.quote.timeEstimate / 60)
                          )}{" "}
                          min after payment
                        </span>
                      </div>
                    </div>
                  )}
                  {minAmount !== null && (
                    <p className="mt-2 text-xs text-red-500">
                      {minUsd > MIN_TOP_UP_USD &&
                        `Fees are high right now (${formatUsd(String(feeUsd))} per swap), so the `}
                      {minUsd > MIN_TOP_UP_USD ? "minimum" : "Minimum"} top-up
                      is ${minUsd} (about {ceilToTwoDigits(minAmount)}{" "}
                      {asset.symbol}).
                    </p>
                  )}
                  {previewError && (
                    <p className="mt-2 text-xs text-red-500">{previewError}</p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5 shrink-0 text-green-600" />
                    <span className="truncate" title={address}>
                      To your shielded address{" "}
                      <span className="font-mono">{truncate(address, 6)}</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="top-up-refund">
                    Your {asset.network} address
                  </Label>
                  <Input
                    id="top-up-refund"
                    placeholder={`${asset.network} address for refunds`}
                    value={refundTo}
                    onChange={(e) => setRefundTo(e.target.value)}
                    className="font-mono"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    {refundTo && !refundValid
                      ? `That doesn't look like a ${asset.network} address.`
                      : "Only used to refund you if the swap can't complete."}
                  </p>
                </div>

                {createError && (
                  <p className="text-xs text-red-500">{createError}</p>
                )}

                <Button
                  className="w-full"
                  disabled={
                    !preview || minAmount !== null || !refundValid || creating
                  }
                  onClick={createSwap}
                >
                  {creating ? "Preparing payment..." : "Continue"}
                  {!creating && <ArrowRight />}
                </Button>
              </div>
            )}
          </>
        )}

        {swap && !settled && expired && (
          <div className="flex flex-col items-center py-8 text-center">
            <Clock className="mb-4 size-14 text-muted-foreground" />
            <h3 className="text-xl font-bold">Deposit address expired</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Don't send anything to it anymore. Start a new top-up to get a
              fresh quote.
            </p>
            <Button className="mt-6" onClick={reset}>
              Start over
            </Button>
          </div>
        )}

        {swap && !settled && !expired && (
          <>
            <DialogHeader>
              <DialogTitle>
                Send {sendAmount} {asset.symbol}
              </DialogTitle>
              <DialogDescription>
                Scan with your {asset.network} wallet, or copy the address
                below.
              </DialogDescription>
            </DialogHeader>

            {awaitingPayment && (
              <div className="flex flex-col items-center">
                <div className="rounded-xl bg-white p-3">
                  <QRCodeSVG
                    value={asset.paymentUri(
                      swap.quote.depositAddress,
                      sendAmount!
                    )}
                    size={200}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-mono text-sm">
                    {sendAmount} {asset.symbol}
                  </p>
                </div>
                <CopyButton value={sendAmount!} label="amount" />
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Deposit address
                  </p>
                  <p className="font-mono text-sm break-all">
                    {swap.quote.depositAddress}
                  </p>
                </div>
                <CopyButton
                  value={swap.quote.depositAddress}
                  label="deposit address"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>You receive</span>
                <span>≈ {swap.quote.amountOutFormatted} ZEC</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>To</span>
                <span className="font-mono" title={swap.recipient}>
                  {truncate(swap.recipient, 6)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Only send {asset.symbol} on {asset.network}, before{" "}
                {new Date(swap.sendBy).toLocaleTimeString(undefined, {
                  timeStyle: "short",
                })}
                . Later deposits are refunded, other tokens are lost.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />
              {STATUS_LABELS[status?.status ?? "PENDING_DEPOSIT"]}
            </div>

            {awaitingPayment && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Start over
              </Button>
            )}
          </>
        )}

        {swap && settled?.status === "SUCCESS" && (
          <div className="flex flex-col items-center py-8 text-center">
            <PartyPopper className="mb-4 size-14 text-primary" />
            <h3 className="text-xl font-bold">
              {settled.swapDetails.amountOutFormatted ??
                swap.quote.amountOutFormatted}{" "}
              ZEC received
            </h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              It was delivered to your shielded address{" "}
              <span className="font-mono" title={swap.recipient}>
                {truncate(swap.recipient, 6)}
              </span>
              .
            </p>
            {settled.swapDetails.destinationChainTxHashes[0] && (
              <a
                href={
                  settled.swapDetails.destinationChainTxHashes[0].explorerUrl
                }
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                View transaction <ExternalLink className="size-3" />
              </a>
            )}
            <Button className="mt-6" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        )}

        {swap && settled && settled.status !== "SUCCESS" && (
          <div className="flex flex-col items-center py-8 text-center">
            <Undo2 className="mb-4 size-14 text-muted-foreground" />
            <h3 className="text-xl font-bold">
              {settled.status === "REFUNDED" ? "Swap refunded" : "Swap failed"}
            </h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {settled.status === "REFUNDED"
                ? `${settled.swapDetails.refundedAmountFormatted ?? "Your"} ${asset.symbol} was sent back to ${truncate(swap.refundTo, 6)}.`
                : "The swap couldn't be completed."}
              {settled.swapDetails.refundReason &&
                ` ${settled.swapDetails.refundReason}`}
            </p>
            <Button className="mt-6" onClick={reset}>
              Try again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
