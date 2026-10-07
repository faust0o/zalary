import { isAccountOwner, isAuthenticated } from "../permissions.js"

export const proposalPermissions: {
  Query: Record<string, unknown>
  Mutation: Record<string, unknown>
} = {
  Query: {
    spendProposals: isAuthenticated,
    spendProposal: isAuthenticated,
  },
  Mutation: {
    createSpendProposal: isAccountOwner,
    approveSpendProposal: isAuthenticated,
    rejectSpendProposal: isAuthenticated,
    setProposalSigners: isAccountOwner,
    markProposalSigned: isAuthenticated,
    markProposalBroadcast: isAccountOwner,
    reportProposalProblem: isAccountOwner,
    reportProposalProgress: isAccountOwner,
    markProposalConfirmed: isAccountOwner,
    cancelSpendProposal: isAccountOwner,
  },
}
