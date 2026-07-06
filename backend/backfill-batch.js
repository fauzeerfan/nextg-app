// ============================================================================
// backfill-batch.js  — FASE 0 Pemisahan Batch
// ----------------------------------------------------------------------------
// Menandai SEMUA ProductionOrder yang sudah ada sekarang sebagai
// "batch tunggal mandiri" agar produksi yang sedang berjalan tetap jalan apa
// adanya setelah kolom batch ditambahkan.
//
//   level       -> tetap BATCH (sudah default dari skema)
//   parentOpId  -> tetap null  (OP lama tidak punya induk)
//   batchNumber -> 1
//   batchCode   -> = opNumber  (kompatibel dengan QR lama yang memuat opNumber)
//
// AMAN & IDEMPOTENT: hanya menyentuh baris yang batchCode-nya masih kosong,
// jadi boleh dijalankan ulang tanpa efek samping.
//
// Jalankan SEKALI setelah migrasi:
//   cd backend
//   npx prisma migrate dev --name add_op_batch_separation
//   node backfill-batch.js
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ops = await prisma.productionOrder.findMany({
    where: { batchCode: null },
    select: { id: true, opNumber: true },
  });

  console.log(`🔄 Backfill ${ops.length} OP lama menjadi batch tunggal...`);

  let done = 0;
  for (const op of ops) {
    await prisma.productionOrder.update({
      where: { id: op.id },
      data: {
        batchNumber: 1,
        batchCode: op.opNumber,
      },
    });
    done++;
  }

  console.log(
    `✅ Selesai: ${done} OP ditandai sebagai batch tunggal ` +
      `(level=BATCH, batchNumber=1, batchCode=opNumber).`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Backfill gagal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());