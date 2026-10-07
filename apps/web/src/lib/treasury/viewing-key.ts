/**
 * The treasury's viewing key, checked in this browser before it's trusted.
 *
 * The coordinator makes the viewing key at the end of the key ceremony and
 * seals a copy for itself; every other signer gets one Noise-encrypted to
 * their comms key. Whoever opens it checks that its spend validating key is
 * the group key from their own key share, and that the treasury's published
 * deposit and change addresses are the ones it derives. A coordinator or
 * server publishing its own address fails that check.
 */
import { fromHex, fromUtf8 } from "../bytes"
import {
  frostKeyPackageGroupKey,
  noiseDecrypt,
  treasuryViewingKeyInfo,
} from "../frost"
import { unsealText, VAULT_CONTEXT, type VaultKeys } from "../vault"
import { ZCASH_NETWORK } from "../zcash-network"

export interface ViewingKeyTreasury {
  id: string
  isCoordinator: boolean
  address?: string | null
  changeAddress?: string | null
  /** Coordinator only. */
  encryptedViewingKey?: string | null
  coordinator: { commsPublicKey?: string | null }
  myMembership?: {
    encryptedKeyPackage?: string | null
    viewingKeyMessage?: string | null
  } | null
}

export interface VerifiedViewingKey {
  ufvk: string
  address: string
  changeAddress: string
}

/** The coordinator hasn't handed this signer the viewing key yet. */
export class ViewingKeyNotShared extends Error {
  constructor() {
    super(
      "The coordinator hasn't shared the treasury's viewing key with you yet. It happens the next time they open Zalary."
    )
  }
}

/** Opening and checking costs a few worker calls; do it once per key. */
const cache = new Map<string, Promise<VerifiedViewingKey>>()

/**
 * Open the treasury's viewing key and check it against this member's own key
 * share and the treasury's published addresses. Throws if anything is off.
 */
export function openViewingKey(
  treasury: ViewingKeyTreasury,
  keys: VaultKeys
): Promise<VerifiedViewingKey> {
  const membership = treasury.myMembership
  const sealed = treasury.isCoordinator
    ? treasury.encryptedViewingKey
    : membership?.viewingKeyMessage
  const cacheKey = [
    keys.userId,
    treasury.id,
    treasury.address,
    treasury.changeAddress,
    sealed,
    membership?.encryptedKeyPackage,
  ].join("|")
  let opened = cache.get(cacheKey)
  if (!opened) {
    opened = open(treasury, keys)
    opened.catch(() => cache.delete(cacheKey))
    cache.set(cacheKey, opened)
  }
  return opened
}

async function open(
  treasury: ViewingKeyTreasury,
  keys: VaultKeys
): Promise<VerifiedViewingKey> {
  const membership = treasury.myMembership
  if (!membership?.encryptedKeyPackage) {
    throw new Error("You don't hold a key share for this treasury.")
  }

  let ufvk: string
  if (treasury.isCoordinator) {
    if (!treasury.encryptedViewingKey) {
      throw new Error("The treasury has no viewing key on record.")
    }
    ufvk = await unsealText(
      keys,
      treasury.encryptedViewingKey,
      VAULT_CONTEXT.viewingKey(treasury.id)
    )
  } else {
    const coordinatorKey = treasury.coordinator.commsPublicKey
    if (!membership.viewingKeyMessage || !coordinatorKey) {
      throw new ViewingKeyNotShared()
    }
    const { plaintext } = await noiseDecrypt(
      keys.commsSecret,
      coordinatorKey,
      null,
      fromHex(membership.viewingKeyMessage)
    )
    ufvk = fromUtf8(plaintext)
  }

  const [info, groupKey] = await Promise.all([
    treasuryViewingKeyInfo(ufvk, ZCASH_NETWORK),
    unsealText(
      keys,
      membership.encryptedKeyPackage,
      VAULT_CONTEXT.keyPackage(treasury.id)
    ).then(frostKeyPackageGroupKey),
  ])
  if (info.groupPublicKey !== groupKey) {
    throw new Error(
      "The treasury's viewing key doesn't belong to the key you hold a share of."
    )
  }
  if (info.address !== treasury.address) {
    throw new Error(
      "The treasury's published address isn't the one its key derives. Don't send funds to it."
    )
  }
  if (info.changeAddress !== treasury.changeAddress) {
    throw new Error(
      "The treasury's published change address isn't the one its key derives."
    )
  }
  return { ufvk, address: info.address, changeAddress: info.changeAddress }
}
