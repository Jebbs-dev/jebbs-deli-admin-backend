/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `vendors` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "vendors_userId_key" ON "vendors"("userId");

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
