/**
 * The one Web Worker running the zcash-view-wasm module: the treasury's
 * view-only wallet plus the FROST, Noise and PCZT functions.
 */

let worker: Worker | null = null
let nextId = 1
const pending = new Map<
  number,
  {
    resolve: (v: unknown) => void
    reject: (e: Error) => void
    onStart?: () => void
  }
>()
let onProgress: ((scanned: number, tip: number) => void) | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./zcash-wallet.worker.ts", import.meta.url), {
      type: "module",
    })
    worker.onmessage = (e) => {
      const msg = e.data
      // Sync progress updates carry no id
      if (msg.type === "progress") {
        onProgress?.(msg.scanned, msg.tip)
        return
      }
      if (msg.type === "started") {
        pending.get(msg.id)?.onStart?.()
        return
      }
      const entry = pending.get(msg.id)
      if (!entry) return
      pending.delete(msg.id)
      if (msg.error) entry.reject(new Error(msg.error))
      else entry.resolve(msg.result)
    }
  }
  return worker
}

/**
 * Run a worker call. Wallet calls queue behind each other (a sync can take a
 * while); `onStart` fires when this one's turn comes.
 */
export function callWorker<T>(
  type: string,
  data?: Record<string, unknown>,
  transfer?: Transferable[],
  onStart?: () => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, {
      resolve: resolve as (v: unknown) => void,
      reject,
      onStart,
    })
    getWorker().postMessage({ id, type, ...data }, { transfer: transfer ?? [] })
  })
}

export function setProgressListener(
  listener: ((scanned: number, tip: number) => void) | null
): void {
  onProgress = listener
}

export function terminateWorker(): void {
  if (!worker) return
  worker.terminate()
  worker = null
  for (const entry of pending.values()) {
    entry.reject(new Error("Wallet worker stopped"))
  }
  pending.clear()
}
