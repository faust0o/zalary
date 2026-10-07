export type ZcashNetwork = "main" | "test"

export const ZCASH_NETWORK: ZcashNetwork =
  import.meta.env.VITE_ZCASH_NETWORK === "test" ? "test" : "main"

export const LIGHTWALLETD_URL: string =
  import.meta.env.VITE_LIGHTWALLETD_URL ??
  (ZCASH_NETWORK === "test"
    ? "https://zcash-testnet.chainsafe.dev"
    : "https://zcash-mainnet.chainsafe.dev")

/** Target block spacing since Blossom. */
export const BLOCK_TIME_SECONDS = 75

export const ZAT_PER_ZEC = 100_000_000

export function explorerUrl(txid: string): string {
  return ZCASH_NETWORK === "main"
    ? `https://mainnet.zcashexplorer.app/transactions/${txid}`
    : `https://testnet.zcashexplorer.app/transactions/${txid}`
}

export function zatToZec(zat: bigint | string | number): number {
  return Number(zat) / ZAT_PER_ZEC
}
