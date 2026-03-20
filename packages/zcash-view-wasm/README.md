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

Requires nightly Rust, `wasm-pack`, and Homebrew LLVM (for cross-compiling the secp256k1 C code):

```bash
# dev build
./build.sh

# release build (smaller wasm, slower to compile)
./build.sh --release
```

## Publishing

```bash
./build.sh --release
cd pkg && npm publish
```
