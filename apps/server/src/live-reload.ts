import type { Express, Response } from "express"
import { watchFile } from "fs"
import { readFile } from "fs/promises"
import { join } from "path"

const ENDPOINT = "/__live-reload"
// Rebuilds write many files; wait for the burst to finish before reloading.
const SETTLE_MS = 300

const CLIENT = `<script>(() => {
  const events = new EventSource("${ENDPOINT}")
  events.onmessage = () => location.reload()
})()</script>`

const BUILDING = `<!doctype html><html><head><meta charset="utf-8"><title>Zalary</title></head>
<body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;color:#666">
Building the web app…${CLIENT}</body></html>`

/**
 * Dev only: reload open pages whenever the web build in `webDist` changes.
 * Vite rewrites index.html on every rebuild, so its mtime is the signal.
 * Returns a handler that serves index.html with the reload client injected.
 */
export function liveReload(
  app: Express,
  webDist: string
): (res: Response) => Promise<void> {
  const clients = new Set<Response>()

  app.get(ENDPOINT, (req, res) => {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    })
    res.write(": connected\n\n")
    clients.add(res)
    req.on("close", () => clients.delete(res))
  })

  // Keep idle connections from timing out.
  setInterval(() => {
    for (const client of clients) client.write(": ping\n\n")
  }, 25_000).unref()

  const index = join(webDist, "index.html")
  let timer: NodeJS.Timeout | undefined
  watchFile(index, { interval: 250 }, (current, previous) => {
    if (current.mtimeMs === 0 || current.mtimeMs === previous.mtimeMs) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      console.log(
        `[live-reload] web rebuilt, reloading ${clients.size} page(s)`
      )
      for (const client of clients) client.write("data: reload\n\n")
    }, SETTLE_MS)
  })

  return async (res) => {
    res.setHeader("cache-control", "no-store")
    try {
      const html = await readFile(index, "utf8")
      res.type("html").send(html.replace("</body>", `${CLIENT}</body>`))
    } catch {
      // First build still running; this page reloads once it's done.
      res.status(503).type("html").send(BUILDING)
    }
  }
}
