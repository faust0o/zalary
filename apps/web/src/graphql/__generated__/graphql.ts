/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AccessInvite = {
  __typename?: 'AccessInvite';
  createdAt: Scalars['String']['output'];
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  role: AccessRole;
  token: Scalars['String']['output'];
};

export type AccessInvitePreview = {
  __typename?: 'AccessInvitePreview';
  expiresAt: Scalars['String']['output'];
  ownerUsername: Scalars['String']['output'];
  role: AccessRole;
};

export type AccessRole =
  | 'DELEGATE'
  | 'MEMBER';

export type AccountKey = {
  __typename?: 'AccountKey';
  exists: Scalars['Boolean']['output'];
  sealedBy?: Maybe<Scalars['String']['output']>;
  sealedKey?: Maybe<Scalars['String']['output']>;
};

export type ApprovalDecision =
  | 'APPROVE'
  | 'REJECT';

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptAccessInvite: AuthPayload;
  acceptTreasuryInvite: AuthPayload;
  approveSpendProposal: SpendProposal;
  cancelSpendProposal: SpendProposal;
  changePassword: AuthPayload;
  createAccessInvite: AccessInvite;
  createAccountKey: AccountKey;
  createSpendProposal: SpendProposal;
  createTreasury: Treasury;
  createTreasuryInvite: TreasuryInvite;
  deleteAccount: Scalars['Boolean']['output'];
  deleteTreasury: Scalars['Boolean']['output'];
  finalizeTreasury: Treasury;
  login: AuthPayload;
  markProposalBroadcast: SpendProposal;
  markProposalConfirmed: SpendProposal;
  markProposalSigned: SpendProposal;
  register: AuthPayload;
  registerPasskey: Passkey;
  rejectSpendProposal: SpendProposal;
  removeAccountMember: User;
  removePasskey: Passkey;
  removeTreasuryMember: TreasuryMember;
  reportProposalProblem: SpendProposal;
  reportProposalProgress: SpendProposal;
  reportTreasuryBalance: Treasury;
  resetTreasuryKeygen: Treasury;
  revokeAccessInvite: AccessInvite;
  revokeTreasuryInvite: TreasuryInvite;
  setMemberAccess: User;
  setProposalSigners: SpendProposal;
  shareAccountKey: User;
  shareTreasuryViewingKey: Treasury;
  startTreasuryKeygen: Treasury;
  submitKeygenResult: TreasuryMember;
  treasuryHeartbeat: TreasuryMember;
  updateTreasury: Treasury;
  writeSealedRecords: Array<SealedRecord>;
};


export type MutationAcceptAccessInviteArgs = {
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationAcceptTreasuryInviteArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  token: Scalars['String']['input'];
  username?: InputMaybe<Scalars['String']['input']>;
};


export type MutationApproveSpendProposalArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelSpendProposalArgs = {
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChangePasswordArgs = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};


export type MutationCreateAccessInviteArgs = {
  role?: InputMaybe<AccessRole>;
};


export type MutationCreateAccountKeyArgs = {
  sealedKey: Scalars['String']['input'];
};


export type MutationCreateSpendProposalArgs = {
  frostSessionId: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  sealed: Scalars['String']['input'];
  sealedPczt: Scalars['String']['input'];
};


