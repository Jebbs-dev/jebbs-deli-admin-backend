-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vendorTag" TEXT;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "billboard" TEXT,
ADD COLUMN     "closingTime" TEXT,
ADD COLUMN     "openingTime" TEXT,
ADD COLUMN     "preparationTime" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "totalReviews" INTEGER;
