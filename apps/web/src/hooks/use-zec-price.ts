import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { createElement } from "react"

interface ZecPriceContextType {
  price: number | null
  loading: boolean
  lastUpdated: Date | null
}

const ZecPriceContext = createContext<ZecPriceContextType>({
  price: null,
  loading: true,
  lastUpdated: null,
})

const FETCH_INTERVAL_MS = 60_000 // 1 minute

export function ZecPriceProvider({ children }: { children: ReactNode }) {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd"
      )
      if (!res.ok) return
      const data = (await res.json()) as { zcash: { usd: number } }
      setPrice(data.zcash.usd)
      setLastUpdated(new Date())
    } catch {
      // Keep last known price on failure
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrice()
    const interval = setInterval(fetchPrice, FETCH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchPrice])

  return createElement(
    ZecPriceContext.Provider,
    { value: { price, loading, lastUpdated } },
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
