-- DropForeignKey
ALTER TABLE "CuttingBatch" DROP CONSTRAINT "CuttingBatch_opId_fkey";

-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "qtyPondNg" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "CuttingBatch" ADD CONSTRAINT "CuttingBatch_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
