-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "cuttingSource" TEXT NOT NULL DEFAULT 'INTERNAL';

-- (opsional) seed default switch
INSERT INTO "system_settings" ("key","value","updatedAt")
VALUES ('CUTTING_SOURCE','INTERNAL', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- (penting untuk data lama) tandai OP induk tanpa Cutting Report internal sebagai EXTERNAL
UPDATE "ProductionOrder" p
SET "cuttingSource" = 'EXTERNAL'
WHERE p."parentOpId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "cutting_form_ops" f WHERE f."opNumber" = p."opNumber");