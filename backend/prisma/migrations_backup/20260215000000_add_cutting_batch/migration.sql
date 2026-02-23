-- Add column to ProductionOrder
ALTER TABLE "ProductionOrder" ADD COLUMN "qtySentToPond" INTEGER NOT NULL DEFAULT 0;

-- Create CuttingBatch table
CREATE TABLE "CuttingBatch" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "qrCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CuttingBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CuttingBatch_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE,
    CONSTRAINT "CuttingBatch_qrCode_key" UNIQUE ("qrCode"),
    CONSTRAINT "CuttingBatch_opId_batchNumber_key" UNIQUE ("opId", "batchNumber")
);