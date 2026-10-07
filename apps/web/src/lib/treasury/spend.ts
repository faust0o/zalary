/**
 * Treasury spends: one transaction paying a batch of payroll payments,
 * authorized by `threshold` members with rerandomized FROST.
 *
 * 1. The coordinator builds and proves a PCZT for the batch, keeps it, opens a
 *    frostd session for every signer and proposes a redacted copy (without
 *    the treasury's viewing key and the spent notes), sealed under the account
 *    key with everything else about the payment (see sealed-spend.ts).
 * 2. Approving is FROST round 1: a member checks the PCZT against the payroll
 *    and the treasury's viewing key, commits to fresh nonces and seals them
 *    on their device together with the sighash and randomizers they checked,
 *    then sends the commitments to the coordinator.
 * 3. Once `threshold` members approved, the coordinator sends those members
 *    the signing package for its own PCZT. Signing is round 2: each of them
 *    signs only the sighash and randomizers they approved.
 * 4. The coordinator aggregates the shares into one spend-auth signature per
 *    spend, applies them to its own PCZT and broadcasts the transaction.
 *
 * frostd keeps undelivered messages for a day, so members can do their part
 * whenever they're around; whatever a browser has received is persisted
 * (sealed) because frostd forgets messages once delivered.
 */
import { fromBase64, fromUtf8, toBase64, toHex, fromHex, utf8 } from "../bytes"
import {
  frostAggregate,
  frostBuildSigningPackage,
  frostCommit,
  frostSign,
  noiseDecrypt,
  noiseEncrypt,
  pcztApplySignatures,
  pcztRedactForSigners,
  pcztSummary,
  provePczt,
  type PcztSummary,
  type SpendPool,
} from "../frost"
import { FrostdClient } from "../frostd"
import { unsealText, VAULT_CONTEXT, type VaultKeys } from "../vault"
import { sendTransaction } from "../lightwalletd"
import { createPczt, extractTransaction } from "../zcash-wallet"
import {
  BLOCK_TIME_SECONDS,
  LIGHTWALLETD_URL,
  ZCASH_NETWORK,
} from "../zcash-network"
import {
  buildPaymentRequest,
  zecToZat,
  type PaymentLine,
} from "./payment-request"
import { loadSpendState, saveSpendState } from "./secure-store"
import { openViewingKey, type VerifiedViewingKey } from "./viewing-key"

/** Proposals live 23h (frostd drops idle sessions after 24h); stay valid a bit longer. */
export const EXPIRY_DELTA_BLOCKS = Math.ceil((25 * 3600) / BLOCK_TIME_SECONDS)

// Sending waits behind any wallet sync that's running, so allow for that.
const FINISH_STEP_TIMEOUT_MS = 5 * 60_000

/**
 * One step of finishing a spend. Failures and hangs name the step, so the
 * problem the coordinator reports says where the spend got stuck.
 */
async function finishStep<T>(
  name: string,
  work: (setStage: (stage: string) => void) => Promise<T>,
  onStage?: (stage: string) => void
): Promise<T> {
  let current = name
  const setStage = (stage: string) => {
    current = stage
    onStage?.(stage)
  }
  setStage(name)
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("timed out")),
      FINISH_STEP_TIMEOUT_MS
    )
  })
  try {
    return await Promise.race([work(setStage), timeout])
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`${current} failed: ${reason}`)
  } finally {
    clearTimeout(timer)
  }
}

export interface TreasuryMemberInfo {
  user: { id: string; commsPublicKey?: string | null }
  identifier?: string | null
  hasKeyShare: boolean
}

export interface TreasuryInfo {
  id: string
  threshold: number
  isCoordinator: boolean
  publicKeyPackage?: string | null
  address?: string | null
  /** Published at setup; change must go here. */
  changeAddress?: string | null
  /** Coordinator only. */
  encryptedViewingKey?: string | null
  coordinator: { id: string; commsPublicKey?: string | null }
  members: TreasuryMemberInfo[]
  myMembership?: {
    identifier?: string | null
    encryptedKeyPackage?: string | null
    viewingKeyMessage?: string | null
  } | null
}

export interface ProposalSpendInfo {
  pool: string
  index: number
  alpha: string
}

