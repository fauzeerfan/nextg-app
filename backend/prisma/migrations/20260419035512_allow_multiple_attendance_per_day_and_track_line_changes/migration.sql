-- DropIndex
DROP INDEX "ManpowerAttendance_nik_date_key";

-- CreateTable
CREATE TABLE "employee_line_changes" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "oldLineCode" TEXT NOT NULL,
    "newLineCode" TEXT NOT NULL,
    "oldStation" TEXT NOT NULL,
    "newStation" TEXT NOT NULL,
    "change_date" TIMESTAMP(3) NOT NULL,
    "changeTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "employee_line_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_line_changes_nik_idx" ON "employee_line_changes"("nik");

-- CreateIndex
CREATE INDEX "employee_line_changes_change_date_idx" ON "employee_line_changes"("change_date");

-- AddForeignKey
ALTER TABLE "employee_line_changes" ADD CONSTRAINT "employee_line_changes_nik_fkey" FOREIGN KEY ("nik") REFERENCES "Employee"("nik") ON DELETE CASCADE ON UPDATE CASCADE;
