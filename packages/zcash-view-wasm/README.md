# zcash-view-wasm

A Zcash view-only light wallet that runs entirely in the browser. Give it a unified full viewing key and a lightwalletd gRPC-web endpoint, and it syncs the blockchain in a Web Worker, tracking balances and detecting sent transactions via nullifier analysis. Built on the Rust `zcash_client_backend` and `zcash_client_memory` crates, compiled to WebAssembly with `wasm-pack`.

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
import initWasm, { ZcashViewWallet, initThreadPool } from "zcash-view-wasm/zcash_view_wasm.js";
import wasmUrl from "zcash-view-wasm/zcash_view_wasm_bg.wasm?url";

await initWasm({ module_or_path: wasmUrl });
await initThreadPool(navigator.hardwareConcurrency);

const wallet = await ZcashViewWallet.create(
  "https://your-lightwalletd.example.com",  // gRPC-web endpoint
  "uview1...",                                // unified full viewing key
  BigInt(2700000)                             // birthday height
);
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
const txs = wallet.getSentTransactions();
// [{ txid: "abc...", amount_zec: 0.5, block_height: 2700123, timestamp: 1710892800 }, ...]
```

### Persist and restore

Serialize the wallet state to bytes for storage (e.g. IndexedDB), and restore it later without re-syncing from scratch:

```js
const bytes = wallet.toBytes();
// store bytes in IndexedDB...

// later:
const restored = await ZcashViewWallet.fromBytes(
  "https://your-lightwalletd.example.com",
  bytes
);
```

## Building from source

### Prerequisites

- **Rust nightly** with `wasm32-unknown-unknown` target and `rust-src` component (pinned in `rust-toolchain.toml`)
- **wasm-pack** (`cargo install wasm-pack`)
- **Homebrew LLVM** (`brew install llvm`) — provides a clang that can cross-compile C to wasm32 (needed by `secp256k1-sys`)

### Quick build

```bash
# dev build (fast, unoptimized, large .wasm)
./build.sh

# release build (slow, optimized, ~2MB .wasm)
./build.sh --release
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