export interface ProposalInfo {
  id: string
  status: string
  pczt: string
  sighash: string
  spends: ProposalSpendInfo[]
  frostSessionId: string
  signerIds: string[]
  approvals: {
    user: { id: string }
    decision: string
    signedAt?: string | null
  }[]
}

export interface ExpectedPayment {
  address: string
  amountZec: number
  label: string
}

interface ParticipantState {
  /** serde_json Vec<SigningNonces>; emptied the moment it is used. */
  nonces: string
  commitments: string
  /**
   * The sighash and randomizers this member checked and approved. The nonces
   * only ever sign these, whatever the server says later.
   */
  sighash?: string
  alphas?: string[]
  /** Noise state of this member's channel to the coordinator. */
  sendState: string | null
  /** Hex ciphertexts, kept so a failed send can be retried verbatim. */
  commitmentMessage: string | null
  commitmentSent: boolean
  signingPackage: string | null
  sharesMessage: string | null
  done: boolean
}

interface CoordinatorState {
  /** Noise state of each member's channel to the coordinator. */
  recv: Record<string, string>
  /** identifier → Vec<SigningCommitments> JSON */
  commitments: Record<string, string>
  /** identifier → Vec<SignatureShare> JSON */
  shares: Record<string, string>
  signers: string[] | null
  signingPackage: string | null
  /** Comms keys the signing package went out to. */
  sentTo: string[]
  /**
   * The full proven PCZT (base64) this browser proposed. Only a redacted copy
   * went to the server; signatures are applied to this one.
   */
  pczt?: string | null
  /** The finished transaction (raw base64), kept so a retry only resends it. */
  transaction?: { txid: string; raw: string } | null
  /** Set once lightwalletd took the transaction. */
  txid: string | null
}

const emptyCoordinatorState = (): CoordinatorState => ({
  recv: {},
  commitments: {},
  shares: {},
  signers: null,
  signingPackage: null,
  sentTo: [],
  txid: null,
})

function client(keys: VaultKeys): FrostdClient {
  return new FrostdClient(keys.commsSecret, keys.commsPublicKey)
}

async function myKeyPackage(
  treasury: TreasuryInfo,
  keys: VaultKeys
): Promise<{ keyPackage: string; identifier: string }> {
  const membership = treasury.myMembership
  if (!membership?.encryptedKeyPackage || !membership.identifier) {
    throw new Error("You don't hold a key share for this treasury.")
  }
  return {
    keyPackage: await unsealText(
      keys,
      membership.encryptedKeyPackage,
      VAULT_CONTEXT.keyPackage(treasury.id)
    ),
    identifier: membership.identifier,
  }
}

const alphasOf = (proposal: ProposalInfo) => proposal.spends.map((s) => s.alpha)

function coordinatorKey(treasury: TreasuryInfo): string {
  const key = treasury.coordinator.commsPublicKey
  if (!key) throw new Error("The coordinator has no passkey set up.")
  return key
}

export interface ProposalCheck {
  summary: PcztSummary
  problems: string[]
}

// Room for lightwalletd lag and for blocks mined between proposing and
// approving.
const EXPIRY_SLACK_BLOCKS = 20

/**
 * Decode the proposal's PCZT here, in this browser, and compare it with what
 * the payroll says. With the treasury's viewing key (checked against this
 * member's key share), change is proven to come back to the treasury. The fee
 * may not exceed the standard one, and the transaction must expire within a
 * day of `chainTip`, so it can't be held back and sent much later.
 */
