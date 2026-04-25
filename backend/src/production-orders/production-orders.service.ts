import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionStatus, StationCode } from '@prisma/client';

@Injectable()
export class ProductionOrdersService {
  constructor(private prisma: PrismaService) {}

  // ======================================================
  // QUERY
  // ======================================================
  async findAll() {
    return this.prisma.productionOrder.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
  }

  /**
   * Mendapatkan daftar OP aktif untuk suatu stasiun.
   * Untuk stasiun yang dapat berjalan paralel (SEWING, QC, PACKING, CP),
   * digunakan filter berdasarkan kuantitas atau kondisi logis, bukan currentStation.
   */
  async findActiveForStation(station: string, includeProgress = false) {
  // ==========================================
  // CHECK PANEL (CP)
  // ==========================================
if (station === 'CP') {
  const ops = await this.prisma.productionOrder.findMany({
    where: {
      status: ProductionStatus.WIP,
      qtyCP: { gt: 0 },
    },
    include: { line: true, checkPanelInspections: true },
    orderBy: { createdAt: 'asc' },
  });
  return ops.filter(op => {
    const totalInspected = (op.cpGoodQty || 0) + (op.cpNgQty || 0);
    const hasRemainingInspection = totalInspected < (op.qtyCP || 0);
    const hasRemainingToSend = (op.setsReadyForSewing || 0) > 0;
    // OP tetap aktif jika:
    // - masih ada pattern yang belum diinspeksi, ATAU
    // - masih ada set yang belum dikirim ke Sewing
    return hasRemainingInspection || hasRemainingToSend;
  });
}

  // ==========================================
  // SEWING
  // ==========================================
  if (station === 'SEWING') {
    // Tampilkan OP yang masih memiliki input (qtySewingIn) lebih besar dari output (qtySewingOut)
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtySewingIn: { gt: 0 },
      },
      include: {
        line: true,
        sewingStartProgress: true,
        sewingFinishProgress: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return ops.filter(op => (op.qtySewingOut || 0) < (op.qtySewingIn || 0));
  }

  // ==========================================
  // QUALITY CONTROL (QC)
  // ==========================================
  if (station === 'QC') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtySewingOut: { gt: 0 },
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });
    return ops.filter(op => {
      const totalInspected = (op.qtyQC || 0) + (op.qcNgQty || 0);
      return totalInspected < (op.qtySewingOut || 0);
    });
  }

  // ==========================================
  // PACKING
  // ==========================================
  if (station === 'PACKING') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtyQC: { gt: 0 },
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });
    return ops.filter(op => (op.qtyPacking || 0) < (op.qtyQC || 0));
  }

  // ==========================================
  // FINISHED GOODS (FG)
  // ==========================================
  if (station === 'FG') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtyPacking: { gt: 0 },
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });
    return ops.filter(op => (op.qtyFG || 0) < (op.qtyPacking || 0));
  }

  // ==========================================
  // CUTTING POND (tetap pakai currentStation)
  // ==========================================
  if (station === 'CUTTING_POND') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        currentStation: StationCode.CUTTING_POND,
      },
      include: {
        line: true,
        patternProgress: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    // Format patternProgress menjadi array patterns (sama seperti sebelumnya)
    return ops.map(op => ({
      ...op,
      patterns: op.patternProgress?.map(p => ({
        index: p.patternIndex,
        name: p.patternName,
        target: p.target,
        good: p.good,
        ng: p.ng,
        current: p.good + p.ng,
        completed: p.completed,
      })) || [],
      patternProgress: undefined,
    }));
  }

  // ==========================================
  // CUTTING ENTAN (tetap pakai currentStation + qty)
  // ==========================================
  if (station === 'CUTTING_ENTAN') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtyEntan: { gt: this.prisma.productionOrder.fields.qtySentToPond },
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });
    return ops;
  }

  // ==========================================
  // FALLBACK (station lain, misal tidak dikenal)
  // ==========================================
  const where: any = {
    status: ProductionStatus.WIP,
    currentStation: station as StationCode,
  };
  return this.prisma.productionOrder.findMany({
    where,
    include: { line: true },
    orderBy: { createdAt: 'asc' },
  });
}

  async findHistoryForStation(station: string) {
    if (station === 'CUTTING_ENTAN') {
      return this.prisma.productionOrder.findMany({
        where: { qtyEntan: { gt: 0 } },
        orderBy: { updatedAt: 'desc' },
        take: 50
      });
    }

    if (station === 'CUTTING_POND') {
      return this.prisma.productionOrder.findMany({
        where: { qtyPond: { gt: 0 } },
        orderBy: { updatedAt: 'desc' },
        take: 50
      });
    }

    return this.prisma.productionOrder.findMany({
      where: { currentStation: { not: station as StationCode } },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });
  }

  async findOne(id: string) {
    return this.prisma.productionOrder.findUnique({ where: { id } });
  }

  // ======================================================
  // PATTERN PROGRESS
  // ======================================================
  async getPatternProgress(opId: string) {
    const progress = await this.prisma.patternProgress.findMany({
      where: { opId },
      orderBy: { patternIndex: 'asc' },
    });
    return progress;
  }

  // ======================================================
  // CHECK PANEL INSPECTIONS
  // ======================================================
  async getCheckPanelInspections(opId: string) {
    return this.prisma.checkPanelInspection.findMany({
      where: { opId },
      orderBy: { patternIndex: 'asc' },
    });
  }

  // ======================================================
  // SEWING PROGRESS
  // ======================================================
  async getSewingProgress(opId: string) {
    const startProgress = await this.prisma.sewingStartProgress.findMany({
      where: { opId },
      orderBy: { startIndex: 'asc' }
    });
    const finishProgress = await this.prisma.sewingFinishProgress.findMany({
      where: { opId },
      orderBy: { finishIndex: 'asc' }
    });
    return { sewingStartProgress: startProgress, sewingFinishProgress: finishProgress };
  }

  // ======================================================
  // QC INSPECTION
  // ======================================================
  async qcInspect(opId: string, dto: { good: number; ng: number; ngReasons?: string[] }) {
    const { good, ng, ngReasons } = dto;

    if (good < 0 || ng < 0) throw new BadRequestException('good and ng must be non-negative');
    if (good + ng === 0) throw new BadRequestException('No quantity to process');

    return this.prisma.$transaction(async (tx) => {
      const op = await tx.productionOrder.findUnique({
        where: { id: opId },
      });
      if (!op) throw new NotFoundException('OP not found');

      // 🔥 Tidak perlu cek currentStation, karena OP bisa di banyak stasiun
      if (op.qtySewingOut <= 0) {
        throw new BadRequestException('No output from sewing yet');
      }

      // Hitung sisa output yang belum diinspeksi
      const totalInspected = (op.qtyQC || 0) + (op.qcNgQty || 0);
      const available = (op.qtySewingOut || 0) - totalInspected;
      if (available <= 0) {
        throw new BadRequestException('No remaining output to inspect');
      }
      if (good + ng > available) {
        throw new BadRequestException(`Cannot inspect more than remaining ${available} sets`);
      }

      // 1. Update ProductionTracking
      await tx.productionTracking.upsert({
        where: { opId_station: { opId, station: StationCode.QC } },
        update: { goodQty: { increment: good }, ngQty: { increment: ng } },
        create: { opId, station: StationCode.QC, goodQty: good, ngQty: ng },
      });

      // 2. Update ProductionOrder
      await tx.productionOrder.update({
        where: { id: opId },
        data: {
          qtyQC: { increment: good },
          qcNgQty: { increment: ng },
          updatedAt: new Date(), // Paksa update timestamp
        },
      });

      // 3. Simpan ke QcInspection
      await tx.qcInspection.create({
        data: {
          opId,
          good,
          ng,
          ngReasons: ngReasons || [],
        },
      });

      // 4. Buat ProductionLog
      await tx.productionLog.create({
        data: {
          opId,
          station: StationCode.QC,
          type: 'INSPECT',
          qty: good + ng,
          note: ngReasons?.join(', ') || null,
        },
      });

      // 5. Cek apakah semua set sudah diinspeksi
      const allInspections = await tx.qcInspection.aggregate({
        where: { opId },
        _sum: { good: true, ng: true },
      });
      const totalInspectedNow = (allInspections._sum.good || 0) + (allInspections._sum.ng || 0);
      if (totalInspectedNow >= (op.qtySewingOut || 0)) {
        await tx.productionOrder.update({
          where: { id: opId },
          data: { currentStation: StationCode.PACKING },
        });
      }

      return { success: true };
    });
  }

  async getQcInspections(opId: string) {
    return this.prisma.qcInspection.findMany({
      where: { opId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ======================================================
  // DASHBOARD STATS
  // ======================================================
  async getDashboardStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeOps = await this.prisma.productionOrder.findMany({
      where: {
        status: { in: [ProductionStatus.WIP, ProductionStatus.DONE] }
      },
      select: { qtyPond: true, qtyPacking: true, currentStation: true }
    });

    const totalWip = activeOps.reduce((acc, op) => acc + (op.qtyPond - op.qtyPacking), 0);

    const packingLogs = await this.prisma.productionLog.aggregate({
      _sum: { qty: true },
      where: {
        station: StationCode.PACKING,
        type: 'PACKING_OUT',
        createdAt: { gte: startOfDay }
      }
    });

    const inspectionLogs = await this.prisma.productionLog.aggregate({
      _sum: { qty: true },
      where: {
        type: 'INSPECT',
        createdAt: { gte: startOfDay }
      }
    });

    const totalInspected = inspectionLogs._sum.qty || 0;
    const ngRate = 0;

    const stationGroup = await this.prisma.productionOrder.groupBy({
      by: ['currentStation'],
      where: { status: { not: ProductionStatus.DONE } },
      _count: { id: true }
    });

    const recentOps = await this.prisma.productionOrder.findMany({
      where: { status: { not: ProductionStatus.DONE } },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    return {
      kpi: {
        wip: totalWip,
        output: packingLogs._sum.qty || 0,
        ngRate: ngRate.toFixed(1),
        speed: Math.round((packingLogs._sum.qty || 0) / 8)
      },
      stations: stationGroup.map(s => ({
        name: s.currentStation,
        count: s._count.id
      })),
      activeOps: recentOps
    };
  }

  // ======================================================
  // DASHBOARD COMPREHENSIVE (UPDATED PER INSTRUKSI)
  // ======================================================
  async getDashboardComprehensive(startDateStr?: string, endDateStr?: string) {
    // Tentukan rentang tanggal (default: hari ini)
    let startDate: Date;
    let endDate: Date;

    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
      // Set ke awal dan akhir hari
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      endDate.setMilliseconds(-1);
    }

    // 1. KPI UTAMA (dalam rentang tanggal)
    const totalOps = await this.prisma.productionOrder.count();
    const totalWip = await this.prisma.productionOrder.count({ where: { status: 'WIP' } });

    // Total output hari ini = packing session closed dalam rentang
    const packingSessionsInRange = await this.prisma.packingSession.aggregate({
      where: {
        status: 'CLOSED',
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { totalQty: true }
    });
    const todayOutput = packingSessionsInRange._sum.totalQty || 0;

    // Active lines (tidak perlu filter tanggal, karena line aktif berdasarkan status WIP)
    const activeLines = await this.prisma.lineMaster.count({
      where: { productionOrders: { some: { status: 'WIP' } } }
    });
    const targetOutput = activeLines * 8 * 50;
    const achievement = targetOutput > 0 ? Math.round((todayOutput / targetOutput) * 100) : 0;

    // Defect rate dalam rentang (CP + QC)
    const totalGoodCP = await this.prisma.checkPanelInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { good: true }
    });
    const totalNgCP = await this.prisma.checkPanelInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { ng: true }
    });
    const totalGoodQC = await this.prisma.qcInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { good: true }
    });
    const totalNgQC = await this.prisma.qcInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { ng: true }
    });
    const totalGood = (totalGoodCP._sum.good || 0) + (totalGoodQC._sum.good || 0);
    const totalProduced = totalGood + (totalNgCP._sum.ng || 0) + (totalNgQC._sum.ng || 0);
    const defectRate = totalProduced > 0 ? Number(((totalProduced - totalGood) / totalProduced) * 100).toFixed(1) : 0;

    const overallEfficiency = achievement;
    const onTimeDelivery = 95;

    // 2. WIP per station (tidak perlu filter tanggal, karena WIP adalah kondisi saat ini)
    const allWipOps = await this.prisma.productionOrder.findMany({
      where: { status: 'WIP' },
      select: {
        id: true, opNumber: true, currentStation: true,
        qtyEntan: true, qtySentToPond: true, qtyPond: true, qtyCP: true,
        cpGoodQty: true, cpNgQty: true, setsReadyForSewing: true,
        qtySewingIn: true, qtySewingOut: true, qtyQC: true, qcNgQty: true,
        qtyPacking: true, qtyFG: true,
        line: { select: { patternMultiplier: true } }
      }
    });

    const stationKeys = ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'];
    const stationMap: Record<string, { count: number; wipQty: number }> = {};
    stationKeys.forEach(key => { stationMap[key] = { count: 0, wipQty: 0 }; });

    for (const op of allWipOps) {
      const multiplier = op.line?.patternMultiplier || 1;
      const entanWip = (op.qtyEntan || 0) - (op.qtySentToPond || 0);
      if (entanWip > 0) {
        stationMap['CUTTING_ENTAN'].count++;
        stationMap['CUTTING_ENTAN'].wipQty += entanWip;
      }
      const targetPond = (op.qtyEntan || 0) * multiplier;
      const pondWip = targetPond - (op.qtyPond || 0);
      if (pondWip > 0) {
        stationMap['CUTTING_POND'].count++;
        stationMap['CUTTING_POND'].wipQty += pondWip;
      }
      const cpInspected = (op.cpGoodQty || 0) + (op.cpNgQty || 0);
      const cpWip = (op.qtyCP || 0) - cpInspected;
      const setsReady = (op.setsReadyForSewing || 0);
      // OP masih aktif di CP jika masih ada set yang perlu diinspeksi ATAU masih ada set siap kirim ke Sewing
      if (cpWip > 0 || setsReady > 0) {
        stationMap['CP'].count++;
        // WIP = sisa inspeksi (jika ada), atau jumlah set yang siap dikirim
        stationMap['CP'].wipQty += cpWip > 0 ? cpWip : setsReady;
      }
      const sewingWip = (op.qtySewingIn || 0) - (op.qtySewingOut || 0);
      if (sewingWip > 0) {
        stationMap['SEWING'].count++;
        stationMap['SEWING'].wipQty += sewingWip;
      }
      const qcInspected = (op.qtyQC || 0) + (op.qcNgQty || 0);
      const qcWip = (op.qtySewingOut || 0) - qcInspected;
      if (qcWip > 0) {
        stationMap['QC'].count++;
        stationMap['QC'].wipQty += qcWip;
      }
      const packingWip = (op.qtyQC || 0) - (op.qtyPacking || 0);
      if (packingWip > 0) {
        stationMap['PACKING'].count++;
        stationMap['PACKING'].wipQty += packingWip;
      }
      const fgWip = (op.qtyPacking || 0) - (op.qtyFG || 0);
      if (fgWip > 0) {
        stationMap['FG'].count++;
        stationMap['FG'].wipQty += fgWip;
      }
    }

    // 3. Hitung input/output/ng berdasarkan rentang tanggal
    const stationStats: Record<string, { input: number; output: number; ng: number }> = {};
    stationKeys.forEach(key => { stationStats[key] = { input: 0, output: 0, ng: 0 }; });

    // Cutting Pond input dari CuttingBatch dalam rentang
    const batchesInRange = await this.prisma.cuttingBatch.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { qty: true }
    });
    stationStats['CUTTING_POND'].input = batchesInRange.reduce((sum, b) => sum + b.qty, 0);

    // Cutting Pond output & NG dari ProductionLog
    const pondLogs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.CUTTING_POND,
        createdAt: { gte: startDate, lte: endDate },
        type: { in: ['GOOD', 'NG'] }
      },
      select: { type: true, qty: true }
    });
    for (const log of pondLogs) {
      if (log.type === 'GOOD') stationStats['CUTTING_POND'].output += log.qty;
      if (log.type === 'NG') stationStats['CUTTING_POND'].ng += log.qty;
    }

    // CP input dari log TRANSFER_TO_CP
    const cpTransferLogs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.CUTTING_POND,
        type: 'TRANSFER_TO_CP',
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { qty: true }
    });
    stationStats['CP'].input = cpTransferLogs.reduce((sum, l) => sum + l.qty, 0);

    // CP output dari log SEND_TO_SEWING
    const cpSendLogs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.CP,
        type: 'SEND_TO_SEWING',
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { qty: true }
    });
    stationStats['CP'].output = cpSendLogs.reduce((sum, l) => sum + l.qty, 0);

    // CP NG dari CheckPanelInspection
    const cpNgInRange = await this.prisma.checkPanelInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { ng: true }
    });
    stationStats['CP'].ng = cpNgInRange._sum.ng || 0;

    // Sewing
    stationStats['SEWING'].input = stationStats['CP'].output;
    const sewingFinishLogs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.SEWING,
        type: 'SEWING_FINISH',
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { qty: true }
    });
    stationStats['SEWING'].output = sewingFinishLogs.reduce((sum, l) => sum + l.qty, 0);

    // QC
    stationStats['QC'].input = stationStats['SEWING'].output;
    const qcGoodInRange = await this.prisma.qcInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { good: true }
    });
    stationStats['QC'].output = qcGoodInRange._sum.good || 0;
    const qcNgInRange = await this.prisma.qcInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { ng: true }
    });
    stationStats['QC'].ng = qcNgInRange._sum.ng || 0;

    // Packing
    stationStats['PACKING'].input = stationStats['QC'].output;
    const packingOutputInRange = await this.prisma.packingSession.aggregate({
      where: { status: 'CLOSED', createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalQty: true }
    });
    stationStats['PACKING'].output = packingOutputInRange._sum.totalQty || 0;

    // FG
    stationStats['FG'].input = stationStats['PACKING'].output;
    const fgOutputInRange = await this.prisma.shipment.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalQty: true }
    });
    stationStats['FG'].output = fgOutputInRange._sum.totalQty || 0;

    // Cutting Entan
    stationStats['CUTTING_ENTAN'].input = 0;
    stationStats['CUTTING_ENTAN'].output = 0;
    stationStats['CUTTING_ENTAN'].ng = 0;

    const stationFlow = stationKeys.map(station => ({
      station,
      count: stationMap[station].count,
      wipQty: stationMap[station].wipQty,
      todayInput: stationStats[station].input,
      todayOutput: stationStats[station].output,
      qtyNg: stationStats[station].ng,
      progress: stationStats[station].input > 0 ? Math.round((stationStats[station].output / stationStats[station].input) * 100) : 0
    }));

    // 4. Hourly production (hanya untuk rentang tanggal yang dipilih)
    const hourlyRaw = await this.prisma.$queryRaw`
      SELECT EXTRACT(HOUR FROM "createdAt") as hour, SUM("totalQty") as output
      FROM "PackingSession"
      WHERE status = 'CLOSED' AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY hour
      ORDER BY hour
    `;
    const hourlyProduction = (hourlyRaw as any[]).map(row => ({
      hour: `${String(row.hour).padStart(2, '0')}:00`,
      output: Number(row.output),
      target: activeLines * 50
    }));

    // 5. Status distribution (tidak perlu filter tanggal, karena status saat ini)
    const statusCounts = await this.prisma.productionOrder.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    const statusDistribution = statusCounts.map(s => ({ status: s.status, count: s._count.status }));

    // 6. Slow moving ops (tidak perlu filter tanggal)
    const slowOps = await this.prisma.productionOrder.findMany({
      where: { status: 'WIP' },
      orderBy: { updatedAt: 'asc' },
      take: 5,
      select: { opNumber: true, currentStation: true, updatedAt: true }
    });
    const now = new Date();
    const slowMovingOps = slowOps.map(op => ({
      opNumber: op.opNumber,
      currentStation: op.currentStation || 'UNKNOWN',
      hoursInStation: Math.round((now.getTime() - op.updatedAt.getTime()) / (1000 * 60 * 60))
    }));

    // 7. Recent activities (dalam rentang tanggal)
    const recentLogs = await this.prisma.productionLog.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { op: { select: { opNumber: true } } }
    });
    const recentActivities = recentLogs.map(log => ({
      time: log.createdAt.toISOString(),
      opNumber: log.op.opNumber,
      station: log.station,
      action: log.type,
      qty: log.qty
    }));

    // 8. Line summaries (dalam rentang tanggal)
    const lines = await this.prisma.lineMaster.findMany({ select: { code: true, name: true } });
    const lineSummaries: { lineCode: string; output: number; efficiency: number; defectRate: number; target: number }[] = [];
    for (const line of lines) {
      const lineOps = await this.prisma.productionOrder.findMany({
        where: { line: { code: line.code } },
        select: { id: true }
      });
      const opIds = lineOps.map(o => o.id);
      const lineOutput = await this.prisma.packingSession.aggregate({
        where: {
          status: 'CLOSED',
          createdAt: { gte: startDate, lte: endDate },
          items: { some: { opId: { in: opIds } } }
        },
        _sum: { totalQty: true }
      });
      const output = lineOutput._sum.totalQty || 0;
      const lineTarget = 8 * 50;
      const cpInspections = await this.prisma.checkPanelInspection.findMany({
        where: { op: { line: { code: line.code } }, createdAt: { gte: startDate, lte: endDate } },
        select: { good: true, ng: true }
      });
      const qcInspections = await this.prisma.qcInspection.findMany({
        where: { op: { line: { code: line.code } }, createdAt: { gte: startDate, lte: endDate } },
        select: { good: true, ng: true }
      });
      let lineGood = 0, lineNg = 0;
      cpInspections.forEach(i => { lineGood += i.good; lineNg += i.ng; });
      qcInspections.forEach(i => { lineGood += i.good; lineNg += i.ng; });
      const lineDefect = lineGood + lineNg > 0 ? Number(((lineNg / (lineGood + lineNg)) * 100).toFixed(1)) : 0;
      lineSummaries.push({
        lineCode: line.code,
        output,
        efficiency: lineTarget > 0 ? Math.round((output / lineTarget) * 100) : 0,
        defectRate: lineDefect,
        target: lineTarget
      });
    }

    // 9. Quality trend (7 hari terakhir, dihitung dari rentang yang dipilih? lebih baik tetap 7 hari terakhir dari tanggal akhir)
    // Untuk konsistensi, kita gunakan 7 hari terakhir dari endDate (atau hari ini jika tidak ada filter)
    const endDateForTrend = endDateStr ? new Date(endDateStr) : new Date();
    const qualityTrend: { date: string; defectRate: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDateForTrend);
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      const dayGood = await this.prisma.checkPanelInspection.aggregate({
        where: { createdAt: { gte: dateStart, lt: dateEnd } },
        _sum: { good: true }
      });
      const dayNg = await this.prisma.checkPanelInspection.aggregate({
        where: { createdAt: { gte: dateStart, lt: dateEnd } },
        _sum: { ng: true }
      });
      const dayTotal = (dayGood._sum.good || 0) + (dayNg._sum.ng || 0);
      const dayDefect = dayTotal > 0 ? Number(((dayNg._sum.ng || 0) / dayTotal) * 100).toFixed(1) : '0';
      qualityTrend.push({
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
        defectRate: Number(dayDefect)
      });
    }

    return {
      kpi: {
        totalOps, todayOutput, totalWip, overallEfficiency,
        defectRate: Number(defectRate), onTimeDelivery, targetOutput, achievement
      },
      stationFlow,
      hourlyProduction,
      statusDistribution,
      slowMovingOps,
      recentActivities,
      lineSummaries,
      qualityTrend
    };
  }

  // ======================================================
  // SYNC EXTERNAL
  // ======================================================
  async syncExternalData() {
    try {
      const response = await fetch('http://202.52.15.30:998/miniapps/admin/api/cuttingreport');
      const externalData = await response.json();

      return await this.prisma.$transaction(async (tx) => {
        for (const item of externalData) {
          if (!item?.nomorOp) continue;

          const styleCode = item.nomorOp.substring(0, 4).toUpperCase();
          const qtyOp = parseInt(item.qtyOp ?? '0') || 0;
          const grandTotalCutting = parseInt(item.grandTotalCutting ?? '0') || 0;

          // ===== FIND / CREATE LINE =====
          let line = await tx.lineMaster.findUnique({
            where: { code: styleCode }
          });

          if (!line) {
            line = await tx.lineMaster.create({
              data: {
                code: styleCode,
                name: `Line ${styleCode}`,
                patternMultiplier: 4,
              }
            });
          }

          await tx.productionOrder.upsert({
            where: { opNumber: item.nomorOp },
            update: {
              itemNumberFG: item.itemNumberFinishGood,
              itemNameFG: item.itemNameFinishGood,
              qtyOp: qtyOp,
              qtyEntan: grandTotalCutting,
            },
            create: {
              opNumber: item.nomorOp,
              styleCode,
              lineId: line.id,
              itemNumberFG: item.itemNumberFinishGood,
              itemNameFG: item.itemNameFinishGood,
              qtyOp,
              qtyEntan: grandTotalCutting,
              currentStation: StationCode.CUTTING_ENTAN,
              status: ProductionStatus.WIP,
            }
          });
        }

        return {
          success: true,
          total: externalData.length
        };
      });
    } catch (error: any) {
      console.error(error);
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  // ======================================================
  // CREATE SIMULATION
  // ======================================================
  async createSimulation(dto: any) {
    let line = await this.prisma.lineMaster.findUnique({
      where: { code: dto.styleCode }
    });

    if (!line) {
      line = await this.prisma.lineMaster.create({
        data: {
          code: dto.styleCode,
          name: `Line ${dto.styleCode}`,
          patternMultiplier: 4
        }
      });
    }

    return this.prisma.productionOrder.create({
      data: {
        opNumber: dto.opNumber,
        styleCode: dto.styleCode,
        lineId: line.id,
        itemNumberFG: dto.itemNumberFG || 'N/A',
        itemNameFG: dto.itemNameFG || null,
        qtyOp: Number(dto.qtyOp),

        status: ProductionStatus.WIP,
        currentStation: StationCode.CUTTING_ENTAN,

        qtyEntan: 0,
        qtyPond: 0,
        qtyCP: 0,
        qtySewingIn: 0,
        qtySewingOut: 0,
        qtyQC: 0,
        qtyPacking: 0,
        qtyFG: 0
      }
    });
  }

  // ======================================================
  // RESET SYSTEM
  // ======================================================
  async resetSystemData() {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.productionLog.deleteMany({});

        if ('materialRequest' in tx) {
          await (tx as any).materialRequest.deleteMany({});
        }
        if ('opReplacement' in tx) {
          await (tx as any).opReplacement.deleteMany({});
        }

        await tx.fGStock.deleteMany({});
        await tx.productionOrder.deleteMany({});
      });

      return { message: 'Factory Reset Successful' };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Reset failed');
    }
  }
}