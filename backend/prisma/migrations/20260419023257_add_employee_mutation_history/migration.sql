-- CreateTable
CREATE TABLE "employee_mutation_history" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "oldLineCode" TEXT NOT NULL,
    "newLineCode" TEXT NOT NULL,
    "oldStation" TEXT NOT NULL,
    "newStation" TEXT NOT NULL,
    "oldSection" TEXT NOT NULL,
    "newSection" TEXT NOT NULL,
    "oldDepartment" TEXT NOT NULL,
    "newDepartment" TEXT NOT NULL,
    "oldJobTitle" TEXT NOT NULL,
    "newJobTitle" TEXT NOT NULL,
    "mutationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "mutatedBy" TEXT,

    CONSTRAINT "employee_mutation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_mutation_history_employeeId_idx" ON "employee_mutation_history"("employeeId");

-- CreateIndex
CREATE INDEX "employee_mutation_history_nik_idx" ON "employee_mutation_history"("nik");

-- AddForeignKey
ALTER TABLE "employee_mutation_history" ADD CONSTRAINT "employee_mutation_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
