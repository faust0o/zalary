/// Web Worker that runs the WASM module off the main thread.
/// Wallet calls are queued and processed sequentially to prevent concurrent
/// access to the wallet (which causes aliasing errors). Everything else is
/// stateless or owns its own object, so it skips the queue instead of
/// waiting behind a potentially long sync.

// Import the WASM module directly (--target web output, not through vite-plugin-wasm)
import initWasm, * as wasm from "zcash-view-wasm/zcash_view_wasm.js"
import {
  FrostDkg,
  ZcashViewWallet,
  initThreadPool,
} from "zcash-view-wasm/zcash_view_wasm.js"
// Import the WASM binary URL so Vite resolves it correctly
import wasmUrl from "zcash-view-wasm/zcash_view_wasm_bg.wasm?url"

let wallet: ZcashViewWallet | null = null
const dkgs = new Map<number, FrostDkg>()
let nextDkg = 1

/** Free functions the main thread may call by name. */
const FUNCTIONS = new Set([
  "commsPublicKey",
  "frostdSignChallenge",
  "noiseEncrypt",
  "noiseDecrypt",
  "frostCommit",
  "frostBuildSigningPackage",
  "frostSign",
  "frostAggregate",
  "frostKeyPackageGroupKey",
  "treasuryViewingKey",
  "treasuryViewingKeyInfo",
  "treasuryChangeAddress",
  "provePczt",
  "pcztRedactForSigners",
  "pcztSummary",
  "pcztApplySignatures",
  "deriveUnifiedAddress",
  "getChainTip",
])

const DKG_METHODS = new Set([
  "identifier",
  "identifierOf",
  "start",
  "receive",
  "isComplete",
  "result",
])

type WalletRequest =
  | {
      id: number
      type: "create"
      lightwalletdUrl: string
      ufvk: string
      birthdayHeight: number
      network: string
    }
  | {
      id: number
      type: "fromBytes"
      lightwalletdUrl: string
      savedState: Uint8Array
      network: string
    }
  | { id: number; type: "sync" }
  | { id: number; type: "getBalance" }
  | { id: number; type: "getSentTransactions" }
  | { id: number; type: "toBytes" }
  | { id: number; type: "getChainTip" }
  | {
      id: number
      type: "createPczt"
      paymentRequest: string
      expiryDelta: number
    }
  | { id: number; type: "extractTransaction"; pczt: Uint8Array }
  | { id: number; type: "close" }

type Request =
  | WalletRequest
  | { id: number; type: "fn"; name: string; args: unknown[] }
  | {
      id: number
      type: "dkg.new"
      secret: Uint8Array
      sessionId: string
      participants: string[]
      minSigners: number
    }
  | {
      id: number
      type: "dkg.call"
      handle: number
      method: string
      args: unknown[]
    }
  | { id: number; type: "dkg.free"; handle: number }

// Prefix of errors after which the wasm instance must be replaced.
const WALLET_CRASHED = "The wallet crashed"

// Sequential wallet queue
const queue: WalletRequest[] = []
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

function reply(id: number, result: unknown) {
  // Hand over byte buffers instead of copying them (shared ones can't move).
  const transfer =
    result instanceof Uint8Array && result.buffer instanceof ArrayBuffer
      ? [result.buffer]
      : []
  self.postMessage({ id, result }, { transfer })
}

function fail(id: number, err: unknown) {
  let message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : String(err)
  // A Rust panic surfaces as an "unreachable" trap; report the panic itself.
  // The wallet can't be used after one (see zcash-wallet.ts).
  if (err instanceof WebAssembly.RuntimeError) {
    message = `${WALLET_CRASHED}: ${wasm.takeLastPanic() ?? message}`
  }
  self.postMessage({ id, error: message })
}

async function processQueue() {
  if (processing) return
  processing = true
  while (queue.length > 0) {
    const msg = queue.shift()!
    // Its turn came: callers waiting behind a sync can say so until now.
    self.postMessage({ type: "started", id: msg.id })
    try {
      await handleWallet(msg)
    } catch (err) {
      fail(msg.id, err)
    }
  }
  processing = false
}

self.onmessage = (e: MessageEvent<Request>) => {
  const msg = e.data
  switch (msg.type) {
    case "fn":
    case "dkg.new":
    case "dkg.call":
    case "dkg.free":
      handleImmediate(msg).catch((err) => fail(msg.id, err))
      return
    default:
      queue.push(msg)
      processQueue()
  }
}

async function handleImmediate(
  msg: Exclude<Request, WalletRequest>
): Promise<void> {
  await ensureWasm()
  switch (msg.type) {
    case "fn": {
      if (!FUNCTIONS.has(msg.name))
        throw new Error(`Unknown function ${msg.name}`)
      const fn = (
        wasm as unknown as Record<string, (...a: unknown[]) => unknown>
      )[msg.name]
      reply(msg.id, await fn(...msg.args))
      return
    }
    case "dkg.new": {
      const handle = nextDkg++
      dkgs.set(
        handle,
        new FrostDkg(
          msg.secret,
          msg.sessionId,
          msg.participants,
          msg.minSigners
        )
      )
      reply(msg.id, handle)
      return
    }
    case "dkg.call": {
      const dkg = dkgs.get(msg.handle)
      if (!dkg) throw new Error("Key ceremony state is gone")
      if (!DKG_METHODS.has(msg.method))
        throw new Error(`Unknown method ${msg.method}`)
      const method = (
        dkg as unknown as Record<string, (...a: unknown[]) => unknown>
      )[msg.method]
      reply(msg.id, method.apply(dkg, msg.args))
      return
    }
    case "dkg.free": {
      dkgs.get(msg.handle)?.free()
      dkgs.delete(msg.handle)
      reply(msg.id, true)
      return
    }
  }
}

function requireWallet(): ZcashViewWallet {
  if (!wallet) throw new Error("Treasury wallet not initialized")
  return wallet
}

async function handleWallet(msg: WalletRequest) {
  await ensureWasm()

  switch (msg.type) {
    case "create": {
      wallet?.free()
      wallet = await ZcashViewWallet.create(
        msg.lightwalletdUrl,
        msg.ufvk,
        msg.birthdayHeight,
        msg.network
      )
      reply(msg.id, true)
      break
    }

    case "fromBytes": {
      wallet?.free()
      wallet = await ZcashViewWallet.fromBytes(
        msg.lightwalletdUrl,
        msg.savedState,
        msg.network
      )
      reply(msg.id, true)
      break
    }

    case "sync": {
      const summary = await requireWallet().syncWithProgress(
        (scanned: number, tip: number) => {
          self.postMessage({ type: "progress", scanned, tip })
        }
      )
      reply(msg.id, summary)
      break
    }

    case "getBalance":
      reply(msg.id, requireWallet().getBalance())
      break

    case "getSentTransactions":
      reply(msg.id, requireWallet().getSentTransactions())
      break

    case "toBytes":
      reply(msg.id, requireWallet().toBytes())
      break

    case "getChainTip":
      reply(msg.id, Number(await requireWallet().getChainTip()))
      break

    case "createPczt":
      reply(
        msg.id,
        await requireWallet().createPczt(msg.paymentRequest, msg.expiryDelta)
      )
      break

    case "extractTransaction":
      reply(msg.id, requireWallet().extractTransaction(msg.pczt))
      break

    case "close":
      wallet?.free()
      wallet = null
      reply(msg.id, true)
      break
  }
}
