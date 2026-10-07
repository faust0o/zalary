import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Check, Vault, X } from "lucide-react"
import { useState } from "react"
import { useDemo } from "../../components/demo-context"
import { ApprovalsView } from "../../components/views/approvals-view"
import { MembersView } from "../../components/views/members-view"
import { TransactionsView } from "../../components/views/transactions-view"
import { TreasuryOverviewView } from "../../components/views/treasury-overview-view"
import { useTitle } from "../../hooks/use-title"
import { useZecPrice } from "../../hooks/use-zec-price"
import {
  DEMO_ACCESS_INVITES,
  DEMO_PAYMENTS,
  DEMO_PEOPLE,
  DEMO_PROPOSALS,
  DEMO_TREASURY,
  DEMO_TREASURY_BALANCE,
} from "../../lib/demo-data"

export function DemoTreasuryPage() {
  useTitle("Treasury")
  const { promptLogin } = useDemo()
  const { price } = useZecPrice()
  const [tab, setTab] = useState("overview")

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h2 className="flex items-center gap-3 text-4xl font-light tracking-tight">
          <Vault className="size-8 text-[var(--primary-dark)] dark:text-primary" />
          {DEMO_TREASURY.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {DEMO_TREASURY.description} · {DEMO_TREASURY.threshold} of{" "}
          {DEMO_PEOPLE.length} signers
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
              1
            </span>
          </TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <TreasuryOverviewView
            address={DEMO_TREASURY.address}
            balanceZec={DEMO_TREASURY_BALANCE}
            balanceNote="Synced to block 3,512,904"
            zecPrice={price}
            threshold={DEMO_TREASURY.threshold}
            members={DEMO_PEOPLE.map((p) => ({
              id: p.id,
              name: p.name,
              username: p.username,
              isCoordinator: p.isAccountOwner,
              hasKeyShare: p.isSigner,
            }))}
            pendingApprovals={1}
            onPay={() => promptLogin()}
            onTopUp={() => promptLogin()}
            onViewApprovals={() => setTab("approvals")}
            onCopyAddress={() => promptLogin()}
          />
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalsView
            proposals={DEMO_PROPOSALS}
            loading={false}
            renderActions={() => (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => promptLogin()}
                >
                  <X />
                  Reject
                </Button>
                <Button className="flex-1" onClick={() => promptLogin()}>
                  <Check />
                  Approve
                </Button>
              </div>
            )}
          />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsView payments={DEMO_PAYMENTS} loading={false} embedded />
        </TabsContent>
        <TabsContent value="members">
          <MembersView
            people={DEMO_PEOPLE}
            invites={DEMO_ACCESS_INVITES}
            loading={false}
            canManage
            onCreateInvite={() => promptLogin()}
            onCopyInvite={() => promptLogin()}
            onRevokeInvite={() => promptLogin()}
            onChangeRole={async () => promptLogin()}
            onRemove={async () => promptLogin()}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
