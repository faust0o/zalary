import { rule } from "graphql-shield"
import type { IRule } from "graphql-shield"
import type { Context } from "../context.js"

export const isAuthenticated: IRule = rule({ cache: "contextual" })(
  async (_parent: unknown, _args: unknown, ctx: Context) => {
    return ctx.userId !== null
  }
) as unknown as IRule
