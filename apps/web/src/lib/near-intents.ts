// Client for the NEAR Intents 1Click API, used to swap other assets into ZEC.
// Docs: https://docs.near-intents.org/integration/distribution-channels/1click-api
// Requests are unauthenticated, so 1Click adds its default platform fee
// (0.2-0.25%). A partner key lowers it but has to stay on a server.

const ONE_CLICK_URL = "https://1click.chaindefuser.com"

const ZEC_ASSET_ID = "nep141:zec.omft.near"
export const ZEC_DECIMALS = 8

/** Slippage tolerance in basis points (100 = 1%) */
const SLIPPAGE_BPS = 100
/** How long the user has to send funds before the swap is refunded */
const DEPOSIT_WINDOW_MS = 2 * 60 * 60 * 1000

export interface TopUpAsset {
  symbol: string
  network: string
  assetId: string
  decimals: number
  addressPattern: RegExp
  /** Payment request URI that wallets can scan to prefill the transfer */
  paymentUri: (depositAddress: string, amount: string) => string
}

export const SOL: TopUpAsset = {
  symbol: "SOL",
  network: "Solana",
  assetId: "nep141:sol.omft.near",
  decimals: 9,
  addressPattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  // Solana Pay transfer request, amount in SOL
  paymentUri: (depositAddress, amount) =>
    `solana:${depositAddress}?amount=${amount}&label=Zalary&message=${encodeURIComponent("ZEC top-up")}`,
}

export interface Quote {
  depositAddress?: string
  depositMemo?: string
  amountIn: string
  amountInFormatted: string
  amountInUsd: string
  minAmountIn: string
  amountOut: string
  amountOutFormatted: string
  amountOutUsd: string
  minAmountOut: string
  /** When the deposit address goes inactive (72h after the requested deadline) */
  deadline?: string
  timeWhenInactive?: string
  /** Seconds from confirmed deposit to delivery */
  timeEstimate: number
  refundFee?: string
  withdrawFee?: string
}

export interface QuoteResponse {
  quote: Quote
  quoteRequest: { recipient: string; refundTo: string; deadline: string }
  timestamp: string
  correlationId: string
}

export type SwapStatus =
  | "PENDING_DEPOSIT"
  | "KNOWN_DEPOSIT_TX"
  | "INCOMPLETE_DEPOSIT"
  | "PROCESSING"
  | "SUCCESS"
  | "REFUNDED"
  | "FAILED"

export const FINAL_STATUSES: SwapStatus[] = ["SUCCESS", "REFUNDED", "FAILED"]

interface TransactionDetails {
  hash: string
  explorerUrl: string
}

export interface StatusResponse {
  status: SwapStatus
  updatedAt: string
  swapDetails: {
    amountOutFormatted?: string | null
    depositedAmountFormatted?: string | null
    refundedAmountFormatted?: string | null
    refundReason?: string | null
    originChainTxHashes: TransactionDetails[]
    destinationChainTxHashes: TransactionDetails[]
  }
}

async function oneClick<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ONE_CLICK_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      body?.message ?? `NEAR Intents request failed (${res.status})`
    )
  }
  return body as T
}

/**
 * Quote a swap of `amount` (base units of `asset`) into ZEC sent to `recipient`.
 * A dry quote only prices the swap; a real one also opens a deposit address.
 */
export function requestQuote({
  asset,
  amount,
  recipient,
  refundTo,
  dry,
}: {
  asset: TopUpAsset
  amount: string
  recipient: string
  refundTo: string
  dry: boolean
}): Promise<QuoteResponse> {
  return oneClick<QuoteResponse>("/v0/quote", {
    method: "POST",
    body: JSON.stringify({
      dry,
      // Accepts any deposit above minAmountIn, so a transfer that arrives a
      // little short (e.g. after an exchange withdrawal fee) still swaps
      swapType: "FLEX_INPUT",
      slippageTolerance: SLIPPAGE_BPS,
      originAsset: asset.assetId,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: ZEC_ASSET_ID,
      amount,
      refundTo,
      refundType: "ORIGIN_CHAIN",
      recipient,
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(Date.now() + DEPOSIT_WINDOW_MS).toISOString(),
      referral: "zalary",
    }),
  }).catch((e: Error) => {
    // The API reports minimums in base units, e.g. "try at least 17252721"
    const min = e.message.match(/try at least (\d+)/)?.[1]
    if (min) {
      throw new Error(
        `Minimum is ${fromBaseUnits(min, asset.decimals)} ${asset.symbol}`
      )
    }
    throw e
  })
}

export function getSwapStatus(depositAddress: string): Promise<StatusResponse> {
  return oneClick<StatusResponse>(
    `/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`
  )
}

/** Parse a decimal amount into integer base units, or null if invalid. */
export function toBaseUnits(amount: string, decimals: number): string | null {
  const match = amount.trim().match(/^(\d*)(?:\.(\d*))?$/)
  if (!match || (!match[1] && !match[2])) return null
  const [, whole = "", fraction = ""] = match
  if (fraction.length > decimals) return null
  const units =
    BigInt(whole || "0") * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0")
  return units > 0n ? units.toString() : null
}

/** Format integer base units as a plain decimal string without trailing zeros. */
export function fromBaseUnits(units: string, decimals: number): string {
  const value = BigInt(units)
  const base = 10n ** BigInt(decimals)
  const fraction = (value % base).toString().padStart(decimals, "0")
  const trimmed = fraction.replace(/0+$/, "")
  return trimmed ? `${value / base}.${trimmed}` : `${value / base}`
}

// The deposit address is the only handle on an in-flight swap, so it's kept
// in localStorage to survive closing the dialog or reloading the page.
const ACTIVE_SWAP_KEY = "zalary-top-up"

export interface ActiveSwap {
  assetSymbol: string
  quote: Quote & { depositAddress: string }
  /** Shielded address of the viewing key the ZEC is delivered to */
  recipient: string
  refundTo: string
  /** Deposits after this are refunded */
  sendBy: string
}

export function loadActiveSwap(): ActiveSwap | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SWAP_KEY)
    const swap = raw ? (JSON.parse(raw) as ActiveSwap) : null
    return swap?.quote?.depositAddress ? swap : null
  } catch {
    return null
  }
}

export function saveActiveSwap(swap: ActiveSwap | null) {
  try {
    if (swap) localStorage.setItem(ACTIVE_SWAP_KEY, JSON.stringify(swap))
    else localStorage.removeItem(ACTIVE_SWAP_KEY)
  } catch {
    // Storage unavailable; the swap still completes, we just can't resume it
  }
}
