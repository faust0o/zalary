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

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type DashboardStats = {
  __typename?: 'DashboardStats';
  nextPayrollDue?: Maybe<NextPayrollDue>;
  recentRuns: Array<PayrollRun>;
  zecSpentByMonth: Array<ZecSpentByMonth>;
};

export type DelegateInvite = {
  __typename?: 'DelegateInvite';
  createdAt: Scalars['String']['output'];
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  token: Scalars['String']['output'];
};

export type DelegateInvitePreview = {
  __typename?: 'DelegateInvitePreview';
  expiresAt: Scalars['String']['output'];
  ownerUsername: Scalars['String']['output'];
};

export type Employee = {
  __typename?: 'Employee';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  salaryAmount: Scalars['Float']['output'];
  salaryCurrency: SalaryCurrency;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  walletAddress: Scalars['String']['output'];
  walletVerified: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptDelegateInvite: AuthPayload;
  changePassword: AuthPayload;
  completePayrollRun: PayrollRun;
  createDelegateInvite: DelegateInvite;
  createEmployee: Employee;
  createPayroll: Payroll;
  deleteAccount: Scalars['Boolean']['output'];
  deleteEmployee: Employee;
  deletePayroll: Payroll;
  importEmployeesCsv: Array<Employee>;
  login: AuthPayload;
  register: AuthPayload;
  removeDelegate: User;
  revokeDelegateInvite: DelegateInvite;
  startPayrollRun: PayrollRun;
  updateEmployee: Employee;
  updatePaymentStatus: Payment;
  updatePayroll: Payroll;
  updateUser: User;
};


export type MutationAcceptDelegateInviteArgs = {
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationChangePasswordArgs = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};


export type MutationCompletePayrollRunArgs = {
  runId: Scalars['ID']['input'];
};


export type MutationCreateEmployeeArgs = {
  name: Scalars['String']['input'];
  salaryAmount: Scalars['Float']['input'];
  salaryCurrency?: InputMaybe<SalaryCurrency>;
  title?: InputMaybe<Scalars['String']['input']>;
  walletAddress: Scalars['String']['input'];
};


export type MutationCreatePayrollArgs = {
  customDays?: InputMaybe<Scalars['Int']['input']>;
  employeeIds: Array<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  schedule: Schedule;
};


export type MutationDeleteEmployeeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePayrollArgs = {
  id: Scalars['ID']['input'];
};


export type MutationImportEmployeesCsvArgs = {
  csvContent: Scalars['String']['input'];
};


export type MutationLoginArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationRegisterArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationRemoveDelegateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeDelegateInviteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationStartPayrollRunArgs = {
  payrollId: Scalars['ID']['input'];
};


