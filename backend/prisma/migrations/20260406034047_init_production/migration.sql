-- CreateEnum
CREATE TYPE "StationCode" AS ENUM ('CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('WIP', 'DONE', 'HOLD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "station" TEXT,
    "allowedStations" JSONB,
    "department" TEXT,
    "jobTitle" TEXT,
    "lineCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineMaster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "patternMultiplier" INTEGER NOT NULL DEFAULT 1,
    "ngCategories" JSONB,
    "qcNgCategories" JSONB,
    "sewingConfig" JSONB,
    "packingConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineStation" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "station" "StationCode" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LineStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternMaster" (
    "id" TEXT NOT NULL,
    "styleCode" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "imgSetGood" TEXT,
    "imgSetNg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatternMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternPart" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imgGood" TEXT,
    "imgNg" TEXT,

    CONSTRAINT "PatternPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "opNumber" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "styleCode" TEXT NOT NULL,
    "itemNumberFG" TEXT NOT NULL,
    "itemNameFG" TEXT,
    "qtyOp" INTEGER NOT NULL,
    "qtyEntan" INTEGER NOT NULL DEFAULT 0,
    "qtySentToPond" INTEGER NOT NULL DEFAULT 0,
    "qtyPond" INTEGER NOT NULL DEFAULT 0,
    "qtyPondNg" INTEGER NOT NULL DEFAULT 0,
    "qtyCP" INTEGER NOT NULL DEFAULT 0,
    "cpGoodQty" INTEGER NOT NULL DEFAULT 0,
    "cpNgQty" INTEGER NOT NULL DEFAULT 0,
    "readyForCP" BOOLEAN NOT NULL DEFAULT false,
    "setsReadyForSewing" INTEGER NOT NULL DEFAULT 0,
    "allPatternsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "qtySewingIn" INTEGER NOT NULL DEFAULT 0,
    "qtySewingOut" INTEGER NOT NULL DEFAULT 0,
    "qtyQC" INTEGER NOT NULL DEFAULT 0,
    "qcNgQty" INTEGER NOT NULL DEFAULT 0,
    "qtyPacking" INTEGER NOT NULL DEFAULT 0,
    "qtyFG" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductionStatus" NOT NULL DEFAULT 'WIP',
    "currentStation" "StationCode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternProgress" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "patternIndex" INTEGER NOT NULL,
    "patternName" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "good" INTEGER NOT NULL DEFAULT 0,
    "ng" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatternProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuttingBatch" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "qrCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CuttingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionTracking" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "station" "StationCode" NOT NULL,
    "goodQty" INTEGER NOT NULL DEFAULT 0,
    "ngQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionTracking_pkey" PRIMARY KEY ("id")
);

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
    "qrCode" TEXT,
    "printed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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

-- CreateTable
CREATE TABLE "IotDevice" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT,
    "mode" TEXT NOT NULL,
    "station" "StationCode" NOT NULL,
    "lineCode" TEXT NOT NULL,
    "config" JSONB,
    "lastSeen" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IotDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SewingStartProgress" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "startIndex" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SewingStartProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SewingFinishProgress" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "finishIndex" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SewingFinishProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckPanelInspection" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "patternIndex" INTEGER NOT NULL,
    "patternName" TEXT NOT NULL,
    "good" INTEGER NOT NULL DEFAULT 0,
    "ng" INTEGER NOT NULL DEFAULT 0,
    "ngReasons" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckPanelInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcInspection" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "good" INTEGER NOT NULL DEFAULT 0,
    "ng" INTEGER NOT NULL DEFAULT 0,
    "ngReasons" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "lineCode" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManpowerAttendance" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lineCode" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "scanTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManpowerAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "LineMaster_code_key" ON "LineMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LineStation_lineId_station_key" ON "LineStation"("lineId", "station");

-- CreateIndex
CREATE UNIQUE INDEX "PatternMaster_styleCode_lineId_key" ON "PatternMaster"("styleCode", "lineId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_opNumber_key" ON "ProductionOrder"("opNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PatternProgress_opId_patternIndex_key" ON "PatternProgress"("opId", "patternIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CuttingBatch_qrCode_key" ON "CuttingBatch"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "CuttingBatch_opId_batchNumber_key" ON "CuttingBatch"("opId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionTracking_opId_station_key" ON "ProductionTracking"("opId", "station");

-- CreateIndex
CREATE UNIQUE INDEX "FGStock_fgNumber_key" ON "FGStock"("fgNumber");

-- CreateIndex
CREATE UNIQUE INDEX "IotDevice_deviceId_key" ON "IotDevice"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "SewingStartProgress_opId_startIndex_key" ON "SewingStartProgress"("opId", "startIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SewingFinishProgress_opId_finishIndex_key" ON "SewingFinishProgress"("opId", "finishIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CheckPanelInspection_opId_patternIndex_key" ON "CheckPanelInspection"("opId", "patternIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_nik_key" ON "Employee"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "ManpowerAttendance_nik_date_key" ON "ManpowerAttendance"("nik", "date");

-- AddForeignKey
ALTER TABLE "LineStation" ADD CONSTRAINT "LineStation_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "LineMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternMaster" ADD CONSTRAINT "PatternMaster_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "LineMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternPart" ADD CONSTRAINT "PatternPart_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "PatternMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "LineMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternProgress" ADD CONSTRAINT "PatternProgress_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingBatch" ADD CONSTRAINT "CuttingBatch_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTracking" ADD CONSTRAINT "ProductionTracking_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "SewingStartProgress" ADD CONSTRAINT "SewingStartProgress_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SewingFinishProgress" ADD CONSTRAINT "SewingFinishProgress_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckPanelInspection" ADD CONSTRAINT "CheckPanelInspection_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcInspection" ADD CONSTRAINT "QcInspection_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManpowerAttendance" ADD CONSTRAINT "ManpowerAttendance_nik_fkey" FOREIGN KEY ("nik") REFERENCES "Employee"("nik") ON DELETE CASCADE ON UPDATE CASCADE;
