/*
  Warnings:

  - You are about to drop the `bundles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finished_good_stocks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_titles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `line_masters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `material_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `op_replacements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pattern_masters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `production_orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shippings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `station_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StationCode" AS ENUM ('CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('WIP', 'DONE', 'HOLD');

-- DropForeignKey
ALTER TABLE "bundles" DROP CONSTRAINT "bundles_opId_fkey";

-- DropForeignKey
ALTER TABLE "material_requests" DROP CONSTRAINT "material_requests_opId_fkey";

-- DropForeignKey
ALTER TABLE "op_replacements" DROP CONSTRAINT "op_replacements_originalOpId_fkey";

-- DropForeignKey
ALTER TABLE "op_replacements" DROP CONSTRAINT "op_replacements_qcInspectorId_fkey";

-- DropForeignKey
ALTER TABLE "op_replacements" DROP CONSTRAINT "op_replacements_replacementOpId_fkey";

-- DropForeignKey
ALTER TABLE "op_replacements" DROP CONSTRAINT "op_replacements_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "production_orders" DROP CONSTRAINT "production_orders_lineCode_fkey";

-- DropForeignKey
ALTER TABLE "station_logs" DROP CONSTRAINT "station_logs_opId_fkey";

-- DropForeignKey
ALTER TABLE "station_logs" DROP CONSTRAINT "station_logs_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_jobTitleId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_lineCode_fkey";

-- DropTable
DROP TABLE "bundles";

-- DropTable
DROP TABLE "departments";

-- DropTable
DROP TABLE "finished_good_stocks";

-- DropTable
DROP TABLE "job_titles";

-- DropTable
DROP TABLE "line_masters";

-- DropTable
DROP TABLE "material_requests";

-- DropTable
DROP TABLE "op_replacements";

-- DropTable
DROP TABLE "pattern_masters";

-- DropTable
DROP TABLE "production_orders";

-- DropTable
DROP TABLE "shippings";

-- DropTable
DROP TABLE "station_logs";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "station" TEXT,
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
    "status" "ProductionStatus" NOT NULL DEFAULT 'WIP',
    "currentStation" "StationCode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "LineStation" ADD CONSTRAINT "LineStation_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "LineMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternMaster" ADD CONSTRAINT "PatternMaster_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "LineMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternPart" ADD CONSTRAINT "PatternPart_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "PatternMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "LineMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTracking" ADD CONSTRAINT "ProductionTracking_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
