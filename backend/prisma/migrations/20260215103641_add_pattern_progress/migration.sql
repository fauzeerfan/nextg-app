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

-- CreateIndex
CREATE UNIQUE INDEX "PatternProgress_opId_patternIndex_key" ON "PatternProgress"("opId", "patternIndex");

-- AddForeignKey
ALTER TABLE "PatternProgress" ADD CONSTRAINT "PatternProgress_opId_fkey" FOREIGN KEY ("opId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
