import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCode } from '@prisma/client';

interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  lineCode?: string;
  station?: string;
  opNumber?: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // NG CUTTING POND REPORT
  // ==========================================
  async getNgCuttingPondReport(filter: ReportFilter) {
    const where: any = {
      station: StationCode.CUTTING_POND,
      type: 'NG',
    };

    if (filter.startDate && filter.endDate) {
      where.createdAt = {
        gte: filter.startDate,
        lte: filter.endDate,
      };
    }

    if (filter.lineCode) {
      const line = await this.prisma.lineMaster.findUnique({
        where: { code: filter.lineCode },
      });
      if (line) {
        const ops = await this.prisma.productionOrder.findMany({
          where: { lineId: line.id },
          select: { id: true },
        });
        where.opId = { in: ops.map((o) => o.id) };
      }
    }

    const logs = await this.prisma.productionLog.findMany({
      where,
      include: {
        op: {
          select: {
            opNumber: true,
            styleCode: true,
            itemNumberFG: true,
            line: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by OP
    const byOp = logs.reduce((acc, log) => {
      const opNum = log.op.opNumber;
      if (!acc[opNum]) {
        acc[opNum] = {
          opNumber: opNum,
          styleCode: log.op.styleCode,
          itemNumberFG: log.op.itemNumberFG,
          lineCode: log.op.line?.code,
          lineName: log.op.line?.name,
          ngQty: 0,
          details: [],
        };
      }
      acc[opNum].ngQty += log.qty;
      acc[opNum].details.push({
        timestamp: log.createdAt,
        qty: log.qty,
        note: log.note,
      });
      return acc;
    }, {} as any);

    return {
      summary: {
        totalNgQty: logs.reduce((sum, log) => sum + log.qty, 0),
        totalOps: Object.keys(byOp).length,
        period: {
          start: filter.startDate,
          end: filter.endDate,
        },
      },
      byOp: Object.values(byOp),
      raw: logs,
    };
  }

  // ==========================================
  // NG CHECK PANEL REPORT
  // ==========================================
  async getNgCheckPanelReport(filter: ReportFilter) {
    const where: any = {};

    if (filter.startDate && filter.endDate) {
      where.createdAt = {
        gte: filter.startDate,
        lte: filter.endDate,
      };
    }

    const inspections = await this.prisma.checkPanelInspection.findMany({
      where,
      include: {
        op: {
          select: {
            opNumber: true,
            styleCode: true,
            itemNumberFG: true,
            line: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by line if specified
    let filtered = inspections;
    if (filter.lineCode) {
      filtered = inspections.filter((i) => i.op.line?.code === filter.lineCode);
    }

    // Aggregate by OP and Pattern
    const byOp = filtered.reduce((acc, insp) => {
      const opNum = insp.op.opNumber;
      if (!acc[opNum]) {
        acc[opNum] = {
          opNumber: opNum,
          styleCode: insp.op.styleCode,
          itemNumberFG: insp.op.itemNumberFG,
          lineCode: insp.op.line?.code,
          lineName: insp.op.line?.name,
          totalGood: 0,
          totalNg: 0,
          patterns: [],
        };
      }
      acc[opNum].totalGood += insp.good;
      acc[opNum].totalNg += insp.ng;
      acc[opNum].patterns.push({
        patternIndex: insp.patternIndex,
        patternName: insp.patternName,
        good: insp.good,
        ng: insp.ng,
        ngReasons: insp.ngReasons || [],
        timestamp: insp.createdAt,
      });
      return acc;
    }, {} as any);

    const totalNg = filtered.reduce((sum, i) => sum + i.ng, 0);
    const totalGood = filtered.reduce((sum, i) => sum + i.good, 0);

    return {
      summary: {
        totalGood,
        totalNg,
        defectRate: totalGood + totalNg > 0 ? ((totalNg / (totalGood + totalNg)) * 100).toFixed(2) : '0',
        totalOps: Object.keys(byOp).length,
        period: {
          start: filter.startDate,
          end: filter.endDate,
        },
      },
      byOp: Object.values(byOp),
      raw: filtered,
    };
  }

  // ==========================================
  // NG QUALITY CONTROL REPORT
  // ==========================================
  async getNgQualityControlReport(filter: ReportFilter) {
    const where: any = {};

    if (filter.startDate && filter.endDate) {
      where.createdAt = {
        gte: filter.startDate,
        lte: filter.endDate,
      };
    }

    const inspections = await this.prisma.qcInspection.findMany({
      where,
      include: {
        op: {
          select: {
            opNumber: true,
            styleCode: true,
            itemNumberFG: true,
            line: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by line if specified
    let filtered = inspections;
    if (filter.lineCode) {
      filtered = inspections.filter((i) => i.op.line?.code === filter.lineCode);
    }

    // Aggregate by OP
    const byOp = filtered.reduce((acc, insp) => {
      const opNum = insp.op.opNumber;
      if (!acc[opNum]) {
        acc[opNum] = {
          opNumber: opNum,
          styleCode: insp.op.styleCode,
          itemNumberFG: insp.op.itemNumberFG,
          lineCode: insp.op.line?.code,
          lineName: insp.op.line?.name,
          totalGood: 0,
          totalNg: 0,
          inspections: [],
        };
      }
      acc[opNum].totalGood += insp.good;
      acc[opNum].totalNg += insp.ng;
      acc[opNum].inspections.push({
        good: insp.good,
        ng: insp.ng,
        ngReasons: insp.ngReasons || [],
        timestamp: insp.createdAt,
      });
      return acc;
    }, {} as any);

    const totalNg = filtered.reduce((sum, i) => sum + i.ng, 0);
    const totalGood = filtered.reduce((sum, i) => sum + i.good, 0);

    return {
      summary: {
        totalGood,
        totalNg,
        defectRate: totalGood + totalNg > 0 ? ((totalNg / (totalGood + totalNg)) * 100).toFixed(2) : '0',
        totalOps: Object.keys(byOp).length,
        period: {
          start: filter.startDate,
          end: filter.endDate,
        },
      },
      byOp: Object.values(byOp),
      raw: filtered,
    };
  }

  // ==========================================
  // STATION PERFORMANCE REPORT
  // ==========================================
  async getStationPerformanceReport(filter: ReportFilter) {
    const stations = [
      'CUTTING_ENTAN',
      'CUTTING_POND',
      'CP',
      'SEWING',
      'QC',
      'PACKING',
      'FG',
    ];

    const performance = await Promise.all(
      stations.map(async (station) => {
        const logs = await this.prisma.productionLog.findMany({
          where: {
            station: station as any,
            ...(filter.startDate && filter.endDate
              ? {
                  createdAt: {
                    gte: filter.startDate,
                    lte: filter.endDate,
                  },
                }
              : {}),
          },
          include: {
            op: {
              select: {
                line: { select: { code: true } },
              },
            },
          },
        });

        // Filter by line if specified
        let filteredLogs = logs;
        if (filter.lineCode) {
          filteredLogs = logs.filter((l) => l.op.line?.code === filter.lineCode);
        }

        const totalQty = filteredLogs.reduce((sum, log) => sum + log.qty, 0);
        const goodQty = filteredLogs
          .filter((l) => l.type === 'GOOD' || l.type === 'INSPECT')
          .reduce((sum, log) => sum + log.qty, 0);
        const ngQty = filteredLogs
          .filter((l) => l.type === 'NG')
          .reduce((sum, log) => sum + log.qty, 0);

        return {
          station,
          totalQty,
          goodQty,
          ngQty,
          efficiency: totalQty > 0 ? ((goodQty / totalQty) * 100).toFixed(2) : '0',
          transactionCount: filteredLogs.length,
        };
      })
    );

    return {
      summary: {
        period: {
          start: filter.startDate,
          end: filter.endDate,
        },
        lineCode: filter.lineCode,
      },
      stations: performance,
    };
  }

  // ==========================================
  // LINE PERFORMANCE REPORT
  // ==========================================
  async getLinePerformanceReport(filter: ReportFilter) {
    const lines = await this.prisma.lineMaster.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    const performance = await Promise.all(
      lines.map(async (line) => {
        const ops = await this.prisma.productionOrder.findMany({
          where: {
            lineId: line.id,
            ...(filter.startDate && filter.endDate
              ? {
                  createdAt: {
                    gte: filter.startDate,
                    lte: filter.endDate,
                  },
                }
              : {}),
          },
          include: {
            patternProgress: true,
            checkPanelInspections: true,
            qcInspections: true,
          },
        });

        const totalOps = ops.length;
        const completedOps = ops.filter((o) => o.status === 'DONE').length;
        const wipOps = ops.filter((o) => o.status === 'WIP').length;

        const totalGoodCP = ops.reduce(
          (sum, op) => sum + (op.cpGoodQty || 0),
          0
        );
        const totalNgCP = ops.reduce(
          (sum, op) => sum + (op.cpNgQty || 0),
          0
        );
        const totalGoodQC = ops.reduce(
          (sum, op) => sum + (op.qtyQC || 0),
          0
        );
        const totalNgQC = ops.reduce(
          (sum, op) => sum + (op.qcNgQty || 0),
          0
        );

        const totalOutput = ops.reduce(
          (sum, op) => sum + (op.qtyPacking || 0),
          0
        );

        return {
          lineCode: line.code,
          lineName: line.name,
          totalOps,
          completedOps,
          wipOps,
          completionRate:
            totalOps > 0 ? ((completedOps / totalOps) * 100).toFixed(2) : '0',
          cpGoodQty: totalGoodCP,
          cpNgQty: totalNgCP,
          cpDefectRate:
            totalGoodCP + totalNgCP > 0
              ? ((totalNgCP / (totalGoodCP + totalNgCP)) * 100).toFixed(2)
              : '0',
          qcGoodQty: totalGoodQC,
          qcNgQty: totalNgQC,
          qcDefectRate:
            totalGoodQC + totalNgQC > 0
              ? ((totalNgQC / (totalGoodQC + totalNgQC)) * 100).toFixed(2)
              : '0',
          totalOutput,
        };
      })
    );

    return {
      summary: {
        period: {
          start: filter.startDate,
          end: filter.endDate,
        },
        totalLines: lines.length,
      },
      lines: performance,
    };
  }

  // ==========================================
  // DAILY PRODUCTION REPORT
  // ==========================================
  async getDailyProductionReport(filter: ReportFilter) {
    const startDate = filter.startDate || new Date();
    const endDate = filter.endDate || new Date();

    // Get packing sessions per day
    const sessions = await this.prisma.packingSession.findMany({
      where: {
        status: 'CLOSED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            op: {
              select: {
                opNumber: true,
                line: { select: { code: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const byDate = sessions.reduce((acc, session) => {
      const date = new Date(session.createdAt).toLocaleDateString('id-ID');
      if (!acc[date]) {
        acc[date] = {
          date,
          totalQty: 0,
          totalBoxes: 0,
          byLine: {} as any,
        };
      }
      acc[date].totalQty += session.totalQty;
      acc[date].totalBoxes += 1;

      session.items.forEach((item) => {
        const lineCode = item.op.line?.code || 'UNKNOWN';
        if (!acc[date].byLine[lineCode]) {
          acc[date].byLine[lineCode] = 0;
        }
        acc[date].byLine[lineCode] += item.qty;
      });

      return acc;
    }, {} as any);

    return {
      summary: {
        period: {
          start: startDate,
          end: endDate,
        },
        totalQty: sessions.reduce((sum, s) => sum + s.totalQty, 0),
        totalBoxes: sessions.length,
      },
      byDate: Object.values(byDate),
    };
  }
}