export type MutationCreateTreasuryArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationDeleteAccountArgs = {
  treasuryEmpty?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationFinalizeTreasuryArgs = {
  address: Scalars['String']['input'];
  birthdayHeight: Scalars['Int']['input'];
  changeAddress: Scalars['String']['input'];
  encryptedViewingKey: Scalars['String']['input'];
  viewingKeyMessages: Array<ViewingKeyMessageInput>;
};


export type MutationLoginArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationMarkProposalBroadcastArgs = {
  id: Scalars['ID']['input'];
  sealedTxid: Scalars['String']['input'];
};


export type MutationMarkProposalConfirmedArgs = {
  id: Scalars['ID']['input'];
};


export type MutationMarkProposalSignedArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRegisterArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationRegisterPasskeyArgs = {
  commsPublicKey: Scalars['String']['input'];
  credentialId: Scalars['String']['input'];
  prfSalt: Scalars['String']['input'];
  transports?: InputMaybe<Array<Scalars['String']['input']>>;
  wrappedVaultKey: Scalars['String']['input'];
};


export type MutationRejectSpendProposalArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveAccountMemberArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationRemovePasskeyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTreasuryMemberArgs = {
  id: Scalars['ID']['input'];
};


export type MutationReportProposalProblemArgs = {
  id: Scalars['ID']['input'];
  problem?: InputMaybe<Scalars['String']['input']>;
};


export type MutationReportProposalProgressArgs = {
  id: Scalars['ID']['input'];
  progress?: InputMaybe<Scalars['String']['input']>;
};


export type MutationReportTreasuryBalanceArgs = {
  sealedBalance: Scalars['String']['input'];
};


export type MutationRevokeAccessInviteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeTreasuryInviteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetMemberAccessArgs = {
  role: AccessRole;
  userId: Scalars['ID']['input'];
};


export type MutationSetProposalSignersArgs = {
  id: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']>;
};


export type MutationShareAccountKeyArgs = {
  sealedKey: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationShareTreasuryViewingKeyArgs = {
  viewingKeyMessages: Array<ViewingKeyMessageInput>;
};


export type MutationStartTreasuryKeygenArgs = {
  dkgSessionId: Scalars['String']['input'];
};


export type MutationSubmitKeygenResultArgs = {
  dkgSessionId: Scalars['String']['input'];
  encryptedKeyPackage: Scalars['String']['input'];
  groupPublicKey: Scalars['String']['input'];
  identifier: Scalars['String']['input'];
  publicKeyPackage: Scalars['String']['input'];
};


export type MutationTreasuryHeartbeatArgs = {
  ready: Scalars['Boolean']['input'];
};


export type MutationUpdateTreasuryArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  threshold?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationWriteSealedRecordsArgs = {
  deletes?: InputMaybe<Array<SealedRecordDelete>>;
  writes: Array<SealedRecordWrite>;
};

export type Passkey = {
  __typename?: 'Passkey';
  createdAt: Scalars['String']['output'];
  credentialId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  prfSalt: Scalars['String']['output'];
  transports: Array<Scalars['String']['output']>;
  wrappedVaultKey: Scalars['String']['output'];
};

export type ProposalApproval = {
  __typename?: 'ProposalApproval';
  createdAt: Scalars['String']['output'];
  decision: ApprovalDecision;
  id: Scalars['ID']['output'];
  signedAt?: Maybe<Scalars['String']['output']>;
  user: User;
};

export type Query = {
  __typename?: 'Query';
  accessInvite?: Maybe<AccessInvitePreview>;
  accessInvites: Array<AccessInvite>;
  accountKey: AccountKey;
  accountMembers: Array<User>;
  me?: Maybe<User>;
  myPasskeys: Array<Passkey>;
  sealedRecords: Array<SealedRecord>;
  spendProposal?: Maybe<SpendProposal>;
  spendProposals: Array<SpendProposal>;
  treasury?: Maybe<Treasury>;
  treasuryInvite?: Maybe<TreasuryInvitePreview>;
};


export type QueryAccessInviteArgs = {
  token: Scalars['String']['input'];
};


export type QuerySpendProposalArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySpendProposalsArgs = {
  open?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryTreasuryInviteArgs = {
  token: Scalars['String']['input'];
};

export type SealedRecord = {
  __typename?: 'SealedRecord';
  data: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
};

export type SealedRecordDelete = {
  id: Scalars['ID']['input'];
  version: Scalars['Int']['input'];
};

export type SealedRecordWrite = {
  data: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  version: Scalars['Int']['input'];
};

export type SpendProposal = {
  __typename?: 'SpendProposal';
  approvals: Array<ProposalApproval>;
  broadcastAt?: Maybe<Scalars['String']['output']>;
  confirmedAt?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  createdBy: User;
  error?: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['String']['output'];
  frostSessionId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  myApproval?: Maybe<ProposalApproval>;
  progress?: Maybe<Scalars['String']['output']>;
  progressAt?: Maybe<Scalars['String']['output']>;
  sealed: Scalars['String']['output'];
  sealedPczt?: Maybe<Scalars['String']['output']>;
  sealedTxid?: Maybe<Scalars['String']['output']>;
  signerIds: Array<Scalars['ID']['output']>;
  status: SpendProposalStatus;
  threshold: Scalars['Int']['output'];
};

export type SpendProposalStatus =
  | 'AWAITING_APPROVALS'
  | 'BROADCAST'
  | 'CANCELLED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'SIGNING';

export type Treasury = {
  __typename?: 'Treasury';
  address?: Maybe<Scalars['String']['output']>;
  birthdayHeight?: Maybe<Scalars['Int']['output']>;
  changeAddress?: Maybe<Scalars['String']['output']>;
  coordinator: User;
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  dkgSessionId?: Maybe<Scalars['String']['output']>;
  encryptedViewingKey?: Maybe<Scalars['String']['output']>;
  groupPublicKey?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  invites: Array<TreasuryInvite>;
  isCoordinator: Scalars['Boolean']['output'];
  keygenStartedAt?: Maybe<Scalars['String']['output']>;
  members: Array<TreasuryMember>;
  myMembership?: Maybe<TreasuryMember>;
  name: Scalars['String']['output'];
  publicKeyPackage?: Maybe<Scalars['String']['output']>;
  sealedBalance?: Maybe<Scalars['String']['output']>;
  signerCount: Scalars['Int']['output'];
  status: TreasuryStatus;
  threshold: Scalars['Int']['output'];
};

export type TreasuryInvite = {
  __typename?: 'TreasuryInvite';
  createdAt: Scalars['String']['output'];
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  token: Scalars['String']['output'];
};

export type TreasuryInvitePreview = {
  __typename?: 'TreasuryInvitePreview';
  expiresAt: Scalars['String']['output'];
  memberCount: Scalars['Int']['output'];
  ownerUsername: Scalars['String']['output'];
  threshold: Scalars['Int']['output'];
  treasuryDescription?: Maybe<Scalars['String']['output']>;
  treasuryName: Scalars['String']['output'];
};

export type TreasuryMember = {
  __typename?: 'TreasuryMember';
  encryptedKeyPackage?: Maybe<Scalars['String']['output']>;
  groupPublicKey?: Maybe<Scalars['String']['output']>;
  hasKeyShare: Scalars['Boolean']['output'];
  hasViewingKey: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  identifier?: Maybe<Scalars['String']['output']>;
  isCoordinator: Scalars['Boolean']['output'];
  joinedAt: Scalars['String']['output'];
  online: Scalars['Boolean']['output'];
  ready: Scalars['Boolean']['output'];
  user: User;
  viewingKeyMessage?: Maybe<Scalars['String']['output']>;
};

export type TreasuryStatus =
  | 'ACTIVE'
  | 'DRAFT'
  | 'KEYGEN';

export type User = {
  __typename?: 'User';
  canEditPayroll: Scalars['Boolean']['output'];
  commsPublicKey?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  hasAccountKey: Scalars['Boolean']['output'];
  hasPasskey: Scalars['Boolean']['output'];
  hasTreasury: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isAccountOwner: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  owner?: Maybe<User>;
  role?: Maybe<AccessRole>;
  username: Scalars['String']['output'];
};

export type ViewingKeyMessageInput = {
  message: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};

export type MeSidebarQueryVariables = Exact<{ [key: string]: never; }>;


export type MeSidebarQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, username: string, isAccountOwner: boolean, owner?: { __typename?: 'User', id: string, username: string } | null } | null, treasury?: { __typename?: 'Treasury', id: string, name: string, status: TreasuryStatus } | null };

export type WalkthroughStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type WalkthroughStatusQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, hasTreasury: boolean, owner?: { __typename?: 'User', id: string } | null } | null };

export type AccountMembersQueryVariables = Exact<{ [key: string]: never; }>;


export type AccountMembersQuery = { __typename?: 'Query', accountMembers: Array<{ __typename?: 'User', id: string, name?: string | null, username: string, role?: AccessRole | null, isAccountOwner: boolean, commsPublicKey?: string | null, hasAccountKey: boolean, createdAt: string }> };

export type AccessInvitesQueryVariables = Exact<{ [key: string]: never; }>;


