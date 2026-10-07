/**
 * The account key: one random AES-256 key per account that seals all of its
 * payroll data (employees, payrolls, payroll runs and payments, treasury
 * spends and the treasury balance) before any of it reaches the server.
 *
 * The owner's browser makes it. Everyone with access to the account gets a
 * copy sealed to their public key (the X25519 key derived from their passkey
 * vault) as a one-way Noise_K message from whoever shared it, which also
 * proves who that was. The server stores those copies but can open none.
 */
import { fromBase64, fromHex, fromUtf8, randomBytes, toBase64, toHex, utf8 } from "./bytes"
import { noiseDecrypt, noiseEncrypt } from "./frost"
import { seal, unseal, type VaultKeys } from "./vault"

const PREFIX = "zalary/account-key/v1"

export interface AccountKey {
  accountId: string
  key: CryptoKey
  /** Needed to share the key with someone else. Never leaves memory. */
  raw: Uint8Array
}

/** The copy of the account key someone sealed to this user. */
export interface AccountKeyGrant {
  sealedKey: string
  /** The sharer's public key, which the message is authenticated with. */
  sealedBy: string
}

async function importKey(accountId: string, raw: Uint8Array): Promise<AccountKey> {
  const key = await crypto.subtle.importKey(
    "raw",
    raw.slice().buffer as ArrayBuffer,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  )
  return { accountId, key, raw }
}

// The message names the account, so a copy can't be passed off as another
// account's key, nor a FROST message as a key.
const header = (accountId: string) => `${PREFIX}\n${accountId}\n`

export function newAccountKey(accountId: string): Promise<AccountKey> {
  return importKey(accountId, randomBytes(32))
}

export async function openAccountKey(
  keys: VaultKeys,
  accountId: string,
  grant: AccountKeyGrant
): Promise<AccountKey> {
  const { plaintext } = await noiseDecrypt(
    keys.commsSecret,
    grant.sealedBy,
    null,
    fromHex(grant.sealedKey)
  )
  const text = fromUtf8(plaintext)
  if (!text.startsWith(header(accountId))) {
    throw new Error("This copy of the account key is for a different account.")
  }
  const raw = fromBase64(text.slice(header(accountId).length))
  if (raw.length !== 32) throw new Error("Malformed account key.")
  return importKey(accountId, raw)
}

/** Seal the account key to `publicKey`, from this user. */
export async function sealAccountKey(
  keys: VaultKeys,
  accountKey: AccountKey,
  publicKey: string
): Promise<string> {
  const { ciphertext } = await noiseEncrypt(
    keys.commsSecret,
    publicKey,
    null,
    utf8(header(accountKey.accountId) + toBase64(accountKey.raw))
  )
  return toHex(ciphertext)
}

/** AES-GCM additional data for what the account key seals. */
export const ACCOUNT_CONTEXT = {
  record: (accountId: string, recordId: string) =>
    `zalary/record/${accountId}/${recordId}`,
  spend: (accountId: string, proposalId: string) =>
    `zalary/spend/${accountId}/${proposalId}`,
  spendPczt: (accountId: string, proposalId: string) =>
    `zalary/spend/${accountId}/${proposalId}/pczt`,
  spendTxid: (accountId: string, proposalId: string) =>
    `zalary/spend/${accountId}/${proposalId}/txid`,
  balance: (accountId: string, treasuryId: string) =>
    `zalary/treasury-balance/${accountId}/${treasuryId}`,
}

export function sealBytes(
  accountKey: AccountKey,
  bytes: Uint8Array,
  context: string
): Promise<string> {
  return seal(accountKey.key, bytes, context)
}

export function openBytes(
  accountKey: AccountKey,
  sealed: string,
  context: string
): Promise<Uint8Array> {
  return unseal(accountKey.key, sealed, context)
}

export function sealJson(
  accountKey: AccountKey,
  value: unknown,
  context: string
): Promise<string> {
  return sealBytes(accountKey, utf8(JSON.stringify(value)), context)
}

export async function openJson<T>(
  accountKey: AccountKey,
  sealed: string,
  context: string
): Promise<T> {
  return JSON.parse(fromUtf8(await openBytes(accountKey, sealed, context))) as T
}

/** A short, readable form of a public key, for comparing it by eye. */
export function keyFingerprint(publicKey: string): string {
  return `${publicKey.slice(0, 4)} ${publicKey.slice(4, 8)} ${publicKey.slice(-8, -4)} ${publicKey.slice(-4)}`
}
