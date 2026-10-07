/**
 * FROST (rerandomized, RedPallas), Noise and PCZT operations from
 * zcash-view-wasm, run in the wallet worker. Message payloads are the same
 * serde_json frost-client sends, so frost-client CLI users could take part.
 */
import { callWorker } from "./wasm-worker"
import type { ZcashNetwork } from "./zcash-network"

function call<T>(name: string, ...args: unknown[]): Promise<T> {
  return callWorker<T>("fn", { name, args })
}

/** Hex X25519 public key of a frostd comms secret. */
export function commsPublicKey(secret: Uint8Array): Promise<string> {
  return call("commsPublicKey", secret)
}

/** XEdDSA signature over a frostd login challenge. */
export function frostdSignChallenge(
  secret: Uint8Array,
  challenge: string
): Promise<string> {
  return call("frostdSignChallenge", secret, challenge)
}

export interface NoiseResult {
  state: string
  ciphertext: Uint8Array
}

/**
 * Encrypt on the one-way Noise_K channel to `peer`. `state` is null for the
 * channel's first message; persist the returned state to continue it.
 */
export function noiseEncrypt(
  secret: Uint8Array,
  peer: string,
  state: string | null,
  plaintext: Uint8Array
): Promise<NoiseResult> {
  return call("noiseEncrypt", secret, peer, state, plaintext)
}

export function noiseDecrypt(
  secret: Uint8Array,
  peer: string,
  state: string | null,
  ciphertext: Uint8Array
): Promise<{ state: string; plaintext: Uint8Array }> {
  return call("noiseDecrypt", secret, peer, state, ciphertext)
}

export interface Commitment {
  /** serde_json Vec<SigningNonces>. Secret, single use. */
  nonces: string
  /** serde_json Vec<SigningCommitments>, one per spend. */
  commitments: string
}

export function frostCommit(
  keyPackage: string,
  count: number
): Promise<Commitment> {
  return call("frostCommit", keyPackage, count)
}

/**
 * The signing packages for one SigningPackage per spend, as frost-client's
 * SendSigningPackageArgs JSON. `commitments` maps identifier to its
 * Vec<SigningCommitments> JSON.
 */
export function frostBuildSigningPackage(
  commitments: Record<string, string>,
  sighash: string,
  randomizers: string[]
): Promise<string> {
  return call(
    "frostBuildSigningPackage",
    jsonObject(commitments),
    sighash,
    randomizers
  )
}

/** Signature shares (Vec<SignatureShare> JSON) after checking the package. */
export function frostSign(
  keyPackage: string,
  nonces: string,
  signingPackage: string,
  sighash: string,
  randomizers: string[]
): Promise<string> {
  return call(
    "frostSign",
    keyPackage,
    nonces,
    signingPackage,
    sighash,
    randomizers
  )
}

/** Verified 64-byte spend-auth signatures, hex, one per spend. */
export function frostAggregate(
  signingPackage: string,
  shares: Record<string, string>,
  publicKeyPackage: string
): Promise<string[]> {
  return call(
    "frostAggregate",
    signingPackage,
    jsonObject(shares),
    publicKeyPackage
  )
}

/** Join identifier → JSON entries into one JSON object without reparsing. */
function jsonObject(entries: Record<string, string>): string {
  return `{${Object.entries(entries)
    .map(([key, value]) => `${JSON.stringify(key)}:${value}`)
    .join(",")}}`
}

export function treasuryViewingKey(
  groupPublicKey: string,
  network: ZcashNetwork
): Promise<{ ufvk: string; address: string; changeAddress: string }> {
  return call("treasuryViewingKey", groupPublicKey, network)
}

/**
 * The group key a treasury viewing key belongs to and the addresses it
 * derives, for checking a viewing key handed over by the coordinator.
 */
export function treasuryViewingKeyInfo(
  ufvk: string,
  network: ZcashNetwork
): Promise<{ groupPublicKey: string; address: string; changeAddress: string }> {
  return call("treasuryViewingKeyInfo", ufvk, network)
}

/** The group public key (hex) of a FROST key share. */
export function frostKeyPackageGroupKey(keyPackage: string): Promise<string> {
  return call("frostKeyPackageGroupKey", keyPackage)
}

/** The internal-scope address the treasury's spends send change to. */
export function treasuryChangeAddress(
  ufvk: string,
  network: ZcashNetwork
): Promise<string> {
  return call("treasuryChangeAddress", ufvk, network)
}

export function getChainTip(lightwalletdUrl: string): Promise<number> {
  return call<number | bigint>("getChainTip", lightwalletdUrl).then(Number)
}

export type SpendPool = "orchard" | "ironwood"

export interface PcztSpend {
  pool: SpendPool
  index: number
  alpha: string
  valueZat: string | null
}

export interface PcztOutput {
  pool: "transparent" | "sapling" | "orchard" | "ironwood"
  address: string | null
  valueZat: string
  memo: string | null
  change: boolean
}

export interface PcztSummary {
  txVersion: number
  sighash: string
  expiryHeight: number
  feeZat: string
  /** The ZIP-317 fee for this transaction's shape. */
  conventionalFeeZat: string
  spends: PcztSpend[]
  outputs: PcztOutput[]
}

/**
 * Decode and verify a PCZT. With the treasury's `ufvk`, change is proven to
 * belong to the treasury; without it, change is only as labelled.
 */
export function pcztSummary(
  pczt: Uint8Array,
  network: ZcashNetwork,
  ufvk?: string
): Promise<PcztSummary> {
  return call("pcztSummary", pczt, network, ufvk ?? null)
}

export function provePczt(pczt: Uint8Array): Promise<Uint8Array> {
  return call("provePczt", pczt)
}

/**
 * The copy of a proven PCZT to upload: without the treasury's full viewing
 * key, the spent notes and their witnesses, which only the coordinator needs.
 */
export function pcztRedactForSigners(pczt: Uint8Array): Promise<Uint8Array> {
  return call("pcztRedactForSigners", pczt)
}

export function pcztApplySignatures(
  pczt: Uint8Array,
  signatures: { pool: SpendPool; index: number; signature: string }[]
): Promise<Uint8Array> {
  return call("pcztApplySignatures", pczt, signatures)
}

/** A FROST DKG participant living in the worker. */
export class FrostDkgSession {
  private readonly handle: Promise<number>

  constructor(
    secret: Uint8Array,
    sessionId: string,
    participants: string[],
    minSigners: number
  ) {
    this.handle = callWorker<number>("dkg.new", {
      secret,
      sessionId,
      participants,
      minSigners,
    })
  }

  private async call<T>(method: string, ...args: unknown[]): Promise<T> {
    return callWorker<T>("dkg.call", {
      handle: await this.handle,
      method,
      args,
    })
  }

  identifier(): Promise<string> {
    return this.call("identifier")
  }

  identifierOf(pubkey: string): Promise<string> {
    return this.call("identifierOf", pubkey)
  }

  start(): Promise<{ recipient: string; msg: Uint8Array }[]> {
    return this.call("start")
  }

  receive(
    sender: string,
    msg: Uint8Array
  ): Promise<{ recipient: string; msg: Uint8Array }[]> {
    return this.call("receive", sender, msg)
  }

  isComplete(): Promise<boolean> {
    return this.call("isComplete")
  }

  result(): Promise<{
    identifier: string
    keyPackage: string
    publicKeyPackage: string
    groupPublicKey: string
  }> {
    return this.call("result")
  }

  async free(): Promise<void> {
    await callWorker("dkg.free", { handle: await this.handle })
  }
}
