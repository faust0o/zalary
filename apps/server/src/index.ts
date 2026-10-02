import { ApolloServer } from "@apollo/server"
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled"
import { expressMiddleware } from "@as-integrations/express5"
import cors from "cors"
import express from "express"
import { existsSync } from "fs"
import { dirname, extname, join } from "path"
import { fileURLToPath } from "url"
import { createContext } from "./context.js"
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

app.use(
  "/graphql",
  cors<cors.CorsRequest>({
    origin: process.env.CORS_ORIGIN || "http://localhost:4000",
    credentials: true,
  }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => createContext({ req }),
  })
)

if (existsSync(webDist)) {
  app.use(express.static(webDist))
  // Client-side routes (e.g. /dashboard) fall through to the SPA shell.
  // Requests for a missing file keep a real 404.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next()
    if (req.path.startsWith("/graphql")) return next()
    if (extname(req.path)) return next()
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
