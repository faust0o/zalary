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
  // COOP/COEP headers for SharedArrayBuffer in local dev
  // (in production, the coi-sw.js service worker adds these)
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  // Workers must use ES module format to support WASM code-splitting.
  worker: {
    format: "es",
    plugins: () => [wasm()],
  },
  // Exclude zcash-view-wasm from dep pre-bundling so WASM files are served as-is.
  optimizeDeps: {
    exclude: ["zcash-view-wasm"],
  },
})
