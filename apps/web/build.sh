#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WASM_CRATE="$REPO_ROOT/packages/zcash-view-wasm"
WEB_APP="$SCRIPT_DIR"

# ── Prerequisites ──────────────────────────────────────────────────

check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo "Error: $1 not found. $2"
    exit 1
  fi
}

check_cmd rustup "Install from https://rustup.rs"
check_cmd bun    "Install from https://bun.sh"

# Ensure wasm-pack is available
if ! command -v wasm-pack &> /dev/null; then
  echo "==> Installing wasm-pack"
  cargo install wasm-pack
fi

# Ensure the wasm32 target is installed
if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
  echo "==> Adding wasm32-unknown-unknown target"
  rustup target add wasm32-unknown-unknown
fi

# ── WASM clang setup ──────────────────────────────────────────────
# secp256k1-sys needs a clang that supports wasm32-unknown-unknown.
# Apple clang does not; detect and use Homebrew LLVM or system clang.

if [ -z "${CC:-}" ]; then
  if [ "$(uname -s)" = "Darwin" ]; then
    # macOS: Apple clang lacks WASM support, use Homebrew LLVM
    BREW_LLVM=""
    if [ -f /opt/homebrew/opt/llvm/bin/clang ]; then
      BREW_LLVM="/opt/homebrew/opt/llvm"
    elif [ -f /usr/local/opt/llvm/bin/clang ]; then
      BREW_LLVM="/usr/local/opt/llvm"
    fi

    if [ -n "$BREW_LLVM" ]; then
      export CC="$BREW_LLVM/bin/clang"
      export AR="$BREW_LLVM/bin/llvm-ar"
    else
      echo "Error: Homebrew LLVM not found. Apple clang cannot compile to wasm32."
      echo "       Install with: brew install llvm"
      exit 1
    fi
  fi
  # On Linux, system clang usually supports wasm32 out of the box
fi

# ── Step 1: Build Rust WASM crate ─────────────────────────────────

echo "==> Building zcash-view-wasm (Rust → WASM)"
wasm-pack build "$WASM_CRATE" \
  --target web \
  --release \
  --out-dir "$WASM_CRATE/pkg" \
  --out-name zcash_view_wasm

echo "==> WASM build complete"

# ── Step 2: Install JS dependencies ──────────────────────────────

echo "==> Installing dependencies"
cd "$REPO_ROOT"
bun install

# ── Step 3: GraphQL codegen ───────────────────────────────────────

echo "==> Running GraphQL codegen"
cd "$WEB_APP"
bun run codegen

# ── Step 4: Build Vite app ────────────────────────────────────────

echo "==> Building web app (Vite)"
cd "$WEB_APP"
bun run build

echo "==> Build complete: $WEB_APP/dist/"
echo "    Serve with: cd dist && npx serve"
echo "    Or:         npx vite preview"