export async function checkProposal(
  proposal: ProposalInfo,
  expected: ExpectedPayment[],
  viewingKey: VerifiedViewingKey,
  chainTip: number
): Promise<ProposalCheck> {
  const summary = await pcztSummary(
    fromBase64(proposal.pczt),
    ZCASH_NETWORK,
    viewingKey.ufvk
  )
  const problems: string[] = []

  if (summary.sighash !== proposal.sighash) {
    problems.push(
      "The transaction doesn't match the signature hash being signed."
    )
  }
  const spendsMatch =
    summary.spends.length === proposal.spends.length &&
    summary.spends.every(
      (s, i) =>
        s.pool === proposal.spends[i].pool &&
        s.index === proposal.spends[i].index &&
        s.alpha === proposal.spends[i].alpha
    )
  if (!spendsMatch) {
    problems.push("The spends to sign don't match the transaction.")
  }

  if (BigInt(summary.feeZat) > BigInt(summary.conventionalFeeZat)) {
    problems.push(
      `The fee is ${Number(summary.feeZat) / 1e8} ZEC, more than the standard ${Number(summary.conventionalFeeZat) / 1e8} ZEC.`
    )
  }
  if (summary.expiryHeight === 0) {
    problems.push("The transaction never expires.")
  } else if (summary.expiryHeight <= chainTip) {
    problems.push("The transaction has already expired.")
  } else if (
    summary.expiryHeight >
    chainTip + EXPIRY_DELTA_BLOCKS + EXPIRY_SLACK_BLOCKS
  ) {
    problems.push(
      "The transaction stays valid for much longer than a day, so it could be sent long after you approved it."
    )
  }

  // Change is whatever pays the treasury's own key: proven, not labelled.
  const unmatched = summary.outputs.filter((o) => !o.change)
  for (const payment of expected) {
    const amount = zecToZat(payment.amountZec).toString()
    const i = unmatched.findIndex(
      (o) => o.address === payment.address.trim() && o.valueZat === amount
    )
    if (i === -1) {
      problems.push(
        `No output pays ${payment.label} exactly as the payroll says.`
      )
    } else {
      unmatched.splice(i, 1)
    }
  }
  for (const output of unmatched) {
    problems.push(
      `Unexpected payment of ${Number(output.valueZat) / 1e8} ZEC to ${output.address ?? "an unknown address"}.`
    )
  }
  return { summary, problems }
}

/**
 * Build, prove and open a spend for the given payments. Returns what gets
 * sealed into the proposal. Coordinator only: it needs the treasury wallet.
 */
export async function buildSpend(opts: {
  keys: VaultKeys
  treasury: TreasuryInfo
  payments: (PaymentLine & { label: string })[]
  onStatus?: (status: string) => void
}) {
  const { keys, treasury, payments, onStatus } = opts
  const paymentRequest = buildPaymentRequest(payments)
  if (!treasury.isCoordinator) {
    throw new Error("Only the coordinator can build treasury payments.")
  }
  // Also checks the published addresses, which the members will rely on.
  const { ufvk } = await openViewingKey(treasury, keys)

  onStatus?.("Building the transaction…")
  const unproven = await createPczt(paymentRequest, EXPIRY_DELTA_BLOCKS)
  onStatus?.("Creating zero-knowledge proofs. This can take a minute…")
  const pczt = await provePczt(unproven)
  // With the viewing key, change is proven to come back to the treasury.
  const summary = await pcztSummary(pczt, ZCASH_NETWORK, ufvk)
  if (summary.spends.length === 0)
    throw new Error("The transaction spends nothing.")
  // The other signers get everything but the viewing key and the spent notes
  // (the server only sees it sealed); this browser keeps the full PCZT to
  // finish the spend.
  const forSigners = await pcztRedactForSigners(pczt)

  const signers = treasury.members
    .filter((m) => m.hasKeyShare && m.user.commsPublicKey)
    .map((m) => m.user.commsPublicKey!)
  onStatus?.("Opening the signing session…")
  const relay = client(keys)
  let frostSessionId: string
  try {
    frostSessionId = await relay.createSession(signers, summary.spends.length)
  } finally {
    await relay.logout().catch(() => {})
  }

  const totalZat = summary.outputs
    .filter((o) => !o.change)
    .reduce((sum, o) => sum + BigInt(o.valueZat), 0n)

  return {
    /** What the transaction commits to; part of the sealed SpendDetails. */
    transaction: {
      paymentRequest,
      sighash: summary.sighash,
      spends: summary.spends.map(({ pool, index, alpha }) => ({
        pool,
        index,
        alpha,
      })),
      totalZat: totalZat.toString(),
      feeZat: summary.feeZat,
      expiryHeight: summary.expiryHeight,
    },
    /** The copy the signers check (base64), sealed into the proposal. */
    pczt: toBase64(forSigners),
    frostSessionId,
    /** Never leaves this browser; pass it to `keepProposedPczt`. */
    fullPczt: toBase64(pczt),
  }
}

/**
 * Keep the full PCZT of a spend this browser just proposed, sealed on this
 * device. The coordinator signs and broadcasts from it.
 */
