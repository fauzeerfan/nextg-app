-- AlterTable
ALTER TABLE "cutting_details" ADD COLUMN     "losWarna" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "turunanId" TEXT;

-- CreateTable
CREATE TABLE "cutting_turunans" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "noTurun" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cutting_turunans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "cutting_turunans_materialId_noTurun_key" ON "cutting_turunans"("materialId", "noTurun");

-- CreateIndex
CREATE INDEX "cutting_details_turunanId_idx" ON "cutting_details"("turunanId");

-- AddForeignKey
ALTER TABLE "cutting_details" ADD CONSTRAINT "cutting_details_turunanId_fkey" FOREIGN KEY ("turunanId") REFERENCES "cutting_turunans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_turunans" ADD CONSTRAINT "cutting_turunans_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "cutting_form_op_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
