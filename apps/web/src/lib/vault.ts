/**
 * Passkey vault: the one place a user's treasury secrets are opened.
 *
 * Each user has a random 32-byte vault key. Every passkey they register wraps
 * it with a key derived from the passkey's WebAuthn PRF output, and the
 * server stores only that wrapping. From the vault key the browser derives
 *
 * - a data key (AES-GCM) that seals FROST key shares and the treasury viewing
 *   key before they are uploaded, and
 * - the X25519 secret behind the user's frostd identity, so their messaging
 *   key is the same on every device without ever being stored.
 *
 * Opened vaults live only in memory for the tab's lifetime.
 */
import {
  buffer,
  fromBase64,
  fromBase64Url,
  randomBytes,
  toBase64,
  toBase64Url,
  utf8,
} from "./bytes"
import { commsPublicKey } from "./frost"

export interface StoredPasskey {
  credentialId: string
  prfSalt: string
  wrappedVaultKey: string
  /** As the authenticator reported them at registration. */
  transports?: string[] | null
}

/**
 * Firefox on macOS sends every passkey request to the system as a platform
 * request plus a security-key request. When PRF is part of it, the system
 * never shows its sheet and the request hangs. Asking for a platform passkey
 * when creating, and for its known transports when using it, keeps the
 * security-key request out of the way. Chrome and Safari don't need this.
 */
function isFirefoxOnMac(): boolean {
  const ua = navigator.userAgent
  return /\bFirefox\//.test(ua) && /\bMac OS X\b|\bMacintosh\b/.test(ua)
}

function allowedCredential(
  passkey: StoredPasskey
): PublicKeyCredentialDescriptor {
  const transports = passkey.transports?.length
    ? passkey.transports
    : // Passkeys made before transports were stored: platform passkeys.
      isFirefoxOnMac()
      ? ["internal", "hybrid"]
      : undefined
  return {
    type: "public-key",
    id: buffer(fromBase64Url(passkey.credentialId)),
    ...(transports
      ? { transports: transports as AuthenticatorTransport[] }
      : {}),
  }
}

export interface PasskeyRegistration extends StoredPasskey {
  commsPublicKey: string
}

export interface VaultKeys {
  userId: string
  dataKey: CryptoKey
  commsSecret: Uint8Array
  commsPublicKey: string
}

/**
 * Why passkeys can't work on this page at all, if they can't. Browsers
 * reject these cases without ever showing their passkey dialog.
 */
export function passkeyEnvironmentProblem(): string | null {
  if (
    !window.isSecureContext ||
    typeof PublicKeyCredential === "undefined" ||
    !navigator.credentials
  ) {
    return "Passkeys need https or localhost."
  }
  const host = window.location.hostname
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    return "Passkeys don't work on IP addresses. Use localhost."
  }
  let embedded = /\bElectron\//.test(navigator.userAgent)
  try {
    embedded ||= window.self !== window.top
  } catch {
    embedded = true
  }
  if (embedded) return "Passkeys need a regular browser tab."
  return null
}

// How long the last failed passkey request took. A refusal within a moment
// came from the browser, not from someone closing its window.
let lastFailureMs: number | null = null

async function timed<T>(request: () => Promise<T>): Promise<T> {
  const started = performance.now()
  try {
    return await request()
  } catch (err) {
    lastFailureMs = performance.now() - started
    throw err
  }
}

/** One short line explaining a failed passkey request. */
export function describePasskeyError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return lastFailureMs !== null && lastFailureMs < 1000
          ? "Your browser blocked the passkey request."
          : "Passkey request cancelled."
      case "SecurityError":
        return "Passkeys aren't allowed on this address."
      case "InvalidStateError":
        return "This device already has your passkey."
      case "NotSupportedError":
        return "This device can't create a suitable passkey."
      case "AbortError":
        return "Passkey request interrupted."
    }
    return `Passkey error: ${err.name}`
  }
  return err instanceof Error && err.message
    ? err.message
    : "Passkey request failed."
}

/** The browser's own wording, for a tooltip. */
export function passkeyErrorDetail(err: unknown): string | undefined {
  if (err instanceof DOMException) return `${err.name}: ${err.message}`
  return undefined
}

