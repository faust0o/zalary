-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "memo" TEXT;

-- Backfill existing rows with a unique memo based on their id
UPDATE "Payment" SET "memo" = 'zalary:' || "id" WHERE "memo" IS NULL;

-- Make the column required and unique
ALTER TABLE "Payment" ALTER COLUMN "memo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_memo_key" ON "Payment"("memo");
