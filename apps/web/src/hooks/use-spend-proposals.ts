import type { ApolloClient } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { useEffect, useMemo, useState } from "react"
import {
  SpendProposalPcztDocument,
  SpendProposalsDocument,
  type SpendProposalFieldsFragment,
} from "../graphql/__generated__/graphql"
import type { AccountKey } from "../lib/account-key"
import {
  openPczt,
  openSpendDetails,
  openTxid,
  type SpendDetails,
} from "../lib/treasury/sealed-spend"
import type { ProposalInfo } from "../lib/treasury/spend"
import { ZAT_PER_ZEC } from "../lib/zcash-network"
import { useAccountData } from "./use-account-data"

export interface OpenedProposal extends SpendProposalFieldsFragment {
  /** Null when this browser couldn't open them. */
  details: SpendDetails | null
  txid: string | null
  totalZec: number
  feeZec: number
}

interface Opened {
  details: SpendDetails | null
  txid: string | null
}

// Shared by every component listing spends; a proposal's sealed fields only
// change when it's broadcast.
const openedByKey = new WeakMap<AccountKey, Map<string, Opened>>()

const cacheKey = (p: SpendProposalFieldsFragment) =>
  `${p.id}|${p.sealedTxid ?? ""}`

async function openProposal(
  accountKey: AccountKey,
  proposal: SpendProposalFieldsFragment
): Promise<Opened> {
  const [details, txid] = await Promise.all([
    openSpendDetails(accountKey, proposal.id, proposal.sealed).catch((err) => {
      console.warn("[treasury] couldn't open a spend's details", err)
      return null
    }),
    proposal.sealedTxid
      ? openTxid(accountKey, proposal.id, proposal.sealedTxid).catch(
          () => null
        )
      : null,
  ])
  return { details, txid }
}

/** The account's treasury spends with what they pay, opened here. */
export function useSpendProposals({
  open,
  pollInterval,
  skip,
}: { open?: boolean; pollInterval?: number; skip?: boolean } = {}) {
  const { accountKey } = useAccountData()
  const { data, loading, refetch } = useQuery(SpendProposalsDocument, {
    variables: { open },
    skip: skip || !accountKey,
    pollInterval,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!accountKey || !data) return
    let opened = openedByKey.get(accountKey)
    if (!opened) {
      opened = new Map()
      openedByKey.set(accountKey, opened)
    }
    const missing = data.spendProposals.filter((p) => !opened.has(cacheKey(p)))
    if (missing.length === 0) return
    let cancelled = false
    Promise.all(
      missing.map(async (p) => {
        opened.set(cacheKey(p), await openProposal(accountKey, p))
      })
    ).then(() => {
      if (!cancelled) setVersion((v) => v + 1)
    })
    return () => {
      cancelled = true
    }
  }, [accountKey, data])

  // Null until every spend listed has been opened (or failed to).
  const proposals = useMemo(() => {
    void version
    if (!data || !accountKey) return null
    const opened = openedByKey.get(accountKey)
    const result: OpenedProposal[] = []
    for (const p of data.spendProposals) {
      const entry = opened?.get(cacheKey(p))
      if (!entry) return null
      result.push({
        ...p,
        ...entry,
        totalZec: Number(entry.details?.totalZat ?? 0) / ZAT_PER_ZEC,
        feeZec: Number(entry.details?.feeZat ?? 0) / ZAT_PER_ZEC,
      })
    }
    return result
  }, [data, accountKey, version])

  return {
    proposals: proposals ?? [],
    loading: !proposals && (loading || !!accountKey),
    refetch,
  }
}

/**
 * Everything signing a spend needs, with its PCZT fetched and opened. The
 * PCZT is large, so it's only fetched to act on one spend.
 */
export async function loadProposalInfo(
  client: ApolloClient,
  accountKey: AccountKey,
  proposal: OpenedProposal,
  fetchPolicy: "cache-first" | "network-only" = "cache-first"
): Promise<ProposalInfo> {
  if (!proposal.details) {
    throw new Error("Couldn't open this payment's details.")
  }
  const { data } = await client.query({
    query: SpendProposalPcztDocument,
    variables: { id: proposal.id },
    fetchPolicy,
  })
  const sealedPczt = data?.spendProposal?.sealedPczt
  if (!sealedPczt) throw new Error("This payment's transaction is gone.")
  return {
    id: proposal.id,
    status: proposal.status,
    pczt: await openPczt(accountKey, proposal.id, sealedPczt),
    sighash: proposal.details.sighash,
    spends: proposal.details.spends,
    frostSessionId: proposal.frostSessionId,
    signerIds: proposal.signerIds,
    approvals: proposal.approvals,
  }
}
