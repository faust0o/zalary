import { useMutation, useQuery } from "@apollo/client/react"
import { DelegationsView } from "../components/views/delegations-view"
import {
  CreateDelegateInviteDocument,
  DelegationsDocument,
  RemoveDelegateDocument,
  RevokeDelegateInviteDocument,
} from "../graphql/__generated__/graphql"
import { useTitle } from "../hooks/use-title"

const refetchDelegations = {
  refetchQueries: [{ query: DelegationsDocument }],
  awaitRefetchQueries: true,
}

export function DelegationsPage() {
  useTitle("Delegations")
  const { data, loading, error } = useQuery(DelegationsDocument)
  const [createInvite, { loading: creating }] = useMutation(
    CreateDelegateInviteDocument,
    refetchDelegations
  )
  const [revokeInvite] = useMutation(
    RevokeDelegateInviteDocument,
    refetchDelegations
  )
  const [removeDelegate] = useMutation(
    RemoveDelegateDocument,
    refetchDelegations
  )

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className="text-4xl font-light tracking-tight">Delegations</h2>
        <p className="text-sm text-muted-foreground">
          Only the account owner can manage delegations.
        </p>
      </div>
    )
  }

  return (
    <DelegationsView
      invites={data?.delegateInvites ?? []}
      delegates={data?.delegates ?? []}
      loading={loading}
      creating={creating}
      onCreateInvite={() => createInvite()}
      onRevokeInvite={(id) => revokeInvite({ variables: { id } })}
      onRemoveDelegate={async (id) => {
        await removeDelegate({ variables: { id } })
      }}
    />
  )
}