export function keepProposedPczt(
  keys: VaultKeys,
  proposalId: string,
  fullPczt: string
): Promise<void> {
  return withSpendLock(proposalId, async () => {
    const state =
      (await loadSpendState<CoordinatorState>(
        keys,
        proposalId,
        "coordinator"
      )) ?? emptyCoordinatorState()
    state.pczt = fullPczt
    await saveSpendState(keys, proposalId, "coordinator", state)
  })
}

/**
 * The sighash and randomizers a PCZT commits to, read from the PCZT itself.
 * Throws if the proposal on record claims otherwise.
 */
async function pinnedTransaction(
  pczt: Uint8Array,
  proposal: ProposalInfo
): Promise<{ sighash: string; spends: ProposalSpendInfo[] }> {
  const summary = await pcztSummary(pczt, ZCASH_NETWORK)
  const spends = summary.spends.map(({ pool, index, alpha }) => ({
    pool,
    index,
    alpha,
  }))
  if (
    summary.sighash !== proposal.sighash ||
    JSON.stringify(spends) !==
      JSON.stringify(
        proposal.spends.map(({ pool, index, alpha }) => ({
          pool,
          index,
          alpha,
        }))
      )
  ) {
    throw new Error(
      "The payment on the server isn't the transaction that was checked. Cancel it."
    )
  }
  return { sighash: summary.sighash, spends }
}

/**
 * Round 1. Commit to nonces for every spend and send the commitments to the
 * coordinator (or, for the coordinator, straight into its own state). The
 * caller records the approval on the server afterwards.
 */
async function approveSpendUnlocked(
  proposal: ProposalInfo,
  treasury: TreasuryInfo,
  keys: VaultKeys,
  isCoordinator: boolean
): Promise<void> {
  const existing = await loadSpendState<ParticipantState>(
    keys,
    proposal.id,
    "participant"
  )
  // The caller checked this PCZT just now; whatever happens later, these
  // nonces only sign what it commits to.
  const pinned = await pinnedTransaction(fromBase64(proposal.pczt), proposal)
  const alphas = pinned.spends.map((s) => s.alpha)
  let state: ParticipantState
  if (existing) {
    state = existing
    if (!state.sighash && !state.commitmentSent) {
      state = { ...state, sighash: pinned.sighash, alphas }
      await saveSpendState(keys, proposal.id, "participant", state)
    }
  } else {
    const { keyPackage } = await myKeyPackage(treasury, keys)
    const { nonces, commitments } = await frostCommit(keyPackage, alphas.length)
    state = {
      nonces,
      commitments,
      sighash: pinned.sighash,
      alphas,
      sendState: null,
      commitmentMessage: null,
      commitmentSent: false,
      signingPackage: null,
      sharesMessage: null,
      done: false,
    }
    await saveSpendState(keys, proposal.id, "participant", state)
  }
  if (state.commitmentSent) return

  if (isCoordinator) {
    const { identifier } = await myKeyPackage(treasury, keys)
    const coordinator =
      (await loadSpendState<CoordinatorState>(
        keys,
        proposal.id,
        "coordinator"
      )) ?? emptyCoordinatorState()
    coordinator.commitments[identifier] = state.commitments
    await saveSpendState(keys, proposal.id, "coordinator", coordinator)
  } else {
    const coordinatorPub = coordinatorKey(treasury)
    const relay = client(keys)
    try {
      const info = await relay.sessionInfo(proposal.frostSessionId)
      if (info.coordinatorPubkey !== coordinatorPub) {
        throw new Error(
          "The signing session isn't run by the treasury's coordinator."
        )
      }
      if (!state.commitmentMessage) {
        const { state: sendState, ciphertext } = await noiseEncrypt(
          keys.commsSecret,
          coordinatorPub,
          null,
          utf8(state.commitments)
        )
        state = { ...state, sendState, commitmentMessage: toHex(ciphertext) }
        await saveSpendState(keys, proposal.id, "participant", state)
      }
      await relay.send(
        proposal.frostSessionId,
        [],
        fromHex(state.commitmentMessage!)
      )
    } finally {
      await relay.logout().catch(() => {})
    }
  }
  state = { ...state, commitmentSent: true }
  await saveSpendState(keys, proposal.id, "participant", state)
}

