import { del, get, set } from "idb-keyval"
import { callWorker, setProgressListener, terminateWorker } from "./wasm-worker"
import { LIGHTWALLETD_URL, ZCASH_NETWORK } from "./zcash-network"

// Bumped when the persisted format changes; stale state is dropped.
const WALLET_VERSION_KEY = "zcash-wallet-version"
const WALLET_VERSION = 22
// Before treasuries, the wallet tracked a connected viewing key here.
const LEGACY_STATE_KEY = "zcash-wallet-state"

export interface BalanceInfo {
  spendable: number
  pending: number
  total: number
}

export interface SyncSummary {
  fully_scanned_height: number
  chain_tip_height: number
  is_synced: boolean
  balance: BalanceInfo
}

export interface SentTransaction {
  txid: string
  amount_zec: number
  memo: string | null
  block_height: number | null
  timestamp: number
}

/** IndexedDB key of a treasury's wallet state on this network. */
export function walletStorageKey(treasuryId: string): string {
  return `treasury-wallet:${ZCASH_NETWORK}:${treasuryId}`
}

let initializedKey: string | null = null
// A Rust panic leaves the wasm wallet unusable ("recursive use of an object"
// on every later call). Start a fresh worker from the saved state instead.
let crashed = false
const CRASH = /wallet crashed|recursive use of an object/i

/** A call on the open wallet, restarting it first if it crashed. */
async function walletCall<T>(
  type: string,
  data?: Record<string, unknown>,
  onStart?: () => void
): Promise<T> {
  if (crashed && initializedKey) {
    const savedState = await get<Uint8Array>(initializedKey)
    if (!savedState)
      throw new Error("The wallet crashed and has no saved state")
    await callWorker("fromBytes", {
      lightwalletdUrl: LIGHTWALLETD_URL,
      savedState,
      network: ZCASH_NETWORK,
    })
    crashed = false
    console.warn("[zcash-wallet] Restarted the wallet after a crash")
  }
  try {
    return await callWorker<T>(type, data, undefined, onStart)
  } catch (err) {
    if (err instanceof Error && CRASH.test(err.message)) {
      console.error("[zcash-wallet]", err.message)
      crashed = true
      terminateWorker()
    }
    throw err
  }
}

async function dropStaleState(): Promise<void> {
  const savedVersion = await get<number>(WALLET_VERSION_KEY)
  if (savedVersion === WALLET_VERSION) return
  console.log("[zcash-wallet] Wallet version changed, clearing stale state")
  const { keys } = await import("idb-keyval")
  for (const key of await keys()) {
    if (typeof key === "string" && key.startsWith("treasury-wallet:")) {
      await del(key)
    }
  }
  await del(LEGACY_STATE_KEY)
  await set(WALLET_VERSION_KEY, WALLET_VERSION)
}

/** Whether this browser already holds the treasury's wallet state. */
export async function hasSavedWallet(storageKey: string): Promise<boolean> {
  await dropStaleState()
  return (await get<Uint8Array>(storageKey)) !== undefined
}

/**
 * Open the treasury wallet: from this browser's saved state when there is
 * one, otherwise from the viewing key the coordinator just unlocked.
 */
export async function initializeWallet(
  storageKey: string,
  viewing: { ufvk: string; birthdayHeight: number } | null
): Promise<void> {
  if (initializedKey === storageKey) return
  await dropStaleState()

  const savedState = await get<Uint8Array>(storageKey)
  if (savedState) {
    try {
      await callWorker("fromBytes", {
        lightwalletdUrl: LIGHTWALLETD_URL,
        savedState,
        network: ZCASH_NETWORK,
      })
      initializedKey = storageKey
      return
    } catch (e) {
      console.warn("[zcash-wallet] Failed to restore, creating new:", e)
      await del(storageKey)
    }
  }

  if (!viewing) throw new Error("Unlock the treasury to load its wallet")
  await callWorker("create", {
    lightwalletdUrl: LIGHTWALLETD_URL,
    ufvk: viewing.ufvk,
    birthdayHeight: viewing.birthdayHeight,
    network: ZCASH_NETWORK,
  })
  initializedKey = storageKey
  await persist()
}

async function persist(): Promise<void> {
  if (!initializedKey) return
  try {
    const bytes = await walletCall<Uint8Array>("toBytes")
    await set(initializedKey, bytes)
  } catch (e) {
    console.warn("[zcash-wallet] Failed to persist wallet state:", e)
  }
}

export async function syncWallet(
  onProgress?: (scannedHeight: number, chainTipHeight: number) => void
): Promise<SyncSummary> {
  if (!initializedKey) throw new Error("Wallet not initialized")
  setProgressListener(onProgress ?? null)
  try {
    return await walletCall<SyncSummary>("sync")
  } finally {
    setProgressListener(null)
    await persist()
  }
}

export async function getBalance(): Promise<BalanceInfo> {
  if (!initializedKey) return { spendable: 0, pending: 0, total: 0 }
  return walletCall<BalanceInfo>("getBalance")
}

export async function getSentTransactions(): Promise<SentTransaction[]> {
  if (!initializedKey) return []
  return walletCall<SentTransaction[]>("getSentTransactions")
}

/**
 * Build the unsigned, unproven PCZT paying a ZIP-321 request from the
 * treasury, valid until `expiryDelta` blocks past the chain tip.
 */
export async function createPczt(
  paymentRequest: string,
  expiryDelta: number
): Promise<Uint8Array> {
  if (!initializedKey) throw new Error("Wallet not initialized")
  const pczt = await walletCall<Uint8Array>("createPczt", {
    paymentRequest,
    expiryDelta,
  })
  // Building a PCZT can record wallet metadata; keep it.
  await persist()
  return pczt
}

/**
 * Extract the transaction from a proven, fully signed PCZT and record it in
 * the wallet; sending it is up to the caller. `onStart` fires once a running
 * sync is out of the way.
 */
export async function extractTransaction(
  pczt: Uint8Array,
  onStart?: () => void
): Promise<{ txid: string; raw: Uint8Array }> {
  if (!initializedKey) throw new Error("Wallet not initialized")
  const extracted = await walletCall<{ txid: string; raw: Uint8Array }>(
    "extractTransaction",
    { pczt },
    onStart
  )
  await persist()
  return extracted
}

/** Default shielded unified address of a UFVK. */
export async function deriveUnifiedAddress(ufvk: string): Promise<string> {
  return callWorker<string>("fn", {
    name: "deriveUnifiedAddress",
    args: [ufvk, ZCASH_NETWORK],
  })
}

export function isInitialized(): boolean {
  return initializedKey !== null
}

/** Forget every treasury wallet in this browser, e.g. on logout. */
export async function clearWalletState(): Promise<void> {
  const { keys } = await import("idb-keyval")
  for (const key of await keys()) {
    if (typeof key === "string" && key.startsWith("treasury-wallet:")) {
      await del(key)
    }
  }
  await del(LEGACY_STATE_KEY)
  initializedKey = null
  crashed = false
  terminateWorker()
}
