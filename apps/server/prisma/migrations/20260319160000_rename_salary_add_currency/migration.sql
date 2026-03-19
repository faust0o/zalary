-- CreateEnum
CREATE TYPE "SalaryCurrency" AS ENUM ('USD', 'ZEC');

-- Rename salaryAmountUsd to salaryAmount
ALTER TABLE "Employee" RENAME COLUMN "salaryAmountUsd" TO "salaryAmount";

-- Add salaryCurrency column with default USD
ALTER TABLE "Employee" ADD COLUMN "salaryCurrency" "SalaryCurrency" NOT NULL DEFAULT 'USD';
