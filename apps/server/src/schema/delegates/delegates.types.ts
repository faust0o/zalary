import { objectType } from "nexus"
import { inviteToken } from "../../auth/invite.js"

export const DelegateInvite = objectType({
  name: "DelegateInvite",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("token", {
      resolve(parent) {
        return inviteToken(parent.id)
      },
    })
    t.nonNull.string("expiresAt", {
      resolve(parent) {
        return parent.expiresAt.toISOString()
      },
    })
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
  },
})

/** What someone holding an invite link may see before accepting it. */
export const DelegateInvitePreview = objectType({
  name: "DelegateInvitePreview",
  definition(t) {
    t.nonNull.string("ownerUsername")
    t.nonNull.string("expiresAt")
  },
})
