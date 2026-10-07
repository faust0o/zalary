import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client"
import { setContext } from "@apollo/client/link/context"
import { getSessionToken } from "./session"

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || "/graphql",
})

const authLink = setContext((_, { headers }) => {
  const token = getSessionToken()
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
})

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      // Polls and refetches swap in new data without flipping `loading`, so
      // views only show their loading state while they have nothing yet.
      notifyOnNetworkStatusChange: false,
    },
  },
})
