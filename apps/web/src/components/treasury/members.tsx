import { useMutation, useQuery } from "@apollo/client/react"
import {
  AccessInvitesDocument,
  AccountMembersDocument,
  CreateAccessInviteDocument,
  RemoveAccountMemberDocument,
  RevokeAccessInviteDocument,
  SetMemberAccessDocument,
  TreasuryDocument,
  type TreasuryFieldsFragment,
} from "../../graphql/__generated__/graphql"
import { MembersView } from "../views/members-view"

const refetchAccess = {
  refetchQueries: [AccountMembersDocument, AccessInvitesDocument],
  awaitRefetchQueries: true,
}

/** Who can work in the account, and as what. */
export function TreasuryMembers({
  treasury,
  isAccountOwner,
}: {
  treasury: TreasuryFieldsFragment | null
  isAccountOwner: boolean
}) {
  // People join through treasury invites elsewhere, so don't trust the cache.
  const { data, loading } = useQuery(AccountMembersDocument, {
    fetchPolicy: "cache-and-network",
  })
  // People are invited once there's a treasury for them to work with.
  const canInvite = isAccountOwner && !!treasury
  const { data: inviteData } = useQuery(AccessInvitesDocument, {
    skip: !canInvite,
    fetchPolicy: "cache-and-network",
  })
  const [createInvite, { loading: creating }] = useMutation(
    CreateAccessInviteDocument,
    refetchAccess
  )
  const [revokeInvite] = useMutation(RevokeAccessInviteDocument, refetchAccess)
  const [setAccess] = useMutation(SetMemberAccessDocument, refetchAccess)
  const [remove] = useMutation(RemoveAccountMemberDocument, {
    refetchQueries: [AccountMembersDocument, TreasuryDocument],
    awaitRefetchQueries: true,
  })

  const signers = new Set(
    (treasury?.members ?? []).filter((m) => m.hasKeyShare).map((m) => m.user.id)
  )

  return (
    <MembersView
      loading={loading && !data}
      canManage={isAccountOwner}
      canInvite={canInvite}
      people={(data?.accountMembers ?? []).map((user) => ({
        ...user,
        isSigner: signers.has(user.id),
        hasDataAccess: user.hasAccountKey,
      }))}
      invites={inviteData?.accessInvites ?? []}
      creating={creating}
      onCreateInvite={(role) => createInvite({ variables: { role } })}
      onRevokeInvite={(id) => revokeInvite({ variables: { id } })}
      onChangeRole={async (userId, role) => {
        await setAccess({ variables: { userId, role } })
      }}
      onRemove={async (userId) => {
        await remove({ variables: { userId } })
      }}
    />
  )
}
