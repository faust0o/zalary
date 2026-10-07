import { useMutation } from "@apollo/client/react"
import { Identicon } from "@workspace/ui/components/Identicon"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Slider } from "@workspace/ui/components/slider"
import { cn } from "@workspace/ui/lib/utils"
import {
  Check,
  Clock,
  Copy,
  Link2,
  Loader2,
  Plus,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"
import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import {
  CreateTreasuryDocument,
  CreateTreasuryInviteDocument,
  DeleteTreasuryDocument,
  MeLayoutDocument,
  RemoveTreasuryMemberDocument,
  RevokeTreasuryInviteDocument,
  StartTreasuryKeygenDocument,
  TreasuryDocument,
  UpdateTreasuryDocument,
  type TreasuryFieldsFragment,
} from "../../graphql/__generated__/graphql"
import { useAuth } from "../../hooks/use-auth"
import { useVault } from "../../hooks/use-vault"
import { openCeremonySession } from "../../lib/treasury/ceremony"
import { ZCASH_NETWORK } from "../../lib/zcash-network"
import { Caution, StepHeading, Stepper } from "./stepper"
import { VaultButton } from "./vault-button"

const STEPS = ["Treasury Details", "Members & Threshold", "Review"]
const MAX_DESCRIPTION = 64

const refetchTreasury = {
  refetchQueries: [TreasuryDocument],
  awaitRefetchQueries: true,
}

function message(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function joinUrl(token: string): string {
  return `${window.location.origin}/join/${token}`
}

function SetupCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardContent className="space-y-5">
        <h3 className="text-base font-medium">{title}</h3>
        <Separator />
        {children}
      </CardContent>
    </Card>
  )
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
      {error}
    </div>
  )
}

/**
 * Setting a treasury up, before its keys exist. The coordinator walks through
 * details, members and threshold, and review; everyone else waits here for
 * the key ceremony to start.
 */