export type SignOutcome = "signed" | "waiting" | "not-approved-here"

/**
 * What a member's nonces may sign: the sighash and randomizers they approved.
 * A signing package for anything else is refused.
 */
function approvedTransaction(
  state: ParticipantState,
  proposal: ProposalInfo
): { sighash: string; alphas: string[] } {
  if (!state.sighash || !state.alphas) {
    throw new Error(
      "You approved this payment before an update. Reject it and ask the coordinator to propose it again."
    )
  }
  if (
    state.sighash !== proposal.sighash ||
    state.alphas.join() !== alphasOf(proposal).join()
  ) {
    throw new Error(
      "This payment changed after you approved it, so your browser won't sign it."
    )
  }
  return { sighash: state.sighash, alphas: state.alphas }
}

/**
 * Round 2 for a member who isn't the coordinator: fetch the signing package,
 * check it, and send signature shares. "waiting" until it has arrived.
 */
async function signSpendUnlocked(
  proposal: ProposalInfo,
  treasury: TreasuryInfo,
  keys: VaultKeys
): Promise<SignOutcome> {
  let state = await loadSpendState<ParticipantState>(
    keys,
    proposal.id,
    "participant"
  )
  if (!state) return "not-approved-here"
  if (state.done) return "signed"

  const coordinatorPub = coordinatorKey(treasury)
  const relay = client(keys)
  try {
    if (!state.signingPackage) {
      const msgs = await relay.receive(proposal.frostSessionId, false)
      const fromCoordinator = msgs.find((m) => m.sender === coordinatorPub)
      if (!fromCoordinator) return "waiting"
      const { plaintext } = await noiseDecrypt(
        keys.commsSecret,
        coordinatorPub,
        null,
        fromCoordinator.msg
      )
      state = { ...state, signingPackage: fromUtf8(plaintext) }
      await saveSpendState(keys, proposal.id, "participant", state)
    }

    if (!state.sharesMessage) {
      if (!state.nonces)
        throw new Error("This approval's nonces were already used.")
      const approved = approvedTransaction(state, proposal)
      const { keyPackage } = await myKeyPackage(treasury, keys)
      let shares: string
      try {
        shares = await frostSign(
          keyPackage,
          state.nonces,
          state.signingPackage!,
          approved.sighash,
          approved.alphas
        )
      } catch (err) {
        // Never offer these nonces to another signing package.
        await saveSpendState(keys, proposal.id, "participant", {
          ...state,
          nonces: "",
        })
        throw err
      }
      const { state: sendState, ciphertext } = await noiseEncrypt(
        keys.commsSecret,
        coordinatorPub,
        state.sendState,
        utf8(shares)
      )
      // Nonces must never sign twice: drop them before anything can fail.
      state = {
        ...state,
        nonces: "",
        sendState,
        sharesMessage: toHex(ciphertext),
      }
      await saveSpendState(keys, proposal.id, "participant", state)
    }

    await relay.send(proposal.frostSessionId, [], fromHex(state.sharesMessage!))
    state = { ...state, done: true }
    await saveSpendState(keys, proposal.id, "participant", state)
    return "signed"
  } finally {
    await relay.logout().catch(() => {})
  }
}

function isSignatureShares(payload: unknown): boolean {
  return (
    Array.isArray(payload) &&
    payload.length > 0 &&
    typeof payload[0] === "object" &&
    payload[0] !== null &&
    "share" in payload[0]
  )
}

export interface CoordinatorActions {
  /** Record who signs; the signing package has gone out to them. */
  setSigners: (userIds: string[]) => Promise<void>
  /** Record the coordinator's own signature. */
  markSigned: () => Promise<void>
  markBroadcast: (txid: string) => Promise<void>
  /** A step that can take a while started, e.g. "Sending the transaction". */
  onStage?: (stage: string) => void
}

export type CoordinatorProgress =
  | { stage: "collecting"; commitments: number }
  | { stage: "signing"; shares: number; signers: number }
  | { stage: "broadcast"; txid: string }

/**
 * One pass of the coordinator: take in new messages, send the signing
 * package once enough members approved, and finish the transaction once every
 * signer's shares are in. Safe to call repeatedly.
 */
