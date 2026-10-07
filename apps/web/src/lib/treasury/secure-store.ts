/**
 * Device-local signing state, sealed under the vault's data key.
 *
 * FROST nonces in particular stay on the device that made them: if they ever
 * came from the server, it could replay them against a second message and
 * recover the member's key share.
 */
import { del, get, set } from "idb-keyval"
import { sealText, unsealText, VAULT_CONTEXT, type VaultKeys } from "../vault"

export type SpendRole = "participant" | "coordinator"

const storeKey = (userId: string, proposalId: string, role: SpendRole) =>
  `spend:${userId}:${proposalId}:${role}`

export async function saveSpendState(
  keys: VaultKeys,
  proposalId: string,
  role: SpendRole,
  state: object
): Promise<void> {
  const sealed = await sealText(
    keys,
    JSON.stringify(state),
    VAULT_CONTEXT.spendState(proposalId, role)
  )
  await set(storeKey(keys.userId, proposalId, role), sealed)
}

export async function loadSpendState<T>(
  keys: VaultKeys,
  proposalId: string,
  role: SpendRole
): Promise<T | null> {
  const sealed = await get<string>(storeKey(keys.userId, proposalId, role))
  if (!sealed) return null
  return JSON.parse(
    await unsealText(keys, sealed, VAULT_CONTEXT.spendState(proposalId, role))
  ) as T
}

/** Whether this device holds state for the spend, without opening it. */
export async function hasSpendState(
  userId: string,
  proposalId: string,
  role: SpendRole
): Promise<boolean> {
  return (await get(storeKey(userId, proposalId, role))) !== undefined
}

export async function deleteSpendState(
  userId: string,
  proposalId: string,
  role: SpendRole
): Promise<void> {
  await del(storeKey(userId, proposalId, role))
}