export type MutationUpdateEmployeeArgs = {
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  salaryAmount?: InputMaybe<Scalars['Float']['input']>;
  salaryCurrency?: InputMaybe<SalaryCurrency>;
  title?: InputMaybe<Scalars['String']['input']>;
  walletAddress?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdatePaymentStatusArgs = {
  paymentId: Scalars['ID']['input'];
  status: PaymentStatus;
  txHash?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdatePayrollArgs = {
  customDays?: InputMaybe<Scalars['Int']['input']>;
  employeeIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  schedule?: InputMaybe<Schedule>;
};


export type MutationUpdateUserArgs = {
  walletBirthdayHeight?: InputMaybe<Scalars['Int']['input']>;
  zcashViewingKey?: InputMaybe<Scalars['String']['input']>;
};

export type NextPayrollDue = {
  __typename?: 'NextPayrollDue';
  dueDate: Scalars['String']['output'];
  employeeCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  totalUsd: Scalars['Float']['output'];
};

export type Payment = {
  __typename?: 'Payment';
  amountUsd: Scalars['Float']['output'];
  amountZec: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  employee: Employee;
  id: Scalars['ID']['output'];
  memo: Scalars['String']['output'];
  payroll: Payroll;
  status: PaymentStatus;
  txHash?: Maybe<Scalars['String']['output']>;
};

export type PaymentStatus =
  | 'COMPLETED'
  | 'PENDING'
  | 'SKIPPED';

export type Payroll = {
  __typename?: 'Payroll';
  createdAt: Scalars['String']['output'];
  customDays?: Maybe<Scalars['Int']['output']>;
  employees: Array<PayrollEmployee>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  runs: Array<PayrollRun>;
  schedule: Schedule;
};

export type PayrollEmployee = {
  __typename?: 'PayrollEmployee';
  employee: Employee;
  employeeId: Scalars['String']['output'];
  payrollId: Scalars['String']['output'];
};

export type PayrollRun = {
  __typename?: 'PayrollRun';
  completedAt?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  payments: Array<Payment>;
  payroll: Payroll;
  status: PayrollRunStatus;
  zecPriceUsd: Scalars['Float']['output'];
};

export type PayrollRunStatus =
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | 'PENDING';

export type Query = {
  __typename?: 'Query';
  dashboardStats: DashboardStats;
  delegateInvite?: Maybe<DelegateInvitePreview>;
  delegateInvites: Array<DelegateInvite>;
  delegates: Array<User>;
  employee?: Maybe<Employee>;
  employees: Array<Employee>;
  me?: Maybe<User>;
  payments: Array<Payment>;
  payroll?: Maybe<Payroll>;
  payrollRun?: Maybe<PayrollRun>;
  payrolls: Array<Payroll>;
  zecBalance?: Maybe<ZecBalance>;
};


export type QueryDelegateInviteArgs = {
  token: Scalars['String']['input'];
};


export type QueryEmployeeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPaymentsArgs = {
  employeeId?: InputMaybe<Scalars['ID']['input']>;
  payrollId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPayrollArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPayrollRunArgs = {
  id: Scalars['ID']['input'];
};

export type SalaryCurrency =
  | 'USD'
  | 'ZEC';

export type Schedule =
  | 'EVERY_MONTH'
  | 'EVERY_TWO_WEEKS'
  | 'EVERY_X_DAYS';

export type User = {
  __typename?: 'User';
  createdAt: Scalars['String']['output'];
  employees: Array<Employee>;
  hasEmployees: Scalars['Boolean']['output'];
  hasPayrollRun: Scalars['Boolean']['output'];
  hasPayrolls: Scalars['Boolean']['output'];
  hasVerifiedPayment: Scalars['Boolean']['output'];
  hasWallet: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  needsWalkthrough: Scalars['Boolean']['output'];
  owner?: Maybe<User>;
  payrolls: Array<Payroll>;
  username: Scalars['String']['output'];
  walletBirthdayHeight?: Maybe<Scalars['Int']['output']>;
  zcashViewingKey?: Maybe<Scalars['String']['output']>;
};

export type ZecBalance = {
  __typename?: 'ZecBalance';
  available: Scalars['Float']['output'];
};

export type ZecSpentByMonth = {
  __typename?: 'ZecSpentByMonth';
  amount: Scalars['Float']['output'];
  month: Scalars['String']['output'];
};

export type MeSidebarQueryVariables = Exact<{ [key: string]: never; }>;


export type MeSidebarQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, username: string, owner?: { __typename?: 'User', id: string, username: string } | null } | null, zecBalance?: { __typename?: 'ZecBalance', available: number } | null };

export type PayrollsForDisburseQueryVariables = Exact<{ [key: string]: never; }>;


export type PayrollsForDisburseQuery = { __typename?: 'Query', payrolls: Array<{ __typename?: 'Payroll', id: string, name: string, schedule: Schedule, customDays?: number | null, employees: Array<{ __typename?: 'PayrollEmployee', employeeId: string, employee: { __typename?: 'Employee', id: string, name: string, walletAddress: string, salaryAmount: number } }> }> };

export type StartPayrollRunMutationVariables = Exact<{
  payrollId: Scalars['ID']['input'];
}>;


export type StartPayrollRunMutation = { __typename?: 'Mutation', startPayrollRun: { __typename?: 'PayrollRun', id: string, status: PayrollRunStatus, zecPriceUsd: number, payments: Array<{ __typename?: 'Payment', id: string, amountUsd: number, amountZec: number, memo: string, status: PaymentStatus, employee: { __typename?: 'Employee', name: string, walletAddress: string } }> } };

export type UpdatePaymentStatusMutationVariables = Exact<{
  paymentId: Scalars['ID']['input'];
  status: PaymentStatus;
  txHash?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdatePaymentStatusMutation = { __typename?: 'Mutation', updatePaymentStatus: { __typename?: 'Payment', id: string, status: PaymentStatus } };

export type CompletePayrollRunMutationVariables = Exact<{
  runId: Scalars['ID']['input'];
}>;


export type CompletePayrollRunMutation = { __typename?: 'Mutation', completePayrollRun: { __typename?: 'PayrollRun', id: string, status: PayrollRunStatus } };

export type WalkthroughStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type WalkthroughStatusQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, needsWalkthrough: boolean, hasEmployees: boolean, hasPayrolls: boolean, hasPayrollRun: boolean, hasWallet: boolean, owner?: { __typename?: 'User', id: string } | null } | null };

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


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, username: string } | null };