async function coordinateSpendUnlocked(
  proposal: ProposalInfo,
  treasury: TreasuryInfo,
  keys: VaultKeys,
  actions: CoordinatorActions
): Promise<CoordinatorProgress> {
  const state =
    (await loadSpendState<CoordinatorState>(
      keys,
      proposal.id,
      "coordinator"
    )) ?? emptyCoordinatorState()
  const save = () => saveSpendState(keys, proposal.id, "coordinator", state)
  // Signing packages and signatures come from the PCZT this browser proposed,
  // never from the server's copy.
  let proposed: Promise<{
    pczt: Uint8Array
    sighash: string
    spends: ProposalSpendInfo[]
  }> | null = null
  const ownTransaction = () => {
    if (!state.pczt) {
      throw new Error(
        "This payment was proposed from another browser or before an update. Cancel it and propose it again here."
      )
    }
    const pczt = fromBase64(state.pczt)
    proposed ??= pinnedTransaction(pczt, proposal).then((pinned) => ({
      pczt,
      ...pinned,
    }))
    return proposed
  }
  const memberOf = (userId: string) =>
    treasury.members.find((m) => m.user.id === userId)
  const { identifier: myIdentifier } = await myKeyPackage(treasury, keys)

  // The coordinator's own commitments, should they ever have gone missing.
  if (!state.commitments[myIdentifier]) {
    const own = await loadSpendState<ParticipantState>(
      keys,
      proposal.id,
      "participant"
    )
    if (own?.commitmentSent && own.nonces) {
      state.commitments[myIdentifier] = own.commitments
      await save()
    }
  }

  const relay = client(keys)
  try {
    // 1. Take in commitments and shares. frostd forgets them on delivery.
    const msgs = await relay.receive(proposal.frostSessionId, true)
    for (const { sender, msg } of msgs) {
      const member = treasury.members.find(
        (m) => m.user.commsPublicKey === sender
      )
      if (!member?.identifier || !member.hasKeyShare) continue
      let decrypted
      try {
        decrypted = await noiseDecrypt(
          keys.commsSecret,
          sender,
          state.recv[sender] ?? null,
          msg
        )
      } catch (err) {
        console.warn("[treasury] Dropping undecryptable message", err)
        continue
      }
      state.recv[sender] = decrypted.state
      const payload = fromUtf8(decrypted.plaintext)
      if (isSignatureShares(JSON.parse(payload))) {
        state.shares[member.identifier] = payload
      } else {
        state.commitments[member.identifier] = payload
      }
      await save()
    }

    // 2. Enough approvals: fix the signers and build the signing package.
    if (!state.signingPackage) {
      const ready = proposal.approvals
        .filter((a) => a.decision === "APPROVE")
        .map((a) => a.user.id)
        .filter((userId) => {
          const identifier = memberOf(userId)?.identifier
          return identifier && state.commitments[identifier]
        })
      if (ready.length < treasury.threshold) {
        return { stage: "collecting", commitments: ready.length }
      }
      const signers = ready.slice(0, treasury.threshold)
      const own = await ownTransaction()
      state.signingPackage = await frostBuildSigningPackage(
        Object.fromEntries(
          signers.map((userId) => {
            const identifier = memberOf(userId)!.identifier!
            return [identifier, state.commitments[identifier]]
          })
        ),
        own.sighash,
        own.spends.map((s) => s.alpha)
      )
      state.signers = signers
      await save()
    }
    const signers = state.signers!

    // 3. Send the signing package to the other signers.
    for (const userId of signers) {
      if (userId === treasury.coordinator.id) continue
      const pub = memberOf(userId)?.user.commsPublicKey
      if (!pub || state.sentTo.includes(pub)) continue
      const { ciphertext } = await noiseEncrypt(
        keys.commsSecret,
        pub,
        null,
        utf8(state.signingPackage)
      )
      await relay.send(proposal.frostSessionId, [pub], ciphertext)
      state.sentTo.push(pub)
      await save()
    }
    if (proposal.status === "AWAITING_APPROVALS") {
      await actions.setSigners(signers)
    }

    // The coordinator's own shares, from the nonces it approved with.
    if (
      signers.includes(treasury.coordinator.id) &&
      !state.shares[myIdentifier]
    ) {
      const own = await loadSpendState<ParticipantState>(
        keys,
        proposal.id,
        "participant"
      )
      if (!own?.nonces)
        throw new Error("Your approval's nonces aren't on this device.")
      const approved = approvedTransaction(own, proposal)
      if (approved.sighash !== (await ownTransaction()).sighash) {
        throw new Error("You approved a different transaction than this one.")
      }
      const { keyPackage } = await myKeyPackage(treasury, keys)
      // Nonces are single use whether or not signing succeeds.
      const shares = await frostSign(
        keyPackage,
        own.nonces,
        state.signingPackage,
        approved.sighash,
        approved.alphas
      ).finally(() =>
        saveSpendState(keys, proposal.id, "participant", {
          ...own,
          nonces: "",
          done: true,
        })
      )
      state.shares[myIdentifier] = shares
      await save()
      await actions.markSigned()
    }

    // 4. All shares in: aggregate, sign the PCZT, broadcast.
    const signerIdentifiers = signers.map(
      (userId) => memberOf(userId)!.identifier!
    )
    const received = signerIdentifiers.filter((id) => state.shares[id]).length
    if (received < signers.length) {
      return { stage: "signing", shares: received, signers: signers.length }
    }

    if (!state.txid) {
      if (!state.transaction) {
        if (!treasury.publicKeyPackage)
          throw new Error("The treasury has no public key package.")
        const publicKeyPackage = treasury.publicKeyPackage
        const own = await ownTransaction()
        const signatures = await finishStep(
          "Combining the signatures",
          () =>
            frostAggregate(
              state.signingPackage!,
              Object.fromEntries(
                signerIdentifiers.map((id) => [id, state.shares[id]])
              ),
              publicKeyPackage
            ),
          actions.onStage
        )
        const signed = await finishStep(
          "Signing the transaction",
          () =>
            pcztApplySignatures(
              own.pczt,
              own.spends.map((spend, i) => ({
                pool: spend.pool as SpendPool,
                index: spend.index,
                signature: signatures[i],
              }))
            ),
          actions.onStage
        )
        // The wallet handles one call at a time, so this may wait for a sync.
        const { txid, raw } = await finishStep(
          "Waiting for the wallet sync to finish",
          (setStage) =>
            extractTransaction(signed, () =>
              setStage("Checking the transaction")
            ),
          actions.onStage
        )
        state.transaction = { txid, raw: toBase64(raw) }
        await save()
      }
      const { txid, raw } = state.transaction
      await finishStep(
        "Sending the transaction",
        () => sendTransaction(LIGHTWALLETD_URL, fromBase64(raw)),
        actions.onStage
      )
      state.txid = txid
      await save()
      await relay.closeSession(proposal.frostSessionId).catch(() => {})
    }
    await actions.markBroadcast(state.txid)
    return { stage: "broadcast", txid: state.txid }
  } finally {
    await relay.logout().catch(() => {})
  }
}

