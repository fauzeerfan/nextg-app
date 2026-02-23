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

-- CreateIndex
CREATE UNIQUE INDEX "CheckPanelInspection_opId_patternIndex_key" ON "CheckPanelInspection"("opId", "patternIndex");

-- AddForeignKey
ALTER TABLE "CheckPanelInspection" ADD CONSTRAINT "CheckPanelInspection_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
