let cachedPrice: { value: number; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60_000 // 1 minute

export async function getZecPrice(): Promise<number> {
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < CACHE_TTL_MS) {
    return cachedPrice.value
  }

  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd"
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch ZEC price: ${res.statusText}`)
  }

  const data = (await res.json()) as { zcash: { usd: number } }
  const price = data.zcash.usd

  cachedPrice = { value: price, fetchedAt: Date.now() }
  return price
}
