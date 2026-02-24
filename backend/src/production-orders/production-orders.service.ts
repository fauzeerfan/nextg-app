import { Injectable, InternalServerErrorException } from '@nestjs/common';
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

  async findActiveForStation(station: string, includeProgress = false) {
    const where: any = {
      currentStation: station as StationCode,
      status: ProductionStatus.WIP,
    };

    const includeOptions: any = {
      line: true,
    };
    if (station === 'CUTTING_POND') {
      includeOptions.patternProgress = true;
    }
    // Jika station SEWING dan includeProgress true, sertakan progress
    if (station === 'SEWING' && includeProgress) {
      includeOptions.sewingStartProgress = true;
      includeOptions.sewingFinishProgress = true;
    }

    const ops = await this.prisma.productionOrder.findMany({
      where,
      include: includeOptions,
      orderBy: { createdAt: 'asc' },
    });

    // Jika station CUTTING_POND, kita format ulang patternProgress menjadi array patterns
    if (station === 'CUTTING_POND') {
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
        patternProgress: undefined, // hapus data mentah
      }));
    }

    return ops;
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
  // PATTERN PROGRESS (NEW)
  // ======================================================
  async getPatternProgress(opId: string) {
    const progress = await this.prisma.patternProgress.findMany({
      where: { opId },
      orderBy: { patternIndex: 'asc' },
    });
    return progress;
  }

  // ======================================================
  // CHECK PANEL INSPECTIONS (ADDED)
  // ======================================================
  async getCheckPanelInspections(opId: string) {
    return this.prisma.checkPanelInspection.findMany({
      where: { opId },
      orderBy: { patternIndex: 'asc' },
    });
  }

  // ======================================================
  // SEWING PROGRESS (ADDED)
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