-- Align legacy Token table with current Prisma schema (tokens + expiresAt)

ALTER TABLE "Token" RENAME TO "tokens";

ALTER TABLE "tokens" ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "tokens"
SET "expiresAt" = "createdAt" + ("expiresIn" * interval '1 second');

ALTER TABLE "tokens" ALTER COLUMN "expiresAt" SET NOT NULL;

ALTER TABLE "tokens" DROP COLUMN "expiresIn";

ALTER INDEX "Token_pkey" RENAME TO "tokens_pkey";
ALTER INDEX "Token_token_key" RENAME TO "tokens_token_key";

CREATE INDEX IF NOT EXISTS "tokens_userId_idx" ON "tokens"("userId");
CREATE INDEX IF NOT EXISTS "tokens_expiresAt_idx" ON "tokens"("expiresAt");
