/*
  Warnings:

  - You are about to drop the column `cartId` on the `CartItem` table. All the data in the column will be lost.
  - Added the required column `cartStoreGroupId` to the `CartItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "cartId",
ADD COLUMN     "cartStoreGroupId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CartStoreGroup" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartStoreGroup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CartStoreGroup" ADD CONSTRAINT "CartStoreGroup_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartStoreGroup" ADD CONSTRAINT "CartStoreGroup_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartStoreGroupId_fkey" FOREIGN KEY ("cartStoreGroupId") REFERENCES "CartStoreGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
