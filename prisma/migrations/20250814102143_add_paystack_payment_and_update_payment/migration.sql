/*
  Warnings:

  - The `status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `orderId` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "description" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "orderId" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ALTER COLUMN "paymentMethod" DROP NOT NULL;

-- DropEnum
DROP TYPE "PaymentStatus";

-- CreateTable
CREATE TABLE "PaystackTransaction" (
    "id" BIGINT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "message" TEXT,
    "accessCode" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "amount" INTEGER NOT NULL,
    "plan" JSONB,
    "split" JSONB,
    "subaccount" JSONB,
    "orderId" TEXT,
    "requestedAmount" TEXT,
    "source" JSONB,
    "connect" JSONB,
    "posTransactionData" JSONB,
    "fees" INTEGER,
    "feesSplit" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "channel" TEXT,
    "gatewayResponse" TEXT,
    "domain" TEXT NOT NULL DEFAULT 'live',
    "ipAddress" TEXT,
    "metadata" JSONB,
    "log" JSONB,
    "authorization" JSONB,
    "customer" JSONB,
    "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
    "webhookSignature" TEXT,
    "webhookReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3)
);

-- CreateIndex
CREATE UNIQUE INDEX "PaystackTransaction_id_key" ON "PaystackTransaction"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackTransaction_paymentId_key" ON "PaystackTransaction"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackTransaction_reference_key" ON "PaystackTransaction"("reference");

-- CreateIndex
CREATE INDEX "PaystackTransaction_id_idx" ON "PaystackTransaction"("id");

-- CreateIndex
CREATE INDEX "PaystackTransaction_reference_idx" ON "PaystackTransaction"("reference");

-- CreateIndex
CREATE INDEX "PaystackTransaction_accessCode_idx" ON "PaystackTransaction"("accessCode");

-- CreateIndex
CREATE INDEX "PaystackTransaction_status_idx" ON "PaystackTransaction"("status");

-- CreateIndex
CREATE INDEX "PaystackTransaction_webhookVerified_idx" ON "PaystackTransaction"("webhookVerified");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_storeId_idx" ON "Payment"("storeId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- AddForeignKey
ALTER TABLE "PaystackTransaction" ADD CONSTRAINT "PaystackTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
