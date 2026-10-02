import { rule } from "graphql-shield"
import type { IRule } from "graphql-shield"
import type { Context } from "../context.js"

export const isAuthenticated: IRule = rule({ cache: "contextual" })(
  async (_parent: unknown, _args: unknown, ctx: Context) => {
    return ctx.userId !== null
  }
) as unknown as IRule

/** Signed in as the account itself, not as one of its delegates. */
export const isAccountOwner: IRule = rule({ cache: "contextual" })(
  async (_parent: unknown, _args: unknown, ctx: Context) => {
    return ctx.userId !== null && ctx.accountId === ctx.userId
  }
) as unknown as IRule

/** Resolver-side counterpart of isAccountOwner. Returns the owner's id. */
export function requireAccountOwner(ctx: Context): string {
  if (!ctx.userId || ctx.accountId !== ctx.userId) {
    throw new Error("Only the account owner can do this")
  }
  return ctx.userId
}
