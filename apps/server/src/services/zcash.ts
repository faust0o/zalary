// Zcash balance and transaction queries are handled client-side via WebZjs.
// The server stores the viewing key and receives balance/sync updates from the client.
// This file provides utility types and placeholder functions for server-side use.

export async function getZecBalance(_viewingKey: string): Promise<number> {
  // Balance is tracked client-side via WebZjs.
  // The server can optionally cache the last known balance
  // reported by the client, but does not query the chain directly.
  return 0
}