export type AccessInvitesQuery = { __typename?: 'Query', accessInvites: Array<{ __typename?: 'AccessInvite', id: string, token: string, role: AccessRole, expiresAt: string }> };

export type CreateAccessInviteMutationVariables = Exact<{
  role?: InputMaybe<AccessRole>;
}>;


export type CreateAccessInviteMutation = { __typename?: 'Mutation', createAccessInvite: { __typename?: 'AccessInvite', id: string, token: string, role: AccessRole, expiresAt: string } };

export type RevokeAccessInviteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeAccessInviteMutation = { __typename?: 'Mutation', revokeAccessInvite: { __typename?: 'AccessInvite', id: string } };

export type SetMemberAccessMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  role: AccessRole;
}>;


export type SetMemberAccessMutation = { __typename?: 'Mutation', setMemberAccess: { __typename?: 'User', id: string, role?: AccessRole | null, canEditPayroll: boolean } };

export type RemoveAccountMemberMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type RemoveAccountMemberMutation = { __typename?: 'Mutation', removeAccountMember: { __typename?: 'User', id: string } };

export type LoginMutationVariables = Exact<{
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', token: string, user: { __typename?: 'User', id: string, username: string } } };

export type RegisterMutationVariables = Exact<{
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type RegisterMutation = { __typename?: 'Mutation', register: { __typename?: 'AuthPayload', token: string, user: { __typename?: 'User', id: string, username: string } } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, username: string, name?: string | null } | null };

export type AcceptAccessInviteMutationVariables = Exact<{
  token: Scalars['String']['input'];
  name: Scalars['String']['input'];
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type AcceptAccessInviteMutation = { __typename?: 'Mutation', acceptAccessInvite: { __typename?: 'AuthPayload', token: string, user: { __typename?: 'User', id: string, username: string } } };

export type MyPasskeysQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPasskeysQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, commsPublicKey?: string | null } | null, myPasskeys: Array<{ __typename?: 'Passkey', id: string, credentialId: string, prfSalt: string, wrappedVaultKey: string, transports: Array<string>, createdAt: string }> };

export type RegisterPasskeyMutationVariables = Exact<{
  credentialId: Scalars['String']['input'];
  prfSalt: Scalars['String']['input'];
  wrappedVaultKey: Scalars['String']['input'];
  commsPublicKey: Scalars['String']['input'];
  transports?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type RegisterPasskeyMutation = { __typename?: 'Mutation', registerPasskey: { __typename?: 'Passkey', id: string, credentialId: string, prfSalt: string, wrappedVaultKey: string, transports: Array<string>, createdAt: string } };

export type RemovePasskeyMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemovePasskeyMutation = { __typename?: 'Mutation', removePasskey: { __typename?: 'Passkey', id: string } };

export type SpendProposalFieldsFragment = { __typename?: 'SpendProposal', id: string, status: SpendProposalStatus, sealed: string, sealedTxid?: string | null, frostSessionId: string, signerIds: Array<string>, error?: string | null, progress?: string | null, progressAt?: string | null, threshold: number, expiresAt: string, broadcastAt?: string | null, confirmedAt?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, name?: string | null, username: string }, approvals: Array<{ __typename?: 'ProposalApproval', id: string, decision: ApprovalDecision, signedAt?: string | null, createdAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string } }>, myApproval?: { __typename?: 'ProposalApproval', id: string, decision: ApprovalDecision, signedAt?: string | null } | null };

export type SpendProposalsQueryVariables = Exact<{
  open?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type SpendProposalsQuery = { __typename?: 'Query', spendProposals: Array<{ __typename?: 'SpendProposal', id: string, status: SpendProposalStatus, sealed: string, sealedTxid?: string | null, frostSessionId: string, signerIds: Array<string>, error?: string | null, progress?: string | null, progressAt?: string | null, threshold: number, expiresAt: string, broadcastAt?: string | null, confirmedAt?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, name?: string | null, username: string }, approvals: Array<{ __typename?: 'ProposalApproval', id: string, decision: ApprovalDecision, signedAt?: string | null, createdAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string } }>, myApproval?: { __typename?: 'ProposalApproval', id: string, decision: ApprovalDecision, signedAt?: string | null } | null }> };

export type SpendProposalPcztQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SpendProposalPcztQuery = { __typename?: 'Query', spendProposal?: { __typename?: 'SpendProposal', id: string, sealedPczt?: string | null } | null };

export type CreateSpendProposalMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  sealed: Scalars['String']['input'];
  sealedPczt: Scalars['String']['input'];
  frostSessionId: Scalars['String']['input'];
}>;


export type CreateSpendProposalMutation = { __typename?: 'Mutation', createSpendProposal: { __typename?: 'SpendProposal', id: string, status: SpendProposalStatus, sealed: string, sealedTxid?: string | null, frostSessionId: string, signerIds: Array<string>, error?: string | null, progress?: string | null, progressAt?: string | null, threshold: number, expiresAt: string, broadcastAt?: string | null, confirmedAt?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, name?: string | null, username: string }, approvals: Array<{ __typename?: 'ProposalApproval', id: string, decision: ApprovalDecision, signedAt?: string | null, createdAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string } }>, myApproval?: { __typename?: 'ProposalApproval', id: string, decision: ApprovalDecision, signedAt?: string | null } | null } };

export type ApproveSpendProposalMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ApproveSpendProposalMutation = { __typename?: 'Mutation', approveSpendProposal: { __typename?: 'SpendProposal', id: string } };

export type RejectSpendProposalMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RejectSpendProposalMutation = { __typename?: 'Mutation', rejectSpendProposal: { __typename?: 'SpendProposal', id: string, status: SpendProposalStatus } };

export type SetProposalSignersMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type SetProposalSignersMutation = { __typename?: 'Mutation', setProposalSigners: { __typename?: 'SpendProposal', id: string, status: SpendProposalStatus, signerIds: Array<string> } };

export type MarkProposalSignedMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type MarkProposalSignedMutation = { __typename?: 'Mutation', markProposalSigned: { __typename?: 'SpendProposal', id: string } };

export type MarkProposalBroadcastMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  sealedTxid: Scalars['String']['input'];
}>;


export type MarkProposalBroadcastMutation = { __typename?: 'Mutation', markProposalBroadcast: { __typename?: 'SpendProposal', id: string, status: SpendProposalStatus, sealedTxid?: string | null } };

