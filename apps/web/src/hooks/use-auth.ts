import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { createElement } from "react"
import { apolloClient } from "../lib/apollo"
import { tribe } from "../lib/tribe"
import { clearWalletState } from "../lib/zcash-wallet"

interface User {
  id: string
  email?: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: () => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  loginWithSocial: (provider: "google" | "discord" | "twitter") => void
  register: (email: string, password: string) => Promise<User>
  registerPasskey: (deviceName?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tribe
      .getSession()
      .then((session) => {
        setUser(session?.user ?? null)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const login = useCallback(async () => {
    const { user } = await tribe.loginWithPasskey()
    setUser(user)
  }, [])

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const { user } = await tribe.login(email, password)
    setUser(user)
  }, [])

  const loginWithSocial = useCallback((provider: "google" | "discord" | "twitter") => {
    tribe.redirectToSocialLogin(provider, {
      redirectUrl: window.location.origin + "/login",
    })
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const { user } = await tribe.register(email, password)
    setUser(user)
    return user
  }, [])

  const registerPasskey = useCallback(async (deviceName?: string) => {
    await tribe.registerPasskey(deviceName)
  }, [])

  const logout = useCallback(async () => {
    await clearWalletState()
    await apolloClient.clearStore()
    await tribe.logout()
    setUser(null)
  }, [])

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        loading,
        login,
        loginWithEmail,
        loginWithSocial,
        register,
        registerPasskey,
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
