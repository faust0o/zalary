import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import wasm from "vite-plugin-wasm"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), wasm()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@graphql-typed-document-node/core": path.resolve(
        __dirname,
        "src/lib/graphql-typed-document-node-shim.ts"
      ),
    },
  },
  // No COOP/COEP needed — WASM runs without atomics (single-threaded).
  // Blocks are scanned one at a time to avoid crossbeam_channel deadlocks.
})
