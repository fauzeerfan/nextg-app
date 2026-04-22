-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "materialNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "category" TEXT,
    "minStock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderDetail" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivingHeader" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "poId" TEXT,
    "deliveryNoteNumber" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivingHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivingDetail" (
    "id" TEXT NOT NULL,
    "headerId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "poDetailId" TEXT,
    "receivedQty" INTEGER NOT NULL,
    "acceptedQty" INTEGER NOT NULL,
    "rejectedQty" INTEGER NOT NULL,
    "rejectionReason" TEXT,
    "batchLotNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING_PUTAWAY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivingDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialInventory" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "receivingDetailId" TEXT NOT NULL,
    "storageLocation" TEXT NOT NULL,
    "batchLotNumber" TEXT,
    "qtyOnHand" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Material_materialNumber_key" ON "Material"("materialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivingHeader_grnNumber_key" ON "ReceivingHeader"("grnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialInventory_materialId_receivingDetailId_storageLocat_key" ON "MaterialInventory"("materialId", "receivingDetailId", "storageLocation", "batchLotNumber");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderDetail" ADD CONSTRAINT "PurchaseOrderDetail_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderDetail" ADD CONSTRAINT "PurchaseOrderDetail_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingHeader" ADD CONSTRAINT "ReceivingHeader_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingHeader" ADD CONSTRAINT "ReceivingHeader_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingDetail" ADD CONSTRAINT "ReceivingDetail_headerId_fkey" FOREIGN KEY ("headerId") REFERENCES "ReceivingHeader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingDetail" ADD CONSTRAINT "ReceivingDetail_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingDetail" ADD CONSTRAINT "ReceivingDetail_poDetailId_fkey" FOREIGN KEY ("poDetailId") REFERENCES "PurchaseOrderDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialInventory" ADD CONSTRAINT "MaterialInventory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialInventory" ADD CONSTRAINT "MaterialInventory_receivingDetailId_fkey" FOREIGN KEY ("receivingDetailId") REFERENCES "ReceivingDetail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
