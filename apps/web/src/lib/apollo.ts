import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client"
import { setContext } from "@apollo/client/link/context"
import { tribe } from "./tribe"

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || "http://localhost:4000/graphql",
})

const authLink = setContext((_, { headers }) => {
  // Send the userToken (JWT signed with TRIBE_KEY) for backend verification
  const userToken = tribe.getUserToken()
  return {
    headers: {
      ...headers,
      ...(userToken ? { authorization: `Bearer ${userToken}` } : {}),
    },
  }
})

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
})
