import { useMutation, useQuery } from "@apollo/client/react"
import { useCallback, useMemo, useSyncExternalStore } from "react"
import {
  MyPasskeysDocument,
  RegisterPasskeyDocument,
} from "../graphql/__generated__/graphql"
import {
  confirmPasskey,
  createPasskey,
  openVault,
  subscribeVault,
  unlockVault,
  type VaultKeys,
} from "../lib/vault"
import { useAuth } from "./use-auth"

/**
 * The signed-in user's passkey vault. `keys` is set while it is open in this
 * tab; `unlock` and `setUp` show a passkey prompt, so call them from a click.
 */
export function useVault() {
  const { user } = useAuth()
  const { data, loading, error, refetch } = useQuery(MyPasskeysDocument, {
    skip: !user,
  })
  const [registerPasskey] = useMutation(RegisterPasskeyDocument)

  const keys = useSyncExternalStore(subscribeVault, () =>
    user ? openVault(user.id) : null
  )
  const passkeys = useMemo(() => data?.myPasskeys ?? [], [data])
  // A comms key on record means a vault exists, even if listing its
  // passkeys failed. Never offer to start a second one then: the authenticator
  // would keep a passkey the server refuses, and some (Google Password
  // Manager) then hide the registered passkey behind the newer one.
  const hasVault = passkeys.length > 0 || !!data?.me?.commsPublicKey

  const unlock = useCallback(async (): Promise<VaultKeys> => {
    if (!user) throw new Error("Not signed in")
    const open = openVault(user.id)
    if (open) return open
    const stored =
      passkeys.length > 0
        ? passkeys
        : ((await refetch()).data?.myPasskeys ?? [])
    return unlockVault(user.id, stored)
  }, [user, passkeys, refetch])

  /**
   * Register a passkey: the first one creates the vault. May throw
   * PasskeyConfirmationNeeded, after which confirmSetUp() finishes it.
   */
  const setUp = useCallback(
    async (name?: string | null): Promise<VaultKeys> => {
      if (!user) throw new Error("Not signed in")
      if (!data || (hasVault && !openVault(user.id))) {
        throw new Error("Unlock with your existing passkey first.")
      }
      const { registration, keys } = await createPasskey({
        id: user.id,
        username: user.username,
        name,
      })
      await registerPasskey({ variables: registration })
      await refetch()
      return keys
    },
    [user, data, hasVault, registerPasskey, refetch]
  )

  /** Finish a setUp() that needed another click. */
  const confirmSetUp = useCallback(async (): Promise<VaultKeys> => {
    if (!user) throw new Error("Not signed in")
    const { registration, keys } = await confirmPasskey(user.id)
    await registerPasskey({ variables: registration })
    await refetch()
    return keys
  }, [user, registerPasskey, refetch])

  return {
    keys,
    passkeys,
    hasPasskey: hasVault,
    // Unknown until the passkeys loaded: don't offer anything meanwhile.
    loading: loading || (!!user && !data),
    error,
    unlock,
    setUp,
    confirmSetUp,
  }
}
