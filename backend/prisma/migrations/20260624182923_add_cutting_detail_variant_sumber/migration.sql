-- AlterTable
ALTER TABLE "cutting_details" ADD COLUMN     "sumber" TEXT NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "turunanKe" INTEGER,
ADD COLUMN     "variant" "CuttingVariant" NOT NULL DEFAULT 'AUT';

-- CreateIndex
CREATE INDEX "cutting_details_materialId_variant_idx" ON "cutting_details"("materialId", "variant");
