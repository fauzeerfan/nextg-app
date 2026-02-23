-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_titles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pattern_masters" (
    "id" TEXT NOT NULL,
    "styleCode" TEXT NOT NULL,
    "lineCode" TEXT,
    "name" TEXT,
    "patterns" JSONB NOT NULL,
    "setImages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pattern_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_masters" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stations" JSONB NOT NULL,
    "patternMultiplier" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "line_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "permissions" JSONB,
    "departmentId" TEXT,
    "jobTitleId" TEXT,
    "lineCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "opNumber" TEXT NOT NULL,
    "styleCode" TEXT NOT NULL,
    "lineCode" TEXT,
    "itemNumberFG" TEXT,
    "itemNameFG" TEXT,
    "qtyOp" INTEGER NOT NULL,
    "completedQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "currentStation" TEXT NOT NULL DEFAULT 'CUTTING_ENTAN',
    "qrCodeEntan" TEXT,
    "qrCodePacking" TEXT,
    "entanQty" INTEGER NOT NULL DEFAULT 0,
    "qtyPondOp" INTEGER NOT NULL DEFAULT 0,
    "qtyPond" INTEGER NOT NULL DEFAULT 0,
    "patternProgress" JSONB,
    "currentPatternIndex" INTEGER DEFAULT 0,
    "cpInQty" INTEGER NOT NULL DEFAULT 0,
    "cpGoodQty" INTEGER NOT NULL DEFAULT 0,
    "cpNgQty" INTEGER NOT NULL DEFAULT 0,
    "sewingLineCode" TEXT,
    "sewingInQty" INTEGER NOT NULL DEFAULT 0,
    "sewingOutQty" INTEGER NOT NULL DEFAULT 0,
    "qcInQty" INTEGER NOT NULL DEFAULT 0,
    "qcGoodQty" INTEGER NOT NULL DEFAULT 0,
    "qcNgQty" INTEGER NOT NULL DEFAULT 0,
    "packingQty" INTEGER NOT NULL DEFAULT 0,
    "packedQty" INTEGER NOT NULL DEFAULT 0,
    "boxesCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_logs" (
    "id" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "qtyGood" INTEGER NOT NULL DEFAULT 0,
    "qtyNG" INTEGER NOT NULL DEFAULT 0,
    "patternName" TEXT,
    "patternIndex" INTEGER,
    "ngReason" TEXT,
    "defectCode" TEXT,
    "deviceId" TEXT,
    "deviceType" TEXT,
    "operatorId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "station_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundles" (
    "id" TEXT NOT NULL,
    "bundleCode" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "boxNumber" TEXT,
    "packedBy" TEXT,
    "packedAt" TIMESTAMP(3),
    "itemNumberFG" TEXT,
    "styleCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finished_good_stocks" (
    "id" TEXT NOT NULL,
    "itemNumberFG" TEXT NOT NULL,
    "styleCode" TEXT NOT NULL,
    "description" TEXT,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "totalBoxes" INTEGER NOT NULL DEFAULT 0,
    "availableStock" INTEGER NOT NULL DEFAULT 0,
    "warehouse" TEXT DEFAULT 'MAIN_WAREHOUSE',
    "shelfLocation" TEXT,
    "opStock" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "finished_good_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shippings" (
    "id" TEXT NOT NULL,
    "shippingNo" TEXT NOT NULL,
    "shippingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerCode" TEXT,
    "customerName" TEXT,
    "address" TEXT,
    "itemNumberFG" TEXT NOT NULL,
    "styleCode" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "shippedOps" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shippings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_requests" (
    "id" TEXT NOT NULL,
    "requestNo" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "op_replacements" (
    "id" TEXT NOT NULL,
    "originalOpId" TEXT NOT NULL,
    "replacementOpId" TEXT,
    "reason" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "requesterId" TEXT,
    "qcInspectorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "op_replacements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "job_titles_code_key" ON "job_titles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "pattern_masters_styleCode_key" ON "pattern_masters"("styleCode");

-- CreateIndex
CREATE UNIQUE INDEX "line_masters_code_key" ON "line_masters"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_opNumber_key" ON "production_orders"("opNumber");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_qrCodeEntan_key" ON "production_orders"("qrCodeEntan");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_qrCodePacking_key" ON "production_orders"("qrCodePacking");

-- CreateIndex
CREATE INDEX "production_orders_opNumber_idx" ON "production_orders"("opNumber");

-- CreateIndex
CREATE INDEX "production_orders_styleCode_idx" ON "production_orders"("styleCode");

-- CreateIndex
CREATE INDEX "production_orders_currentStation_idx" ON "production_orders"("currentStation");

-- CreateIndex
CREATE INDEX "production_orders_lineCode_idx" ON "production_orders"("lineCode");

-- CreateIndex
CREATE INDEX "station_logs_opId_idx" ON "station_logs"("opId");

-- CreateIndex
CREATE INDEX "station_logs_station_idx" ON "station_logs"("station");

-- CreateIndex
CREATE INDEX "station_logs_timestamp_idx" ON "station_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "bundles_bundleCode_key" ON "bundles"("bundleCode");

-- CreateIndex
CREATE UNIQUE INDEX "finished_good_stocks_itemNumberFG_key" ON "finished_good_stocks"("itemNumberFG");

-- CreateIndex
CREATE UNIQUE INDEX "shippings_shippingNo_key" ON "shippings"("shippingNo");

-- CreateIndex
CREATE UNIQUE INDEX "material_requests_requestNo_key" ON "material_requests"("requestNo");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_lineCode_fkey" FOREIGN KEY ("lineCode") REFERENCES "line_masters"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_lineCode_fkey" FOREIGN KEY ("lineCode") REFERENCES "line_masters"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_logs" ADD CONSTRAINT "station_logs_opId_fkey" FOREIGN KEY ("opId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_logs" ADD CONSTRAINT "station_logs_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_opId_fkey" FOREIGN KEY ("opId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_opId_fkey" FOREIGN KEY ("opId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "op_replacements" ADD CONSTRAINT "op_replacements_originalOpId_fkey" FOREIGN KEY ("originalOpId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "op_replacements" ADD CONSTRAINT "op_replacements_replacementOpId_fkey" FOREIGN KEY ("replacementOpId") REFERENCES "production_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "op_replacements" ADD CONSTRAINT "op_replacements_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "op_replacements" ADD CONSTRAINT "op_replacements_qcInspectorId_fkey" FOREIGN KEY ("qcInspectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
