/*
  Warnings:

  - A unique constraint covering the columns `[batchCode]` on the table `ProductionOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OpLevel" AS ENUM ('PARENT', 'BATCH');

-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "batchCode" TEXT,
ADD COLUMN     "batchNumber" INTEGER,
ADD COLUMN     "level" "OpLevel" NOT NULL DEFAULT 'BATCH',
ADD COLUMN     "parentOpId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_batchCode_key" ON "ProductionOrder"("batchCode");

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_parentOpId_fkey" FOREIGN KEY ("parentOpId") REFERENCES "ProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
