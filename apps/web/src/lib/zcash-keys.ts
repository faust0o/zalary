import initWasm, {
  UnifiedFullViewingKey,
  UnifiedSpendingKey,
} from "@chainsafe/webzjs-keys"
import wasmUrl from "@chainsafe/webzjs-keys/webzjs_keys_bg.wasm?url"
import * as bip39 from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english.js"

let wasmInitialized = false

async function ensureWasm() {
  if (!wasmInitialized) {
    await initWasm({ module_or_path: wasmUrl })
    wasmInitialized = true
  }
}

/**
 * Derive a Unified Full Viewing Key (UFVK) from a 24-word seed phrase.
 * The seed phrase is processed locally and never sent to any server.
 */
export async function deriveViewingKeyFromSeedPhrase(
  seedPhrase: string,
  network: "main" | "test" = "main",
  accountIndex: number = 0
): Promise<string> {
  await ensureWasm()

  const seed = bip39.mnemonicToSeedSync(seedPhrase.trim())
  const usk = new UnifiedSpendingKey(network, seed, accountIndex)
  const ufvk = usk.to_unified_full_viewing_key()
  const encoded = ufvk.encode(network)

  // Free WASM memory
  usk.free()
  ufvk.free()

  return encoded
}

/**
 * Validate that a UFVK string is correctly formatted and parseable.
 * Returns true if valid, false otherwise.
 */
export async function validateViewingKey(
  encodedKey: string,
  network: "main" | "test" = "main"
): Promise<boolean> {
  await ensureWasm()

  try {
    const ufvk = new UnifiedFullViewingKey(network, encodedKey.trim())
    ufvk.free()
    return true
  } catch {
    return false
  }
}

/**
 * Validate a BIP39 seed phrase (24 words).
 */
export function validateSeedPhrase(phrase: string): boolean {
  return bip39.validateMnemonic(phrase.trim(), wordlist)
}
