-- Align remaining legacy PascalCase tables with current Prisma @@map names

-- CartItem timestamps (required by schema)
ALTER TABLE "CartItem"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Cart" RENAME TO "carts";
ALTER TABLE "CartStoreGroup" RENAME TO "cart_store_groups";
ALTER TABLE "CartItem" RENAME TO "cart_items";

ALTER INDEX IF EXISTS "Cart_pkey" RENAME TO "carts_pkey";
ALTER INDEX IF EXISTS "Cart_userId_key" RENAME TO "carts_userId_key";
ALTER INDEX IF EXISTS "Cart_sessionId_key" RENAME TO "carts_sessionId_key";
ALTER INDEX IF EXISTS "CartStoreGroup_pkey" RENAME TO "cart_store_groups_pkey";
ALTER INDEX IF EXISTS "CartItem_pkey" RENAME TO "cart_items_pkey";

CREATE INDEX IF NOT EXISTS "cart_store_groups_cartId_idx" ON "cart_store_groups"("cartId");
CREATE INDEX IF NOT EXISTS "cart_store_groups_storeId_idx" ON "cart_store_groups"("storeId");
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_cartStoreGroupId_productId_key"
  ON "cart_items"("cartStoreGroupId", "productId");
CREATE INDEX IF NOT EXISTS "cart_items_productId_idx" ON "cart_items"("productId");

-- Address
ALTER TABLE "Address" RENAME TO "addresses";
ALTER INDEX IF EXISTS "Address_pkey" RENAME TO "addresses_pkey";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'addresses' AND column_name = 'place_id'
  ) THEN
    ALTER TABLE "addresses" RENAME COLUMN "place_id" TO "placeId";
  END IF;
END $$;

-- Discount
ALTER TABLE "Discount" RENAME TO "discounts";
ALTER INDEX IF EXISTS "Discount_pkey" RENAME TO "discounts_pkey";
ALTER INDEX IF EXISTS "Discount_code_key" RENAME TO "discounts_code_key";

ALTER TABLE "discounts"
  ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "maxUses" INTEGER,
  ADD COLUMN IF NOT EXISTS "usedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "minOrderAmount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "maxDiscountAmount" DECIMAL(12,2);

-- OrderItem
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "productName" TEXT,
  ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "OrderItem" oi
SET
  "productName" = p.name,
  "unitPrice" = p.price::DECIMAL(12,2)
FROM products p
WHERE oi."productId" = p.id
  AND (oi."productName" IS NULL OR oi."unitPrice" IS NULL);

UPDATE "OrderItem"
SET "productName" = COALESCE("productName", 'Unknown product')
WHERE "productName" IS NULL;

UPDATE "OrderItem"
SET "unitPrice" = COALESCE("unitPrice", 0)
WHERE "unitPrice" IS NULL;

ALTER TABLE "OrderItem" ALTER COLUMN "productName" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "unitPrice" SET NOT NULL;

ALTER TABLE "OrderItem" RENAME TO "order_items";
ALTER INDEX IF EXISTS "OrderItem_pkey" RENAME TO "order_items_pkey";

CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX IF NOT EXISTS "order_items_productId_idx" ON "order_items"("productId");
CREATE INDEX IF NOT EXISTS "order_items_storeId_idx" ON "order_items"("storeId");

-- Orders updatedAt (schema expects it)
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Payment
ALTER TABLE "Payment" RENAME TO "payments";
ALTER INDEX IF EXISTS "Payment_pkey" RENAME TO "payments_pkey";
ALTER INDEX IF EXISTS "Payment_orderId_key" RENAME TO "payments_orderId_key";
ALTER INDEX IF EXISTS "Payment_reference_key" RENAME TO "payments_reference_key";
ALTER INDEX IF EXISTS "Payment_userId_idx" RENAME TO "payments_userId_idx";
ALTER INDEX IF EXISTS "Payment_storeId_idx" RENAME TO "payments_storeId_idx";
ALTER INDEX IF EXISTS "Payment_createdAt_idx" RENAME TO "payments_createdAt_idx";
ALTER INDEX IF EXISTS "Payment_status_idx" RENAME TO "payments_status_idx";
ALTER INDEX IF EXISTS "Payment_paystackId_key" RENAME TO "payments_paystackId_key";

-- PaystackTransaction
ALTER TABLE "PaystackTransaction" RENAME TO "paystack_transactions";
ALTER INDEX IF EXISTS "PaystackTransaction_id_key" RENAME TO "paystack_transactions_id_key";
ALTER INDEX IF EXISTS "PaystackTransaction_paymentId_key" RENAME TO "paystack_transactions_paymentId_key";
ALTER INDEX IF EXISTS "PaystackTransaction_reference_key" RENAME TO "paystack_transactions_reference_key";
ALTER INDEX IF EXISTS "PaystackTransaction_id_idx" RENAME TO "paystack_transactions_id_idx";
ALTER INDEX IF EXISTS "PaystackTransaction_reference_idx" RENAME TO "paystack_transactions_reference_idx";
ALTER INDEX IF EXISTS "PaystackTransaction_accessCode_idx" RENAME TO "paystack_transactions_accessCode_idx";
ALTER INDEX IF EXISTS "PaystackTransaction_webhookVerified_idx" RENAME TO "paystack_transactions_webhookVerified_idx";
ALTER INDEX IF EXISTS "PaystackTransaction_status_idx" RENAME TO "paystack_transactions_status_idx";