/** Everything useful for debugging a failed request, in the console. */
export async function logPasskeyFailure(err: unknown): Promise<void> {
  const capabilities = await (
    PublicKeyCredential as unknown as {
      getClientCapabilities?: () => Promise<Record<string, boolean>>
    }
  )
    .getClientCapabilities?.()
    .catch(() => undefined)
  const platformAuthenticator =
    await PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(
      () => undefined
    )
  console.error("[vault] passkey request failed", {
    error: err,
    detail: passkeyErrorDetail(err),
    elapsedMs: lastFailureMs === null ? null : Math.round(lastFailureMs),
    platformAuthenticator,
    capabilities,
    // An extension (password manager) handling passkeys instead of the browser
    replacedByExtension: !/\[native code\]/.test(
      String(navigator.credentials.create)
    ),
    userAgent: navigator.userAgent,
  })
}

/** The passkey exists but needs one more tap to derive its encryption key. */
export class PasskeyConfirmationNeeded extends Error {
  constructor() {
    super("Confirm once more to finish.")
  }
}

function assertPasskeysUsable(): void {
  const problem = passkeyEnvironmentProblem()
  if (problem) throw new Error(problem)
}

export class PrfUnsupportedError extends Error {
  constructor() {
    super("This passkey can't encrypt (no PRF support).")
  }
}

const KDF_SALT = utf8("zalary-vault/v1")

async function hkdf(ikm: Uint8Array, info: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", buffer(ikm), "HKDF", false, [
    "deriveBits",
  ])
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: buffer(KDF_SALT),
      info: buffer(utf8(info)),
    },
    key,
    256
  )
  return new Uint8Array(bits)
}

function aesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", buffer(raw), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ])
}

/**
 * Encrypt under `key`, bound to `context` (AES-GCM additional data) so the
 * server can't hand back a ciphertext meant for something else.
 */
export async function seal(
  key: CryptoKey,
  plaintext: Uint8Array,
  context: string
): Promise<string> {
  const iv = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: buffer(iv), additionalData: buffer(utf8(context)) },
    key,
    buffer(plaintext)
  )
  const out = new Uint8Array(iv.length + ciphertext.byteLength)
  out.set(iv)
  out.set(new Uint8Array(ciphertext), iv.length)
  return toBase64(out)
}

export async function unseal(
  key: CryptoKey,
  sealed: string,
  context: string
): Promise<Uint8Array> {
  const bytes = fromBase64(sealed)
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: buffer(bytes.subarray(0, 12)),
      additionalData: buffer(utf8(context)),
    },
    key,
    buffer(bytes.subarray(12))
  )
  return new Uint8Array(plaintext)
}

const vaultKeyContext = (userId: string) => `zalary/vault-key/${userId}`

// The open vault: derived keys plus the raw vault key, which a new passkey
// needs to wrap.
let current: { keys: VaultKeys; vaultKey: Uint8Array } | null = null
const listeners = new Set<() => void>()

function setCurrent(next: typeof current) {
  current = next
  listeners.forEach((listener) => listener())
}

async function deriveKeys(
  userId: string,
  vaultKey: Uint8Array
): Promise<VaultKeys> {
  const commsSecret = await hkdf(vaultKey, "zalary/vault/frost-comms")
  return {
    userId,
    dataKey: await aesKey(await hkdf(vaultKey, "zalary/vault/data")),
    commsSecret,
    commsPublicKey: await commsPublicKey(commsSecret),
  }
}

export function openVault(userId: string): VaultKeys | null {
  return current?.keys.userId === userId ? current.keys : null
}

export function lockVault(): void {
  setCurrent(null)
}

