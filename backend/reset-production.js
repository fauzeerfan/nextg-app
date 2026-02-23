const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetProduction() {
  // Cek argumen --force untuk keamanan
  if (!process.argv.includes('--force')) {
    console.log('⚠️  Gunakan: node reset-production.js --force');
    console.log('⚠️  Perintah ini akan MENGHAPUS SEMUA DATA PRODUKSI!');
    process.exit(1);
  }

  console.log('🔄 Mereset semua data produksi...');
  try {
    await prisma.$transaction(async (tx) => {
      // Hapus data transaksional dengan urutan dependensi (anak dulu, baru induk)

      // 1. Log dan tracking detail
      console.log('  - Menghapus ProductionLog...');
      await tx.productionLog.deleteMany({});

      console.log('  - Menghapus ProductionTracking...');
      await tx.productionTracking.deleteMany({});

      console.log('  - Menghapus PatternProgress...');
      await tx.patternProgress.deleteMany({});

      // 2. Cutting batches
      console.log('  - Menghapus CuttingBatch...');
      await tx.cuttingBatch.deleteMany({});

      // 3. Packing
      console.log('  - Menghapus PackingItem...');
      await tx.packingItem.deleteMany({});
      console.log('  - Menghapus PackingSession...');
      await tx.packingSession.deleteMany({});

      // 4. Finished Goods
      console.log('  - Menghapus FGStockItem...');
      await tx.fGStockItem.deleteMany({});
      console.log('  - Menghapus FGStock...');
      await tx.fGStock.deleteMany({});

      // 5. Shipment
      console.log('  - Menghapus ShipmentItem...');
      await tx.shipmentItem.deleteMany({});
      console.log('  - Menghapus Shipment...');
      await tx.shipment.deleteMany({});

      // 6. Sync log
      console.log('  - Menghapus CuttingSyncLog...');
      await tx.cuttingSyncLog.deleteMany({});

      // 7. Sewing progress (jika sudah ada di schema)
      if (tx.sewingStartProgress) {
        console.log('  - Menghapus SewingStartProgress...');
        await tx.sewingStartProgress.deleteMany({});
      }
      if (tx.sewingFinishProgress) {
        console.log('  - Menghapus SewingFinishProgress...');
        await tx.sewingFinishProgress.deleteMany({});
      }

      // 8. ProductionOrder (induk utama)
      console.log('  - Menghapus ProductionOrder...');
      await tx.productionOrder.deleteMany({});

      // 9. Opsional: jika ada tabel material request, op replacement, dll. (tidak ada di schema saat ini)
    });

    console.log('✅ Semua data produksi berhasil direset!');
    console.log('ℹ️  Master data (user, line, pattern, device) tetap utuh.');
  } catch (error) {
    console.error('❌ Gagal mereset data:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetProduction();