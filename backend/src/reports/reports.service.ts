import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCode } from '@prisma/client';

interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  lineCode?: string;
  station?: string;
  opId?: string;
  groupBy?: 'line' | 'station';
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ========== NEW: RUNNING OPS ==========
async getRunningOps() {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: 'WIP',
        OR: [
          { qtyEntan: { gt: 0 } },
          { qtyPond: { gt: 0 } },
          { qtyCP: { gt: 0 } },
          { qtySewingOut: { gt: 0 } } // Tambahan: Agar OP yang sedang di QC muncul di filter
        ]
      },
      select: {
        id: true,
        opNumber: true,
        styleCode: true,
        line: { select: { code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return ops;
  }

  // ========== NG CUTTING POND & CHECK PANEL GABUNGAN ==========
  async getNgCuttingPondCheckPanel(filter: ReportFilter) {
// Inisialisasi endOfDay di awal method
    const endOfDay = filter.endDate ? new Date(filter.endDate) : undefined;
    if (endOfDay) endOfDay.setHours(23, 59, 59, 999);

    // 1. NG Cutting Pond (dari ProductionLog)
    const pondWhere: any = {
      station: StationCode.CUTTING_POND,
      type: 'NG',
    };
    if (filter.startDate && endOfDay) {
      pondWhere.createdAt = { gte: filter.startDate, lte: endOfDay };
    }
    if (filter.lineCode) {
      const line = await this.prisma.lineMaster.findUnique({ where: { code: filter.lineCode } });
      if (line) {
        const ops = await this.prisma.productionOrder.findMany({
          where: { lineId: line.id },
          select: { id: true }
        });
        pondWhere.opId = { in: ops.map(o => o.id) };
      }
    }
    if (filter.opId) {
      pondWhere.opId = filter.opId;
    }
    const pondLogs = await this.prisma.productionLog.findMany({
      where: pondWhere,
      include: { op: { include: { line: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // 2. NG Check Panel (dari CheckPanelInspection)
const cpWhere: any = {};
    if (filter.startDate && endOfDay) {
      cpWhere.createdAt = { gte: filter.startDate, lte: endOfDay };
    }
    if (filter.lineCode) {
      const line = await this.prisma.lineMaster.findUnique({ where: { code: filter.lineCode } });
      if (line) {
        const ops = await this.prisma.productionOrder.findMany({
          where: { lineId: line.id },
          select: { id: true }
        });
        cpWhere.opId = { in: ops.map(o => o.id) };
      }
    }
    if (filter.opId) {
      cpWhere.opId = filter.opId;
    }
    const cpInspections = await this.prisma.checkPanelInspection.findMany({
      where: cpWhere,
      include: { op: { include: { line: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Format response untuk Cutting Pond (dengan detail per pattern)
    const pondByOp: Record<string, any> = {};
    const opIdToOpNumber = new Map<string, string>(); // MAP untuk menyimpan relasi opId -> opNumber
    pondLogs.forEach(log => {
      const opNum = log.op.opNumber;
      const opId = log.opId;
      opIdToOpNumber.set(opId, opNum); // Simpan mapping
      if (!pondByOp[opNum]) {
        pondByOp[opNum] = {
          opNumber: opNum,
          styleCode: log.op.styleCode,
          lineCode: log.op.line?.code,
          station: 'CUTTING_POND',
          totalNg: 0,
          details: [],
          patternNgDetails: []
        };
      }
      pondByOp[opNum].totalNg += log.qty;
      pondByOp[opNum].details.push({
        timestamp: log.createdAt,
        qty: log.qty,
        note: log.note || 'NG Pond'
      });
    });

    // Ambil detail NG per pattern dari PatternProgress untuk Cutting Pond
    const opIds = [...new Set(pondLogs.map(l => l.opId))];
    if (opIds.length > 0) {
      const patternProgressList = await this.prisma.patternProgress.findMany({
        where: {
          opId: { in: opIds },
          ng: { gt: 0 }
        },
        select: {
          opId: true,
          patternIndex: true,
          patternName: true,
          ng: true
        }
      });
      // Group by opId
      const patternByOp = new Map<string, any[]>();
      for (const pp of patternProgressList) {
        if (!patternByOp.has(pp.opId)) patternByOp.set(pp.opId, []);
        patternByOp.get(pp.opId)!.push({
          patternName: pp.patternName,
          patternIndex: pp.patternIndex,
          ng: pp.ng
        });
      }
      // Merge ke pondByOp menggunakan mapping opId -> opNumber
      for (const [opId, patternDetails] of patternByOp.entries()) {
        const opNumber = opIdToOpNumber.get(opId);
        if (opNumber && pondByOp[opNumber]) {
          pondByOp[opNumber].patternNgDetails = patternDetails;
        }
      }
    }

    const cpByOp: Record<string, any> = {};
    cpInspections.forEach(insp => {
      const opNum = insp.op.opNumber;
      if (!cpByOp[opNum]) {
        cpByOp[opNum] = {
          opNumber: opNum,
          styleCode: insp.op.styleCode,
          lineCode: insp.op.line?.code,
          station: 'CHECK_PANEL',
          totalNg: 0,
          patternDetails: []
        };
      }
      cpByOp[opNum].totalNg += insp.ng;

      // PARSING ROBUST UNTUK ALASAN NG (Mencegah Array terpecah jadi huruf)
      let reasons: string[] = [];
      const raw = insp.ngReasons as any;
      if (Array.isArray(raw)) {
        reasons = raw;
      } else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          reasons = Array.isArray(parsed) ? parsed : [raw];
        } catch {
          reasons = [raw];
        }
      }
      // Flatten & bersihkan string kosong
      reasons = reasons.flat().filter(r => r && String(r).trim() !== '').map(String);

      cpByOp[opNum].patternDetails.push({
        patternName: insp.patternName,
        ng: insp.ng,
        ngReasons: reasons,
        timestamp: insp.createdAt
      });
    });

    return {
      summary: {
        totalNgPond: pondLogs.reduce((s, l) => s + l.qty, 0),
        totalNgCP: cpInspections.reduce((s, i) => s + i.ng, 0),
        totalNg: pondLogs.reduce((s, l) => s + l.qty, 0) + cpInspections.reduce((s, i) => s + i.ng, 0),
        period: { start: filter.startDate, end: filter.endDate }
      },
      cuttingPond: Object.values(pondByOp),
      checkPanel: Object.values(cpByOp),
      rawPond: pondLogs,
      rawCP: cpInspections
    };
  }

  // ========== NG QUALITY CONTROL (tambah filter opId) ==========
async getNgQualityControlReport(filter: ReportFilter) {
  const where: any = {};
  
  // Perbaikan: Pastikan endDate mencakup hingga akhir hari (23:59:59)
  if (filter.startDate && filter.endDate) {
    const endOfDay = new Date(filter.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    where.createdAt = { 
      gte: filter.startDate, 
      lte: endOfDay 
    };
  }

  if (filter.opId) {
      where.opId = filter.opId;
    }
    const inspections = await this.prisma.qcInspection.findMany({
      where,
      include: { op: { include: { line: true } } },
      orderBy: { createdAt: 'desc' }
    });
    let filtered = inspections;
    if (filter.lineCode) {
      filtered = inspections.filter(i => i.op.line?.code === filter.lineCode);
    }
    const byOp = filtered.reduce((acc, insp) => {
      const opNum = insp.op.opNumber;
      if (!acc[opNum]) {
        acc[opNum] = {
          opNumber: opNum,
          styleCode: insp.op.styleCode,
          lineCode: insp.op.line?.code,
          totalGood: 0,
          totalNg: 0,
          inspections: []
        };
      }
      acc[opNum].totalGood += insp.good;
      acc[opNum].totalNg += insp.ng;

      // PARSING ROBUST UNTUK ALASAN NG QC
      let reasons: string[] = [];
      const raw = insp.ngReasons as any;
      if (Array.isArray(raw)) {
        reasons = raw;
      } else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          reasons = Array.isArray(parsed) ? parsed : [raw];
        } catch {
          reasons = [raw];
        }
      }
      reasons = reasons.flat().filter(r => r && String(r).trim() !== '').map(String);

      acc[opNum].inspections.push({
        good: insp.good,
        ng: insp.ng,
        ngReasons: reasons,
        timestamp: insp.createdAt
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
        period: { start: filter.startDate, end: filter.endDate }
      },
      byOp: Object.values(byOp),
      raw: filtered
    };
  }

  // ========== LINE CHECK TIME ==========
  async getLineCheckTime(filter: ReportFilter) {
    const stations = ['CUTTING_POND', 'CP', 'SEWING', 'QC'];
    const result: any[] = [];
    for (const station of stations) {
      if (filter.station && filter.station !== station) continue;
      // Ambil semua OP yang memiliki log di station ini
      const ops = await this.prisma.productionOrder.findMany({
        where: filter.lineCode ? { line: { code: filter.lineCode } } : {},
        select: { id: true, opNumber: true, line: { select: { code: true } } }
      });
      const opIds = ops.map(o => o.id);
      if (opIds.length === 0) continue;

      let logs: any[] = [];
      if (station === 'CUTTING_POND') {
        // Ambil log pertama dan terakhir per OP
        const firstLogs = await this.prisma.productionLog.groupBy({
          by: ['opId'],
          where: {
            opId: { in: opIds },
            station: StationCode.CUTTING_POND,
            type: { in: ['GOOD', 'NG'] }
          },
          _min: { createdAt: true },
        });
        const lastLogs = await this.prisma.productionLog.groupBy({
          by: ['opId'],
          where: {
            opId: { in: opIds },
            station: StationCode.CUTTING_POND,
            type: { in: ['GOOD', 'NG'] }
          },
          _max: { createdAt: true },
        });
        const firstMap = new Map(firstLogs.map(l => [l.opId, l._min.createdAt]));
        const lastMap = new Map(lastLogs.map(l => [l.opId, l._max.createdAt]));
        // Juga ambil total qty processed
        const qtySum = await this.prisma.productionLog.groupBy({
          by: ['opId'],
          where: {
            opId: { in: opIds },
            station: StationCode.CUTTING_POND,
            type: { in: ['GOOD', 'NG'] }
          },
          _sum: { qty: true }
        });
        const qtyMap = new Map(qtySum.map(q => [q.opId, q._sum.qty || 0]));
        for (const op of ops) {
          const first = firstMap.get(op.id);
          const last = lastMap.get(op.id);
          const totalQty = qtyMap.get(op.id) || 0;
          if (first && last && totalQty > 0) {
            const diffMs = last.getTime() - first.getTime();
            const avgSec = diffMs / 1000 / totalQty;
            result.push({
              lineCode: op.line?.code,
              opNumber: op.opNumber,
              station,
              totalProcessed: totalQty,
              firstEvent: first,
              lastEvent: last,
              totalDurationSec: diffMs / 1000,
              avgCheckTimeSec: avgSec,
              avgCheckTimeMinutes: (avgSec / 60).toFixed(2),
              avgCheckTimeHuman: `${Math.floor(avgSec / 60)}m ${Math.round(avgSec % 60)}s`
            });
          }
        }
      } else if (station === 'CP') {
        // Ambil log RECEIVED dan INSPECT
        const receivedLogs = await this.prisma.productionLog.findMany({
          where: { opId: { in: opIds }, station: StationCode.CP, type: 'RECEIVED' },
          select: { opId: true, createdAt: true }
        });
        const inspectLogs = await this.prisma.productionLog.findMany({
          where: { opId: { in: opIds }, station: StationCode.CP, type: 'INSPECT' },
          select: { opId: true, createdAt: true, qty: true }
        });
        const receivedMap = new Map(receivedLogs.map(r => [r.opId, r.createdAt]));
        const inspectGroup = new Map<string, { last: Date; totalQty: number }>();
        for (const insp of inspectLogs) {
          const existing = inspectGroup.get(insp.opId);
          if (!existing || insp.createdAt > existing.last) {
            inspectGroup.set(insp.opId, { last: insp.createdAt, totalQty: (existing?.totalQty || 0) + insp.qty });
          } else {
            existing.totalQty += insp.qty;
          }
        }
        for (const op of ops) {
          const received = receivedMap.get(op.id);
          const insp = inspectGroup.get(op.id);
          if (received && insp && insp.totalQty > 0) {
            const diffMs = insp.last.getTime() - received.getTime();
            const avgSec = diffMs / 1000 / insp.totalQty;
            result.push({
              lineCode: op.line?.code,
              opNumber: op.opNumber,
              station,
              totalProcessed: insp.totalQty,
              firstEvent: received,
              lastEvent: insp.last,
              totalDurationSec: diffMs / 1000,
              avgCheckTimeSec: avgSec,
              avgCheckTimeMinutes: (avgSec / 60).toFixed(2),
              avgCheckTimeHuman: `${Math.floor(avgSec / 60)}m ${Math.round(avgSec % 60)}s`
            });
          }
        }
      } else if (station === 'SEWING') {
        // Sewing: start dan finish
        const startLogs = await this.prisma.productionLog.findMany({
          where: { opId: { in: opIds }, station: StationCode.SEWING, type: 'SEWING_START' },
          select: { opId: true, createdAt: true }
        });
        const finishLogs = await this.prisma.productionLog.findMany({
          where: { opId: { in: opIds }, station: StationCode.SEWING, type: 'SEWING_FINISH' },
          select: { opId: true, createdAt: true, qty: true }
        });
        const startMap = new Map(startLogs.map(s => [s.opId, s.createdAt]));
        const finishGroup = new Map<string, { last: Date; totalQty: number }>();
        for (const fin of finishLogs) {
          const existing = finishGroup.get(fin.opId);
          if (!existing || fin.createdAt > existing.last) {
            finishGroup.set(fin.opId, { last: fin.createdAt, totalQty: (existing?.totalQty || 0) + fin.qty });
          } else {
            existing.totalQty += fin.qty;
          }
        }
        for (const op of ops) {
          const start = startMap.get(op.id);
          const finish = finishGroup.get(op.id);
          if (start && finish && finish.totalQty > 0) {
            const diffMs = finish.last.getTime() - start.getTime();
            const avgSec = diffMs / 1000 / finish.totalQty;
            result.push({
              lineCode: op.line?.code,
              opNumber: op.opNumber,
              station,
              totalProcessed: finish.totalQty,
              firstEvent: start,
              lastEvent: finish.last,
              totalDurationSec: diffMs / 1000,
              avgCheckTimeSec: avgSec,
              avgCheckTimeMinutes: (avgSec / 60).toFixed(2),
              avgCheckTimeHuman: `${Math.floor(avgSec / 60)}m ${Math.round(avgSec % 60)}s`
            });
          }
        }
      } else if (station === 'QC') {
        // QC: IN dan INSPECT
        const inLogs = await this.prisma.productionLog.findMany({
          where: { opId: { in: opIds }, station: StationCode.QC, type: 'IN' },
          select: { opId: true, createdAt: true }
        });
        const inspectLogs = await this.prisma.productionLog.findMany({
          where: { opId: { in: opIds }, station: StationCode.QC, type: 'INSPECT' },
          select: { opId: true, createdAt: true, qty: true }
        });
        const inMap = new Map(inLogs.map(i => [i.opId, i.createdAt]));
        const inspectGroup = new Map<string, { last: Date; totalQty: number }>();
        for (const insp of inspectLogs) {
          const existing = inspectGroup.get(insp.opId);
          if (!existing || insp.createdAt > existing.last) {
            inspectGroup.set(insp.opId, { last: insp.createdAt, totalQty: (existing?.totalQty || 0) + insp.qty });
          } else {
            existing.totalQty += insp.qty;
          }
        }
        for (const op of ops) {
          const inTime = inMap.get(op.id);
          const insp = inspectGroup.get(op.id);
          if (inTime && insp && insp.totalQty > 0) {
            const diffMs = insp.last.getTime() - inTime.getTime();
            const avgSec = diffMs / 1000 / insp.totalQty;
            result.push({
              lineCode: op.line?.code,
              opNumber: op.opNumber,
              station,
              totalProcessed: insp.totalQty,
              firstEvent: inTime,
              lastEvent: insp.last,
              totalDurationSec: diffMs / 1000,
              avgCheckTimeSec: avgSec,
              avgCheckTimeMinutes: (avgSec / 60).toFixed(2),
              avgCheckTimeHuman: `${Math.floor(avgSec / 60)}m ${Math.round(avgSec % 60)}s`
            });
          }
        }
      }
    }
    return {
      summary: {
        period: { start: filter.startDate, end: filter.endDate },
        lineCode: filter.lineCode,
        station: filter.station
      },
      data: result
    };
  }

  // ========== STATION PERFORMANCE ==========
  async getStationPerformanceReport(filter: ReportFilter) {
    const stations = filter.station ? [filter.station] : [
      'CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'
    ];
    const performance = await Promise.all(
      stations.map(async (station) => {
        const logs = await this.prisma.productionLog.findMany({
          where: {
            station: station as any,
            ...(filter.startDate && filter.endDate
              ? { createdAt: { gte: filter.startDate, lte: filter.endDate } }
              : {}),
          },
          include: { op: { select: { line: { select: { code: true } } } } }
        });
        let filteredLogs = logs;
        if (filter.lineCode) {
          filteredLogs = logs.filter(l => l.op.line?.code === filter.lineCode);
        }
        const totalQty = filteredLogs.reduce((sum, log) => sum + log.qty, 0);
        const goodQty = filteredLogs.filter(l => l.type === 'GOOD' || l.type === 'INSPECT').reduce((sum, log) => sum + log.qty, 0);
        const ngQty = filteredLogs.filter(l => l.type === 'NG').reduce((sum, log) => sum + log.qty, 0);
        const avgCycleTime = totalQty > 0 ? (filteredLogs.reduce((sum, log) => sum + (log.createdAt.getTime() - (log as any).updatedAt?.getTime() || 0), 0) / totalQty / 1000) : 0;
        return {
          station,
          totalQty,
          goodQty,
          ngQty,
          efficiency: totalQty > 0 ? ((goodQty / totalQty) * 100).toFixed(2) : '0',
          transactionCount: filteredLogs.length,
          avgCycleTimeSec: avgCycleTime.toFixed(1)
        };
      })
    );
    return {
      summary: { period: { start: filter.startDate, end: filter.endDate }, lineCode: filter.lineCode, station: filter.station },
      stations: performance
    };
  }

  // ========== LINE PERFORMANCE ==========
  async getLinePerformanceReport(filter: ReportFilter) {
    const linesWhere = filter.lineCode ? { code: filter.lineCode } : {};
    const lines = await this.prisma.lineMaster.findMany({
      where: linesWhere,
      select: { id: true, code: true, name: true }
    });
    const performance = await Promise.all(
      lines.map(async (line) => {
        const ops = await this.prisma.productionOrder.findMany({
          where: {
            lineId: line.id,
            ...(filter.startDate && filter.endDate
              ? { createdAt: { gte: filter.startDate, lte: filter.endDate } }
              : {}),
          },
          include: { patternProgress: true, checkPanelInspections: true, qcInspections: true }
        });
        const totalOps = ops.length;
        const completedOps = ops.filter(o => o.status === 'DONE').length;
        const wipOps = ops.filter(o => o.status === 'WIP').length;
        const totalGoodCP = ops.reduce((sum, op) => sum + (op.cpGoodQty || 0), 0);
        const totalNgCP = ops.reduce((sum, op) => sum + (op.cpNgQty || 0), 0);
        const totalGoodQC = ops.reduce((sum, op) => sum + (op.qtyQC || 0), 0);
        const totalNgQC = ops.reduce((sum, op) => sum + (op.qcNgQty || 0), 0);
        const totalOutput = ops.reduce((sum, op) => sum + (op.qtyPacking || 0), 0);
        return {
          lineCode: line.code,
          lineName: line.name,
          totalOps,
          completedOps,
          wipOps,
          completionRate: totalOps > 0 ? ((completedOps / totalOps) * 100).toFixed(2) : '0',
          cpGoodQty: totalGoodCP,
          cpNgQty: totalNgCP,
          cpDefectRate: totalGoodCP + totalNgCP > 0 ? ((totalNgCP / (totalGoodCP + totalNgCP)) * 100).toFixed(2) : '0',
          qcGoodQty: totalGoodQC,
          qcNgQty: totalNgQC,
          qcDefectRate: totalGoodQC + totalNgQC > 0 ? ((totalNgQC / (totalGoodQC + totalNgQC)) * 100).toFixed(2) : '0',
          totalOutput
        };
      })
    );
    return {
      summary: { period: { start: filter.startDate, end: filter.endDate }, lineCode: filter.lineCode },
      lines: performance
    };
  }

  // ========== DAILY PRODUCTION ==========
  async getDailyProductionReport(filter: ReportFilter) {
    const startDate = filter.startDate || new Date();
    const endDate = filter.endDate || new Date();
    const sessions = await this.prisma.packingSession.findMany({
      where: {
        status: 'CLOSED',
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        items: { include: { op: { select: { opNumber: true, line: { select: { code: true } } } } } }
      },
      orderBy: { createdAt: 'asc' }
    });
    if (filter.groupBy === 'line') {
      const byLine: Record<string, any> = {};
      for (const session of sessions) {
        for (const item of session.items) {
          const lineCode = item.op.line?.code || 'UNKNOWN';
          if (!byLine[lineCode]) {
            byLine[lineCode] = { lineCode, totalQty: 0, totalBoxes: 0, ops: new Set() };
          }
          byLine[lineCode].totalQty += item.qty;
          byLine[lineCode].totalBoxes += 1;
          byLine[lineCode].ops.add(item.op.opNumber);
        }
      }
      const lines = Object.values(byLine).map((l: any) => ({
        lineCode: l.lineCode,
        totalQty: l.totalQty,
        totalBoxes: l.totalBoxes,
        uniqueOps: l.ops.size
      }));
      return {
        summary: { period: { start: startDate, end: endDate }, totalQty: sessions.reduce((s, ses) => s + ses.totalQty, 0), totalBoxes: sessions.length },
        byLine: lines
      };
    } else if (filter.groupBy === 'station') {
      // Ambil data dari ProductionLog per station
      const stationGroups = await this.prisma.productionLog.groupBy({
        by: ['station'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _sum: { qty: true },
        _count: { id: true }
      });
      const stations = stationGroups.map(g => ({
        station: g.station,
        totalQty: g._sum.qty || 0,
        transactionCount: g._count.id
      }));
      return {
        summary: { period: { start: startDate, end: endDate }, totalQty: sessions.reduce((s, ses) => s + ses.totalQty, 0) },
        byStation: stations
      };
    } else {
      const byDate = sessions.reduce((acc, session) => {
        const date = new Date(session.createdAt).toLocaleDateString('id-ID');
        if (!acc[date]) {
          acc[date] = { date, totalQty: 0, totalBoxes: 0, byLine: {} as any };
        }
        acc[date].totalQty += session.totalQty;
        acc[date].totalBoxes += 1;
        for (const item of session.items) {
          const lineCode = item.op.line?.code || 'UNKNOWN';
          acc[date].byLine[lineCode] = (acc[date].byLine[lineCode] || 0) + item.qty;
        }
        return acc;
      }, {} as any);
      return {
        summary: { period: { start: startDate, end: endDate }, totalQty: sessions.reduce((s, ses) => s + ses.totalQty, 0), totalBoxes: sessions.length },
        byDate: Object.values(byDate)
      };
    }
  }

  // ========== EXISTING METHODS TETAP DIJAGA UTUH ==========
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
}