export function subscribeVault(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** False when the browser says it can't do PRF, undefined if it won't say. */
export async function prfSupported(): Promise<boolean | undefined> {
  if (typeof PublicKeyCredential === "undefined") return false
  const getCapabilities = (
    PublicKeyCredential as unknown as {
      getClientCapabilities?: () => Promise<Record<string, boolean>>
    }
  ).getClientCapabilities
  if (!getCapabilities) return undefined
  try {
    const capabilities = await getCapabilities()
    return capabilities["extension:prf"]
  } catch {
    return undefined
  }
}

interface PrfResults {
  enabled?: boolean
  results?: { first?: ArrayBuffer }
}

function prfOf(credential: PublicKeyCredential): PrfResults | undefined {
  return (credential.getClientExtensionResults() as { prf?: PrfResults }).prf
}

async function assertWithPrf(
  passkeys: StoredPasskey[],
  userVerification: UserVerificationRequirement = "required"
): Promise<{ passkey: StoredPasskey; prf: Uint8Array }> {
  assertPasskeysUsable()
  const credential = (await timed(() =>
    navigator.credentials.get({
      publicKey: {
        challenge: buffer(randomBytes(32)),
        allowCredentials: passkeys.map(allowedCredential),
        userVerification,
        extensions: {
          prf: {
            evalByCredential: Object.fromEntries(
              passkeys.map((p) => [
                p.credentialId,
                { first: buffer(fromBase64Url(p.prfSalt)) },
              ])
            ),
          },
        } as AuthenticationExtensionsClientInputs,
      },
    })
  )) as PublicKeyCredential | null
  if (!credential) throw new Error("Passkey request cancelled.")

  const passkey = passkeys.find((p) => p.credentialId === credential.id)
  if (!passkey) throw new Error("That passkey isn't registered with Zalary.")
  const first = prfOf(credential)?.results?.first
  if (!first) throw new PrfUnsupportedError()
  return { passkey, prf: new Uint8Array(first) }
}

/** Open the vault with any of the user's passkeys. */
export async function unlockVault(
  userId: string,
  passkeys: StoredPasskey[]
): Promise<VaultKeys> {
  const open = openVault(userId)
  if (open) return open
  if (passkeys.length === 0) throw new Error("Set up a passkey first.")

  let assertion: { passkey: StoredPasskey; prf: Uint8Array }
  try {
    assertion = await assertWithPrf(passkeys)
  } catch (err) {
    // A passkey manager that refused the preferences at creation refuses
    // required verification here too.
    if (!refusedInstantly(err)) throw err
    assertion = await assertWithPrf(passkeys, "preferred")
  }
  const { passkey, prf } = assertion
  const kek = await aesKey(await hkdf(prf, "zalary/vault/kek"))
  let vaultKey: Uint8Array
  try {
    vaultKey = await unseal(
      kek,
      passkey.wrappedVaultKey,
      vaultKeyContext(userId)
    )
  } catch {
    throw new Error("This passkey couldn't open your vault.")
  }
  const keys = await deriveKeys(userId, vaultKey)
  setCurrent({ keys, vaultKey })
  return keys
}

// A passkey that was created but whose PRF output still needs an assertion,
// which some browsers only allow after a fresh click.
let pendingCreation: {
  userId: string
  vaultKey: Uint8Array
  stored: StoredPasskey
  userVerification: UserVerificationRequirement
} | null = null

/**
 * What to ask for when creating a passkey, most to least. Passkey managers
 * that browser extensions plug in (1Password, Bitwarden, KeePassXC…) replace
 * the browser's own handling and some reject options they don't know, like
 * evaluating PRF at creation, at once and without showing anything. Each
 * fallback asks for less. "enable" turns PRF on for the new passkey without
 * evaluating it (security keys need that to support it at all); the PRF
 * output is then requested when the passkey is first used.
 */
const CREATION_ATTEMPTS = [
  { prf: "eval", selection: true },
  { prf: "enable", selection: true },
  { prf: "enable", selection: false },
  { prf: "none", selection: false },
] as const

type CreationAttempt = (typeof CREATION_ATTEMPTS)[number]

function creationOptions(
  user: { id: string; username: string; name?: string | null },
  salt: Uint8Array,
  attempt: CreationAttempt
): PublicKeyCredentialCreationOptions {
  const selection: AuthenticatorSelectionCriteria = {
    ...(attempt.selection
      ? { residentKey: "preferred", userVerification: "required" }
      : {}),
    ...(isFirefoxOnMac() ? { authenticatorAttachment: "platform" } : {}),
  }
  return {
    challenge: buffer(randomBytes(32)),
    rp: { name: "Zalary" },
    user: {
      id: buffer(utf8(user.id)),
      name: user.username,
      displayName: user.name || user.username,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    ...(Object.keys(selection).length > 0
      ? { authenticatorSelection: selection }
      : {}),
    ...(attempt.prf !== "none"
      ? {
          extensions: {
            prf:
              attempt.prf === "eval" ? { eval: { first: buffer(salt) } } : {},
          } as AuthenticationExtensionsClientInputs,
        }
      : {}),
  }
}

/** Refused before anyone could have seen, let alone dismissed, a dialog. */
function refusedInstantly(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    err.name === "NotAllowedError" &&
    lastFailureMs !== null &&
    lastFailureMs < 1000
  )
}

async function completeCreation(
  userId: string,
  vaultKey: Uint8Array,
  stored: StoredPasskey,
  prfOutput: Uint8Array
): Promise<{ registration: PasskeyRegistration; keys: VaultKeys }> {
  const kek = await aesKey(await hkdf(prfOutput, "zalary/vault/kek"))
  const wrappedVaultKey = await seal(kek, vaultKey, vaultKeyContext(userId))
  const keys = await deriveKeys(userId, vaultKey)
  pendingCreation = null
  setCurrent({ keys, vaultKey })
  return {
    registration: {
      ...stored,
      wrappedVaultKey,
      commsPublicKey: keys.commsPublicKey,
    },
    keys,
  }
}

/**
 * Create a passkey that wraps the user's vault key: the open one, or a new
 * vault for a first passkey. Returns what the server stores. Throws
 * PasskeyConfirmationNeeded when the browser wants another click before the
 * passkey can be used; finish with confirmPasskey().
 */
export async function createPasskey(user: {
  id: string
  username: string
  name?: string | null
}): Promise<{ registration: PasskeyRegistration; keys: VaultKeys }> {
  assertPasskeysUsable()
  const vaultKey =
    current?.keys.userId === user.id ? current.vaultKey : randomBytes(32)
  const salt = randomBytes(32)

  let credential: PublicKeyCredential | null = null
  let attempt: CreationAttempt = CREATION_ATTEMPTS[0]
  for (const next of CREATION_ATTEMPTS) {
    attempt = next
    try {
      credential = (await timed(() =>
        navigator.credentials.create({
          publicKey: creationOptions(user, salt, attempt),
        })
      )) as PublicKeyCredential | null
      break
    } catch (err) {
      if (!refusedInstantly(err) || next === CREATION_ATTEMPTS.at(-1)) {
        throw err
      }
      console.warn("[vault] passkey creation refused, asking for less", {
        attempt,
        error: err,
      })
    }
  }
  if (!credential) throw new Error("Passkey request cancelled.")

  const prf = attempt.prf !== "none" ? prfOf(credential) : undefined
  if (prf?.enabled === false) throw new PrfUnsupportedError()
  // Without the authenticator preferences, don't insist on verification
  // either: whatever refused them would refuse that too.
  const userVerification: UserVerificationRequirement = attempt.selection
    ? "required"
    : "preferred"

  const response = credential.response as AuthenticatorAttestationResponse
  const stored: StoredPasskey = {
    transports: response.getTransports?.() ?? [],
    credentialId: credential.id,
    prfSalt: toBase64Url(salt),
    wrappedVaultKey: "",
  }
  if (prf?.results?.first) {
    return completeCreation(
      user.id,
      vaultKey,
      stored,
      new Uint8Array(prf.results.first)
    )
  }

  // Many authenticators only evaluate PRF on assertions, not at creation.
  try {
    const { prf: output } = await assertWithPrf([stored], userVerification)
    return completeCreation(user.id, vaultKey, stored, output)
  } catch (err) {
    // Safari and others need a fresh click for a second passkey request.
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      pendingCreation = { userId: user.id, vaultKey, stored, userVerification }
      throw new PasskeyConfirmationNeeded()
    }
    throw err
  }
}

