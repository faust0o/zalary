import { del, get, set } from "idb-keyval"

const LIGHTWALLETD_URL =
  import.meta.env.VITE_LIGHTWALLETD_URL ??
  "https://zcash-mainnet.chainsafe.dev"

const IDB_KEY = "zcash-wallet-state"
const WALLET_VERSION_KEY = "zcash-wallet-version"
const WALLET_VERSION = 21

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

// --- Worker communication ---

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
let onProgressCallback: ((scanned: number, tip: number) => void) | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("./zcash-wallet.worker.ts", import.meta.url),
      { type: "module" }
    )
    worker.onmessage = (e) => {
      const msg = e.data
      // Progress updates (no id)
      if (msg.type === "progress") {
        onProgressCallback?.(msg.scanned, msg.tip)
        return
      }
      // RPC responses
      const entry = pending.get(msg.id)
      if (!entry) return
      pending.delete(msg.id)
      if (msg.error) {
        entry.reject(new Error(msg.error))
      } else {
        entry.resolve(msg.result)
      }
    }
  }
  return worker
}

function call(type: string, data?: Record<string, unknown>, transfer?: Transferable[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, type, ...data }, { transfer: transfer ?? [] })
  })
}

// --- Public API (unchanged interface, now backed by worker) ---

let initialized = false

export async function initializeWallet(
  ufvk: string,
  birthdayHeight: number
): Promise<void> {
  console.log("[zcash-wallet] Initializing wallet in worker...")

  // Clear stale data if wallet version changed
  const savedVersion = await get<number>(WALLET_VERSION_KEY)
  if (savedVersion !== WALLET_VERSION) {
    console.log("[zcash-wallet] Wallet version changed, clearing stale state")
    await del(IDB_KEY)
    await set(WALLET_VERSION_KEY, WALLET_VERSION)
  }

  // Try restoring from IndexedDB
  const savedState = await get<Uint8Array>(IDB_KEY)
  if (savedState) {
    try {
      console.log("[zcash-wallet] Restoring from IndexedDB...")
      await call("fromBytes", { lightwalletdUrl: LIGHTWALLETD_URL, savedState })
      initialized = true
      console.log("[zcash-wallet] Restored successfully")
      return
    } catch (e) {
      console.warn("[zcash-wallet] Failed to restore, creating new:", e)
      await del(IDB_KEY)
    }
  }

  console.log("[zcash-wallet] Creating new wallet at birthday height", birthdayHeight)
  await call("create", { lightwalletdUrl: LIGHTWALLETD_URL, ufvk, birthdayHeight })
  initialized = true
  console.log("[zcash-wallet] Wallet created successfully")
}

export async function syncWallet(
  onProgress?: (scannedHeight: number, chainTipHeight: number) => void
): Promise<SyncSummary> {
  if (!initialized) throw new Error("Wallet not initialized")

  onProgressCallback = onProgress ?? null
  console.log("[zcash-wallet] Starting sync in worker...")
  const summary = (await call("sync")) as SyncSummary
  onProgressCallback = null
  console.log("[zcash-wallet] Sync complete:", summary)

  // Persist to IndexedDB
  try {
    const bytes = (await call("toBytes")) as Uint8Array
    await set(IDB_KEY, bytes)
  } catch (e) {
    console.warn("[zcash-wallet] Failed to persist wallet state:", e)
  }

  return summary
}

export async function getBalance(): Promise<BalanceInfo> {
  if (!initialized) return { spendable: 0, pending: 0, total: 0 }
  return (await call("getBalance")) as BalanceInfo
}

export async function getSentTransactions(): Promise<SentTransaction[]> {
  if (!initialized) return []
  return (await call("getSentTransactions")) as SentTransaction[]
}

/** Derive the default shielded unified address of the UFVK. */
export async function deriveUnifiedAddress(ufvk: string): Promise<string> {
  return (await call("deriveAddress", { ufvk })) as string
}

export function isInitialized(): boolean {
  return initialized
}

export async function clearWalletState(): Promise<void> {
  await del(IDB_KEY)
  initialized = false
  if (worker) {
    worker.terminate()
    worker = null
  }
}
