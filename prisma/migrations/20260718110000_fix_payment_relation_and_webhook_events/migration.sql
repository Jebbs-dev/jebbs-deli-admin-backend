-- Fix Payment ↔ PaystackTransaction ownership (paymentId → Payment.id)
-- Drop incorrect FK on Payment.paystackId if present (from broken relation)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'payments'
  ) THEN
    ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_paystackId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'Payment'
  ) THEN
    ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_paystackId_fkey";
  END IF;
END $$;

-- Ensure PaystackTransaction.paymentId FK exists (may already from earlier migrations)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'paystack_transactions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'paystack_transactions_paymentId_fkey'
    ) THEN
      ALTER TABLE "paystack_transactions"
        ADD CONSTRAINT "paystack_transactions_paymentId_fkey"
        FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'PaystackTransaction'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'PaystackTransaction_paymentId_fkey'
    ) AND NOT EXISTS (
      SELECT 1
      FROM "PaystackTransaction" pt
      LEFT JOIN "Payment" p ON pt."paymentId" = p."id"
      WHERE pt."paymentId" IS NOT NULL
        AND p."id" IS NULL
    ) THEN
      ALTER TABLE "PaystackTransaction"
        ADD CONSTRAINT "PaystackTransaction_paymentId_fkey"
        FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

-- WebhookEvent idempotency log
CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" TEXT NOT NULL,
    "paystack_event_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_paystack_event_id_key"
  ON "webhook_events"("paystack_event_id");

CREATE INDEX IF NOT EXISTS "webhook_events_paystack_event_id_idx"
  ON "webhook_events"("paystack_event_id");
