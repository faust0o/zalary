-- Payroll data now lives in records sealed in the browser under each
-- account's data key, and spend proposals keep only what coordinating them
-- needs. The plaintext payroll tables and spend details go.

-- Existing spends carry their payment details in plaintext.
DELETE FROM "SpendProposal";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_payrollId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_runId_fkey";

-- DropForeignKey
ALTER TABLE "Payroll" DROP CONSTRAINT "Payroll_userId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollEmployee" DROP CONSTRAINT "PayrollEmployee_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollEmployee" DROP CONSTRAINT "PayrollEmployee_payrollId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollRun" DROP CONSTRAINT "PayrollRun_payrollId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollRun" DROP CONSTRAINT "PayrollRun_proposalId_fkey";

-- AlterTable
ALTER TABLE "SpendProposal" DROP COLUMN "expiryHeight",
DROP COLUMN "feeZat",
DROP COLUMN "paymentRequest",
DROP COLUMN "pczt",
DROP COLUMN "sighash",
DROP COLUMN "spends",
DROP COLUMN "totalZat",
DROP COLUMN "txid",
ADD COLUMN     "sealed" TEXT NOT NULL,
ADD COLUMN     "sealedPczt" TEXT,
ADD COLUMN     "sealedTxid" TEXT;

-- AlterTable
ALTER TABLE "Treasury" DROP COLUMN "balanceSyncedHeight",
DROP COLUMN "balanceUpdatedAt",
DROP COLUMN "balanceZat",
ADD COLUMN     "sealedBalance" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountKeySealedBy" TEXT,
ADD COLUMN     "sealedAccountKey" TEXT;

-- DropTable
DROP TABLE "Employee";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "Payroll";

-- DropTable
DROP TABLE "PayrollEmployee";

-- DropTable
DROP TABLE "PayrollRun";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PayrollRunStatus";

-- DropEnum
DROP TYPE "SalaryCurrency";

-- DropEnum
DROP TYPE "Schedule";

-- CreateTable
CREATE TABLE "SealedRecord" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SealedRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SealedRecord_accountId_idx" ON "SealedRecord"("accountId");

-- AddForeignKey
ALTER TABLE "SealedRecord" ADD CONSTRAINT "SealedRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

