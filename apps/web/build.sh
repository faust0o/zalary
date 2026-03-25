#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WASM_CRATE="$REPO_ROOT/packages/zcash-view-wasm"
WEB_APP="$SCRIPT_DIR"

# ── Step 1: Build Rust WASM crate (skip if pre-built) ────────────

if [ -f "$WASM_CRATE/pkg/zcash_view_wasm.js" ]; then
  echo "==> WASM pkg/ already exists, skipping Rust build"
else
  echo "==> Building zcash-view-wasm (Rust → WASM)"

  check_cmd() {
    if ! command -v "$1" &> /dev/null; then
      echo "Error: $1 not found. $2"
      exit 1
    fi
  }

  check_cmd rustup "Install from https://rustup.rs"

  if ! command -v wasm-pack &> /dev/null; then
    echo "==> Installing wasm-pack"
    cargo install wasm-pack
  fi

  if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
    echo "==> Adding wasm32-unknown-unknown target"
    rustup target add wasm32-unknown-unknown
  fi

  # secp256k1-sys needs a clang that supports wasm32-unknown-unknown.
  # Apple clang does not; detect and use Homebrew LLVM or system clang.
  if [ -z "${CC:-}" ] && [ "$(uname -s)" = "Darwin" ]; then
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

  wasm-pack build "$WASM_CRATE" \
    --target web \
    --release \
    --out-dir "$WASM_CRATE/pkg" \
    --out-name zcash_view_wasm

  echo "==> WASM build complete"
fi

# ── Step 2: Install JS dependencies ──────────────────────────────

echo "==> Installing dependencies"
cd "$REPO_ROOT"
bun install

# ── Step 3: Build Vite app ────────────────────────────────────────

echo "==> Building web app (Vite)"
cd "$WEB_APP"
bun run build

echo "==> Build complete: $WEB_APP/dist/"
