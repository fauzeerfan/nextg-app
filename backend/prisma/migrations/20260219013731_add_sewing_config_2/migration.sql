-- AlterTable
ALTER TABLE "IotDevice" ADD COLUMN     "config" JSONB;

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

-- CreateIndex
CREATE UNIQUE INDEX "SewingStartProgress_opId_startIndex_key" ON "SewingStartProgress"("opId", "startIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SewingFinishProgress_opId_finishIndex_key" ON "SewingFinishProgress"("opId", "finishIndex");

-- AddForeignKey
ALTER TABLE "SewingStartProgress" ADD CONSTRAINT "SewingStartProgress_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SewingFinishProgress" ADD CONSTRAINT "SewingFinishProgress_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