export function TreasurySetup({
  treasury,
  onCancel,
}: {
  treasury: TreasuryFieldsFragment | null
  onCancel?: () => void
}) {
  const [step, setStep] = useState(treasury ? 1 : 0)

  if (treasury && !treasury.isCoordinator) {
    return <MemberWaitingRoom treasury={treasury} />
  }

  return (
    <div className="space-y-10 py-4">
      <Stepper steps={STEPS} current={step} />
      {step === 0 && (
        <DetailsStep
          treasury={treasury}
          onCancel={onCancel}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && treasury && (
        <MembersStep
          treasury={treasury}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && treasury && (
        <ReviewStep treasury={treasury} onBack={() => setStep(1)} />
      )}
    </div>
  )
}

function DetailsStep({
  treasury,
  onCancel,
  onNext,
}: {
  treasury: TreasuryFieldsFragment | null
  onCancel?: () => void
  onNext: () => void
}) {
  const [name, setName] = useState(treasury?.name ?? "")
  const [description, setDescription] = useState(treasury?.description ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [createTreasury] = useMutation(CreateTreasuryDocument, refetchTreasury)
  const [updateTreasury] = useMutation(UpdateTreasuryDocument, refetchTreasury)
  const [deleteTreasury] = useMutation(DeleteTreasuryDocument, {
    refetchQueries: [TreasuryDocument, MeLayoutDocument],
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const variables = {
        name: name.trim(),
        description: description.trim() || null,
      }
      if (treasury) await updateTreasury({ variables })
      else await createTreasury({ variables })
      onNext()
    } catch (err) {
      setError(message(err, "Couldn't save the treasury."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <StepHeading
        title="Secure your payroll funds in a few clicks"
        description="Give your treasury a name. You can always adjust the details later."
      />
      <SetupCard title="Create a Treasury">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {name.trim() ? (
                <Identicon hash={name.trim()} size={40} />
              ) : (
                <Plus className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <Input
                aria-label="Treasury name"
                placeholder="Treasury name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                required
                autoFocus
                className="h-14 text-2xl md:text-2xl"
              />
              <p className="text-xs text-muted-foreground">
                Only people with access to your account see it.
              </p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="treasury-description">
              Treasury description (optional)
            </Label>
            <Input
              id="treasury-description"
              placeholder={`Description (max ${MAX_DESCRIPTION} characters)`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION}
            />
          </div>
          <ErrorLine error={error} />
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={async () => {
                // A draft nobody joined yet can just go away.
                if (treasury && treasury.members.length <= 1) {
                  await deleteTreasury().catch(() => {})
                }
                onCancel?.()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Next"}
            </Button>
          </div>
        </form>
      </SetupCard>
    </>
  )
}

function PasskeyStatus({ ready }: { ready: boolean }) {
  return ready ? (
    <span className="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-emerald-600 dark:text-emerald-400">
      <ShieldCheck className="size-3.5" /> Passkey ready
    </span>
  ) : (
    <span className="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
      <Clock className="size-3.5" /> Waiting for passkey
    </span>
  )
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="text-green-500" /> : <Copy />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

function MembersStep({
  treasury,
  onBack,
  onNext,
}: {
  treasury: TreasuryFieldsFragment
  onBack: () => void
  onNext: () => void
}) {
  const { user } = useAuth()
  const vault = useVault()
  const [error, setError] = useState<string | null>(null)
  const [createInvite, { loading: inviting }] = useMutation(
    CreateTreasuryInviteDocument,
    refetchTreasury
  )
  const [revokeInvite] = useMutation(
    RevokeTreasuryInviteDocument,
    refetchTreasury
  )
  const [removeMember] = useMutation(
    RemoveTreasuryMemberDocument,
    refetchTreasury
  )
  const [updateTreasury] = useMutation(UpdateTreasuryDocument, refetchTreasury)

  const others = treasury.members.filter((m) => !m.isCoordinator)
  const slots = treasury.members.length + treasury.invites.length
  const maxThreshold = Math.max(2, slots)
  // The slider's value while it is being dragged.
  const [dragging, setDragging] = useState<number | null>(null)
  const threshold = dragging ?? Math.min(treasury.threshold, maxThreshold)

  // Fewer slots than the threshold after a revoke: follow it down.
  useEffect(() => {
    if (treasury.threshold > maxThreshold) {
      updateTreasury({ variables: { threshold: maxThreshold } }).catch(() => {})
    }
  }, [treasury.threshold, maxThreshold, updateTreasury])

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(message(err, fallback))
    }
  }

  return (
    <>
      <StepHeading
        title="Add members and configure security"
        description="Invite the people who co-sign payroll payments and choose how many of them must approve."
      />
      <SetupCard title="Add treasury members">
        <ul className="space-y-3">
          <li className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Member 1 · Coordinator
            </p>
            <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5">
              <Identicon
                hash={user?.username}
                size={28}
                className="rounded-md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  You (@{user?.username})
                </p>
              </div>
              {vault.hasPasskey ? (
                <PasskeyStatus ready />
              ) : (
                <VaultButton size="sm" variant="outline" />
              )}
            </div>
          </li>
          {others.map((member, i) => (
            <li key={member.id} className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Member {i + 2}</p>
              <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5">
                <Identicon
                  hash={member.user.username}
                  size={28}
                  className="rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.user.name ?? member.user.username}{" "}
                    <span className="font-normal text-muted-foreground">
                      @{member.user.username}
                    </span>
                  </p>
                </div>
                <PasskeyStatus ready={!!member.user.commsPublicKey} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="Remove from treasury"
                  onClick={() =>
                    run(
                      () => removeMember({ variables: { id: member.id } }),
                      "Couldn't remove the member."
                    )
                  }
                >
                  <X />
                </Button>
              </div>
            </li>
          ))}
          {treasury.invites.map((invite, i) => (
            <li key={invite.id} className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Member {others.length + i + 2} · invite link
              </p>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-muted px-3 py-2.5">
                  <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {joinUrl(invite.token)}
                  </span>
                </div>
                <CopyLink url={joinUrl(invite.token)} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    run(
                      () => revokeInvite({ variables: { id: invite.id } }),
                      "Couldn't revoke the link."
                    )
                  }
                >
                  Revoke
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                For one person only. Expires{" "}
                {new Date(invite.expiresAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                .
              </p>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          className="w-full"
          disabled={inviting}
          onClick={() =>
            run(() => createInvite(), "Couldn't create an invite link.")
          }
        >
          <Plus />
          {inviting ? "Creating link..." : "Add Member"}
        </Button>
        <Caution>
          Only invite people you trust to co-sign payments. Each member holds a
          share of the treasury key, sealed by their own passkey. Nobody, not
          even Zalary, holds the whole key.
        </Caution>
      </SetupCard>

      <SetupCard title="Set approval threshold">
        <div className="grid gap-6 sm:grid-cols-[1fr_12rem] sm:items-center">
          <div className="space-y-2">
            <Slider
              min={2}
              max={maxThreshold}
              step={1}
              value={[threshold]}
              disabled={slots < 2}
              onValueChange={([value]) => setDragging(value)}
              onValueCommit={([value]) =>
                run(
                  () => updateTreasury({ variables: { threshold: value } }),
                  "Couldn't update the threshold."
                ).finally(() => setDragging(null))
              }
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2</span>
              <span>{maxThreshold}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="block text-2xl font-medium text-foreground">
              {threshold}/{slots}
            </span>
            members must approve each payment
          </p>
        </div>
        {slots < 2 ? (
          <Caution>
            Add at least one more member. FROST multisig needs two or more
            signers.
          </Caution>
        ) : (
          threshold >= slots && (
            <Caution>
              Every member must sign. If anyone loses their passkey, the
              treasury's funds are locked for good. Add a backup member or lower
              the threshold.
            </Caution>
          )
        )}
        <ErrorLine error={error} />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={onBack}>
            Back
          </Button>
          <Button size="lg" onClick={onNext} disabled={slots < 2}>
            Next
          </Button>
        </div>
      </SetupCard>
    </>
  )
}

function StatTile({
  value,
  label,
  icon: Icon,
}: {
  value: ReactNode
  label: string
  icon?: typeof Users
}) {
  return (
    <div className="relative rounded-lg bg-muted px-4 py-3">
      {Icon && (
        <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-md bg-background">
          <Icon className="size-3.5" />
        </span>
      )}
      <p className="text-3xl font-medium">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function ReviewStep({
  treasury,
  onBack,
}: {
  treasury: TreasuryFieldsFragment
  onBack: () => void
}) {
  const vault = useVault()
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [startKeygen] = useMutation(StartTreasuryKeygenDocument, {
    refetchQueries: [TreasuryDocument, MeLayoutDocument],
  })

  const blockers = [
    ...(treasury.invites.length > 0
      ? [
          `${treasury.invites.length} invite link${treasury.invites.length > 1 ? "s haven't" : " hasn't"} been used yet.`,
        ]
      : []),
    ...treasury.members
      .filter((m) => !m.user.commsPublicKey)
      .map((m) =>
        m.isCoordinator
          ? "Set up your passkey."
          : `@${m.user.username} hasn't set up a passkey yet.`
      ),
    ...(treasury.members.length < 2 ? ["Add at least one more member."] : []),
  ]

  async function handleStart() {
    setError(null)
    setStarting(true)
    try {
      const keys = await vault.unlock()
      const participants = treasury.members.map((m) => m.user.commsPublicKey!)
      const dkgSessionId = await openCeremonySession(keys, participants)
      await startKeygen({ variables: { dkgSessionId } })
    } catch (err) {
      setError(message(err, "Couldn't start the key ceremony."))
      setStarting(false)
    }
  }

  return (
    <>
      <StepHeading
        title="Review and confirm"
        description="One last look before the treasury's keys are created."
      />
      <SetupCard title="Review your Treasury">
        <div className="flex items-center gap-4">
          <Identicon hash={treasury.name} size={40} className="rounded-full" />
          <div className="min-w-0">
            <p className="truncate text-3xl font-medium">{treasury.name}</p>
            {treasury.description && (
              <p className="truncate text-sm text-muted-foreground">
                {treasury.description}
              </p>
            )}
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile
            value={treasury.members.length}
            label="Members"
            icon={Users}
          />
          <StatTile
            value={`${treasury.threshold}/${treasury.members.length}`}
            label="Threshold"
            icon={ShieldCheck}
          />
          <StatTile
            value={ZCASH_NETWORK === "main" ? "ZEC" : "TAZ"}
            label={ZCASH_NETWORK === "main" ? "Mainnet" : "Testnet"}
          />
        </div>
        <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          Starting the key ceremony locks the members and threshold. Everyone
          needs this page open while the keys are created, which takes under a
          minute. Each member's share is sealed with their passkey.
        </p>
        {blockers.length > 0 && (
          <ul className="space-y-1">
            {blockers.map((blocker) => (
              <li key={blocker}>
                <Caution>{blocker}</Caution>
              </li>
            ))}
          </ul>
        )}
        <ErrorLine error={error} />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={onBack}>
            Back
          </Button>
          <Button
            size="lg"
            onClick={handleStart}
            disabled={starting || blockers.length > 0}
          >
            {starting && <Loader2 className="animate-spin" />}
            {starting ? "Starting..." : "Start key ceremony"}
          </Button>
        </div>
      </SetupCard>
    </>
  )
}

/** What members who aren't the coordinator see before the ceremony. */
function MemberWaitingRoom({ treasury }: { treasury: TreasuryFieldsFragment }) {
  const vault = useVault()
  return (
    <div className="space-y-10 py-4">
      <StepHeading
        title={`Joining ${treasury.name}`}
        description={`@${treasury.coordinator.username} is setting up this treasury. Keep this page open when they start the key ceremony.`}
      />
      <SetupCard title="Your key share">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Your share of the treasury key will be sealed with your passkey, so
            only you can use it.
          </p>
          {vault.hasPasskey ? (
            <PasskeyStatus ready />
          ) : (
            <VaultButton size="sm" />
          )}
        </div>
      </SetupCard>
      <SetupCard title={`Members · ${treasury.threshold} must approve`}>
        <ul className="space-y-2">
          {treasury.members.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5"
            >
              <Identicon
                hash={member.user.username}
                size={28}
                className="rounded-md"
              />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {member.user.name ?? member.user.username}{" "}
                <span className="font-normal text-muted-foreground">
                  @{member.user.username}
                </span>
              </p>
              {member.isCoordinator && (
                <span className="text-xs text-muted-foreground">
                  Coordinator
                </span>
              )}
              <PasskeyStatus ready={!!member.user.commsPublicKey} />
            </li>
          ))}
        </ul>
        <p className={cn("text-xs text-muted-foreground")}>
          The coordinator can still add members before the ceremony.
        </p>
      </SetupCard>
    </div>
  )
}
