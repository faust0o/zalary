-- Delegates: users who manage another account's payroll, invited by link.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT,
ADD COLUMN     "ownerId" TEXT;

-- CreateTable
CREATE TABLE "DelegateInvite" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DelegateInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DelegateInvite_ownerId_idx" ON "DelegateInvite"("ownerId");

-- CreateIndex
CREATE INDEX "User_ownerId_idx" ON "User"("ownerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegateInvite" ADD CONSTRAINT "DelegateInvite_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

