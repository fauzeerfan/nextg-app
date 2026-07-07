-- AlterTable
ALTER TABLE "ManpowerAttendance" ADD COLUMN     "check_out" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'SCAN';

-- AlterTable
ALTER TABLE "cutting_entans" ADD COLUMN     "batchCode" TEXT,
ADD COLUMN     "postedQty" INTEGER NOT NULL DEFAULT 0;
