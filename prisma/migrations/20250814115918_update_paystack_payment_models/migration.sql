/*
  Warnings:

  - A unique constraint covering the columns `[paystackId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "PaystackTransaction" DROP CONSTRAINT "PaystackTransaction_paymentId_fkey";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paystackId" BIGINT;

-- AlterTable
ALTER TABLE "PaystackTransaction" ALTER COLUMN "id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paystackId_key" ON "Payment"("paystackId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paystackId_fkey" FOREIGN KEY ("paystackId") REFERENCES "PaystackTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
