#!/usr/bin/env bash
set -euo pipefail

# Build zcash-view-wasm for browser use.
# Requires: nightly Rust, wasm-pack, Homebrew LLVM (for secp256k1 C cross-compilation)
#
# The nightly toolchain is pinned in rust-toolchain.toml.
# The .cargo/config.toml enables atomics + build-std for halo2 multicore support.

export CC_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/clang
export AR_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/llvm-ar

MODE="${1:---dev}"

wasm-pack build --target bundler "$MODE"

echo "Build complete. Output in pkg/"
echo "WASM size: $(du -sh pkg/*.wasm | cut -f1)"