export type AcceptDelegateInviteMutationVariables = Exact<{
  token: Scalars['String']['input'];
  name: Scalars['String']['input'];
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type AcceptDelegateInviteMutation = { __typename?: 'Mutation', acceptDelegateInvite: { __typename?: 'AuthPayload', token: string, user: { __typename?: 'User', id: string, username: string } } };

export type EmployeeFieldsFragment = { __typename?: 'Employee', id: string, name: string, walletAddress: string, salaryAmount: number, salaryCurrency: SalaryCurrency } & { ' $fragmentName'?: 'EmployeeFieldsFragment' };

export type PayrollFieldsFragment = { __typename?: 'Payroll', id: string, name: string, schedule: Schedule, customDays?: number | null, employees: Array<{ __typename?: 'PayrollEmployee', employeeId: string, employee: (
      { __typename?: 'Employee' }
      & { ' $fragmentRefs'?: { 'EmployeeFieldsFragment': EmployeeFieldsFragment } }
    ) }> } & { ' $fragmentName'?: 'PayrollFieldsFragment' };

export type PaymentFieldsFragment = { __typename?: 'Payment', id: string, amountUsd: number, amountZec: number, status: PaymentStatus, txHash?: string | null, createdAt: string, employee: { __typename?: 'Employee', name: string, walletAddress: string }, payroll: { __typename?: 'Payroll', name: string } } & { ' $fragmentName'?: 'PaymentFieldsFragment' };

export type PayrollRunFieldsFragment = { __typename?: 'PayrollRun', id: string, status: PayrollRunStatus, zecPriceUsd: number, createdAt: string, completedAt?: string | null, payroll: { __typename?: 'Payroll', name: string }, payments: Array<(
    { __typename?: 'Payment' }
    & { ' $fragmentRefs'?: { 'PaymentFieldsFragment': PaymentFieldsFragment } }
  )> } & { ' $fragmentName'?: 'PayrollRunFieldsFragment' };

export type MeLayoutQueryVariables = Exact<{ [key: string]: never; }>;


export type MeLayoutQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, zcashViewingKey?: string | null, walletBirthdayHeight?: number | null, owner?: { __typename?: 'User', id: string } | null } | null };

export type DashboardStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type DashboardStatsQuery = { __typename?: 'Query', dashboardStats: { __typename?: 'DashboardStats', zecSpentByMonth: Array<{ __typename?: 'ZecSpentByMonth', month: string, amount: number }> }, payrolls: Array<{ __typename?: 'Payroll', id: string, name: string, schedule: Schedule, customDays?: number | null, employees: Array<{ __typename?: 'PayrollEmployee', employeeId: string, employee: { __typename?: 'Employee', id: string, name: string, salaryAmount: number } }>, runs: Array<{ __typename?: 'PayrollRun', id: string, status: PayrollRunStatus, createdAt: string }> }> };

export type DelegationsQueryVariables = Exact<{ [key: string]: never; }>;


export type DelegationsQuery = { __typename?: 'Query', delegates: Array<{ __typename?: 'User', id: string, name?: string | null, username: string, createdAt: string }>, delegateInvites: Array<{ __typename?: 'DelegateInvite', id: string, token: string, expiresAt: string }> };

export type CreateDelegateInviteMutationVariables = Exact<{ [key: string]: never; }>;


export type CreateDelegateInviteMutation = { __typename?: 'Mutation', createDelegateInvite: { __typename?: 'DelegateInvite', id: string, token: string, expiresAt: string } };

