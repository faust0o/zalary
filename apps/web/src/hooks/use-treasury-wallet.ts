import { useMutation } from "@apollo/client/react"
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { ReportTreasuryBalanceDocument } from "../graphql/__generated__/graphql"
import { ACCOUNT_CONTEXT, openJson, sealJson } from "../lib/account-key"
import {
  openViewingKey,
  ViewingKeyNotShared,
} from "../lib/treasury/viewing-key"
import { unsealText, VAULT_CONTEXT } from "../lib/vault"
import {
  getBalance,
  getSentTransactions,
  hasSavedWallet,
  initializeWallet,
  syncWallet,
  walletStorageKey,
  type BalanceInfo,
  type SentTransaction,
  type SyncSummary,
} from "../lib/zcash-wallet"
import { ZAT_PER_ZEC } from "../lib/zcash-network"
import { useAccountData } from "./use-account-data"
import { useVault } from "./use-vault"

const RESYNC_INTERVAL_MS = 2 * 60_000
// Resyncs that only pick up the last few blocks happen quietly.
const CATCH_UP_BLOCKS = 20

export interface TreasuryWalletTreasury {
  id: string
  status: string
  address?: string | null
  changeAddress?: string | null
  birthdayHeight?: number | null
  encryptedViewingKey?: string | null
  isCoordinator: boolean
  /** Sealed under the account key; see SealedBalance. */
  sealedBalance?: string | null
  coordinator: { commsPublicKey?: string | null }
  myMembership?: {
    encryptedKeyPackage?: string | null
    viewingKeyMessage?: string | null
  } | null
}

/** What the coordinator's wallet last saw, for everyone else with access. */
interface SealedBalance {
  zat: string
  syncedHeight: number
  at: string
}

/**
 * Whether this browser checked the treasury's published addresses against the
 * viewing key and its own key share. Only signers can.
 */
export type AddressCheck = "unchecked" | "verified" | "failed"

interface WalletState {
  initialized: boolean
  syncing: boolean
  balance: BalanceInfo | null
  lastSyncedHeight: number | null
  chainTipHeight: number | null
  /** Where the running sync started scanning. */
  syncFrom: number | null
  error: string | null
  /** Bumped after every completed sync. */
  syncCount: number
}

interface TreasuryWalletContextType extends WalletState {
  /**
   * The treasury's shielded address. Withheld when this browser found it
   * doesn't belong to the treasury's key.
   */
  address: string | null
  addressCheck: AddressCheck
  addressError: string | null
  isCoordinator: boolean
  /**
   * The coordinator's browser has no copy of the treasury wallet yet and
   * needs the passkey to open the viewing key.
   */
  needsUnlock: boolean
  /** Live for the coordinator, otherwise the coordinator's last report. */
  displayBalance: number | null
  /** When the coordinator's wallet last reported the balance. */
  reportedAt: string | null
  /** Syncing with enough blocks to go that it's worth showing. */
  catchingUp: boolean
  /** Progress of a catch-up sync, in percent. */
  syncProgress: number | null
  sync: () => Promise<SyncSummary | null>
  getSentTxs: () => Promise<SentTransaction[]>
}

const initialState: WalletState = {
  initialized: false,
  syncing: false,
  balance: null,
  lastSyncedHeight: null,
  chainTipHeight: null,
  syncFrom: null,
  error: null,
  syncCount: 0,
}

const TreasuryWalletContext = createContext<TreasuryWalletContextType>({
  ...initialState,
  address: null,
  addressCheck: "unchecked",
  addressError: null,
  isCoordinator: false,
  needsUnlock: false,
  displayBalance: null,
  reportedAt: null,
  catchingUp: false,
  syncProgress: null,
  sync: async () => null,
  getSentTxs: async () => [],
})

/**
 * The treasury's view-only wallet. Only the coordinator holds the viewing
 * key, so only their browser syncs; it reports the balance for everyone else.
 */
