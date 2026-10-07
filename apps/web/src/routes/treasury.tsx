import { useMutation, useQuery } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Lock, Plus, ShieldCheck, Users, Vault } from "lucide-react"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { RequireAccountData } from "../components/account-access"
import { DisburseModal } from "../components/disburse-modal/disburse-modal"
import { TopUpModal } from "../components/top-up-modal"
import { TreasuryApprovals } from "../components/treasury/approvals"
import { KeyCeremony } from "../components/treasury/ceremony"
import { TreasuryMembers } from "../components/treasury/members"
import { TreasurySetup } from "../components/treasury/setup"
import { useSpendAgent } from "../components/treasury/spend-agent-context"
import { TreasuryTransactions } from "../components/treasury/transactions"
import { VaultButton } from "../components/treasury/vault-button"
import { TreasuryOverviewView } from "../components/views/treasury-overview-view"
import {
  MeLayoutDocument,
  SpendProposalsDocument,
  TreasuryDocument,
  TreasuryHeartbeatDocument,
  type TreasuryFieldsFragment,
} from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"
import { useTreasuryWallet } from "../hooks/use-treasury-wallet"
import { useVault } from "../hooks/use-vault"
import { useZecPrice } from "../hooks/use-zec-price"
import { ZCASH_NETWORK } from "../lib/zcash-network"

const TABS = ["overview", "approvals", "transactions", "members"] as const
type Tab = (typeof TABS)[number]

const HEARTBEAT_MS = 5000
// Setup and the ceremony move along with other people's clicks; a live
// treasury only changes with payments and balance reports.
const SETUP_POLL_MS = 3000
const ACTIVE_POLL_MS = 30_000

