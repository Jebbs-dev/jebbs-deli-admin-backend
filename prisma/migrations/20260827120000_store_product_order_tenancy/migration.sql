-- New stores start inactive until an admin approves.
ALTER TABLE "stores" ALTER COLUMN "isActive" SET DEFAULT false;

-- Products belong to a store; deleting a store with products is not allowed.
ALTER TABLE "products" DROP CONSTRAINT "products_storeId_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Nested findUnique([id, storeId]) for /stores/:storeId/products/:id and orders.
CREATE UNIQUE INDEX "products_id_storeId_key" ON "products"("id", "storeId");
CREATE UNIQUE INDEX "orders_id_storeId_key" ON "orders"("id", "storeId");
