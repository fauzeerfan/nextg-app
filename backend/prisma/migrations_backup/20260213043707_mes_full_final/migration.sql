/*
  Warnings:

  - You are about to drop the column `qtyEntan` on the `ProductionOrder` table. All the data in the column will be lost.
  - You are about to drop the column `qtySewing` on the `ProductionOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductionOrder" DROP COLUMN "qtyEntan",
DROP COLUMN "qtySewing",
ADD COLUMN     "qtyCP" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qtyEntan" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qtySewingIn" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qtySewingOut" INTEGER NOT NULL DEFAULT 0;
