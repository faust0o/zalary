/// Web Worker that runs the WASM wallet off the main thread.
/// Messages are queued and processed sequentially to prevent
/// concurrent access to the WASM wallet (which causes aliasing errors).

// Import the WASM module directly (--target web output, not through vite-plugin-wasm)
import initWasm, {
  ZcashViewWallet,
  deriveUnifiedAddress,
  initThreadPool,
} from "zcash-view-wasm/zcash_view_wasm.js"
// Import the WASM binary URL so Vite resolves it correctly
import wasmUrl from "zcash-view-wasm/zcash_view_wasm_bg.wasm?url"

let wallet: ZcashViewWallet | null = null

type Request =
  | { id: number; type: "create"; lightwalletdUrl: string; ufvk: string; birthdayHeight: number }
  | { id: number; type: "fromBytes"; lightwalletdUrl: string; savedState: Uint8Array }
  | { id: number; type: "sync" }
  | { id: number; type: "getBalance" }
  | { id: number; type: "getSentTransactions" }
  | { id: number; type: "toBytes" }
  | { id: number; type: "getChainTip" }
  | { id: number; type: "deriveAddress"; ufvk: string }

type QueuedRequest = Exclude<Request, { type: "deriveAddress" }>

// Sequential message queue
const queue: QueuedRequest[] = []
let processing = false
let wasmReady: Promise<void> | null = null

function ensureWasm() {
  wasmReady ??= (async () => {
    await initWasm({ module_or_path: wasmUrl })
    await initThreadPool(navigator.hardwareConcurrency || 4)
    console.log("[zcash-worker] WASM + thread pool initialized")
  })().catch((err) => {
    wasmReady = null
    throw err
  })
  return wasmReady
}

async function processQueue() {
  if (processing) return
  processing = true
  while (queue.length > 0) {
    const msg = queue.shift()!
    try {
      await handleMessage(msg)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      self.postMessage({ id: msg.id, error: message })
    }
  }
  processing = false
}

self.onmessage = (e: MessageEvent<Request>) => {
  // Address derivation doesn't touch wallet state, so it skips the queue
  // instead of waiting behind a potentially long sync.
  if (e.data.type === "deriveAddress") {
    const { id, ufvk } = e.data
    ensureWasm()
      .then(() => self.postMessage({ id, result: deriveUnifiedAddress(ufvk) }))
      .catch((err) =>
        self.postMessage({
          id,
          error: err instanceof Error ? err.message : String(err),
        })
      )
    return
  }
  queue.push(e.data)
  processQueue()
}

async function handleMessage(msg: QueuedRequest) {
  await ensureWasm()

  switch (msg.type) {
    case "create": {
      wallet = await ZcashViewWallet.create(
        msg.lightwalletdUrl,
        msg.ufvk,
        BigInt(msg.birthdayHeight)
      )
      self.postMessage({ id: msg.id, result: true })
      break
    }

    case "fromBytes": {
      wallet = await ZcashViewWallet.fromBytes(
        msg.lightwalletdUrl,
        msg.savedState
      )
      self.postMessage({ id: msg.id, result: true })
      break
    }

    case "sync": {
      if (!wallet) throw new Error("Wallet not initialized")
      const summary = await wallet.syncWithProgress(
        (scanned: number, tip: number) => {
          self.postMessage({ type: "progress", scanned, tip })
        }
      )
      self.postMessage({ id: msg.id, result: summary })
      break
    }

    case "getBalance": {
      if (!wallet) throw new Error("Wallet not initialized")
      const balance = wallet.getBalance()
      self.postMessage({ id: msg.id, result: balance })
      break
    }

    case "getSentTransactions": {
      if (!wallet) throw new Error("Wallet not initialized")
      const txs = wallet.getSentTransactions()
      self.postMessage({ id: msg.id, result: txs })
      break
    }

    case "toBytes": {
      if (!wallet) throw new Error("Wallet not initialized")
      const bytes = wallet.toBytes()
      // Transfer the buffer to avoid copying
      self.postMessage({ id: msg.id, result: bytes })
      break
    }

    case "getChainTip": {
      if (!wallet) throw new Error("Wallet not initialized")
      const tip = await wallet.getChainTip()
      self.postMessage({ id: msg.id, result: Number(tip) })
      break
    }
  }
}
