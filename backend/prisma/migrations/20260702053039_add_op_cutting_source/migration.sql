-- OP induk lama tanpa Cutting Report internal = berasal dari EXTERNAL
UPDATE "ProductionOrder" p
SET "cuttingSource" = 'EXTERNAL'
WHERE p."parentOpId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "cutting_form_ops" f WHERE f."opNumber" = p."opNumber");