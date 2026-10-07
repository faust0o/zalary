/**
 * What a treasury spend pays, sealed under the account key. The server only
 * coordinates approvals; the payment request, the PCZT members check, the
 * amounts, the payroll runs it pays and its transaction id are all sealed.
 */
import { fromBase64, fromUtf8, toBase64, utf8 } from "../bytes"
import {
  ACCOUNT_CONTEXT,
  openBytes,
  openJson,
  sealBytes,
  sealJson,
  type AccountKey,
} from "../account-key"
import type { ProposalSpendInfo } from "./spend"

/** One salary the spend pays, as the payroll run had it. */
export interface SpendPayment {
  runId: string
  paymentId: string
  payrollName: string
  employeeName: string
  walletAddress: string
  amountUsd: number
  amountZec: number
}

export interface SpendDetails {
  /** ZIP-321 payment request the transaction was built from. */
  paymentRequest: string
  /** Hex sighash every spend signature signs. */
  sighash: string
  /** Spends awaiting a signature, in signing order. */
  spends: ProposalSpendInfo[]
  totalZat: string
  feeZat: string
  expiryHeight: number
  runIds: string[]
  payments: SpendPayment[]
}

export function sealSpendDetails(
  accountKey: AccountKey,
  proposalId: string,
  details: SpendDetails
): Promise<string> {
  return sealJson(
    accountKey,
    details,
    ACCOUNT_CONTEXT.spend(accountKey.accountId, proposalId)
  )
}

export function openSpendDetails(
  accountKey: AccountKey,
  proposalId: string,
  sealed: string
): Promise<SpendDetails> {
  return openJson<SpendDetails>(
    accountKey,
    sealed,
    ACCOUNT_CONTEXT.spend(accountKey.accountId, proposalId)
  )
}

/** Seal a base64 PCZT. */
export function sealPczt(
  accountKey: AccountKey,
  proposalId: string,
  pczt: string
): Promise<string> {
  return sealBytes(
    accountKey,
    fromBase64(pczt),
    ACCOUNT_CONTEXT.spendPczt(accountKey.accountId, proposalId)
  )
}

/** The base64 PCZT. */
export async function openPczt(
  accountKey: AccountKey,
  proposalId: string,
  sealed: string
): Promise<string> {
  return toBase64(
    await openBytes(
      accountKey,
      sealed,
      ACCOUNT_CONTEXT.spendPczt(accountKey.accountId, proposalId)
    )
  )
}

export function sealTxid(
  accountKey: AccountKey,
  proposalId: string,
  txid: string
): Promise<string> {
  return sealBytes(
    accountKey,
    utf8(txid),
    ACCOUNT_CONTEXT.spendTxid(accountKey.accountId, proposalId)
  )
}

export async function openTxid(
  accountKey: AccountKey,
  proposalId: string,
  sealed: string
): Promise<string> {
  return fromUtf8(
    await openBytes(
      accountKey,
      sealed,
      ACCOUNT_CONTEXT.spendTxid(accountKey.accountId, proposalId)
    )
  )
}
