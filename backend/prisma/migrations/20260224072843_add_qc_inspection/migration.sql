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

-- AddForeignKey
ALTER TABLE "QcInspection" ADD CONSTRAINT "QcInspection_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
