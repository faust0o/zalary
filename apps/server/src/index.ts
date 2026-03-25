import { ApolloServer } from "@apollo/server"
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled"
import { expressMiddleware } from "@as-integrations/express5"
import cors from "cors"
import express from "express"
import { createContext } from "./context.js"
import { schema } from "./schema/index.js"

const app = express()
const port = process.env.PORT || 4000

const isProduction = process.env.NODE_ENV === "production"

const server = new ApolloServer({
  schema,
  introspection: !isProduction,
  plugins: [ApolloServerPluginLandingPageDisabled()],
  csrfPrevention: false,
})

await server.start()

app.use(
  "/graphql",
  cors<cors.CorsRequest>({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => createContext({ req }),
  })
)

app.listen(port, () => {
  console.log(`🚀 Server ready at http://localhost:${port}/graphql`)
})
