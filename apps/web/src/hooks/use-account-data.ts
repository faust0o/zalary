import { useApolloClient, useMutation, useQuery } from "@apollo/client/react"
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  AccountKeyDocument,
  CreateAccountKeyDocument,
  SealedRecordsDocument,
  SealedRecordVersionFragmentDoc,
  WriteSealedRecordsDocument,
} from "../graphql/__generated__/graphql"
import {
  ACCOUNT_CONTEXT,
  newAccountKey,
  openAccountKey,
  openJson,
  sealAccountKey,
  sealJson,
  type AccountKey,
} from "../lib/account-key"
import type {
  Employee,
  Payroll,
  PayrollRecord,
  PayrollRun,
  RecordChanges,
} from "../lib/payroll-records"
import { useAuth } from "./use-auth"
import { useVault } from "./use-vault"

const RECORDS_POLL_MS = 20_000
// Someone waiting for access finds out soon after it was shared.
const ACCESS_POLL_MS = 10_000

/**
 * - locked: the passkey vault isn't open in this tab
 * - no-access: nobody has shared the account key with this user yet
 * - ready: the payroll data is open
 */
export type AccountDataStatus =
  | "locked"
  | "loading"
  | "no-access"
  | "ready"
  | "error"

interface OpenRecord {
  version: number
  record: PayrollRecord
}

interface AccountDataContextType {
  status: AccountDataStatus
  error: string | null
  accountKey: AccountKey | null
  /** Who to ask for access while waiting for it. */
  ownerUsername: string | null
  canEdit: boolean
  employees: Employee[]
  payrolls: Payroll[]
  runs: PayrollRun[]
  /**
   * Seal and save record changes. Resolves once they're saved and being
   * opened; throws on a conflicting edit.
   */
  write: (changes: Partial<RecordChanges>) => Promise<void>
}

const AccountDataContext = createContext<AccountDataContextType>({
  status: "locked",
  error: null,
  accountKey: null,
  ownerUsername: null,
  canEdit: false,
  employees: [],
  payrolls: [],
  runs: [],
  write: async () => {
    throw new Error("Payroll data isn't open.")
  },
})

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * The account's payroll data, opened in this browser. Everything the server
 * keeps of it is sealed under the account key, which this user's copy is
 * opened with their passkey vault. The owner's browser makes the key the
 * first time it's needed.
 */
