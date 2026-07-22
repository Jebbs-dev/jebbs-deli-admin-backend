-- Deduplicate any existing (cartId, storeId) pairs before adding unique constraint.
-- Keep the oldest group; move items onto it when possible, drop empty duplicates.
DO $$
DECLARE
  dup RECORD;
  keep_id TEXT;
  drop_id TEXT;
BEGIN
  FOR dup IN
    SELECT "cartId", "storeId"
    FROM "cart_store_groups"
    GROUP BY "cartId", "storeId"
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM "cart_store_groups"
    WHERE "cartId" = dup."cartId" AND "storeId" = dup."storeId"
    ORDER BY "createdAt" ASC
    LIMIT 1;

    FOR drop_id IN
      SELECT id
      FROM "cart_store_groups"
      WHERE "cartId" = dup."cartId"
        AND "storeId" = dup."storeId"
        AND id <> keep_id
    LOOP
      -- Move items that don't already exist on the kept group
      UPDATE "cart_items" AS moving
      SET "cartStoreGroupId" = keep_id
      WHERE moving."cartStoreGroupId" = drop_id
        AND NOT EXISTS (
          SELECT 1
          FROM "cart_items" existing
          WHERE existing."cartStoreGroupId" = keep_id
            AND existing."productId" = moving."productId"
        );

      DELETE FROM "cart_items" WHERE "cartStoreGroupId" = drop_id;
      DELETE FROM "cart_store_groups" WHERE id = drop_id;
    END LOOP;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "cart_store_groups_cartId_storeId_key"
  ON "cart_store_groups"("cartId", "storeId");
