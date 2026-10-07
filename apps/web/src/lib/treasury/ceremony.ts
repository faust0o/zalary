/**
 * The key ceremony: FROST DKG among every treasury member, relayed by frostd.
 * Each member's browser runs this while they are in the ceremony room; the
 * state is in memory, so a member who leaves mid-way means starting over.
 */
import { FrostDkgSession } from "../frost"
import { FrostdClient } from "../frostd"
import type { VaultKeys } from "../vault"

export interface KeygenResult {
  identifier: string
  keyPackage: string
  publicKeyPackage: string
  groupPublicKey: string
}

const POLL_MS = 1500

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted)
      return reject(new DOMException("Aborted", "AbortError"))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true }
    )
  })
}

function sameMembers(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join()
}

/** Open the ceremony's frostd session. Done by the coordinator. */
export async function openCeremonySession(
  keys: VaultKeys,
  participants: string[]
): Promise<string> {
  const client = new FrostdClient(keys.commsSecret, keys.commsPublicKey)
  try {
    return await client.createSession(participants, 1)
  } finally {
    await client.logout().catch(() => {})
  }
}

export async function runKeyCeremony(opts: {
  keys: VaultKeys
  sessionId: string
  /** Every member's comms key, including this member's. */
  participants: string[]
  threshold: number
  signal: AbortSignal
  onProgress?: (received: number) => void
}): Promise<KeygenResult> {
  const { keys, sessionId, participants, threshold, signal } = opts
  const client = new FrostdClient(keys.commsSecret, keys.commsPublicKey)
  await client.login()

  // frostd must route between exactly the members Zalary shows.
  const info = await client.sessionInfo(sessionId)
  if (!sameMembers(info.pubkeys, participants)) {
    throw new Error(
      "The relay session doesn't match the treasury's members. Ask the coordinator to restart the ceremony."
    )
  }

  const dkg = new FrostDkgSession(
    keys.commsSecret,
    sessionId,
    participants,
    threshold
  )
  const send = async (out: { recipient: string; msg: Uint8Array }[]) => {
    for (const { recipient, msg } of out) {
      await client.send(sessionId, [recipient], msg)
    }
  }

  try {
    await send(await dkg.start())
    let received = 0
    while (!(await dkg.isComplete())) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError")
      const msgs = await client.receive(sessionId, false)
      for (const { sender, msg } of msgs) {
        await send(await dkg.receive(sender, msg))
        opts.onProgress?.(++received)
      }
      if (msgs.length === 0) await sleep(POLL_MS, signal)
    }
    return await dkg.result()
  } finally {
    await dkg.free().catch(() => {})
    await client.logout().catch(() => {})
  }
}

/** Best effort: drop the ceremony's relay session once everyone is done. */
export async function closeCeremonySession(
  keys: VaultKeys,
  sessionId: string
): Promise<void> {
  const client = new FrostdClient(keys.commsSecret, keys.commsPublicKey)
  try {
    await client.closeSession(sessionId)
  } catch {
    // Already gone or expired
  } finally {
    await client.logout().catch(() => {})
  }
}

/**
 * Ceremony runs outlive the components showing them: a DKG can't be resumed
 * or restarted within its session, so remounting the ceremony room (or React
 * StrictMode's rehearsal unmount) must not abort it. Only a restart does.
 */
export interface CeremonyRun {
  received: number
  error: string | null
}

const runs = new Map<string, CeremonyRun & { abort: AbortController }>()
const runListeners = new Set<() => void>()

function updateRun(sessionId: string, patch: Partial<CeremonyRun>) {
  const run = runs.get(sessionId)
  if (!run) return
  runs.set(sessionId, { ...run, ...patch })
  runListeners.forEach((listener) => listener())
}

export function subscribeCeremonyRuns(listener: () => void): () => void {
  runListeners.add(listener)
  return () => runListeners.delete(listener)
}

export function ceremonyRun(sessionId: string | null | undefined) {
  return sessionId ? runs.get(sessionId) : undefined
}

/** Start this browser's part of a session, unless it already started. */
export function startCeremonyRun(
  sessionId: string,
  run: (opts: {
    signal: AbortSignal
    onProgress: (received: number) => void
  }) => Promise<void>,
  describeError: (err: unknown) => string
): void {
  if (runs.has(sessionId)) return
  const abort = new AbortController()
  runs.set(sessionId, { received: 0, error: null, abort })
  runListeners.forEach((listener) => listener())
  run({
    signal: abort.signal,
    onProgress: (received) => updateRun(sessionId, { received }),
  }).catch((err) => {
    if (err instanceof DOMException && err.name === "AbortError") return
    console.error("[treasury] key ceremony failed", err)
    updateRun(sessionId, { error: describeError(err) })
  })
}

/** Stop every run except the given session's, e.g. after a restart. */
export function abortCeremonyRuns(keep?: string | null): void {
  for (const [sessionId, run] of runs) {
    if (sessionId === keep) continue
    run.abort.abort()
    runs.delete(sessionId)
  }
  runListeners.forEach((listener) => listener())
}

/** Record a failure that happened after the run itself, e.g. activation. */
export function failCeremonyRun(sessionId: string, error: string): void {
  updateRun(sessionId, { error })
}
