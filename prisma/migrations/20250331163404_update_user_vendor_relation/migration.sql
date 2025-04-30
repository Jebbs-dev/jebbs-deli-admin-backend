-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_userId_fkey";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
