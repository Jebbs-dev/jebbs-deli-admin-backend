/*
  Warnings:

  - You are about to drop the column `vendorId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `vendorTag` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `vendors` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `storeId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storeId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storeId` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_vendorId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "vendorId",
ADD COLUMN     "storeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "vendorId",
ADD COLUMN     "storeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "vendorId",
DROP COLUMN "vendorTag",
ADD COLUMN     "storeId" TEXT NOT NULL,
ADD COLUMN     "storeTag" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "vendorId";

-- DropTable
DROP TABLE "vendors";

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "userId" TEXT,
    "address" TEXT NOT NULL,
    "billboard" TEXT,
    "logo" TEXT,
    "preparationTime" TEXT,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "rating" DOUBLE PRECISION,
    "totalReviews" INTEGER,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_email_key" ON "stores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stores_userId_key" ON "stores"("userId");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
