// Cross-Origin Isolation Service Worker
// Adds COOP/COEP headers to same-origin responses so that
// SharedArrayBuffer is available for the WASM wallet thread pool.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url)

  // Only modify same-origin responses — leave external APIs untouched
  if (url.origin !== self.location.origin) return

  e.respondWith(
    fetch(e.request).then((res) => {
      // Don't modify opaque or error responses
      if (res.status === 0 || !res.ok) return res

      const headers = new Headers(res.headers)
      headers.set("Cross-Origin-Opener-Policy", "same-origin")
      headers.set("Cross-Origin-Embedder-Policy", "credentialless")
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      })
    })
  )
})
