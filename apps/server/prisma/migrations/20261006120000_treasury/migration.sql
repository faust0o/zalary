-- Treasuries: FROST multisig wallets replace connected viewing keys. Passkey
-- vaults hold each user's secrets client-side encrypted; members and
-- delegates get distinct access roles.

-- CreateEnum
CREATE TYPE "AccessRole" AS ENUM ('MEMBER', 'DELEGATE');

-- CreateEnum
CREATE TYPE "TreasuryStatus" AS ENUM ('DRAFT', 'KEYGEN', 'ACTIVE');

-- CreateEnum
CREATE TYPE "SpendProposalStatus" AS ENUM ('AWAITING_APPROVALS', 'SIGNING', 'BROADCAST', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVE', 'REJECT');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "walletBirthdayHeight",
DROP COLUMN "zcashViewingKey",
ADD COLUMN     "commsPublicKey" TEXT,
ADD COLUMN     "role" "AccessRole" NOT NULL DEFAULT 'DELEGATE';

-- AlterTable
ALTER TABLE "DelegateInvite" ADD COLUMN     "role" "AccessRole" NOT NULL DEFAULT 'DELEGATE';

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "proposalId" TEXT;

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "prfSalt" TEXT NOT NULL,
    "wrappedVaultKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treasury" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "threshold" INTEGER NOT NULL DEFAULT 2,
    "status" "TreasuryStatus" NOT NULL DEFAULT 'DRAFT',
    "dkgSessionId" TEXT,
    "keygenStartedAt" TIMESTAMP(3),
    "groupPublicKey" TEXT,
    "publicKeyPackage" TEXT,
    "address" TEXT,
    "changeAddress" TEXT,
    "birthdayHeight" INTEGER,
    "encryptedViewingKey" TEXT,
    "balanceZat" BIGINT,
    "balanceSyncedHeight" INTEGER,
    "balanceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treasury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryMember" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identifier" TEXT,
    "encryptedKeyPackage" TEXT,
    "groupPublicKey" TEXT,
    "publicKeyPackage" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryInvite" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "acceptedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendProposal" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "SpendProposalStatus" NOT NULL DEFAULT 'AWAITING_APPROVALS',
    "paymentRequest" TEXT NOT NULL,
    "pczt" TEXT NOT NULL,
    "sighash" TEXT NOT NULL,
    "spends" JSONB NOT NULL,
    "totalZat" BIGINT NOT NULL,
    "feeZat" BIGINT NOT NULL,
    "expiryHeight" INTEGER NOT NULL,
    "frostSessionId" TEXT NOT NULL,
    "signerIds" TEXT[],
    "txid" TEXT,
    "error" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "broadcastAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpendProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalApproval" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Treasury_accountId_key" ON "Treasury"("accountId");

-- CreateIndex
CREATE INDEX "TreasuryMember_userId_idx" ON "TreasuryMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryMember_treasuryId_userId_key" ON "TreasuryMember"("treasuryId", "userId");

-- CreateIndex
CREATE INDEX "TreasuryInvite_treasuryId_idx" ON "TreasuryInvite"("treasuryId");

-- CreateIndex
CREATE INDEX "SpendProposal_treasuryId_idx" ON "SpendProposal"("treasuryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalApproval_proposalId_userId_key" ON "ProposalApproval"("proposalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_commsPublicKey_key" ON "User"("commsPublicKey");

-- CreateIndex
CREATE INDEX "PayrollRun_proposalId_idx" ON "PayrollRun"("proposalId");

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treasury" ADD CONSTRAINT "Treasury_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryMember" ADD CONSTRAINT "TreasuryMember_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "Treasury"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryMember" ADD CONSTRAINT "TreasuryMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryInvite" ADD CONSTRAINT "TreasuryInvite_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "Treasury"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryInvite" ADD CONSTRAINT "TreasuryInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendProposal" ADD CONSTRAINT "SpendProposal_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "Treasury"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendProposal" ADD CONSTRAINT "SpendProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalApproval" ADD CONSTRAINT "ProposalApproval_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SpendProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalApproval" ADD CONSTRAINT "ProposalApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Txids recorded by the old viewing-key matching were in internal byte
-- order; the wallet now reports them the way block explorers show them.
UPDATE "Payment"
SET "txHash" = (
    SELECT string_agg(substr("txHash", i, 2), '' ORDER BY i DESC)
    FROM generate_series(1, 63, 2) AS i
)
WHERE "txHash" ~ '^[0-9a-f]{64}$';

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SpendProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

