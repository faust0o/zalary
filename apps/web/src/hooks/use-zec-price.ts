import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { createElement } from "react"

interface PricePoint {
  time: number
  price: number
}

interface ZecPriceContextType {
  price: number | null
  priceHistory: PricePoint[]
  loading: boolean
  lastUpdated: Date | null
}

const ZecPriceContext = createContext<ZecPriceContextType>({
  price: null,
  priceHistory: [],
  loading: true,
  lastUpdated: null,
})

const FETCH_INTERVAL_MS = 60_000 // 1 minute

export function ZecPriceProvider({ children }: { children: ReactNode }) {
  const [price, setPrice] = useState<number | null>(null)
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd"
      )
      if (!res.ok) return
      const data = (await res.json()) as { zcash: { usd: number } }
      const now = Date.now()
      setPrice(data.zcash.usd)
      setLastUpdated(new Date())
      // Append to history without truncating the 24h data
      setPriceHistory((prev) => [...prev, { time: now, price: data.zcash.usd }])
    } catch {
      // Keep last known price on failure
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch 24h history on mount for the sparkline
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/zcash/market_chart?vs_currency=usd&days=1"
      )
      if (!res.ok) return
      const data = (await res.json()) as { prices: [number, number][] }
      const points = data.prices.map(([time, price]) => ({ time, price }))
      setPriceHistory(points)
    } catch {
      // Will fill from polling
    }
  }, [])

  useEffect(() => {
    fetchHistory()
    fetchPrice()
    const interval = setInterval(fetchPrice, FETCH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchPrice, fetchHistory])

  return createElement(
    ZecPriceContext.Provider,
    { value: { price, priceHistory, loading, lastUpdated } },
    children
  )
}

export function useZecPrice() {
  return useContext(ZecPriceContext)
}

/**
 * Convert ZEC to USD using the current price.
 * Returns null if price is not yet available.
 */
export function formatZecAsUsd(
  zecAmount: number,
  price: number | null
): string | null {
  if (price === null) return null
  const usd = zecAmount * price
  return `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
