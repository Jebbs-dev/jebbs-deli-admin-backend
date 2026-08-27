-- Fees, settlement ledgers, payout batches, token family rotation

CREATE TYPE "OrderChargeType" AS ENUM ('SERVICE_FEE', 'DELIVERY_FEE', 'BAG_FEE', 'SURGE_FEE');
CREATE TYPE "ChargeBeneficiary" AS ENUM ('PLATFORM', 'VENDOR', 'LOGISTICS');
CREATE TYPE "SurgeType" AS ENUM ('flat', 'percent');
CREATE TYPE "SettlementLedgerTxType" AS ENUM ('order_credit', 'delivery_credit', 'adjustment', 'payout');
CREATE TYPE "SettlementLedgerStatus" AS ENUM ('available', 'pending_payout', 'paid', 'failed');
CREATE TYPE "PayoutParty" AS ENUM ('VENDOR', 'RIDER');
CREATE TYPE "PayoutBatchStatus" AS ENUM ('pending', 'processing', 'completed', 'partial', 'failed');

-- Store fee + recipient fields
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "bagFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bagFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bagCommissionable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "surgeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "surgeType" "SurgeType" NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS "surgeValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paystackRecipientCode" TEXT;

-- Order bag/surge + settledAt
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "bagFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "surgeFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3);

-- Rider bank / recipient
ALTER TABLE "rider_profiles"
  ADD COLUMN IF NOT EXISTS "bankCode" TEXT,
  ADD COLUMN IF NOT EXISTS "bankName" TEXT,
  ADD COLUMN IF NOT EXISTS "accountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "accountName" TEXT,
  ADD COLUMN IF NOT EXISTS "paystackRecipientCode" TEXT;

-- Token family rotation
ALTER TABLE "tokens"
  ADD COLUMN IF NOT EXISTS "familyId" TEXT,
  ADD COLUMN IF NOT EXISTS "replacedByTokenId" TEXT,
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

UPDATE "tokens" SET "familyId" = "id" WHERE "familyId" IS NULL;
ALTER TABLE "tokens" ALTER COLUMN "familyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "tokens_familyId_idx" ON "tokens"("familyId");

CREATE TABLE IF NOT EXISTS "order_charges" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "OrderChargeType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "beneficiary" "ChargeBeneficiary" NOT NULL,
  "commissionable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_charges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "order_charges_orderId_idx" ON "order_charges"("orderId");
CREATE INDEX IF NOT EXISTS "order_charges_type_idx" ON "order_charges"("type");

ALTER TABLE "order_charges"
  DROP CONSTRAINT IF EXISTS "order_charges_orderId_fkey",
  ADD CONSTRAINT "order_charges_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "store_wallets" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "store_wallets_storeId_key" ON "store_wallets"("storeId");

ALTER TABLE "store_wallets"
  DROP CONSTRAINT IF EXISTS "store_wallets_storeId_fkey",
  ADD CONSTRAINT "store_wallets_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "rider_wallets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rider_wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rider_wallets_userId_key" ON "rider_wallets"("userId");

ALTER TABLE "rider_wallets"
  DROP CONSTRAINT IF EXISTS "rider_wallets_userId_fkey",
  ADD CONSTRAINT "rider_wallets_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "payout_batches" (
  "id" TEXT NOT NULL,
  "party" "PayoutParty" NOT NULL,
  "periodKey" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "PayoutBatchStatus" NOT NULL DEFAULT 'pending',
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "transferCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "payout_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payout_batches_party_periodKey_key" ON "payout_batches"("party", "periodKey");
CREATE INDEX IF NOT EXISTS "payout_batches_status_idx" ON "payout_batches"("status");
CREATE INDEX IF NOT EXISTS "payout_batches_createdAt_idx" ON "payout_batches"("createdAt");

CREATE TABLE IF NOT EXISTS "store_ledger_txs" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" "SettlementLedgerTxType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "balanceAfter" DECIMAL(12,2) NOT NULL,
  "status" "SettlementLedgerStatus" NOT NULL DEFAULT 'available',
  "reference" TEXT NOT NULL,
  "orderId" TEXT,
  "paymentId" TEXT,
  "payoutBatchId" TEXT,
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_ledger_txs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "store_ledger_txs_reference_key" ON "store_ledger_txs"("reference");
CREATE INDEX IF NOT EXISTS "store_ledger_txs_storeId_createdAt_idx" ON "store_ledger_txs"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "store_ledger_txs_walletId_status_idx" ON "store_ledger_txs"("walletId", "status");
CREATE INDEX IF NOT EXISTS "store_ledger_txs_orderId_idx" ON "store_ledger_txs"("orderId");
CREATE INDEX IF NOT EXISTS "store_ledger_txs_payoutBatchId_idx" ON "store_ledger_txs"("payoutBatchId");

