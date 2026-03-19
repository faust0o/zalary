-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "title" TEXT,
ADD COLUMN     "walletVerified" BOOLEAN NOT NULL DEFAULT false;
