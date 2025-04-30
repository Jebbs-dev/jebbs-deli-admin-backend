/*
  Warnings:

  - The `size` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `vendorId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vendorId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vendorId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SizeValue" AS ENUM ('small', 'medium', 'large');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Category" ADD VALUE 'sides';
ALTER TYPE "Category" ADD VALUE 'small_chops';
ALTER TYPE "Category" ADD VALUE 'chicken';
ALTER TYPE "Category" ADD VALUE 'pizza';
ALTER TYPE "Category" ADD VALUE 'burger';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VENDOR';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "vendorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "vendorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "vendorId" TEXT NOT NULL,
DROP COLUMN "size",
ADD COLUMN     "size" "SizeValue";

-- DropEnum
DROP TYPE "Size";

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "address" TEXT NOT NULL,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_email_key" ON "vendors"("email");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
