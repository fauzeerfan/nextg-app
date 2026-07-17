-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canEditCuttingReport" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "cutting_forms" ADD COLUMN     "editGrantUserIds" JSONB;

-- CreateTable
CREATE TABLE "cutting_report_requests" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "kodeForm" TEXT NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'EDIT',
    "targetLabel" TEXT,
    "note" TEXT,
    "requestedById" TEXT,
    "requestedByName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutting_report_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cutting_report_requests_status_idx" ON "cutting_report_requests"("status");

-- CreateIndex
CREATE INDEX "cutting_report_requests_formId_idx" ON "cutting_report_requests"("formId");
