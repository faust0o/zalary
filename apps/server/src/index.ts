import express from "express"
import cors from "cors"
import { ApolloServer } from "@apollo/server"
import { expressMiddleware } from "@as-integrations/express5"
import { schema } from "./schema/index.js"
import { createContext } from "./context.js"

const app = express()
const port = process.env.PORT || 4000

const server = new ApolloServer({ schema })

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
