-- AlterTable
ALTER TABLE "LineMaster" ADD COLUMN     "ngCategories" JSONB;

-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "setsReadyForSewing" INTEGER NOT NULL DEFAULT 0;
