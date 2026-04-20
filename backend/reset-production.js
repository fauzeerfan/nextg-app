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
      // 0. Log login user (transaksional)
      console.log('  - Menghapus UserLoginLog...');
      await tx.userLoginLog.deleteMany({});

      // 0a. Manpower Attendance (data absensi harian)
      console.log('  - Menghapus ManpowerAttendance...');
      await tx.manpowerAttendance.deleteMany({});

      // 0b. Riwayat perpindahan karyawan (transaksional)
      console.log('  - Menghapus EmployeeLineChange...');
      await tx.employeeLineChange.deleteMany({});

      // 0c. Riwayat mutasi karyawan (transaksional)
      console.log('  - Menghapus EmployeeMutationHistory...');
      await tx.employeeMutationHistory.deleteMany({});

      // 0d. Riwayat percakapan AI (transaksional)
      console.log('  - Menghapus AiConversation...');
      await tx.aiConversation.deleteMany({});

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

      // 7. Sewing progress
      console.log('  - Menghapus SewingStartProgress...');
      await tx.sewingStartProgress.deleteMany({});
      console.log('  - Menghapus SewingFinishProgress...');
      await tx.sewingFinishProgress.deleteMany({});

      // 8. Inspeksi
      console.log('  - Menghapus CheckPanelInspection...');
      await tx.checkPanelInspection.deleteMany({});
      console.log('  - Menghapus QcInspection...');
      await tx.qcInspection.deleteMany({});

      // 9. ProductionOrder (induk utama)
      console.log('  - Menghapus ProductionOrder...');
      await tx.productionOrder.deleteMany({});
    });

    console.log('✅ Semua data produksi berhasil direset!');
    console.log('ℹ️  Master data (user, line, pattern, device, employee, target, ai_intents) tetap utuh.');
  } catch (error) {
    console.error('❌ Gagal mereset data:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetProduction();