import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { createElement } from "react"
import {
  initializeWallet,
  syncWallet,
  getBalance,
  getSentTransactions,
  isInitialized,
  type BalanceInfo,
  type SyncSummary,
  type SentTransaction,
} from "../lib/zcash-wallet"

interface ZcashWalletState {
  initialized: boolean
  syncing: boolean
  balance: BalanceInfo | null
  lastSyncedHeight: number | null
  chainTipHeight: number | null
  error: string | null
}

interface ZcashWalletContextType extends ZcashWalletState {
  sync: () => Promise<SyncSummary | null>
  getSentTxs: () => Promise<SentTransaction[]>
  syncProgress: number | null
}

const ZcashWalletContext = createContext<ZcashWalletContextType>({
  initialized: false,
  syncing: false,
  balance: null,
  lastSyncedHeight: null,
  chainTipHeight: null,
  error: null,
  sync: async () => null,
  getSentTxs: async () => [],
  syncProgress: null,
})

export function ZcashWalletProvider({
  ufvk,
  birthdayHeight: birthdayHeightProp,
  children,
}: {
  ufvk: string | null | undefined
  birthdayHeight: number | null | undefined
  children: ReactNode
}) {
  const [state, setState] = useState<ZcashWalletState>({
    initialized: false,
    syncing: false,
    balance: null,
    lastSyncedHeight: null,
    chainTipHeight: null,
    error: null,
  })
  const syncingRef = useRef(false)

  // Initialize wallet when UFVK becomes available
  useEffect(() => {
    if (!ufvk) { console.log("[zcash-wallet] Waiting for viewing key..."); return }
    if (!birthdayHeightProp) { console.log("[zcash-wallet] Waiting for birthday height..."); return }
    if (isInitialized()) return

    let cancelled = false

    async function init() {
      try {
        await initializeWallet(ufvk!, birthdayHeightProp!)
        if (!cancelled) {
          setState((s) => ({ ...s, initialized: true }))
        }
      } catch (e) {
        console.error("Failed to initialize wallet:", e)
        if (!cancelled) {
          setState((s) => ({
            ...s,
            error: e instanceof Error ? e.message : "Failed to init wallet",
          }))
        }
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [ufvk, birthdayHeightProp])

  const sync = useCallback(async (): Promise<SyncSummary | null> => {
    if (!isInitialized() || syncingRef.current) return null

    syncingRef.current = true
    setState((s) => ({ ...s, syncing: true }))

    try {
      const summary = await syncWallet((blocksScanned, totalToScan) => {
        setState((s) => ({
          ...s,
          lastSyncedHeight: blocksScanned,
          chainTipHeight: totalToScan,
        }))
      })
      setState((s) => ({
        ...s,
        syncing: false,
        balance: summary.balance,
        lastSyncedHeight: summary.fully_scanned_height,
        chainTipHeight: summary.chain_tip_height,
        error: null,
      }))
      return summary
    } catch (e) {
      console.error("Sync failed:", e)
      setState((s) => ({
        ...s,
        syncing: false,
        error: e instanceof Error ? e.message : "Sync failed",
      }))
      return null
    } finally {
      syncingRef.current = false
    }
  }, [])

  const getSentTxs = useCallback(async (): Promise<SentTransaction[]> => {
    return getSentTransactions()
  }, [])

  // Sync once on init — further syncs are triggered on-demand via sync()
  useEffect(() => {
    if (!state.initialized) return
    sync()
  }, [state.initialized, sync])

  // Read balance on init (from restored state, before first sync completes)
  useEffect(() => {
    if (state.initialized && !state.balance) {
      getBalance().then((balance) => {
        if (balance.total > 0) {
          setState((s) => ({ ...s, balance }))
        }
      })
    }
  }, [state.initialized, state.balance])

  const syncProgress =
    state.lastSyncedHeight != null && state.chainTipHeight != null && state.chainTipHeight > 0
      ? Math.min(100, Math.round((state.lastSyncedHeight / state.chainTipHeight) * 100))
      : null

  return createElement(
    ZcashWalletContext.Provider,
    { value: { ...state, sync, getSentTxs, syncProgress } },
    children
  )
}

export function useZcashWallet() {
  return useContext(ZcashWalletContext)
}
