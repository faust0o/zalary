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
  // Required for SharedArrayBuffer (WASM atomics for crossbeam_channel batch scanning).
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  // Exclude zcash-view-wasm from dep pre-bundling — it contains worker helper
  // snippets that must be served as separate files (wasm-bindgen-rayon workers).
  optimizeDeps: {
    exclude: ["zcash-view-wasm"],
  },
})
