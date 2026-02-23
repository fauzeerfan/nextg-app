/*
  Warnings:

  - A unique constraint covering the columns `[opId,station]` on the table `ProductionTracking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "qtyFG" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qtyPacking" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qtyPond" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qtyQC" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qtySewing" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProductionLog" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "station" "StationCode" NOT NULL,
    "type" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingSession" (
    "id" TEXT NOT NULL,
    "fgNumber" TEXT NOT NULL,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "PackingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FGStock" (
    "id" TEXT NOT NULL,
    "fgNumber" TEXT NOT NULL,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FGStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FGStockItem" (
    "id" TEXT NOT NULL,
    "fgId" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FGStockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "suratJalan" TEXT NOT NULL,
    "fgNumber" TEXT NOT NULL,
    "totalQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuttingSyncLog" (
    "id" TEXT NOT NULL,
    "opNumber" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuttingSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FGStock_fgNumber_key" ON "FGStock"("fgNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionTracking_opId_station_key" ON "ProductionTracking"("opId", "station");

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingItem" ADD CONSTRAINT "PackingItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PackingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingItem" ADD CONSTRAINT "PackingItem_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FGStockItem" ADD CONSTRAINT "FGStockItem_fgId_fkey" FOREIGN KEY ("fgId") REFERENCES "FGStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FGStockItem" ADD CONSTRAINT "FGStockItem_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
