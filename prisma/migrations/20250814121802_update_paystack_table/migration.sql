/*
  Warnings:

  - The `requestedAmount` column on the `PaystackTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `feesSplit` column on the `PaystackTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "PaystackTransaction" DROP COLUMN "requestedAmount",
ADD COLUMN     "requestedAmount" INTEGER,
DROP COLUMN "feesSplit",
ADD COLUMN     "feesSplit" JSONB;