export function TreasuryWalletProvider({
  treasury,
  children,
}: {
  treasury: TreasuryWalletTreasury | null
  children: ReactNode
}) {
  const [state, setState] = useState<WalletState>(initialState)
  const [hasSaved, setHasSaved] = useState<boolean | null>(null)
  const syncingRef = useRef(false)
  const openingRef = useRef(false)
  const { keys } = useVault()
  const { accountKey } = useAccountData()
  const [reportBalance] = useMutation(ReportTreasuryBalanceDocument)
  const lastReported = useRef<string | null>(null)

  const active = treasury?.status === "ACTIVE"
  const isCoordinator = active && treasury.isCoordinator

  // Signers check the published addresses against the viewing key, which
  // they check against their own key share.
  const [check, setCheck] = useState<{
    check: AddressCheck
    error: string | null
  }>({ check: "unchecked", error: null })
  const isSigner = active && !!treasury.myMembership?.encryptedKeyPackage
  useEffect(() => {
    if (!isSigner || !keys || !treasury) return
    let cancelled = false
    openViewingKey(treasury, keys).then(
      () => {
        if (!cancelled) setCheck({ check: "verified", error: null })
      },
      (err) => {
        if (cancelled) return
        if (err instanceof ViewingKeyNotShared) {
          setCheck({ check: "unchecked", error: null })
        } else {
          console.error("[treasury] address check failed", err)
          setCheck({
            check: "failed",
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [isSigner, keys, treasury])
  const storageKey = isCoordinator ? walletStorageKey(treasury.id) : null
  const birthdayHeight = treasury?.birthdayHeight ?? null

  useEffect(() => {
    if (!storageKey) return
    let cancelled = false
    hasSavedWallet(storageKey).then((saved) => {
      if (!cancelled) setHasSaved(saved)
    })
    return () => {
      cancelled = true
    }
  }, [storageKey])

  // Open the wallet: from this browser's copy, or by decrypting the viewing
  // key once the coordinator unlocked their vault.
  useEffect(() => {
    if (!storageKey || !treasury || state.initialized || hasSaved === null) {
      return
    }
    const canDecrypt =
      keys && treasury.encryptedViewingKey && treasury.birthdayHeight
    if (!hasSaved && !canDecrypt) return
    if (openingRef.current) return
    openingRef.current = true
    ;(async () => {
      try {
        const viewing = hasSaved
          ? null
          : {
              ufvk: await unsealText(
                keys!,
                treasury.encryptedViewingKey!,
                VAULT_CONTEXT.viewingKey(treasury.id)
              ),
              birthdayHeight: treasury.birthdayHeight!,
            }
        await initializeWallet(storageKey, viewing)
        setState((s) => ({ ...s, initialized: true }))
      } catch (e) {
        console.error("Failed to open treasury wallet:", e)
        setState((s) => ({
          ...s,
          error: e instanceof Error ? e.message : "Failed to open treasury",
        }))
      } finally {
        openingRef.current = false
      }
    })()
  }, [storageKey, treasury, keys, hasSaved, state.initialized])

  const sync = useCallback(async (): Promise<SyncSummary | null> => {
    if (!state.initialized || syncingRef.current) return null
    syncingRef.current = true
    setState((s) => ({
      ...s,
      syncing: true,
      syncFrom: s.lastSyncedHeight ?? birthdayHeight,
    }))
    try {
      const summary = await syncWallet((scanned, tip) => {
        setState((s) => ({
          ...s,
          lastSyncedHeight: scanned,
          chainTipHeight: tip,
        }))
      })
      setState((s) => ({
        ...s,
        syncing: false,
        balance: summary.balance,
        lastSyncedHeight: summary.fully_scanned_height,
        chainTipHeight: summary.chain_tip_height,
        error: null,
        syncCount: s.syncCount + 1,
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
  }, [state.initialized, birthdayHeight])

  // Sync on open and every couple of minutes after.
  useEffect(() => {
    if (!state.initialized) return
    sync()
    const timer = setInterval(sync, RESYNC_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [state.initialized, sync])

  // Show the restored balance before the first sync finishes.
  useEffect(() => {
    if (state.initialized && !state.balance) {
      getBalance().then((balance) => {
        if (balance.total > 0) setState((s) => ({ ...s, balance }))
      })
    }
  }, [state.initialized, state.balance])

  // Tell everyone else what the wallet sees, sealed so only they can read it.
  const treasuryId = treasury?.id
  useEffect(() => {
    if (!isCoordinator || !state.balance || state.lastSyncedHeight === null) {
      return
    }
    if (state.syncing || !accountKey || !treasuryId) return
    const zat = String(Math.round(state.balance.total * ZAT_PER_ZEC))
    if (zat === lastReported.current) return
    lastReported.current = zat
    const balance: SealedBalance = {
      zat,
      syncedHeight: state.lastSyncedHeight,
      at: new Date().toISOString(),
    }
    sealJson(
      accountKey,
      balance,
      ACCOUNT_CONTEXT.balance(accountKey.accountId, treasuryId)
    )
      .then((sealedBalance) => reportBalance({ variables: { sealedBalance } }))
      .catch((e) => {
        lastReported.current = null
        console.warn("Couldn't report treasury balance", e)
      })
  }, [
    isCoordinator,
    state.balance,
    state.lastSyncedHeight,
    state.syncing,
    accountKey,
    treasuryId,
    reportBalance,
  ])

  const sealedBalance = active ? (treasury.sealedBalance ?? null) : null
  const [reported, setReported] = useState<SealedBalance | null>(null)
  useEffect(() => {
    if (!sealedBalance || !accountKey || !treasuryId) {
      setReported(null)
      return
    }
    let cancelled = false
    openJson<SealedBalance>(
      accountKey,
      sealedBalance,
      ACCOUNT_CONTEXT.balance(accountKey.accountId, treasuryId)
    ).then(
      (balance) => {
        if (!cancelled) setReported(balance)
      },
      (e) => {
        console.warn("Couldn't open the treasury balance", e)
        if (!cancelled) setReported(null)
      }
    )
    return () => {
      cancelled = true
    }
  }, [sealedBalance, accountKey, treasuryId])

  const getSentTxs = useCallback(() => getSentTransactions(), [])

  const toScan =
    state.syncFrom !== null && state.chainTipHeight !== null
      ? state.chainTipHeight - state.syncFrom
      : null
  const catchingUp =
    state.syncing &&
    (state.lastSyncedHeight === null ||
      toScan === null ||
      toScan > CATCH_UP_BLOCKS)
  const syncProgress =
    catchingUp &&
    toScan !== null &&
    toScan > 0 &&
    state.lastSyncedHeight !== null
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((state.lastSyncedHeight - state.syncFrom!) / toScan) * 100
            )
          )
        )
      : null


  return createElement(
    TreasuryWalletContext.Provider,
    {
      value: {
        ...state,
        address:
          active && check.check !== "failed"
            ? (treasury.address ?? null)
            : null,
        addressCheck: active ? check.check : "unchecked",
        addressError: active ? check.error : null,
        isCoordinator,
        needsUnlock:
          isCoordinator && hasSaved === false && !state.initialized && !keys,
        catchingUp,
        displayBalance:
          state.balance && state.lastSyncedHeight !== null
            ? state.balance.total
            : reported
              ? Number(reported.zat) / ZAT_PER_ZEC
              : null,
        reportedAt: reported?.at ?? null,
        syncProgress,
        sync,
        getSentTxs,
      },
    },
    children
  )
}

export function useTreasuryWallet() {
  return useContext(TreasuryWalletContext)
}
