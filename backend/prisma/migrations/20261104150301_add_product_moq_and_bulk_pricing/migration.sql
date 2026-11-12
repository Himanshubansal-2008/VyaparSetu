-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSurplus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minOrderQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "surplusDeadline" TIMESTAMP(3),
ADD COLUMN     "surplusPrice" DECIMAL(10,2),
ADD COLUMN     "surplusQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'piece';

-- CreateTable
CREATE TABLE "BulkPricing" (
    "id" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkPricing_productId_idx" ON "BulkPricing"("productId");

-- CreateIndex
CREATE INDEX "Product_isActive_isFeatured_idx" ON "Product"("isActive", "isFeatured");

-- CreateIndex
CREATE INDEX "Product_isSurplus_idx" ON "Product"("isSurplus");

-- AddForeignKey
ALTER TABLE "BulkPricing" ADD CONSTRAINT "BulkPricing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
