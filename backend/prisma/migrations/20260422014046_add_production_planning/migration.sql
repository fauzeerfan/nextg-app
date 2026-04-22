-- CreateTable
CREATE TABLE "planned_orders" (
    "id" TEXT NOT NULL,
    "itemNumberFG" TEXT NOT NULL,
    "styleCode" TEXT,
    "quantity" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "assignedLineCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_recommendation_logs" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planning_recommendation_logs_pkey" PRIMARY KEY ("id")
);
