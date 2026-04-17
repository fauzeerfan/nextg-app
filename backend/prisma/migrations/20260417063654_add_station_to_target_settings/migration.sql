/*
  Warnings:

  - A unique constraint covering the columns `[lineCode,station,effective_date]` on the table `target_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "target_settings_lineCode_effective_date_key";

-- AlterTable
ALTER TABLE "target_settings" ADD COLUMN     "station" TEXT NOT NULL DEFAULT 'SEWING';

-- CreateIndex
CREATE UNIQUE INDEX "target_settings_lineCode_station_effective_date_key" ON "target_settings"("lineCode", "station", "effective_date");