ALTER TABLE "store_ledger_txs"
  DROP CONSTRAINT IF EXISTS "store_ledger_txs_storeId_fkey",
  ADD CONSTRAINT "store_ledger_txs_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_ledger_txs"
  DROP CONSTRAINT IF EXISTS "store_ledger_txs_walletId_fkey",
  ADD CONSTRAINT "store_ledger_txs_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "store_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_ledger_txs"
  DROP CONSTRAINT IF EXISTS "store_ledger_txs_orderId_fkey",
  ADD CONSTRAINT "store_ledger_txs_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "store_ledger_txs"
  DROP CONSTRAINT IF EXISTS "store_ledger_txs_payoutBatchId_fkey",
  ADD CONSTRAINT "store_ledger_txs_payoutBatchId_fkey"
    FOREIGN KEY ("payoutBatchId") REFERENCES "payout_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "rider_ledger_txs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" "SettlementLedgerTxType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "balanceAfter" DECIMAL(12,2) NOT NULL,
  "status" "SettlementLedgerStatus" NOT NULL DEFAULT 'available',
  "reference" TEXT NOT NULL,
  "orderId" TEXT,
  "assignmentId" TEXT,
  "payoutBatchId" TEXT,
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rider_ledger_txs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rider_ledger_txs_reference_key" ON "rider_ledger_txs"("reference");
CREATE INDEX IF NOT EXISTS "rider_ledger_txs_userId_createdAt_idx" ON "rider_ledger_txs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "rider_ledger_txs_walletId_status_idx" ON "rider_ledger_txs"("walletId", "status");
CREATE INDEX IF NOT EXISTS "rider_ledger_txs_orderId_idx" ON "rider_ledger_txs"("orderId");
CREATE INDEX IF NOT EXISTS "rider_ledger_txs_payoutBatchId_idx" ON "rider_ledger_txs"("payoutBatchId");

ALTER TABLE "rider_ledger_txs"
  DROP CONSTRAINT IF EXISTS "rider_ledger_txs_walletId_fkey",
  ADD CONSTRAINT "rider_ledger_txs_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "rider_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rider_ledger_txs"
  DROP CONSTRAINT IF EXISTS "rider_ledger_txs_orderId_fkey",
  ADD CONSTRAINT "rider_ledger_txs_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rider_ledger_txs"
  DROP CONSTRAINT IF EXISTS "rider_ledger_txs_assignmentId_fkey",
  ADD CONSTRAINT "rider_ledger_txs_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "delivery_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rider_ledger_txs"
  DROP CONSTRAINT IF EXISTS "rider_ledger_txs_payoutBatchId_fkey",
  ADD CONSTRAINT "rider_ledger_txs_payoutBatchId_fkey"
    FOREIGN KEY ("payoutBatchId") REFERENCES "payout_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "payout_transfers" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "party" "PayoutParty" NOT NULL,
  "storeId" TEXT,
  "riderUserId" TEXT,
  "recipientCode" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "SettlementLedgerStatus" NOT NULL DEFAULT 'pending_payout',
  "paystackTransferCode" TEXT,
  "paystackReference" TEXT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "payout_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payout_transfers_paystackReference_key" ON "payout_transfers"("paystackReference");
CREATE INDEX IF NOT EXISTS "payout_transfers_batchId_idx" ON "payout_transfers"("batchId");
CREATE INDEX IF NOT EXISTS "payout_transfers_storeId_idx" ON "payout_transfers"("storeId");
CREATE INDEX IF NOT EXISTS "payout_transfers_riderUserId_idx" ON "payout_transfers"("riderUserId");
CREATE INDEX IF NOT EXISTS "payout_transfers_status_idx" ON "payout_transfers"("status");

ALTER TABLE "payout_transfers"
  DROP CONSTRAINT IF EXISTS "payout_transfers_batchId_fkey",
  ADD CONSTRAINT "payout_transfers_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "payout_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
