/**
 * Client for ZF's frostd relay (frost-tools/frostd), reached through the
 * Zalary server's same-origin /frostd proxy. The proxy wants the Zalary
 * session in X-Zalary-Auth; frostd's own token rides in Authorization.
 *
 * frostd only routes opaque bytes between comms keys. Payloads are Noise
 * encrypted end to end before they get here.
 */
import { fromHex, toHex } from "./bytes"
import { frostdSignChallenge } from "./frost"
import { getSessionToken } from "./session"

function frostdBaseUrl(): string {
  if (import.meta.env.VITE_FROSTD_URL) return import.meta.env.VITE_FROSTD_URL
  // Next to the GraphQL endpoint, wherever that is served from.
  const graphql = import.meta.env.VITE_GRAPHQL_URL || "/graphql"
  return new URL("/frostd", new URL(graphql, window.location.origin)).toString()
}

// frost-client's api.rs error codes
const UNAUTHORIZED = 2
const SESSION_NOT_FOUND = 3
// The server gives up on frostd after 15s; this covers the hop to the server.
const REQUEST_TIMEOUT_MS = 30_000

export class FrostdError extends Error {
  readonly code: number | null

  constructor(message: string, code: number | null) {
    super(message)
    this.code = code
  }

  get sessionGone(): boolean {
    return this.code === SESSION_NOT_FOUND
  }
}

export interface FrostdMessage {
  sender: string
  msg: Uint8Array
}

export interface FrostdSessionInfo {
  messageCount: number
  pubkeys: string[]
  coordinatorPubkey: string
}

export class FrostdClient {
  private readonly secret: Uint8Array
  readonly publicKey: string
  private accessToken: string | null = null

  constructor(secret: Uint8Array, publicKey: string) {
    this.secret = secret
    this.publicKey = publicKey
  }

  private async post<T>(
    endpoint: string,
    body: unknown,
    authenticated = true,
    retried = false
  ): Promise<T> {
    if (authenticated && !this.accessToken) await this.login()

    let res: Response
    let text: string
    try {
      res = await fetch(`${frostdBaseUrl()}/${endpoint}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-zalary-auth": getSessionToken() ?? "",
          ...(authenticated && this.accessToken
            ? { authorization: `Bearer ${this.accessToken}` }
            : {}),
        },
        body: JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      text = await res.text()
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new FrostdError(
          `The FROST relay didn't answer (${endpoint}).`,
          null
        )
      }
      throw err
    }
    let data: unknown = undefined
    try {
      data = text ? JSON.parse(text) : undefined
    } catch {
      // frostd answers plain text for malformed requests
    }

    if (!res.ok) {
      const error = data as { code?: number; msg?: string } | undefined
      // Access tokens last an hour; log in again once and retry.
      if (authenticated && error?.code === UNAUTHORIZED && !retried) {
        this.accessToken = null
        return this.post(endpoint, body, authenticated, true)
      }
      throw new FrostdError(
        error?.msg ?? (text || `FROST relay error ${res.status}`),
        error?.code ?? null
      )
    }
    return data as T
  }

  /** Prove ownership of the comms key and get an access token. */
  async login(): Promise<void> {
    const { challenge } = await this.post<{ challenge: string }>(
      "challenge",
      {},
      false
    )
    const signature = await frostdSignChallenge(this.secret, challenge)
    const { access_token } = await this.post<{ access_token: string }>(
      "login",
      { challenge, pubkey: this.publicKey, signature },
      false
    )
    this.accessToken = access_token
  }

  async createSession(
    pubkeys: string[],
    messageCount: number
  ): Promise<string> {
    const { session_id } = await this.post<{ session_id: string }>(
      "create_new_session",
      { pubkeys, message_count: messageCount }
    )
    return session_id
  }

  async listSessions(): Promise<string[]> {
    const { session_ids } = await this.post<{ session_ids: string[] }>(
      "list_sessions",
      {}
    )
    return session_ids
  }

  async sessionInfo(sessionId: string): Promise<FrostdSessionInfo> {
    const info = await this.post<{
      message_count: number
      pubkeys: string[]
      coordinator_pubkey: string
    }>("get_session_info", { session_id: sessionId })
    return {
      messageCount: info.message_count,
      pubkeys: info.pubkeys,
      coordinatorPubkey: info.coordinator_pubkey,
    }
  }

  /** Send to the given participants, or to the coordinator if none. */
  async send(
    sessionId: string,
    recipients: string[],
    msg: Uint8Array
  ): Promise<void> {
    await this.post("send", {
      session_id: sessionId,
      recipients,
      msg: toHex(msg),
    })
  }

  /** Drain this inbox: frostd forgets messages once they're received. */
  async receive(
    sessionId: string,
    asCoordinator: boolean
  ): Promise<FrostdMessage[]> {
    const { msgs } = await this.post<{
      msgs: { sender: string; msg: string }[]
    }>("receive", { session_id: sessionId, as_coordinator: asCoordinator })
    return msgs.map((m) => ({ sender: m.sender, msg: fromHex(m.msg) }))
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.post("close_session", { session_id: sessionId })
  }

  async logout(): Promise<void> {
    if (!this.accessToken) return
    try {
      await this.post("logout", {})
    } finally {
      this.accessToken = null
    }
  }
}
