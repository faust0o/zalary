import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

interface DemoContextType {
  promptLogin: () => void
  authModalOpen: boolean
  setAuthModalOpen: (open: boolean) => void
}

const DemoContext = createContext<DemoContextType | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const promptLogin = useCallback(() => setAuthModalOpen(true), [])

  return (
    <DemoContext.Provider value={{ promptLogin, authModalOpen, setAuthModalOpen }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error("useDemo must be used within DemoProvider")
  return ctx
}
