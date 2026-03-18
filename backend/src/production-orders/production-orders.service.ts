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
    // ===== QUALITY CONTROL =====
    if (station === 'QC') {
      const ops = await this.prisma.productionOrder.findMany({
        where: {
          status: ProductionStatus.WIP,
          qtySewingOut: { gt: 0 },
        },
        include: {
          line: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      // Filter yang masih memiliki sisa inspeksi
      return ops.filter(op => op.qtySewingOut > (op.qtyQC + op.qcNgQty));
    }

    // ===== SEWING =====
    if (station === 'SEWING') {
      const ops = await this.prisma.productionOrder.findMany({
        where: {
          status: ProductionStatus.WIP,
          qtySewingIn: { gt: 0 }, // tampilkan OP yang sudah menerima set dari CP
        },
        include: {
          line: true,
          sewingStartProgress: true,
          sewingFinishProgress: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      // Filter yang masih memiliki set belum selesai (qtySewingOut < qtySewingIn)
      return ops.filter(op => (op.qtySewingOut || 0) < (op.qtySewingIn || 0));
    }

    // ===== PACKING =====
    if (station === 'PACKING') {
      const ops = await this.prisma.productionOrder.findMany({
        where: {
          status: ProductionStatus.WIP,
        },
        include: { line: true },
        orderBy: { createdAt: 'asc' },
      });
      return ops.filter(op => (op.qtyQC || 0) > (op.qtyPacking || 0));
    }

    // ===== CHECK PANEL =====
      if (station === 'CP') {
        const ops = await this.prisma.productionOrder.findMany({
          where: {
            status: ProductionStatus.WIP,
            currentStation: StationCode.CP,  // ✅ HANYA yang sudah ditransfer dari Pond
          },
          include: { 
            line: true,
            checkPanelInspections: true,  // ✅ Include inspection progress
          },
          orderBy: { createdAt: 'asc' },
        });
        return ops;
      }

    // ===== CUTTING POND =====
      if (station === 'CUTTING_POND') {
        const ops = await this.prisma.productionOrder.findMany({
          where: {
            status: ProductionStatus.WIP,
            currentStation: StationCode.CUTTING_POND,
            // ✅ Tampilkan OP yang masih proses ATAU sudah selesai tapi belum transfer
            // (readyForCP = false artinya masih proses, readyForCP = true artinya selesai tapi belum transfer)
          },
          include: {
            line: true,
            patternProgress: true,
          },
          orderBy: { createdAt: 'asc' },
        });
        
        // Format patternProgress menjadi array patterns
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

    // ===== CUTTING ENTAN =====
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

    // ===== STASIUN LAIN (FALLBACK) =====
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
// DASHBOARD COMPREHENSIVE (REAL DATA - INDUSTRY STANDARD)
// ======================================================
async getDashboardComprehensive() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // ==========================================
  // 1. KPI UTAMA
  // ==========================================
  const totalOps = await this.prisma.productionOrder.count();
  const totalWip = await this.prisma.productionOrder.count({ where: { status: 'WIP' } });

  // Output hari ini dari packing session yang ditutup
  const todayPackingSessions = await this.prisma.packingSession.aggregate({
    where: {
      status: 'CLOSED',
      createdAt: { gte: startOfDay, lt: endOfDay }
    },
    _sum: { totalQty: true }
  });
  const todayOutput = todayPackingSessions._sum.totalQty || 0;

  // Target output (asumsi 8 jam x 50 sets/jam x active lines)
  const activeLines = await this.prisma.lineMaster.count({
    where: {
      productionOrders: {
        some: { status: 'WIP' }
      }
    }
  });
  const targetOutput = activeLines * 8 * 50; // 400 sets per line per day
  const achievement = targetOutput > 0 ? Math.round((todayOutput / targetOutput) * 100) : 0;

  // Defect rate dari semua inspeksi
  const totalGoodCP = await this.prisma.checkPanelInspection.aggregate({ _sum: { good: true } });
  const totalNgCP = await this.prisma.checkPanelInspection.aggregate({ _sum: { ng: true } });
  const totalGoodQC = await this.prisma.qcInspection.aggregate({ _sum: { good: true } });
  const totalNgQC = await this.prisma.qcInspection.aggregate({ _sum: { ng: true } });
  
  const totalGood = (totalGoodCP._sum.good || 0) + (totalGoodQC._sum.good || 0);
  const totalProduced = totalGood + (totalNgCP._sum.ng || 0) + (totalNgQC._sum.ng || 0);
  const defectRate = totalProduced > 0 ? Number(((totalProduced - totalGood) / totalProduced) * 100).toFixed(1) : 0;

  // Efisiensi (Output Actual / Target)
  const overallEfficiency = achievement;
  const onTimeDelivery = 95; // Default

  // ==========================================
  // 2. STATION FLOW (WIP per Station)
  // ==========================================
  const stationWipRaw = await this.prisma.productionOrder.groupBy({
    by: ['currentStation'],
    where: { status: 'WIP' },
    _count: { id: true },
    _sum: { qtyPond: true }
  });

  const stationFlow = stationWipRaw.map(s => ({
    station: s.currentStation || 'UNKNOWN',
    count: s._count.id,
    wipQty: s._sum.qtyPond || 0,
    progress: 0 // Will be calculated based on station order
  }));

  // ==========================================
  // 3. PRODUKSI PER JAM
  // ==========================================
  const hourlyRaw = await this.prisma.$queryRaw`
    SELECT EXTRACT(HOUR FROM "createdAt") as hour, SUM("totalQty") as output
    FROM "PackingSession"
    WHERE status = 'CLOSED' AND "createdAt" >= ${startOfDay} AND "createdAt" < ${endOfDay}
    GROUP BY hour
    ORDER BY hour
  `;
  const hourlyProduction = (hourlyRaw as any[]).map(row => ({
    hour: `${String(row.hour).padStart(2, '0')}:00`,
    output: Number(row.output),
    target: activeLines * 50 // Target per jam
  }));

  // ==========================================
  // 4. DISTRIBUSI STATUS OP
  // ==========================================
  const statusCounts = await this.prisma.productionOrder.groupBy({
    by: ['status'],
    _count: { status: true }
  });
  const statusDistribution = statusCounts.map(s => ({
    status: s.status,
    count: s._count.status
  }));

  // ==========================================
  // 5. SLOW MOVING OPS (>24 jam di station yang sama)
  // ==========================================
  const slowOps = await this.prisma.productionOrder.findMany({
    where: { status: 'WIP' },
    orderBy: { updatedAt: 'asc' },
    take: 5,
    select: { opNumber: true, currentStation: true, updatedAt: true }
  });
  const slowMovingOps = slowOps.map(op => ({
    opNumber: op.opNumber,
    currentStation: op.currentStation || 'UNKNOWN',
    hoursInStation: Math.round((now.getTime() - op.updatedAt.getTime()) / (1000 * 60 * 60))
  }));

  // ==========================================
  // 6. AKTIVITAS TERBARU
  // ==========================================
  const recentLogs = await this.prisma.productionLog.findMany({
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

  // ==========================================
  // 7. RINGKASAN PER LINE
  // ==========================================
  const lines = await this.prisma.lineMaster.findMany({
    select: { code: true, name: true }
  });
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
        createdAt: { gte: startOfDay, lt: endOfDay },
        items: { some: { opId: { in: opIds } } }
      },
      _sum: { totalQty: true }
    });
    const output = lineOutput._sum.totalQty || 0;
    const lineTarget = 8 * 50; // 400 per day per line

    const cpInspections = await this.prisma.checkPanelInspection.findMany({
      where: { op: { line: { code: line.code } } },
      select: { good: true, ng: true }
    });
    const qcInspections = await this.prisma.qcInspection.findMany({
      where: { op: { line: { code: line.code } } },
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

  // ==========================================
  // 8. QUALITY TREND (7 hari terakhir)
  // ==========================================
  const qualityTrend: { date: string; defectRate: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
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

  // ==========================================
  // RETURN
  // ==========================================
  return {
    kpi: {
      totalOps,
      todayOutput,
      totalWip,
      overallEfficiency,
      defectRate: Number(defectRate),
      onTimeDelivery,
      targetOutput,
      achievement
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