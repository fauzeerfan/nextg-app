-- CreateTable
CREATE TABLE "target_settings" (
    "id" TEXT NOT NULL,
    "lineCode" TEXT NOT NULL,
    "indexValue" DOUBLE PRECISION NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "target_settings_lineCode_effective_date_key" ON "target_settings"("lineCode", "effective_date");
