import express, { type Router } from "express"
import { authenticate } from "./context.js"

// frostd's API (frost-tools/frostd/src/lib.rs). Everything is a JSON POST.
const ENDPOINTS = new Set([
  "challenge",
  "login",
  "logout",
  "create_new_session",
  "list_sessions",
  "get_session_info",
  "send",
  "receive",
  "close_session",
])

// frostd caps a message at 65535 bytes, which travels hex-encoded.
const BODY_LIMIT = "512kb"
const UPSTREAM_TIMEOUT_MS = 15_000

/**
 * Same-origin relay to frostd, which has no CORS support and stays on the
 * private network. Callers need a Zalary login (in X-Zalary-Auth) so the relay
 * isn't open to the internet; frostd's own bearer token, from its
 * challenge/login handshake, passes through in Authorization. Messages are
 * end-to-end encrypted between members, so this server can't read them.
 */
export function frostdProxy(frostdUrl: string): Router {
  const base = frostdUrl.replace(/\/+$/, "")
  const router = express.Router()

  router.post(
    "/:endpoint",
    express.json({ limit: BODY_LIMIT }),
    async (req, res) => {
      const endpoint = String(req.params.endpoint)
      if (!ENDPOINTS.has(endpoint)) {
        res.status(404).json({ msg: "Unknown frostd endpoint" })
        return
      }

      const session = await authenticate(req.header("x-zalary-auth"))
      if (!session) {
        res.status(401).json({ msg: "Sign in to Zalary first" })
        return
      }

      try {
        const authorization = req.header("authorization")
        const upstream = await fetch(`${base}/${endpoint}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(authorization ? { authorization } : {}),
          },
          body: JSON.stringify(req.body ?? {}),
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        })
        res.status(upstream.status)
        const contentType = upstream.headers.get("content-type")
        if (contentType) res.setHeader("content-type", contentType)
        res.send(Buffer.from(await upstream.arrayBuffer()))
      } catch (err) {
        console.error(`[frostd] ${endpoint} failed:`, err)
        res.status(502).json({ msg: "The FROST relay is unreachable" })
      }
    }
  )

  return router
}