export type RevokeDelegateInviteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeDelegateInviteMutation = { __typename?: 'Mutation', revokeDelegateInvite: { __typename?: 'DelegateInvite', id: string } };

export type RemoveDelegateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveDelegateMutation = { __typename?: 'Mutation', removeDelegate: { __typename?: 'User', id: string } };

export type EmployeesQueryVariables = Exact<{ [key: string]: never; }>;


export type EmployeesQuery = { __typename?: 'Query', employees: Array<{ __typename?: 'Employee', id: string, name: string, title?: string | null, walletAddress: string, walletVerified: boolean, salaryAmount: number, salaryCurrency: SalaryCurrency }> };

export type CreateEmployeeMutationVariables = Exact<{
  name: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  walletAddress: Scalars['String']['input'];
  salaryAmount: Scalars['Float']['input'];
  salaryCurrency?: InputMaybe<SalaryCurrency>;
}>;


export type CreateEmployeeMutation = { __typename?: 'Mutation', createEmployee: { __typename?: 'Employee', id: string, name: string, title?: string | null, walletAddress: string, walletVerified: boolean, salaryAmount: number, salaryCurrency: SalaryCurrency } };

export type UpdateEmployeeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  walletAddress?: InputMaybe<Scalars['String']['input']>;
  salaryAmount?: InputMaybe<Scalars['Float']['input']>;
  salaryCurrency?: InputMaybe<SalaryCurrency>;
}>;


export type UpdateEmployeeMutation = { __typename?: 'Mutation', updateEmployee: { __typename?: 'Employee', id: string, name: string, title?: string | null, walletAddress: string, walletVerified: boolean, salaryAmount: number, salaryCurrency: SalaryCurrency } };

export type DeleteEmployeeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteEmployeeMutation = { __typename?: 'Mutation', deleteEmployee: { __typename?: 'Employee', id: string } };

export type ImportEmployeesCsvMutationVariables = Exact<{
  csvContent: Scalars['String']['input'];
}>;


export type ImportEmployeesCsvMutation = { __typename?: 'Mutation', importEmployeesCsv: Array<{ __typename?: 'Employee', id: string, name: string, title?: string | null, walletAddress: string, walletVerified: boolean, salaryAmount: number, salaryCurrency: SalaryCurrency }> };

export type DelegateInvitePreviewQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type DelegateInvitePreviewQuery = { __typename?: 'Query', delegateInvite?: { __typename?: 'DelegateInvitePreview', ownerUsername: string, expiresAt: string } | null };

export type PayrollsQueryVariables = Exact<{ [key: string]: never; }>;


export type PayrollsQuery = { __typename?: 'Query', payrolls: Array<{ __typename?: 'Payroll', id: string, name: string, schedule: Schedule, customDays?: number | null, employees: Array<{ __typename?: 'PayrollEmployee', employeeId: string, employee: { __typename?: 'Employee', id: string, name: string, salaryAmount: number } }>, runs: Array<{ __typename?: 'PayrollRun', id: string, status: PayrollRunStatus, createdAt: string }> }> };

export type PayrollQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PayrollQuery = { __typename?: 'Query', payroll?: { __typename?: 'Payroll', id: string, name: string, schedule: Schedule, customDays?: number | null, employees: Array<{ __typename?: 'PayrollEmployee', employeeId: string, employee: { __typename?: 'Employee', id: string, name: string, walletAddress: string, salaryAmount: number } }>, runs: Array<{ __typename?: 'PayrollRun', id: string, status: PayrollRunStatus, createdAt: string }> } | null };

export type AllEmployeesQueryVariables = Exact<{ [key: string]: never; }>;


export type AllEmployeesQuery = { __typename?: 'Query', employees: Array<{ __typename?: 'Employee', id: string, name: string, salaryAmount: number }> };

