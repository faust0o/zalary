# zcash-view-wasm

A Zcash light wallet that runs entirely in the browser, plus the cryptography for FROST multisig "treasuries" (see [Treasuries](#treasuries-frost-multisig)). Give it a unified full viewing key and a lightwalletd gRPC-web endpoint, and it syncs the blockchain in a Web Worker, tracking balances and detecting sent transactions via nullifier analysis. It scans the Sapling, Orchard and Ironwood (NU6.3, mainnet height 3,428,143) shielded pools; Ironwood notes are found with the UFVK's Orchard key. Built on the Rust `zcash_client_backend` (0.24) and `zcash_client_memory` crates, compiled to WebAssembly with `wasm-pack`. The lightwalletd server must speak lightwallet-protocol v0.5 (Ironwood compact actions, tree state and subtree roots).

## Install

```
npm install zcash-view-wasm
```

## Usage

The package is built with `--target web` and uses `wasm-bindgen-rayon` for multithreaded scanning, so it requires `SharedArrayBuffer`. Your server must send the following headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

Initialize the WASM module and thread pool, then create a wallet:

```js
import initWasm, { ZcashViewWallet, initThreadPool, getChainTip } from "zcash-view-wasm/zcash_view_wasm.js";
import wasmUrl from "zcash-view-wasm/zcash_view_wasm_bg.wasm?url";

await initWasm({ module_or_path: wasmUrl });
await initThreadPool(navigator.hardwareConcurrency);

const wallet = await ZcashViewWallet.create(
  "https://your-lightwalletd.example.com",  // gRPC-web endpoint
  "uview1...",                                // unified full viewing key
  2700000,                                    // birthday height
  "main"                                      // network: "main" | "test"
);

// Chain tip without a wallet (e.g. as a new wallet's birthday)
const tip = await getChainTip("https://your-lightwalletd.example.com");
```

### Sync and get balance

```js
const summary = await wallet.syncWithProgress((scanned, total) => {
  console.log(`${scanned} / ${total} blocks`);
});

const balance = wallet.getBalance();
// { spendable: 1.5, pending: 0.25, total: 1.75 }
```

### Detect sent transactions

Since this is a view-only wallet, it can't see recipient memos. Instead it detects outgoing transactions by tracking nullifier spends and subtracting change notes:

```js
const txs = wallet.getSentTransactions(); // txids in display (block explorer) byte order
// [{ txid: "abc...", amount_zec: 0.5, block_height: 2700123, timestamp: 1710892800 }, ...]
```

### Persist and restore

Serialize the wallet state to bytes for storage (e.g. IndexedDB), and restore it later without re-syncing from scratch. The bytes record the network, which `fromBytes` checks; states saved by earlier versions (no header) are accepted as mainnet wallets.

```js
const bytes = wallet.toBytes();
// store bytes in IndexedDB...

// later:
const restored = await ZcashViewWallet.fromBytes(
  "https://your-lightwalletd.example.com",
  bytes,
  "main"
);
```

## Treasuries (FROST multisig)

A treasury is a rerandomized FROST group (RedPallas, `reddsa::frost::redpallas`) whose group key is the Orchard spend validating key `ak`. Members run the DKG and signing in their browsers; messages travel through ZF's [frostd](https://github.com/ZcashFoundation/frost-tools) (the JS side does the HTTP, this package does all cryptography). The message formats, the Noise channels and the identifier derivation are those of frost-client, so a frost-client CLI user can take part.

- **frostd identity**: `commsPublicKey(secret)`, `frostdSignChallenge(secret, challengeUuid)` (XEdDSA, for `/login`).
- **Noise**: `noiseEncrypt` / `noiseDecrypt` implement frost-client's one-way `Noise_K_25519_ChaChaPoly_BLAKE2s` channels (sender = initiator). Pass `null` as state for the first message on a directed channel and keep the returned opaque state (it contains a key; store it encrypted). Use a fresh state per frostd session, peer and direction.
- **DKG**: `new FrostDkg(secret, sessionId, participantPubkeys, minSigners)`, then `start()` and `receive(sender, msg)` until `isComplete()`, then `result()`. Send the returned messages in order. Messages that arrive early are buffered.
- **Viewing key**: `treasuryViewingKey(groupPublicKey, network)` gives an Orchard-only UFVK (random `nk`/`rivk`), its address and its `changeAddress`; open a normal `ZcashViewWallet` with the UFVK. Hand the UFVK to every signer: `treasuryViewingKeyInfo(ufvk, network)` returns the group key it belongs to and both addresses, for a signer to compare with `frostKeyPackageGroupKey(theirKeyPackage)` and the published addresses.
- **Spending**: `wallet.createPczt(zip321Uri, expiryDelta)` → `provePczt(pczt)` → `pcztRedactForSigners(proven)` (the copy to share; keep the full one) → `pcztSummary(pczt, network, ufvk)` (what signers review: payees, proven change, `feeZat` vs. `conventionalFeeZat`, `expiryHeight`) → `frostCommit` / `frostBuildSigningPackage` / `frostSign` / `frostAggregate` → `pcztApplySignatures(fullPczt, signatures)` → `wallet.extractTransaction(signed)` → broadcast the returned `raw` bytes.

Proving uses the rayon thread pool, so call `provePczt` (and everything else) from a Web Worker after `initThreadPool`. The first proof also builds the Orchard proving key (a few seconds; cached afterwards). Sapling recipients are not supported by treasuries yet.

## Building from source

### Prerequisites

- **Rust nightly** with `wasm32-unknown-unknown` target and `rust-src` component (pinned in `rust-toolchain.toml`)
- **wasm-pack** (`cargo install wasm-pack`)
- **Homebrew LLVM** (`brew install llvm`) — provides a clang that can cross-compile C to wasm32 (needed by `secp256k1-sys`)

### Quick build

```bash
# dev build (fast, unoptimized, large .wasm)
./build.sh

# release build (slow, optimized, ~7MB .wasm, ~3MB gzipped)
./build.sh --release
```

### Tests

```bash
cargo test   # native: Noise/snow interop, DKG, FROST signing, PCZT proving and extraction
```

### Manual build

The `.cargo/config.toml` sets the required flags (`+atomics`, `+bulk-memory`, `+mutable-globals`, `--shared-memory`, `--import-memory`). The only extra step is telling `cc` where to find the LLVM clang for the wasm32 target:

```bash
export CC_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/clang
export AR_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/llvm-ar

wasm-pack build --target web --release
```

`--target web` is required (not `bundler`) because `wasm-bindgen-rayon` needs access to the `WebAssembly.Module` for spawning worker threads.

### Vite integration

When consuming this package in a Vite app, exclude it from dependency pre-bundling so the `snippets/workerHelpers.js` file (used by `wasm-bindgen-rayon`) is served correctly:

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["zcash-view-wasm"],
  },
});
```

## Publishing

```bash
./build.sh --release
cd pkg && npm publish
```
