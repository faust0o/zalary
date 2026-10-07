import { inputObjectType, objectType } from "nexus"

/**
 * One piece of an account's payroll data, encrypted in the browser under the
 * account key. Only its id and version mean anything to the server.
 */
export const SealedRecord = objectType({
  name: "SealedRecord",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("data")
    t.nonNull.int("version")
  },
})

/** Create a record (version 0) or replace the version the browser read. */
export const SealedRecordWrite = inputObjectType({
  name: "SealedRecordWrite",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("data")
    t.nonNull.int("version")
  },
})

export const SealedRecordDelete = inputObjectType({
  name: "SealedRecordDelete",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.int("version")
  },
})

/** The signed-in user's copy of the account key, and whether one exists. */
export const AccountKey = objectType({
  name: "AccountKey",
  definition(t) {
    /** Hex Noise_K message to the user's comms key, or null if not shared yet. */
    t.string("sealedKey")
    /** Comms key of whoever sealed it. */
    t.string("sealedBy")
    /** Someone in the account holds the key, so nobody may create another. */
    t.nonNull.boolean("exists")
  },
})