export function AccountDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { keys } = useVault()
  const client = useApolloClient()
  // Kept per user, so a key never outlives its vault (logout, another user).
  const [opening, setOpening] = useState<{
    userId: string
    key: AccountKey | null
    error: string | null
  } | null>(null)
  const current = opening && opening.userId === keys?.userId ? opening : null
  const accountKey = current?.key ?? null
  const keyError = current?.error ?? null
  const creating = useRef(false)
  const [attempt, setAttempt] = useState(0)

  const { data: keyData, refetch: refetchKey } = useQuery(AccountKeyDocument, {
    skip: !user || !keys,
    pollInterval: keys && !accountKey ? ACCESS_POLL_MS : 0,
  })
  const [createAccountKey] = useMutation(CreateAccountKeyDocument)
  const me = keyData?.me
  const grant = keyData?.accountKey
  const accountId = me ? (me.owner?.id ?? me.id) : null

  useEffect(() => {
    if (!keys || !me || !grant || !accountId || accountKey || keyError) return
    let cancelled = false
    if (grant.sealedKey && grant.sealedBy) {
      openAccountKey(keys, accountId, {
        sealedKey: grant.sealedKey,
        sealedBy: grant.sealedBy,
      }).then(
        (opened) => {
          if (!cancelled) {
            setOpening({ userId: keys.userId, key: opened, error: null })
          }
        },
        (err) => {
          console.error("[account] couldn't open the account key", err)
          if (!cancelled) {
            setOpening({ userId: keys.userId, key: null, error: message(err) })
          }
        }
      )
    } else if (
      !grant.exists &&
      me.isAccountOwner &&
      // A new passkey opens the vault before the server has its public key.
      me.commsPublicKey === keys.commsPublicKey &&
      !creating.current
    ) {
      creating.current = true
      ;(async () => {
        const fresh = await newAccountKey(accountId)
        const sealedKey = await sealAccountKey(keys, fresh, keys.commsPublicKey)
        await createAccountKey({ variables: { sealedKey } })
        if (!cancelled) {
          setOpening({ userId: keys.userId, key: fresh, error: null })
        }
      })()
        .catch((err) => {
          // Another tab may have made it first; use that one, or try again.
          console.warn("[account] couldn't create the account key", err)
          void refetchKey()
          setTimeout(() => setAttempt((n) => n + 1), 3000)
        })
        .finally(() => {
          creating.current = false
        })
    }
    return () => {
      cancelled = true
    }
  }, [
    keys,
    me,
    grant,
    accountId,
    accountKey,
    keyError,
    attempt,
    createAccountKey,
    refetchKey,
  ])

  const { data: recordsData, refetch: refetchRecords } = useQuery(
    SealedRecordsDocument,
    { skip: !accountKey, pollInterval: RECORDS_POLL_MS }
  )
  const [writeRecords] = useMutation(WriteSealedRecordsDocument)

  // Opened records by id. Ciphertexts only change with their version, so
  // each version is only opened once.
  const [opened, setOpened] = useState<{
    key: AccountKey
    records: Map<string, OpenRecord>
    failed: number
  } | null>(null)
  const cache = useRef(new Map<string, PayrollRecord | null>())

  useEffect(() => {
    if (!accountKey || !recordsData) return
    let cancelled = false
    ;(async () => {
      const results = await Promise.all(
        recordsData.sealedRecords.map(async ({ id, data, version }) => {
          const cacheKey = `${id}:${version}`
          let record = cache.current.get(cacheKey)
          if (record === undefined) {
            record = await openJson<PayrollRecord>(
              accountKey,
              data,
              ACCOUNT_CONTEXT.record(accountKey.accountId, id)
            ).then(
              (r) => (r.id === id ? r : null),
              () => null
            )
            cache.current.set(cacheKey, record)
          }
          return { id, version, record }
        })
      )
      if (cancelled) return
      const records = new Map<string, OpenRecord>()
      let failed = 0
      for (const { id, version, record } of results) {
        if (record) records.set(id, { version, record })
        else failed++
      }
      if (failed > 0) {
        console.warn(`[account] ${failed} records didn't open`)
      }
      setOpened({ key: accountKey, records, failed })
    })()
    return () => {
      cancelled = true
    }
  }, [accountKey, recordsData])

  const write = useCallback(
    async ({ put = [], remove = [] }: Partial<RecordChanges>) => {
      if (!accountKey) throw new Error("Payroll data isn't open yet.")
      // The cache holds the version of every record read or written so far,
      // including writes whose refetch hasn't landed yet.
      const cacheId = (id: string) =>
        client.cache.identify({ __typename: "SealedRecord", id })
      const versionOf = (id: string) =>
        client.cache.readFragment({
          id: cacheId(id),
          fragment: SealedRecordVersionFragmentDoc,
        })?.version ?? 0
      const writes = await Promise.all(
        put.map(async (record) => ({
          id: record.id,
          version: versionOf(record.id),
          data: await sealJson(
            accountKey,
            record,
            ACCOUNT_CONTEXT.record(accountKey.accountId, record.id)
          ),
        }))
      )
      const deletes = remove.flatMap((id) => {
        const version = versionOf(id)
        return version ? [{ id, version }] : []
      })
      try {
        await writeRecords({ variables: { writes, deletes } })
      } catch (err) {
        // Someone else's change got in first; pick it up.
        void refetchRecords()
        throw err
      }
      for (const { id } of deletes) client.cache.evict({ id: cacheId(id) })
      client.cache.gc()
      await refetchRecords()
    },
    [accountKey, client, writeRecords, refetchRecords]
  )

  const collections = useMemo(() => {
    const employees: Employee[] = []
    const payrolls: Payroll[] = []
    const runs: PayrollRun[] = []
    for (const { record } of opened?.records.values() ?? []) {
      const { kind, ...value } = record
      if (kind === "employee") employees.push(value as Employee)
      else if (kind === "payroll") payrolls.push(value as Payroll)
      else if (kind === "payrollRun") runs.push(value as PayrollRun)
    }
    employees.sort((a, b) => a.name.localeCompare(b.name))
    payrolls.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return { employees, payrolls, runs }
  }, [opened])

  let status: AccountDataStatus
  let error: string | null = null
  if (!user || !keys) status = "locked"
  else if (keyError) {
    status = "error"
    error = keyError
  } else if (!grant) status = "loading"
  else if (!accountKey) {
    status =
      grant.sealedKey || (!grant.exists && me?.isAccountOwner)
        ? "loading"
        : "no-access"
  } else if (!opened || opened.key !== accountKey) status = "loading"
  else if (opened.failed > 0 && opened.records.size === 0) {
    status = "error"
    error = "Your copy of the account key doesn't open this account's data."
  } else status = "ready"

  return createElement(
    AccountDataContext.Provider,
    {
      value: {
        status,
        error,
        accountKey: status === "ready" ? accountKey : null,
        ownerUsername: me?.owner?.username ?? null,
        canEdit: !!me?.canEditPayroll,
        ...collections,
        write,
      },
    },
    children
  )
}

export function useAccountData() {
  return useContext(AccountDataContext)
}
