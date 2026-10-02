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

wasm-pack build --target web "$MODE"

# wasm-pack writes pkg/.gitignore with "*". That pattern hides the prebuilt
# package from Railway uploads even after the files are committed.
rm -f pkg/.gitignore

# wasm-pack doesn't include snippets/ in the files list; patch it in
node -e '
  const pkg = require("./pkg/package.json");
  pkg.description = "Zcash view-only light wallet for the browser, compiled to WebAssembly.";
  pkg.license = "MIT";
  pkg.repository = { type: "git", url: "https://github.com/AustinZhu/zalary.git", directory: "packages/zcash-view-wasm" };
  if (!pkg.files.includes("snippets")) pkg.files.push("snippets");
  require("fs").writeFileSync("./pkg/package.json", JSON.stringify(pkg, null, 2) + "\n");
'

cp README.md pkg/
echo "Build complete. Output in pkg/"
echo "WASM size: $(du -sh pkg/*.wasm | cut -f1)"
