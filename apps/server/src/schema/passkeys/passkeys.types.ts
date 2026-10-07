import { objectType } from "nexus"

/**
 * A passkey that unlocks its user's vault. Only ever returned to its own user,
 * who needs the salt and wrapped key to open the vault in their browser.
 */
export const Passkey = objectType({
  name: "Passkey",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("credentialId")
    t.nonNull.string("prfSalt")
    t.nonNull.string("wrappedVaultKey")
    t.nonNull.list.nonNull.string("transports")
    t.nonNull.string("createdAt", {
      resolve(parent) {
        return parent.createdAt.toISOString()
      },
    })
  },
})