export type ReportProposalProblemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  problem?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReportProposalProblemMutation = { __typename?: 'Mutation', reportProposalProblem: { __typename?: 'SpendProposal', id: string, error?: string | null } };

export type ReportProposalProgressMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  progress?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReportProposalProgressMutation = { __typename?: 'Mutation', reportProposalProgress: { __typename?: 'SpendProposal', id: string, progress?: string | null, progressAt?: string | null } };

export type MarkProposalConfirmedMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type MarkProposalConfirmedMutation = { __typename?: 'Mutation', markProposalConfirmed: { __typename?: 'SpendProposal', id: string, status: SpendProposalStatus } };

export type CancelSpendProposalMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type CancelSpendProposalMutation = { __typename?: 'Mutation', cancelSpendProposal: { __typename?: 'SpendProposal', id: string, status: SpendProposalStatus, error?: string | null } };

export type AccountKeyQueryVariables = Exact<{ [key: string]: never; }>;


export type AccountKeyQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, commsPublicKey?: string | null, isAccountOwner: boolean, canEditPayroll: boolean, owner?: { __typename?: 'User', id: string, username: string } | null } | null, accountKey: { __typename?: 'AccountKey', sealedKey?: string | null, sealedBy?: string | null, exists: boolean } };

export type CreateAccountKeyMutationVariables = Exact<{
  sealedKey: Scalars['String']['input'];
}>;


export type CreateAccountKeyMutation = { __typename?: 'Mutation', createAccountKey: { __typename?: 'AccountKey', sealedKey?: string | null, sealedBy?: string | null, exists: boolean } };

export type ShareAccountKeyMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  sealedKey: Scalars['String']['input'];
}>;


export type ShareAccountKeyMutation = { __typename?: 'Mutation', shareAccountKey: { __typename?: 'User', id: string, hasAccountKey: boolean } };

export type SealedRecordsQueryVariables = Exact<{ [key: string]: never; }>;


export type SealedRecordsQuery = { __typename?: 'Query', sealedRecords: Array<{ __typename?: 'SealedRecord', id: string, data: string, version: number }> };

export type WriteSealedRecordsMutationVariables = Exact<{
  writes: Array<SealedRecordWrite> | SealedRecordWrite;
  deletes?: InputMaybe<Array<SealedRecordDelete> | SealedRecordDelete>;
}>;


export type WriteSealedRecordsMutation = { __typename?: 'Mutation', writeSealedRecords: Array<{ __typename?: 'SealedRecord', id: string, data: string, version: number }> };

export type SealedRecordVersionFragment = { __typename?: 'SealedRecord', id: string, version: number };

export type TreasuryMemberFieldsFragment = { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } };

export type TreasuryFieldsFragment = { __typename?: 'Treasury', id: string, name: string, description?: string | null, threshold: number, status: TreasuryStatus, dkgSessionId?: string | null, keygenStartedAt?: string | null, groupPublicKey?: string | null, publicKeyPackage?: string | null, address?: string | null, changeAddress?: string | null, birthdayHeight?: number | null, encryptedViewingKey?: string | null, sealedBalance?: string | null, isCoordinator: boolean, signerCount: number, createdAt: string, coordinator: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null }, members: Array<{ __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } }>, myMembership?: { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } } | null, invites: Array<{ __typename?: 'TreasuryInvite', id: string, token: string, expiresAt: string, createdAt: string }> };

export type TreasuryQueryVariables = Exact<{ [key: string]: never; }>;


export type TreasuryQuery = { __typename?: 'Query', treasury?: { __typename?: 'Treasury', id: string, name: string, description?: string | null, threshold: number, status: TreasuryStatus, dkgSessionId?: string | null, keygenStartedAt?: string | null, groupPublicKey?: string | null, publicKeyPackage?: string | null, address?: string | null, changeAddress?: string | null, birthdayHeight?: number | null, encryptedViewingKey?: string | null, sealedBalance?: string | null, isCoordinator: boolean, signerCount: number, createdAt: string, coordinator: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null }, members: Array<{ __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } }>, myMembership?: { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } } | null, invites: Array<{ __typename?: 'TreasuryInvite', id: string, token: string, expiresAt: string, createdAt: string }> } | null };

export type CreateTreasuryMutationVariables = Exact<{
  name: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateTreasuryMutation = { __typename?: 'Mutation', createTreasury: { __typename?: 'Treasury', id: string, name: string, description?: string | null, threshold: number, status: TreasuryStatus, dkgSessionId?: string | null, keygenStartedAt?: string | null, groupPublicKey?: string | null, publicKeyPackage?: string | null, address?: string | null, changeAddress?: string | null, birthdayHeight?: number | null, encryptedViewingKey?: string | null, sealedBalance?: string | null, isCoordinator: boolean, signerCount: number, createdAt: string, coordinator: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null }, members: Array<{ __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } }>, myMembership?: { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } } | null, invites: Array<{ __typename?: 'TreasuryInvite', id: string, token: string, expiresAt: string, createdAt: string }> } };

export type UpdateTreasuryMutationVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  threshold?: InputMaybe<Scalars['Int']['input']>;
}>;


export type UpdateTreasuryMutation = { __typename?: 'Mutation', updateTreasury: { __typename?: 'Treasury', id: string, name: string, description?: string | null, threshold: number, status: TreasuryStatus, dkgSessionId?: string | null, keygenStartedAt?: string | null, groupPublicKey?: string | null, publicKeyPackage?: string | null, address?: string | null, changeAddress?: string | null, birthdayHeight?: number | null, encryptedViewingKey?: string | null, sealedBalance?: string | null, isCoordinator: boolean, signerCount: number, createdAt: string, coordinator: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null }, members: Array<{ __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } }>, myMembership?: { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } } | null, invites: Array<{ __typename?: 'TreasuryInvite', id: string, token: string, expiresAt: string, createdAt: string }> } };

export type DeleteTreasuryMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteTreasuryMutation = { __typename?: 'Mutation', deleteTreasury: boolean };

export type CreateTreasuryInviteMutationVariables = Exact<{ [key: string]: never; }>;


export type CreateTreasuryInviteMutation = { __typename?: 'Mutation', createTreasuryInvite: { __typename?: 'TreasuryInvite', id: string, token: string, expiresAt: string, createdAt: string } };

