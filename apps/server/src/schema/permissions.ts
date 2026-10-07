import { rule } from "graphql-shield"
import type { IRule } from "graphql-shield"
import type { Context } from "../context.js"

export const isAuthenticated: IRule = rule({ cache: "contextual" })(
  async (_parent: unknown, _args: unknown, ctx: Context) => {
    return ctx.userId !== null
  }
) as unknown as IRule

/** Signed in as the account itself, not as one of its members or delegates. */
export const isAccountOwner: IRule = rule({ cache: "contextual" })(
  async (_parent: unknown, _args: unknown, ctx: Context) => {
    return ctx.userId !== null && ctx.accountId === ctx.userId
  }
) as unknown as IRule

/** The owner or a delegate: members may only look at payroll data. */
export const canEditPayroll: IRule = rule({ cache: "contextual" })(
  async (_parent: unknown, _args: unknown, ctx: Context) => {
    return ctx.userId !== null && isPayrollEditor(ctx)
  }
) as unknown as IRule

export function isPayrollEditor(ctx: Context): boolean {
  return ctx.accountId === ctx.userId || ctx.role === "DELEGATE"
}

/** Resolver-side counterpart of isAccountOwner. Returns the owner's id. */
export function requireAccountOwner(ctx: Context): string {
  if (!ctx.userId || ctx.accountId !== ctx.userId) {
    throw new Error("Only the account owner can do this")
  }
  return ctx.userId
}

/** Resolver-side guard for any signed-in user. Returns their ids. */
export function requireUser(ctx: Context): {
  userId: string
  accountId: string
} {
  if (!ctx.userId || !ctx.accountId) throw new Error("Not authenticated")
  return { userId: ctx.userId, accountId: ctx.accountId }
}
