import { ApolloServer } from "@apollo/server"
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled"
import { expressMiddleware } from "@as-integrations/express5"
import cors from "cors"
import express from "express"
import { existsSync } from "fs"
import { dirname, extname, join } from "path"
import { fileURLToPath } from "url"
import { createContext } from "./context.js"
import { frostdProxy } from "./frostd-proxy.js"
import { liveReload } from "./live-reload.js"
import { schema } from "./schema/index.js"

// src/index.ts and dist/index.js are both two levels below apps/web/dist.
const webDist =
  process.env.WEB_DIST ||
  join(dirname(fileURLToPath(import.meta.url)), "../../web/dist")

const app = express()
const port = process.env.PORT || 4000

if (!process.env.AUTH_SECRET) {
  console.warn(
    "AUTH_SECRET is not set. Username/password login will fail until it is configured."
  )
}

const isProduction = process.env.NODE_ENV === "production"

const server = new ApolloServer({
  schema,
  introspection: !isProduction,
  plugins: [ApolloServerPluginLandingPageDisabled()],
  csrfPrevention: false,
})

await server.start()

// Required for the in-browser Zcash WASM wallet (SharedArrayBuffer).
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless")
  next()
})

const corsOptions = cors<cors.CorsRequest>({
  origin: process.env.CORS_ORIGIN || "http://localhost:4000",
  credentials: true,
})

app.use(
  "/graphql",
  corsOptions,
  // Spend proposals carry a proven PCZT.
  express.json({ limit: "8mb" }),
  expressMiddleware(server, {
    context: async ({ req }) => createContext({ req }),
  })
)

if (process.env.FROSTD_URL) {
  app.use("/frostd", corsOptions, frostdProxy(process.env.FROSTD_URL))
} else {
  console.warn(
    "FROSTD_URL is not set. Treasury key ceremonies and signing will fail until it is configured."
  )
}

// `bun run dev` at the repo root rebuilds the web app into webDist on every
// change; open pages then reload themselves.
const serveIndex =
  process.env.LIVE_RELOAD === "1" ? liveReload(app, webDist) : null

if (serveIndex || existsSync(webDist)) {
  // In live-reload mode index.html always goes through serveIndex.
  app.use(express.static(webDist, { index: serveIndex ? false : "index.html" }))
  // Client-side routes (e.g. /dashboard) fall through to the SPA shell.
  // Requests for a missing file keep a real 404.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next()
    if (req.path.startsWith("/graphql") || req.path.startsWith("/frostd")) {
      return next()
    }
    if (extname(req.path)) return next()
    if (serveIndex) {
      serveIndex(res).catch(next)
      return
    }
    res.sendFile(join(webDist, "index.html"), (err) => {
      if (err) next(err)
    })
  })
} else {
  console.warn(
    `Web build not found at ${webDist}. Run \`bun run build\` in apps/web.`
  )
}

app.listen(port, () => {
  console.log(`App ready at http://localhost:${port}/`)
  console.log(`GraphQL ready at http://localhost:${port}/graphql`)
})