export type RevokeTreasuryInviteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeTreasuryInviteMutation = { __typename?: 'Mutation', revokeTreasuryInvite: { __typename?: 'TreasuryInvite', id: string } };

export type RemoveTreasuryMemberMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveTreasuryMemberMutation = { __typename?: 'Mutation', removeTreasuryMember: { __typename?: 'TreasuryMember', id: string } };

export type TreasuryHeartbeatMutationVariables = Exact<{
  ready: Scalars['Boolean']['input'];
}>;


export type TreasuryHeartbeatMutation = { __typename?: 'Mutation', treasuryHeartbeat: { __typename?: 'TreasuryMember', id: string, online: boolean, ready: boolean } };

export type StartTreasuryKeygenMutationVariables = Exact<{
  dkgSessionId: Scalars['String']['input'];
}>;


export type StartTreasuryKeygenMutation = { __typename?: 'Mutation', startTreasuryKeygen: { __typename?: 'Treasury', id: string, name: string, description?: string | null, threshold: number, status: TreasuryStatus, dkgSessionId?: string | null, keygenStartedAt?: string | null, groupPublicKey?: string | null, publicKeyPackage?: string | null, address?: string | null, changeAddress?: string | null, birthdayHeight?: number | null, encryptedViewingKey?: string | null, sealedBalance?: string | null, isCoordinator: boolean, signerCount: number, createdAt: string, coordinator: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null }, members: Array<{ __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } }>, myMembership?: { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } } | null, invites: Array<{ __typename?: 'TreasuryInvite', id: string, token: string, expiresAt: string, createdAt: string }> } };

export type SubmitKeygenResultMutationVariables = Exact<{
  dkgSessionId: Scalars['String']['input'];
  identifier: Scalars['String']['input'];
  encryptedKeyPackage: Scalars['String']['input'];
  publicKeyPackage: Scalars['String']['input'];
  groupPublicKey: Scalars['String']['input'];
}>;


export type SubmitKeygenResultMutation = { __typename?: 'Mutation', submitKeygenResult: { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } } };

export type FinalizeTreasuryMutationVariables = Exact<{
  address: Scalars['String']['input'];
  changeAddress: Scalars['String']['input'];
  encryptedViewingKey: Scalars['String']['input'];
  viewingKeyMessages: Array<ViewingKeyMessageInput> | ViewingKeyMessageInput;
  birthdayHeight: Scalars['Int']['input'];
}>;


export type FinalizeTreasuryMutation = { __typename?: 'Mutation', finalizeTreasury: { __typename?: 'Treasury', id: string, name: string, description?: string | null, threshold: number, status: TreasuryStatus, dkgSessionId?: string | null, keygenStartedAt?: string | null, groupPublicKey?: string | null, publicKeyPackage?: string | null, address?: string | null, changeAddress?: string | null, birthdayHeight?: number | null, encryptedViewingKey?: string | null, sealedBalance?: string | null, isCoordinator: boolean, signerCount: number, createdAt: string, coordinator: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null }, members: Array<{ __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } }>, myMembership?: { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } } | null, invites: Array<{ __typename?: 'TreasuryInvite', id: string, token: string, expiresAt: string, createdAt: string }> } };

export type ShareTreasuryViewingKeyMutationVariables = Exact<{
  viewingKeyMessages: Array<ViewingKeyMessageInput> | ViewingKeyMessageInput;
}>;


export type ShareTreasuryViewingKeyMutation = { __typename?: 'Mutation', shareTreasuryViewingKey: { __typename?: 'Treasury', id: string, name: string, description?: string | null, threshold: number, status: TreasuryStatus, dkgSessionId?: string | null, keygenStartedAt?: string | null, groupPublicKey?: string | null, publicKeyPackage?: string | null, address?: string | null, changeAddress?: string | null, birthdayHeight?: number | null, encryptedViewingKey?: string | null, sealedBalance?: string | null, isCoordinator: boolean, signerCount: number, createdAt: string, coordinator: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null }, members: Array<{ __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } }>, myMembership?: { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } } | null, invites: Array<{ __typename?: 'TreasuryInvite', id: string, token: string, expiresAt: string, createdAt: string }> } };

export type ResetTreasuryKeygenMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetTreasuryKeygenMutation = { __typename?: 'Mutation', resetTreasuryKeygen: { __typename?: 'Treasury', id: string, name: string, description?: string | null, threshold: number, status: TreasuryStatus, dkgSessionId?: string | null, keygenStartedAt?: string | null, groupPublicKey?: string | null, publicKeyPackage?: string | null, address?: string | null, changeAddress?: string | null, birthdayHeight?: number | null, encryptedViewingKey?: string | null, sealedBalance?: string | null, isCoordinator: boolean, signerCount: number, createdAt: string, coordinator: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null }, members: Array<{ __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } }>, myMembership?: { __typename?: 'TreasuryMember', id: string, identifier?: string | null, hasKeyShare: boolean, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null, hasViewingKey: boolean, groupPublicKey?: string | null, isCoordinator: boolean, online: boolean, ready: boolean, joinedAt: string, user: { __typename?: 'User', id: string, name?: string | null, username: string, commsPublicKey?: string | null } } | null, invites: Array<{ __typename?: 'TreasuryInvite', id: string, token: string, expiresAt: string, createdAt: string }> } };

export type ReportTreasuryBalanceMutationVariables = Exact<{
  sealedBalance: Scalars['String']['input'];
}>;


export type ReportTreasuryBalanceMutation = { __typename?: 'Mutation', reportTreasuryBalance: { __typename?: 'Treasury', id: string, sealedBalance?: string | null } };

export type TreasuryInvitePreviewQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type TreasuryInvitePreviewQuery = { __typename?: 'Query', treasuryInvite?: { __typename?: 'TreasuryInvitePreview', treasuryName: string, treasuryDescription?: string | null, ownerUsername: string, threshold: number, memberCount: number, expiresAt: string } | null };

export type AcceptTreasuryInviteMutationVariables = Exact<{
  token: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
}>;


export type AcceptTreasuryInviteMutation = { __typename?: 'Mutation', acceptTreasuryInvite: { __typename?: 'AuthPayload', token: string, user: { __typename?: 'User', id: string, username: string } } };

