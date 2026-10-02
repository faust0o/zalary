import { useDemo } from "../../components/demo-context"
import { DelegationsView } from "../../components/views/delegations-view"
import { useTitle } from "../../hooks/use-title"
import { DEMO_DELEGATE_INVITES, DEMO_DELEGATES } from "../../lib/demo-data"

export function DemoDelegationsPage() {
  useTitle("Delegations")
  const { promptLogin } = useDemo()

  return (
    <DelegationsView
      invites={DEMO_DELEGATE_INVITES}
      delegates={DEMO_DELEGATES}
      loading={false}
      onCreateInvite={() => promptLogin()}
      onCopyInvite={() => promptLogin()}
      onRevokeInvite={() => promptLogin()}
      onRemoveDelegate={async () => {
        promptLogin()
      }}
    />
  )
}
