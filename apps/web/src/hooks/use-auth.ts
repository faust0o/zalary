import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { createElement } from "react"
import {
  AcceptDelegateInviteDocument,
  LoginDocument,
  MeDocument,
  RegisterDocument,
} from "../graphql/__generated__/graphql"
import { apolloClient } from "../lib/apollo"
import { clearWalletState } from "../lib/zcash-wallet"
import {
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from "../lib/session"

interface User {
  id: string
  username: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  acceptInvite: (
    token: string,
    name: string,
    username: string,
    password: string
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function establishSession(token: string, user: User) {
  setSessionToken(token)
  await apolloClient.clearStore()
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    apolloClient
      .query({ query: MeDocument, fetchPolicy: "network-only" })
      .then((result) => {
        if (cancelled) return
        const me = result.data?.me
        if (me) {
          setUser(me)
        } else {
          clearSessionToken()
          setUser(null)
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await apolloClient.mutate({
      mutation: LoginDocument,
      variables: { username, password },
    })
    const payload = result.data?.login
    if (!payload) throw new Error("Login failed")
    setUser(await establishSession(payload.token, payload.user))
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    const result = await apolloClient.mutate({
      mutation: RegisterDocument,
      variables: { username, password },
    })
    const payload = result.data?.register
    if (!payload) throw new Error("Registration failed")
    setUser(await establishSession(payload.token, payload.user))
  }, [])

  const acceptInvite = useCallback(
    async (token: string, name: string, username: string, password: string) => {
      const result = await apolloClient.mutate({
        mutation: AcceptDelegateInviteDocument,
        variables: { token, name, username, password },
      })
      const payload = result.data?.acceptDelegateInvite
      if (!payload) throw new Error("Could not accept invite")
      setUser(await establishSession(payload.token, payload.user))
    },
    []
  )

  const logout = useCallback(async () => {
    await clearWalletState()
    await apolloClient.clearStore()
    clearSessionToken()
    setUser(null)
  }, [])

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        loading,
        login,
        register,
        acceptInvite,
        logout,
      },
    },
    children
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