export type MeLayoutQueryVariables = Exact<{ [key: string]: never; }>;


export type MeLayoutQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, username: string, name?: string | null, isAccountOwner: boolean, role?: AccessRole | null, canEditPayroll: boolean, hasPasskey: boolean, commsPublicKey?: string | null, owner?: { __typename?: 'User', id: string, username: string } | null } | null, treasury?: { __typename?: 'Treasury', id: string, status: TreasuryStatus, address?: string | null, changeAddress?: string | null, birthdayHeight?: number | null, encryptedViewingKey?: string | null, isCoordinator: boolean, sealedBalance?: string | null, coordinator: { __typename?: 'User', id: string, commsPublicKey?: string | null }, myMembership?: { __typename?: 'TreasuryMember', id: string, encryptedKeyPackage?: string | null, viewingKeyMessage?: string | null } | null } | null };

export type AccessInvitePreviewQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type AccessInvitePreviewQuery = { __typename?: 'Query', accessInvite?: { __typename?: 'AccessInvitePreview', ownerUsername: string, role: AccessRole, expiresAt: string } | null };

export type MeSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type MeSettingsQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, username: string, name?: string | null, isAccountOwner: boolean, role?: AccessRole | null, owner?: { __typename?: 'User', id: string, username: string } | null } | null };