export type CreatePayrollMutationVariables = Exact<{
  name: Scalars['String']['input'];
  schedule: Schedule;
  customDays?: InputMaybe<Scalars['Int']['input']>;
  employeeIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type CreatePayrollMutation = { __typename?: 'Mutation', createPayroll: { __typename?: 'Payroll', id: string } };

export type UpdatePayrollMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  schedule?: InputMaybe<Schedule>;
  customDays?: InputMaybe<Scalars['Int']['input']>;
  employeeIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type UpdatePayrollMutation = { __typename?: 'Mutation', updatePayroll: { __typename?: 'Payroll', id: string } };

export type DeletePayrollMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePayrollMutation = { __typename?: 'Mutation', deletePayroll: { __typename?: 'Payroll', id: string } };

export type ZecBalanceQueryVariables = Exact<{ [key: string]: never; }>;


export type ZecBalanceQuery = { __typename?: 'Query', zecBalance?: { __typename?: 'ZecBalance', available: number } | null };

export type MeSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type MeSettingsQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, username: string, name?: string | null, zcashViewingKey?: string | null, walletBirthdayHeight?: number | null, owner?: { __typename?: 'User', id: string, username: string } | null } | null };

export type UpdateUserMutationVariables = Exact<{
  zcashViewingKey?: InputMaybe<Scalars['String']['input']>;
  walletBirthdayHeight?: InputMaybe<Scalars['Int']['input']>;
}>;


export type UpdateUserMutation = { __typename?: 'Mutation', updateUser: { __typename?: 'User', id: string, zcashViewingKey?: string | null, walletBirthdayHeight?: number | null } };

