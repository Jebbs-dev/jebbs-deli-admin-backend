-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('delivery', 'pickup');

-- CreateEnum
CREATE TYPE "StorePayoutStatus" AS ENUM ('pending', 'verified', 'disabled');

-- CreateEnum
CREATE TYPE "DeliveryAssignmentStatus" AS ENUM ('assigned', 'picked_up', 'in_transit', 'delivered', 'failed');

-- AlterEnum Role
ALTER TYPE "Role" ADD VALUE 'RIDER';

-- AlterEnum OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE 'paid';
ALTER TYPE "OrderStatus" ADD VALUE 'confirmed';
ALTER TYPE "OrderStatus" ADD VALUE 'preparing';
ALTER TYPE "OrderStatus" ADD VALUE 'ready';
ALTER TYPE "OrderStatus" ADD VALUE 'picked_up';
ALTER TYPE "OrderStatus" ADD VALUE 'in_transit';
ALTER TYPE "OrderStatus" ADD VALUE 'failed';

-- Store payout / commission fields
ALTER TABLE "stores"
  ADD COLUMN "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "bankCode" TEXT,
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "accountNumber" TEXT,
  ADD COLUMN "accountName" TEXT,
  ADD COLUMN "paystackSubaccountCode" TEXT,
  ADD COLUMN "paystackSubaccountStatus" "StorePayoutStatus" NOT NULL DEFAULT 'pending';

-- Order fulfillment + settlement + paidAt
ALTER TABLE "orders"
  ADD COLUMN "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'delivery',
  ADD COLUMN "vendorCommission" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "vendorPayout" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "platformServiceFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "platformDeliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "paidAt" TIMESTAMP(3);

CREATE INDEX "orders_fulfillmentType_idx" ON "orders"("fulfillmentType");

-- Drop Payment.orderId unique so retries are allowed
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_orderId_key";
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- Order status events
CREATE TABLE "order_status_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "note" TEXT,
    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_status_events_orderId_at_idx" ON "order_status_events"("orderId", "at");

ALTER TABLE "order_status_events"
  ADD CONSTRAINT "order_status_events_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_status_events"
  ADD CONSTRAINT "order_status_events_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rider profiles
CREATE TABLE "rider_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "vehicle" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rider_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rider_profiles_userId_key" ON "rider_profiles"("userId");

ALTER TABLE "rider_profiles"
  ADD CONSTRAINT "rider_profiles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Delivery assignments
CREATE TABLE "delivery_assignments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "status" "DeliveryAssignmentStatus" NOT NULL DEFAULT 'assigned',
    "failureReason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "inTransitAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_assignments_orderId_key" ON "delivery_assignments"("orderId");
CREATE INDEX "delivery_assignments_riderId_idx" ON "delivery_assignments"("riderId");
CREATE INDEX "delivery_assignments_status_idx" ON "delivery_assignments"("status");

ALTER TABLE "delivery_assignments"
  ADD CONSTRAINT "delivery_assignments_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_assignments"
  ADD CONSTRAINT "delivery_assignments_riderId_fkey"
  FOREIGN KEY ("riderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