export function TreasuryPage() {
  useTitle("Treasury")
  const [params, setParams] = useSearchParams()
  const { data, loading, startPolling } = useQuery(TreasuryDocument)
  const { data: meData } = useQuery(MeLayoutDocument)
  const treasury = data?.treasury ?? null
  const me = meData?.me
  const isAccountOwner = !!me?.isAccountOwner
  const active = treasury?.status === "ACTIVE"
  useEffect(() => {
    startPolling(active ? ACTIVE_POLL_MS : SETUP_POLL_MS)
  }, [active, startPolling])
  const [creating, setCreating] = useState(false)

  // Presence for the setup and ceremony rooms.
  const { keys } = useVault()
  const [heartbeat] = useMutation(TreasuryHeartbeatDocument)
  const inRoom = !!treasury && !active && !!treasury.myMembership
  useEffect(() => {
    if (!inRoom) return
    const beat = () =>
      heartbeat({ variables: { ready: !!keys } }).catch(() => {})
    beat()
    const timer = setInterval(beat, HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [inRoom, keys, heartbeat])

  const tabParam = params.get("tab")
  const tab: Tab = TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "overview"

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (!treasury) {
    if (creating)
      return (
        <TreasurySetup treasury={null} onCancel={() => setCreating(false)} />
      )
    return (
      <div className="space-y-8">
        <TreasuryEmpty
          isAccountOwner={isAccountOwner}
          ownerUsername={me?.owner?.username}
          onCreate={() => setCreating(true)}
        />
        <TreasuryMembers treasury={null} isAccountOwner={isAccountOwner} />
      </div>
    )
  }

  if (treasury.status === "DRAFT") return <TreasurySetup treasury={treasury} />
  if (treasury.status === "KEYGEN") {
    return treasury.myMembership ? (
      <KeyCeremony treasury={treasury} />
    ) : (
      <p className="text-sm text-muted-foreground">
        The treasury's key ceremony is running.
      </p>
    )
  }

  return (
    <ActiveTreasury
      tab={tab}
      onTab={(next) => setParams(next === "overview" ? {} : { tab: next })}
      treasury={treasury}
      isAccountOwner={isAccountOwner}
    />
  )
}

function TreasuryEmpty({
  isAccountOwner,
  ownerUsername,
  onCreate,
}: {
  isAccountOwner: boolean
  ownerUsername?: string
  onCreate: () => void
}) {
  return (
    <div className="space-y-10 py-8 text-center">
      <div className="space-y-4">
        <h2 className="mx-auto max-w-xl text-5xl font-medium tracking-tight text-balance">
          Multisig treasury for your payroll
        </h2>
        <p className="mx-auto max-w-md text-muted-foreground">
          Hold payroll funds in a shielded Zcash treasury that pays out only
          when enough of your team approves. Keys are created together and never
          exist in one place.
        </p>
      </div>
      {isAccountOwner ? (
        <Button size="lg" onClick={onCreate}>
          <Plus />
          Create Treasury
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          @{ownerUsername} hasn't set up a treasury yet.
        </p>
      )}
      <div className="mx-auto grid max-w-3xl gap-4 text-left sm:grid-cols-3">
        {[
          {
            icon: Users,
            title: "Shared control",
            text: "Pick who co-signs and how many approvals each payment needs.",
          },
          {
            icon: Lock,
            title: "Keys behind passkeys",
            text: "Every member's key share is sealed with their own passkey.",
          },
          {
            icon: ShieldCheck,
            title: "One transaction per payroll",
            text: "All salaries in a run go out together, privately.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="space-y-2 rounded-xl border bg-card p-5">
            <Icon className="size-5 text-[var(--primary-dark)] dark:text-primary" />
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActiveTreasury({
  tab,
  onTab,
  treasury,
  isAccountOwner,
}: {
  tab: Tab
  onTab: (tab: Tab) => void
  treasury: TreasuryFieldsFragment
  isAccountOwner: boolean
}) {
  const wallet = useTreasuryWallet()
  const { price } = useZecPrice()
  const { data: proposalData } = useQuery(SpendProposalsDocument, {
    variables: { open: true },
    pollInterval: 15_000,
  })
  const [payOpen, setPayOpen] = useState(false)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const pending = (proposalData?.spendProposals ?? []).filter(
    (p) => p.status === "AWAITING_APPROVALS" || p.status === "SIGNING"
  ).length
  const canPay = treasury.isCoordinator
  const { needsUnlock: spendNeedsUnlock } = useSpendAgent()

  const balanceNote = wallet.initialized
    ? wallet.catchingUp
      ? `Syncing${wallet.syncProgress !== null ? ` ${wallet.syncProgress}%` : ""}...`
      : wallet.lastSyncedHeight !== null
        ? `Synced to block ${wallet.lastSyncedHeight.toLocaleString()}${
            wallet.balance && wallet.balance.pending > 0
              ? ` · ${wallet.balance.pending.toFixed(4)} ZEC still confirming`
              : ""
          }`
        : null
    : wallet.reportedAt
      ? `As of ${new Date(wallet.reportedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}`
      : "Not synced yet"

  return (
    // One column for the header, tabs and every tab's content.
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-3 text-4xl font-light tracking-tight">
            <Vault className="size-8 text-[var(--primary-dark)] dark:text-primary" />
            {treasury.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {treasury.description ? `${treasury.description} · ` : ""}
            {treasury.threshold} of {treasury.signerCount} signers
            {ZCASH_NETWORK === "test" && " · Testnet"}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => onTab(value as Tab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            {pending > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
                {pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TreasuryOverviewView
            address={wallet.address}
            addressNote={
              wallet.addressError ? (
                <p className="mt-2 text-sm text-destructive">
                  {wallet.addressError}
                </p>
              ) : wallet.addressCheck === "verified" ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-3.5" />
                  Checked in your browser: this address belongs to the
                  treasury's key.
                </p>
              ) : null
            }
            balanceZec={wallet.displayBalance}
            balanceNote={balanceNote}
            zecPrice={price}
            threshold={treasury.threshold}
            members={treasury.members.map((m) => ({
              id: m.user.id,
              name: m.user.name ?? m.user.username,
              username: m.user.username,
              isCoordinator: m.isCoordinator,
              hasKeyShare: m.hasKeyShare,
            }))}
            pendingApprovals={pending}
            pendingNeedsUnlock={spendNeedsUnlock}
            notice={
              wallet.needsUnlock && (
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed p-4">
                  <p className="flex-1 text-sm text-muted-foreground">
                    Unlock the treasury on this device to see its live balance
                    and pay payrolls. Its viewing key stays encrypted until you
                    do.
                  </p>
                  <VaultButton>Unlock treasury</VaultButton>
                </div>
              )
            }
            onPay={canPay ? () => setPayOpen(true) : undefined}
            onTopUp={() => setTopUpOpen(true)}
            onViewApprovals={() => onTab("approvals")}
          />
        </TabsContent>
        <TabsContent value="approvals">
          <RequireAccountData>
            <TreasuryApprovals
              treasury={treasury}
              onPay={canPay ? () => setPayOpen(true) : undefined}
            />
          </RequireAccountData>
        </TabsContent>
        <TabsContent value="transactions">
          <RequireAccountData>
            <TreasuryTransactions />
          </RequireAccountData>
        </TabsContent>
        <TabsContent value="members">
          <TreasuryMembers
            treasury={treasury}
            isAccountOwner={isAccountOwner}
          />
        </TabsContent>
      </Tabs>

      {canPay && (
        <DisburseModal
          open={payOpen}
          onOpenChange={setPayOpen}
          onProposed={() => onTab("approvals")}
        />
      )}
      <TopUpModal open={topUpOpen} onOpenChange={setTopUpOpen} />
    </div>
  )
}