export type ChangePasswordMutationVariables = Exact<{
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ChangePasswordMutation = { __typename?: 'Mutation', changePassword: { __typename?: 'AuthPayload', token: string, user: { __typename?: 'User', id: string, username: string } } };

export type DeleteAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAccountMutation = { __typename?: 'Mutation', deleteAccount: boolean };

export type PaymentsQueryVariables = Exact<{ [key: string]: never; }>;


export type PaymentsQuery = { __typename?: 'Query', payments: Array<{ __typename?: 'Payment', id: string, amountUsd: number, amountZec: number, memo: string, status: PaymentStatus, txHash?: string | null, createdAt: string, employee: { __typename?: 'Employee', name: string }, payroll: { __typename?: 'Payroll', name: string } }> };

export const EmployeeFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}},{"kind":"Field","name":{"kind":"Name","value":"salaryCurrency"}}]}}]} as unknown as DocumentNode<EmployeeFieldsFragment, unknown>;
export const PayrollFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayrollFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Payroll"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"}},{"kind":"Field","name":{"kind":"Name","value":"customDays"}},{"kind":"Field","name":{"kind":"Name","value":"employees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employeeId"}},{"kind":"Field","name":{"kind":"Name","value":"employee"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EmployeeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}},{"kind":"Field","name":{"kind":"Name","value":"salaryCurrency"}}]}}]} as unknown as DocumentNode<PayrollFieldsFragment, unknown>;
export const PaymentFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Payment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amountUsd"}},{"kind":"Field","name":{"kind":"Name","value":"amountZec"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"txHash"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"employee"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}}]}},{"kind":"Field","name":{"kind":"Name","value":"payroll"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<PaymentFieldsFragment, unknown>;
export const PayrollRunFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayrollRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayrollRun"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"zecPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"payroll"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"payments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Payment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amountUsd"}},{"kind":"Field","name":{"kind":"Name","value":"amountZec"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"txHash"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"employee"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}}]}},{"kind":"Field","name":{"kind":"Name","value":"payroll"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<PayrollRunFieldsFragment, unknown>;
export const MeSidebarDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MeSidebar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"zecBalance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"available"}}]}}]}}]} as unknown as DocumentNode<MeSidebarQuery, MeSidebarQueryVariables>;
export const PayrollsForDisburseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PayrollsForDisburse"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payrolls"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"}},{"kind":"Field","name":{"kind":"Name","value":"customDays"}},{"kind":"Field","name":{"kind":"Name","value":"employees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employeeId"}},{"kind":"Field","name":{"kind":"Name","value":"employee"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}}]}}]}}]}}]}}]} as unknown as DocumentNode<PayrollsForDisburseQuery, PayrollsForDisburseQueryVariables>;
export const StartPayrollRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartPayrollRun"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"payrollId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startPayrollRun"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"payrollId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"payrollId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"zecPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"payments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amountUsd"}},{"kind":"Field","name":{"kind":"Name","value":"amountZec"}},{"kind":"Field","name":{"kind":"Name","value":"memo"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"employee"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}}]}}]}}]}}]}}]} as unknown as DocumentNode<StartPayrollRunMutation, StartPayrollRunMutationVariables>;
export const UpdatePaymentStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePaymentStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"paymentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PaymentStatus"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"txHash"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePaymentStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"paymentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"paymentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"txHash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"txHash"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<UpdatePaymentStatusMutation, UpdatePaymentStatusMutationVariables>;
export const CompletePayrollRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompletePayrollRun"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"runId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completePayrollRun"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"runId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"runId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<CompletePayrollRunMutation, CompletePayrollRunMutationVariables>;
export const WalkthroughStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WalkthroughStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"needsWalkthrough"}},{"kind":"Field","name":{"kind":"Name","value":"hasEmployees"}},{"kind":"Field","name":{"kind":"Name","value":"hasPayrolls"}},{"kind":"Field","name":{"kind":"Name","value":"hasPayrollRun"}},{"kind":"Field","name":{"kind":"Name","value":"hasWallet"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<WalkthroughStatusQuery, WalkthroughStatusQueryVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const AcceptDelegateInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptDelegateInvite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptDelegateInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<AcceptDelegateInviteMutation, AcceptDelegateInviteMutationVariables>;
export const MeLayoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MeLayout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"zcashViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"walletBirthdayHeight"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<MeLayoutQuery, MeLayoutQueryVariables>;
export const DashboardStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DashboardStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dashboardStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zecSpentByMonth"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"month"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"payrolls"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"}},{"kind":"Field","name":{"kind":"Name","value":"customDays"}},{"kind":"Field","name":{"kind":"Name","value":"employees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employeeId"}},{"kind":"Field","name":{"kind":"Name","value":"employee"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"runs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<DashboardStatsQuery, DashboardStatsQueryVariables>;
export const DelegationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Delegations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delegates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"delegateInvites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<DelegationsQuery, DelegationsQueryVariables>;
export const CreateDelegateInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDelegateInvite"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDelegateInvite"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<CreateDelegateInviteMutation, CreateDelegateInviteMutationVariables>;
export const RevokeDelegateInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeDelegateInvite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeDelegateInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RevokeDelegateInviteMutation, RevokeDelegateInviteMutationVariables>;
export const RemoveDelegateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveDelegate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeDelegate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RemoveDelegateMutation, RemoveDelegateMutationVariables>;
export const EmployeesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Employees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}},{"kind":"Field","name":{"kind":"Name","value":"walletVerified"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}},{"kind":"Field","name":{"kind":"Name","value":"salaryCurrency"}}]}}]}}]} as unknown as DocumentNode<EmployeesQuery, EmployeesQueryVariables>;
export const CreateEmployeeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateEmployee"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"walletAddress"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"salaryAmount"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"salaryCurrency"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SalaryCurrency"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createEmployee"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"walletAddress"},"value":{"kind":"Variable","name":{"kind":"Name","value":"walletAddress"}}},{"kind":"Argument","name":{"kind":"Name","value":"salaryAmount"},"value":{"kind":"Variable","name":{"kind":"Name","value":"salaryAmount"}}},{"kind":"Argument","name":{"kind":"Name","value":"salaryCurrency"},"value":{"kind":"Variable","name":{"kind":"Name","value":"salaryCurrency"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}},{"kind":"Field","name":{"kind":"Name","value":"walletVerified"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}},{"kind":"Field","name":{"kind":"Name","value":"salaryCurrency"}}]}}]}}]} as unknown as DocumentNode<CreateEmployeeMutation, CreateEmployeeMutationVariables>;
export const UpdateEmployeeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateEmployee"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"walletAddress"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"salaryAmount"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"salaryCurrency"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SalaryCurrency"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateEmployee"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"walletAddress"},"value":{"kind":"Variable","name":{"kind":"Name","value":"walletAddress"}}},{"kind":"Argument","name":{"kind":"Name","value":"salaryAmount"},"value":{"kind":"Variable","name":{"kind":"Name","value":"salaryAmount"}}},{"kind":"Argument","name":{"kind":"Name","value":"salaryCurrency"},"value":{"kind":"Variable","name":{"kind":"Name","value":"salaryCurrency"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}},{"kind":"Field","name":{"kind":"Name","value":"walletVerified"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}},{"kind":"Field","name":{"kind":"Name","value":"salaryCurrency"}}]}}]}}]} as unknown as DocumentNode<UpdateEmployeeMutation, UpdateEmployeeMutationVariables>;
export const DeleteEmployeeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteEmployee"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteEmployee"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteEmployeeMutation, DeleteEmployeeMutationVariables>;
export const ImportEmployeesCsvDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImportEmployeesCsv"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"csvContent"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importEmployeesCsv"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"csvContent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"csvContent"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}},{"kind":"Field","name":{"kind":"Name","value":"walletVerified"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}},{"kind":"Field","name":{"kind":"Name","value":"salaryCurrency"}}]}}]}}]} as unknown as DocumentNode<ImportEmployeesCsvMutation, ImportEmployeesCsvMutationVariables>;
export const DelegateInvitePreviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DelegateInvitePreview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delegateInvite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownerUsername"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<DelegateInvitePreviewQuery, DelegateInvitePreviewQueryVariables>;
export const PayrollsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Payrolls"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payrolls"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"}},{"kind":"Field","name":{"kind":"Name","value":"customDays"}},{"kind":"Field","name":{"kind":"Name","value":"employees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employeeId"}},{"kind":"Field","name":{"kind":"Name","value":"employee"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"runs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<PayrollsQuery, PayrollsQueryVariables>;
export const PayrollDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Payroll"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payroll"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"}},{"kind":"Field","name":{"kind":"Name","value":"customDays"}},{"kind":"Field","name":{"kind":"Name","value":"employees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employeeId"}},{"kind":"Field","name":{"kind":"Name","value":"employee"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"walletAddress"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"runs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<PayrollQuery, PayrollQueryVariables>;
export const AllEmployeesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AllEmployees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"salaryAmount"}}]}}]}}]} as unknown as DocumentNode<AllEmployeesQuery, AllEmployeesQueryVariables>;
export const CreatePayrollDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePayroll"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Schedule"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"customDays"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"employeeIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPayroll"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"schedule"},"value":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}}},{"kind":"Argument","name":{"kind":"Name","value":"customDays"},"value":{"kind":"Variable","name":{"kind":"Name","value":"customDays"}}},{"kind":"Argument","name":{"kind":"Name","value":"employeeIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"employeeIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreatePayrollMutation, CreatePayrollMutationVariables>;
export const UpdatePayrollDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePayroll"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Schedule"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"customDays"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"employeeIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePayroll"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"schedule"},"value":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}}},{"kind":"Argument","name":{"kind":"Name","value":"customDays"},"value":{"kind":"Variable","name":{"kind":"Name","value":"customDays"}}},{"kind":"Argument","name":{"kind":"Name","value":"employeeIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"employeeIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdatePayrollMutation, UpdatePayrollMutationVariables>;
export const DeletePayrollDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePayroll"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePayroll"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeletePayrollMutation, DeletePayrollMutationVariables>;
export const ZecBalanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZecBalance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zecBalance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"available"}}]}}]}}]} as unknown as DocumentNode<ZecBalanceQuery, ZecBalanceQueryVariables>;
export const MeSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MeSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"zcashViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"walletBirthdayHeight"}}]}}]}}]} as unknown as DocumentNode<MeSettingsQuery, MeSettingsQueryVariables>;
export const UpdateUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"zcashViewingKey"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"walletBirthdayHeight"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"zcashViewingKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"zcashViewingKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"walletBirthdayHeight"},"value":{"kind":"Variable","name":{"kind":"Name","value":"walletBirthdayHeight"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"zcashViewingKey"}},{"kind":"Field","name":{"kind":"Name","value":"walletBirthdayHeight"}}]}}]}}]} as unknown as DocumentNode<UpdateUserMutation, UpdateUserMutationVariables>;
export const ChangePasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"currentPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const DeleteAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAccount"}}]}}]} as unknown as DocumentNode<DeleteAccountMutation, DeleteAccountMutationVariables>;
export const PaymentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Payments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amountUsd"}},{"kind":"Field","name":{"kind":"Name","value":"amountZec"}},{"kind":"Field","name":{"kind":"Name","value":"memo"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"txHash"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"employee"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"payroll"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<PaymentsQuery, PaymentsQueryVariables>;