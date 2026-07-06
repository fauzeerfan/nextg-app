-- CreateEnum
CREATE TYPE "CuttingVariant" AS ENUM ('AUT', 'NAT');

-- CreateTable
CREATE TABLE "cutting_forms" (
    "id" TEXT NOT NULL,
    "kodeForm" TEXT NOT NULL,
    "shipDate" TIMESTAMP(3),
    "creatorName" TEXT,
    "createdById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cutting_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_form_ops" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "opNumber" TEXT NOT NULL,
    "styleCode" TEXT NOT NULL,
    "itemNumberFG" TEXT NOT NULL,
    "itemNameFG" TEXT,
    "qtyOp" INTEGER NOT NULL DEFAULT 0,
    "releaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutting_form_ops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_form_op_materials" (
    "id" TEXT NOT NULL,
    "formOpId" TEXT NOT NULL,
    "setArtnr" TEXT NOT NULL,
    "artName" TEXT,
    "unit" TEXT,
    "pricePerUnit" DOUBLE PRECISION,
    "usagePerSet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variant" "CuttingVariant" NOT NULL DEFAULT 'AUT',
    "qtyRequirement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtySetPcs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutting_form_op_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_entans" (
    "id" TEXT NOT NULL,
    "formOpId" TEXT NOT NULL,
    "entanKe" INTEGER NOT NULL DEFAULT 1,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishAt" TIMESTAMP(3),
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutting_entans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_details" (
    "id" TEXT NOT NULL,
    "entanId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "noLot" TEXT,
    "panjangPackingList" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "panjangAktual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lebar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markerPanjang" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markerLebar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entanLembar" INTEGER NOT NULL DEFAULT 0,
    "entanGambar" INTEGER NOT NULL DEFAULT 0,
    "losSambungan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "losCacat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "losAktual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSetOrPcs" INTEGER NOT NULL DEFAULT 0,
    "aktualPemakaian" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aktualMaterial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sisa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cutting_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_dispatches" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "batchOpId" TEXT NOT NULL,
    "batchLabel" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "patternIndexes" JSONB NOT NULL,
    "sourceEntanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutting_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cutting_forms_kodeForm_key" ON "cutting_forms"("kodeForm");

-- CreateIndex
CREATE UNIQUE INDEX "cutting_entans_formOpId_entanKe_key" ON "cutting_entans"("formOpId", "entanKe");

-- AddForeignKey
ALTER TABLE "cutting_form_ops" ADD CONSTRAINT "cutting_form_ops_formId_fkey" FOREIGN KEY ("formId") REFERENCES "cutting_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_form_op_materials" ADD CONSTRAINT "cutting_form_op_materials_formOpId_fkey" FOREIGN KEY ("formOpId") REFERENCES "cutting_form_ops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_entans" ADD CONSTRAINT "cutting_entans_formOpId_fkey" FOREIGN KEY ("formOpId") REFERENCES "cutting_form_ops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_details" ADD CONSTRAINT "cutting_details_entanId_fkey" FOREIGN KEY ("entanId") REFERENCES "cutting_entans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_details" ADD CONSTRAINT "cutting_details_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "cutting_form_op_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
