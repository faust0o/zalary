import { toBase64Url, utf8 } from "../bytes"
import { ZAT_PER_ZEC } from "../zcash-network"

export interface PaymentLine {
  address: string
  amountZat: bigint
  memo?: string | null
}

export function zecToZat(zec: number): bigint {
  return BigInt(Math.round(zec * ZAT_PER_ZEC))
}

/** ZIP-321 decimal ZEC: at most 8 decimals, no trailing zeros. */
export function formatZecAmount(zat: bigint): string {
  const whole = zat / BigInt(ZAT_PER_ZEC)
  const frac = (zat % BigInt(ZAT_PER_ZEC)).toString().padStart(8, "0")
  const trimmed = frac.replace(/0+$/, "")
  return trimmed ? `${whole}.${trimmed}` : whole.toString()
}

/** Transparent (and TEX) recipients can't receive memos. */
export function acceptsMemo(address: string): boolean {
  return !/^(t1|t3|tm|t2|tex1|textest1)/.test(address)
}

/**
 * One ZIP-321 request paying every line, which the treasury turns into a
 * single transaction: `zcash:?address=…&amount=…&memo=…&address.1=…`.
 */
export function buildPaymentRequest(lines: PaymentLine[]): string {
  if (lines.length === 0) throw new Error("Nothing to pay")
  const params = lines.flatMap((line, i) => {
    if (line.amountZat <= 0n)
      throw new Error("Payment amounts must be positive")
    const suffix = i === 0 ? "" : `.${i}`
    const fields = [
      `address${suffix}=${encodeURIComponent(line.address.trim())}`,
      `amount${suffix}=${formatZecAmount(line.amountZat)}`,
    ]
    if (line.memo && acceptsMemo(line.address)) {
      fields.push(`memo${suffix}=${toBase64Url(utf8(line.memo))}`)
    }
    return fields
  })
  return `zcash:?${params.join("&")}`
}