export type ChangePasswordMutationVariables = Exact<{
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ChangePasswordMutation = { __typename?: 'Mutation', changePassword: { __typename?: 'AuthPayload', token: string, user: { __typename?: 'User', id: string, username: string } } };

export type DeleteAccountMutationVariables = Exact<{
  treasuryEmpty?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type DeleteAccountMutation = { __typename?: 'Mutation', deleteAccount: boolean };

export const SpendProposalFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpendProposalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SpendProposal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sealed"}},{"kind":"Field","name":{"kind":"Name","value":"sealedTxid"}},{"kind":"Field","name":{"kind":"Name","value":"frostSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"signerIds"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"progressAt"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"broadcastAt"}},{"kind":"Field","name":{"kind":"Name","value":"confirmedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"approvals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"decision"}},{"kind":"Field","name":{"kind":"Name","value":"signedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"myApproval"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"decision"}},{"kind":"Field","name":{"kind":"Name","value":"signedAt"}}]}}]}}]} as unknown as DocumentNode<SpendProposalFieldsFragment, unknown>;
export const SealedRecordVersionFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SealedRecordVersion"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SealedRecord"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]} as unknown as DocumentNode<SealedRecordVersionFragment, unknown>;
export const TreasuryMemberFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}}]} as unknown as DocumentNode<TreasuryMemberFieldsFragment, unknown>;
export const TreasuryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Treasury"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dkgSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"keygenStartedAt"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"publicKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"changeAddress"}},{"kind":"Field","name":{"kind":"Name","value":"birthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"signerCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"coordinator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myMembership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"invites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}}]} as unknown as DocumentNode<TreasuryFieldsFragment, unknown>;
export const MeSidebarDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MeSidebar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"isAccountOwner"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"treasury"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<MeSidebarQuery, MeSidebarQueryVariables>;
export const WalkthroughStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WalkthroughStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"hasTreasury"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<WalkthroughStatusQuery, WalkthroughStatusQueryVariables>;
export const AccountMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accountMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isAccountOwner"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"hasAccountKey"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AccountMembersQuery, AccountMembersQueryVariables>;
export const AccessInvitesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccessInvites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessInvites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<AccessInvitesQuery, AccessInvitesQueryVariables>;
export const CreateAccessInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAccessInvite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"AccessRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAccessInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<CreateAccessInviteMutation, CreateAccessInviteMutationVariables>;
export const RevokeAccessInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeAccessInvite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeAccessInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RevokeAccessInviteMutation, RevokeAccessInviteMutationVariables>;
export const SetMemberAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetMemberAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AccessRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setMemberAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"canEditPayroll"}}]}}]}}]} as unknown as DocumentNode<SetMemberAccessMutation, SetMemberAccessMutationVariables>;
export const RemoveAccountMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveAccountMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeAccountMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RemoveAccountMemberMutation, RemoveAccountMemberMutationVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const AcceptAccessInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptAccessInvite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptAccessInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<AcceptAccessInviteMutation, AcceptAccessInviteMutationVariables>;
export const MyPasskeysDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyPasskeys"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myPasskeys"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"credentialId"}},{"kind":"Field","name":{"kind":"Name","value":"prfSalt"}},{"kind":"Field","name":{"kind":"Name","value":"wrappedVaultKey"}},{"kind":"Field","name":{"kind":"Name","value":"transports"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<MyPasskeysQuery, MyPasskeysQueryVariables>;
export const RegisterPasskeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegisterPasskey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"credentialId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"prfSalt"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"wrappedVaultKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"commsPublicKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"transports"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registerPasskey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"credentialId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"credentialId"}}},{"kind":"Argument","name":{"kind":"Name","value":"prfSalt"},"value":{"kind":"Variable","name":{"kind":"Name","value":"prfSalt"}}},{"kind":"Argument","name":{"kind":"Name","value":"wrappedVaultKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"wrappedVaultKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"commsPublicKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"commsPublicKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"transports"},"value":{"kind":"Variable","name":{"kind":"Name","value":"transports"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"credentialId"}},{"kind":"Field","name":{"kind":"Name","value":"prfSalt"}},{"kind":"Field","name":{"kind":"Name","value":"wrappedVaultKey"}},{"kind":"Field","name":{"kind":"Name","value":"transports"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<RegisterPasskeyMutation, RegisterPasskeyMutationVariables>;
export const RemovePasskeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemovePasskey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removePasskey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RemovePasskeyMutation, RemovePasskeyMutationVariables>;
export const SpendProposalsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SpendProposals"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"open"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"spendProposals"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"open"},"value":{"kind":"Variable","name":{"kind":"Name","value":"open"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SpendProposalFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpendProposalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SpendProposal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sealed"}},{"kind":"Field","name":{"kind":"Name","value":"sealedTxid"}},{"kind":"Field","name":{"kind":"Name","value":"frostSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"signerIds"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"progressAt"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"broadcastAt"}},{"kind":"Field","name":{"kind":"Name","value":"confirmedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"approvals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"decision"}},{"kind":"Field","name":{"kind":"Name","value":"signedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"myApproval"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"decision"}},{"kind":"Field","name":{"kind":"Name","value":"signedAt"}}]}}]}}]} as unknown as DocumentNode<SpendProposalsQuery, SpendProposalsQueryVariables>;
export const SpendProposalPcztDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SpendProposalPczt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"spendProposal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sealedPczt"}}]}}]}}]} as unknown as DocumentNode<SpendProposalPcztQuery, SpendProposalPcztQueryVariables>;
export const CreateSpendProposalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSpendProposal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sealed"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sealedPczt"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"frostSessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSpendProposal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"sealed"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sealed"}}},{"kind":"Argument","name":{"kind":"Name","value":"sealedPczt"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sealedPczt"}}},{"kind":"Argument","name":{"kind":"Name","value":"frostSessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"frostSessionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SpendProposalFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpendProposalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SpendProposal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sealed"}},{"kind":"Field","name":{"kind":"Name","value":"sealedTxid"}},{"kind":"Field","name":{"kind":"Name","value":"frostSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"signerIds"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"progressAt"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"broadcastAt"}},{"kind":"Field","name":{"kind":"Name","value":"confirmedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"approvals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"decision"}},{"kind":"Field","name":{"kind":"Name","value":"signedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"myApproval"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"decision"}},{"kind":"Field","name":{"kind":"Name","value":"signedAt"}}]}}]}}]} as unknown as DocumentNode<CreateSpendProposalMutation, CreateSpendProposalMutationVariables>;
export const ApproveSpendProposalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApproveSpendProposal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approveSpendProposal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ApproveSpendProposalMutation, ApproveSpendProposalMutationVariables>;
export const RejectSpendProposalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RejectSpendProposal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rejectSpendProposal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<RejectSpendProposalMutation, RejectSpendProposalMutationVariables>;
export const SetProposalSignersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetProposalSigners"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setProposalSigners"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"signerIds"}}]}}]}}]} as unknown as DocumentNode<SetProposalSignersMutation, SetProposalSignersMutationVariables>;
export const MarkProposalSignedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkProposalSigned"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markProposalSigned"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<MarkProposalSignedMutation, MarkProposalSignedMutationVariables>;
export const MarkProposalBroadcastDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkProposalBroadcast"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sealedTxid"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markProposalBroadcast"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"sealedTxid"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sealedTxid"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sealedTxid"}}]}}]}}]} as unknown as DocumentNode<MarkProposalBroadcastMutation, MarkProposalBroadcastMutationVariables>;
export const ReportProposalProblemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReportProposalProblem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"problem"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportProposalProblem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"problem"},"value":{"kind":"Variable","name":{"kind":"Name","value":"problem"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<ReportProposalProblemMutation, ReportProposalProblemMutationVariables>;
export const ReportProposalProgressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReportProposalProgress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"progress"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportProposalProgress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"progress"},"value":{"kind":"Variable","name":{"kind":"Name","value":"progress"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"progressAt"}}]}}]}}]} as unknown as DocumentNode<ReportProposalProgressMutation, ReportProposalProgressMutationVariables>;
export const MarkProposalConfirmedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkProposalConfirmed"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markProposalConfirmed"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<MarkProposalConfirmedMutation, MarkProposalConfirmedMutationVariables>;
export const CancelSpendProposalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelSpendProposal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reason"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelSpendProposal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"reason"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reason"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<CancelSpendProposalMutation, CancelSpendProposalMutationVariables>;
export const AccountKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountKey"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isAccountOwner"}},{"kind":"Field","name":{"kind":"Name","value":"canEditPayroll"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"accountKey"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sealedKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBy"}},{"kind":"Field","name":{"kind":"Name","value":"exists"}}]}}]}}]} as unknown as DocumentNode<AccountKeyQuery, AccountKeyQueryVariables>;
export const CreateAccountKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAccountKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sealedKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAccountKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sealedKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sealedKey"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sealedKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBy"}},{"kind":"Field","name":{"kind":"Name","value":"exists"}}]}}]}}]} as unknown as DocumentNode<CreateAccountKeyMutation, CreateAccountKeyMutationVariables>;
export const ShareAccountKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ShareAccountKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sealedKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shareAccountKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"sealedKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sealedKey"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"hasAccountKey"}}]}}]}}]} as unknown as DocumentNode<ShareAccountKeyMutation, ShareAccountKeyMutationVariables>;
export const SealedRecordsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SealedRecords"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sealedRecords"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<SealedRecordsQuery, SealedRecordsQueryVariables>;
export const WriteSealedRecordsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"WriteSealedRecords"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"writes"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SealedRecordWrite"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deletes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SealedRecordDelete"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"writeSealedRecords"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"writes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"writes"}}},{"kind":"Argument","name":{"kind":"Name","value":"deletes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deletes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<WriteSealedRecordsMutation, WriteSealedRecordsMutationVariables>;
export const TreasuryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Treasury"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"treasury"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Treasury"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dkgSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"keygenStartedAt"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"publicKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"changeAddress"}},{"kind":"Field","name":{"kind":"Name","value":"birthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"signerCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"coordinator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myMembership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"invites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<TreasuryQuery, TreasuryQueryVariables>;
export const CreateTreasuryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTreasury"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTreasury"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Treasury"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dkgSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"keygenStartedAt"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"publicKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"changeAddress"}},{"kind":"Field","name":{"kind":"Name","value":"birthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"signerCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"coordinator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myMembership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"invites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateTreasuryMutation, CreateTreasuryMutationVariables>;
export const UpdateTreasuryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTreasury"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"threshold"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTreasury"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"threshold"},"value":{"kind":"Variable","name":{"kind":"Name","value":"threshold"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Treasury"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dkgSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"keygenStartedAt"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"publicKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"changeAddress"}},{"kind":"Field","name":{"kind":"Name","value":"birthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"signerCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"coordinator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myMembership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"invites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<UpdateTreasuryMutation, UpdateTreasuryMutationVariables>;
export const DeleteTreasuryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTreasury"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTreasury"}}]}}]} as unknown as DocumentNode<DeleteTreasuryMutation, DeleteTreasuryMutationVariables>;
export const CreateTreasuryInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTreasuryInvite"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTreasuryInvite"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateTreasuryInviteMutation, CreateTreasuryInviteMutationVariables>;
export const RevokeTreasuryInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeTreasuryInvite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeTreasuryInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RevokeTreasuryInviteMutation, RevokeTreasuryInviteMutationVariables>;
export const RemoveTreasuryMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTreasuryMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTreasuryMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RemoveTreasuryMemberMutation, RemoveTreasuryMemberMutationVariables>;
export const TreasuryHeartbeatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TreasuryHeartbeat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ready"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"treasuryHeartbeat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ready"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ready"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}}]}}]}}]} as unknown as DocumentNode<TreasuryHeartbeatMutation, TreasuryHeartbeatMutationVariables>;
export const StartTreasuryKeygenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartTreasuryKeygen"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dkgSessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTreasuryKeygen"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"dkgSessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dkgSessionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Treasury"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dkgSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"keygenStartedAt"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"publicKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"changeAddress"}},{"kind":"Field","name":{"kind":"Name","value":"birthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"signerCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"coordinator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myMembership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"invites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<StartTreasuryKeygenMutation, StartTreasuryKeygenMutationVariables>;
export const SubmitKeygenResultDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubmitKeygenResult"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dkgSessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"identifier"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"encryptedKeyPackage"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publicKeyPackage"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupPublicKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submitKeygenResult"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"dkgSessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dkgSessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"identifier"},"value":{"kind":"Variable","name":{"kind":"Name","value":"identifier"}}},{"kind":"Argument","name":{"kind":"Name","value":"encryptedKeyPackage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"encryptedKeyPackage"}}},{"kind":"Argument","name":{"kind":"Name","value":"publicKeyPackage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publicKeyPackage"}}},{"kind":"Argument","name":{"kind":"Name","value":"groupPublicKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupPublicKey"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}}]} as unknown as DocumentNode<SubmitKeygenResultMutation, SubmitKeygenResultMutationVariables>;
export const FinalizeTreasuryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FinalizeTreasury"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"changeAddress"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"encryptedViewingKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"viewingKeyMessages"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ViewingKeyMessageInput"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"birthdayHeight"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"finalizeTreasury"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"changeAddress"},"value":{"kind":"Variable","name":{"kind":"Name","value":"changeAddress"}}},{"kind":"Argument","name":{"kind":"Name","value":"encryptedViewingKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"encryptedViewingKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"viewingKeyMessages"},"value":{"kind":"Variable","name":{"kind":"Name","value":"viewingKeyMessages"}}},{"kind":"Argument","name":{"kind":"Name","value":"birthdayHeight"},"value":{"kind":"Variable","name":{"kind":"Name","value":"birthdayHeight"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Treasury"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dkgSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"keygenStartedAt"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"publicKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"changeAddress"}},{"kind":"Field","name":{"kind":"Name","value":"birthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"signerCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"coordinator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myMembership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"invites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<FinalizeTreasuryMutation, FinalizeTreasuryMutationVariables>;
export const ShareTreasuryViewingKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ShareTreasuryViewingKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"viewingKeyMessages"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ViewingKeyMessageInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shareTreasuryViewingKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"viewingKeyMessages"},"value":{"kind":"Variable","name":{"kind":"Name","value":"viewingKeyMessages"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Treasury"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dkgSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"keygenStartedAt"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"publicKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"changeAddress"}},{"kind":"Field","name":{"kind":"Name","value":"birthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"signerCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"coordinator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myMembership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"invites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<ShareTreasuryViewingKeyMutation, ShareTreasuryViewingKeyMutationVariables>;
export const ResetTreasuryKeygenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetTreasuryKeygen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetTreasuryKeygen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryMemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TreasuryMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"hasKeyShare"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"online"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TreasuryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Treasury"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dkgSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"keygenStartedAt"}},{"kind":"Field","name":{"kind":"Name","value":"groupPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"publicKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"changeAddress"}},{"kind":"Field","name":{"kind":"Name","value":"birthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"signerCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"coordinator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myMembership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TreasuryMemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"invites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<ResetTreasuryKeygenMutation, ResetTreasuryKeygenMutationVariables>;
export const ReportTreasuryBalanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReportTreasuryBalance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sealedBalance"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportTreasuryBalance"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sealedBalance"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sealedBalance"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}}]}}]}}]} as unknown as DocumentNode<ReportTreasuryBalanceMutation, ReportTreasuryBalanceMutationVariables>;
export const TreasuryInvitePreviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TreasuryInvitePreview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"treasuryInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"treasuryName"}},{"kind":"Field","name":{"kind":"Name","value":"treasuryDescription"}},{"kind":"Field","name":{"kind":"Name","value":"ownerUsername"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"memberCount"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<TreasuryInvitePreviewQuery, TreasuryInvitePreviewQueryVariables>;
export const AcceptTreasuryInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptTreasuryInvite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptTreasuryInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<AcceptTreasuryInviteMutation, AcceptTreasuryInviteMutationVariables>;
export const MeLayoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MeLayout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isAccountOwner"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"canEditPayroll"}},{"kind":"Field","name":{"kind":"Name","value":"hasPasskey"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"treasury"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"changeAddress"}},{"kind":"Field","name":{"kind":"Name","value":"birthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"isCoordinator"}},{"kind":"Field","name":{"kind":"Name","value":"sealedBalance"}},{"kind":"Field","name":{"kind":"Name","value":"coordinator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commsPublicKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myMembership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"encryptedKeyPackage"}},{"kind":"Field","name":{"kind":"Name","value":"viewingKeyMessage"}}]}}]}}]}}]} as unknown as DocumentNode<MeLayoutQuery, MeLayoutQueryVariables>;
export const AccessInvitePreviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccessInvitePreview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownerUsername"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<AccessInvitePreviewQuery, AccessInvitePreviewQueryVariables>;
export const MeSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MeSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isAccountOwner"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<MeSettingsQuery, MeSettingsQueryVariables>;
export const ChangePasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"currentPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const DeleteAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"treasuryEmpty"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"treasuryEmpty"},"value":{"kind":"Variable","name":{"kind":"Name","value":"treasuryEmpty"}}}]}]}}]} as unknown as DocumentNode<DeleteAccountMutation, DeleteAccountMutationVariables>;