/** Finish a passkey creation that needed another click. */
export async function confirmPasskey(
  userId: string
): Promise<{ registration: PasskeyRegistration; keys: VaultKeys }> {
  const pending = pendingCreation
  if (!pending || pending.userId !== userId) {
    throw new Error("Start setting up the passkey again.")
  }
  const { prf } = await assertWithPrf(
    [pending.stored],
    pending.userVerification
  )
  return completeCreation(userId, pending.vaultKey, pending.stored, prf)
}

export function hasPendingPasskey(userId: string): boolean {
  return pendingCreation?.userId === userId
}

/** Seal a UTF-8 string under the vault's data key. */
export async function sealText(
  keys: VaultKeys,
  text: string,
  context: string
): Promise<string> {
  return seal(keys.dataKey, utf8(text), context)
}

export async function unsealText(
  keys: VaultKeys,
  sealed: string,
  context: string
): Promise<string> {
  return new TextDecoder().decode(await unseal(keys.dataKey, sealed, context))
}

/** AAD contexts for what the vault seals. */
export const VAULT_CONTEXT = {
  keyPackage: (treasuryId: string) => `zalary/key-package/${treasuryId}`,
  viewingKey: (treasuryId: string) => `zalary/viewing-key/${treasuryId}`,
  spendState: (proposalId: string, role: string) =>
    `zalary/spend-state/${proposalId}/${role}`,
}
