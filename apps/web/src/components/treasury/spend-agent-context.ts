import { createContext, useContext } from "react"
import type { CoordinatorProgress } from "../../lib/treasury/spend"

export interface SpendActivity {
  progress?: CoordinatorProgress
  /** For signers: still waiting for the coordinator's signing package. */
  waitingForPackage?: boolean
  /** The coordinator's step in progress, e.g. "Sending the transaction". */
  stage?: string
  stageSince?: number
  error?: string
}

export interface SpendAgentContextType {
  activity: Record<string, SpendActivity>
  /** Run a pass now, e.g. right after approving. */
  poke: () => void
  /** A spend is waiting for this user's passkey. */
  needsUnlock: boolean
}

export const SpendAgentContext = createContext<SpendAgentContextType>({
  activity: {},
  poke: () => {},
  needsUnlock: false,
})

export function useSpendAgent() {
  return useContext(SpendAgentContext)
}