// A pass reads a spend's state, changes it over several awaits and writes it
// back. The background agent and a click can overlap, so passes over the
// same spend take turns rather than lose each other's updates.
const spendLocks = new Map<string, Promise<unknown>>()

function withSpendLock<T>(
  proposalId: string,
  fn: () => Promise<T>
): Promise<T> {
  const previous = spendLocks.get(proposalId) ?? Promise.resolve()
  const run = previous.catch(() => {}).then(fn)
  spendLocks.set(proposalId, run)
  run
    .finally(() => {
      if (spendLocks.get(proposalId) === run) spendLocks.delete(proposalId)
    })
    .catch(() => {})
  return run
}

/** See approveSpendUnlocked: round 1 for one member. */
export function approveSpend(
  ...args: Parameters<typeof approveSpendUnlocked>
): Promise<void> {
  return withSpendLock(args[0].id, () => approveSpendUnlocked(...args))
}

/** See signSpendUnlocked: round 2 for one member. */
export function signSpend(
  ...args: Parameters<typeof signSpendUnlocked>
): Promise<SignOutcome> {
  return withSpendLock(args[0].id, () => signSpendUnlocked(...args))
}

/** See coordinateSpendUnlocked: one pass of the coordinator. */
export function coordinateSpend(
  ...args: Parameters<typeof coordinateSpendUnlocked>
): Promise<CoordinatorProgress> {
  return withSpendLock(args[0].id, () => coordinateSpendUnlocked(...args))
}
