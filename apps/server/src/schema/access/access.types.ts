import { objectType } from "nexus"
import { inviteToken } from "../../auth/invite.js"

/** A link that creates one member or delegate login in the owner's account. */
export const AccessInvite = objectType({
  name: "AccessInvite",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("token", {
      resolve(parent) {
        return inviteToken(parent.id)
      },
    })
    t.nonNull.field("role", { type: "AccessRole" })
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
export const AccessInvitePreview = objectType({
  name: "AccessInvitePreview",
  definition(t) {
    t.nonNull.string("ownerUsername")
    t.nonNull.field("role", { type: "AccessRole" })
    t.nonNull.string("expiresAt")
  },
})
