import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlannedOrderDto } from './dto/create-planned-order.dto';
import { UpdatePlannedOrderDto } from './dto/update-planned-order.dto';
import { CapacityQueryDto } from './dto/capacity-query.dto';

// ========== EXPORTED INTERFACES ==========
export interface GanttItem {
  id: string;
  name: string;
  type: 'existing' | 'planned';
  lineCode: string | null;
  startDate: string;
  endDate: string;
  progress: number;
}

export interface DailyPlanActual {
  date: string;
  planned: number;
  actual: number;
}

@Injectable()
export class ProductionPlanningService {
  constructor(private prisma: PrismaService) {}

  // ========== Planned Order CRUD ==========
  async createPlannedOrder(dto: CreatePlannedOrderDto) {
    return this.prisma.plannedOrder.create({
      data: {
        itemNumberFG: dto.itemNumberFG,
        styleCode: dto.styleCode,
        quantity: dto.quantity,
        dueDate: new Date(dto.dueDate),
        priority: dto.priority ?? 2,
        assignedLineCode: dto.assignedLineCode,
        note: dto.note,
        status: 'DRAFT',
      },
    });
  }

  async getAllPlannedOrders() {
    return this.prisma.plannedOrder.findMany({
      orderBy: { dueDate: 'asc' },
    });
  }

  async getPlannedOrderById(id: string) {
    const order = await this.prisma.plannedOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Planned order not found');
    return order;
  }

  async updatePlannedOrder(id: string, dto: UpdatePlannedOrderDto) {
    const existing = await this.getPlannedOrderById(id);
    return this.prisma.plannedOrder.update({
      where: { id },
      data: {
        itemNumberFG: dto.itemNumberFG ?? existing.itemNumberFG,
        styleCode: dto.styleCode ?? existing.styleCode,
        quantity: dto.quantity ?? existing.quantity,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
        priority: dto.priority ?? existing.priority,
        assignedLineCode: dto.assignedLineCode ?? existing.assignedLineCode,
        note: dto.note ?? existing.note,
      },
    });
  }

  async deletePlannedOrder(id: string) {
    await this.getPlannedOrderById(id);
    return this.prisma.plannedOrder.delete({ where: { id } });
  }

  async exportPlannedOrdersToCsv(): Promise<string> {
    const orders = await this.getAllPlannedOrders();
    const header = 'Item FG,Style Code,Quantity,Due Date,Priority,Assigned Line,Status,Note\n';
    const rows = orders.map(o =>
      `${o.itemNumberFG},${o.styleCode || ''},${o.quantity},${o.dueDate.toISOString().split('T')[0]},${o.priority},${o.assignedLineCode || ''},${o.status},${o.note || ''}`
    ).join('\n');
    return header + rows;
  }

  // ========== Helper: Kapasitas per hari ==========
  private async getCapacityPerDay(lineCode: string, station: string, date: Date): Promise<number> {
    const targetSetting = await this.prisma.targetSetting.findFirst({
      where: { lineCode, station, effectiveDate: { lte: date }, isActive: true },
      orderBy: { effectiveDate: 'desc' },
    });
    if (!targetSetting) return 100; // fallback default

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const manpowerCount = await this.prisma.manpowerAttendance.count({
      where: {
        lineCode,
        station,
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
    });
    return targetSetting.indexValue * manpowerCount;
  }

  // ========== Capacity & Load Analysis ==========
  async getCapacityLoad(query: CapacityQueryDto) {
    const { lineCode, station, startDate, endDate } = query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let capacityPerDay = 0;
    if (lineCode && station) {
      const targetSetting = await this.prisma.targetSetting.findFirst({
        where: { lineCode, station, effectiveDate: { lte: end }, isActive: true },
        orderBy: { effectiveDate: 'desc' },
      });
      if (targetSetting) {
        // Hitung total MP attendance dalam rentang tanggal, lalu rata-ratakan per hari
        const attendances = await this.prisma.manpowerAttendance.groupBy({
          by: ['tanggal'],
          where: {
            lineCode,
            station,
            tanggal: { gte: start, lte: end },
          },
          _count: { id: true },
        });
        const totalMP = attendances.reduce((sum, day) => sum + day._count.id, 0);
        const daysWithData = attendances.length;
        const avgMP = daysWithData > 0 ? totalMP / daysWithData : 0;
        capacityPerDay = targetSetting.indexValue * avgMP;
      }
    }

    const existingOps = await this.prisma.productionOrder.findMany({
      where: {
        status: 'WIP',
        ...(lineCode ? { line: { code: lineCode } } : {}),
      },
      select: {
        id: true,
        opNumber: true,
        qtyOp: true,
      },
    });

    let totalLoadDays = 0;
    for (const op of existingOps) {
      if (capacityPerDay > 0) {
        totalLoadDays += Math.ceil(op.qtyOp / capacityPerDay);
      } else {
        totalLoadDays += 1;
      }
    }

    const plannedOrders = await this.prisma.plannedOrder.findMany({
      where: {
        status: { in: ['DRAFT', 'SIMULATED'] },
        dueDate: { gte: start, lte: end },
        ...(lineCode ? { assignedLineCode: lineCode } : {}),
      },
    });
    let plannedLoadDays = 0;
    for (const po of plannedOrders) {
      if (capacityPerDay > 0) {
        plannedLoadDays += Math.ceil(po.quantity / capacityPerDay);
      } else {
        plannedLoadDays += 1;
      }
    }

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const availableCapacityDays = totalDays * (capacityPerDay > 0 ? 1 : 0);
    const isOverload = (totalLoadDays + plannedLoadDays) > availableCapacityDays;

    if (isOverload) {
      await this.prisma.planningRecommendationLog.create({
        data: {
          message: `Overload detected for line ${lineCode || 'ALL'} station ${station || 'ALL'} between ${startDate} and ${endDate}. Existing load: ${totalLoadDays} days, planned load: ${plannedLoadDays} days, capacity: ${availableCapacityDays} days.`,
          recommendationType: 'OVERLOAD',
          relatedEntityId: null,
        },
      });
    }

    return {
      period: { start: startDate, end: endDate },
      lineCode: lineCode || 'ALL',
      station: station || 'ALL',
      capacityPerDay: Math.round(capacityPerDay),
      availableCapacityDays,
      existingLoadDays: totalLoadDays,
      plannedLoadDays,
      totalLoadDays: totalLoadDays + plannedLoadDays,
      isOverload,
      recommendation: isOverload ? 'Consider redistributing load to other lines or extending due dates.' : null,
    };
  }

  // ========== Gantt Data ==========
  async getGanttData(lineCode?: string, startDate?: string, endDate?: string): Promise<{ lines: any[]; items: GanttItem[] }> {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const lines = await this.prisma.lineMaster.findMany({
      where: lineCode ? { code: lineCode } : {},
      select: { id: true, code: true, name: true },
    });

    const existingOps = await this.prisma.productionOrder.findMany({
      where: {
        status: 'WIP',
        createdAt: { lte: end },
        ...(lineCode ? { line: { code: lineCode } } : {}),
      },
      select: {
        id: true,
        opNumber: true,
        qtyOp: true,
        createdAt: true,
        line: { select: { code: true } },
      },
    });

    const items: GanttItem[] = [];
    for (const op of existingOps) {
      const line = op.line?.code;
      if (!line) continue;
      const capacity = await this.getCapacityPerDay(line, 'SEWING', new Date()); // asumsi station SEWING, bisa disesuaikan
      const estimatedDays = Math.max(1, Math.ceil(op.qtyOp / (capacity || 100)));
      const startDateOp = op.createdAt;
      const endDateOp = new Date(startDateOp);
      endDateOp.setDate(endDateOp.getDate() + estimatedDays);
      items.push({
        id: op.id,
        name: op.opNumber,
        type: 'existing',
        lineCode: op.line?.code ?? null,
        startDate: startDateOp.toISOString(),
        endDate: endDateOp.toISOString(),
        progress: 0,
      });
    }

    const plannedOrders = await this.prisma.plannedOrder.findMany({
      where: {
        dueDate: { gte: start, lte: end },
        status: { in: ['DRAFT', 'SIMULATED'] },
      },
    });
    for (const po of plannedOrders) {
      const line = po.assignedLineCode;
      const capacity = line ? await this.getCapacityPerDay(line, 'SEWING', new Date()) : 100;
      const estimatedDays = Math.max(1, Math.ceil(po.quantity / (capacity || 100)));
      const startDatePo = new Date();
      const endDatePo = new Date(startDatePo);
      endDatePo.setDate(endDatePo.getDate() + estimatedDays);
      items.push({
        id: po.id,
        name: `PLAN: ${po.itemNumberFG}`,
        type: 'planned',
        lineCode: po.assignedLineCode ?? null,
        startDate: startDatePo.toISOString(),
        endDate: endDatePo.toISOString(),
        progress: 0,
      });
    }

    return { lines, items };
  }

  // ========== Plan vs Actual Monitor ==========
  async getPlanVsActual(startDate?: string, endDate?: string): Promise<{
    period: { start: string; end: string };
    otdRate: number;
    totalPlannedQty: number;
    totalActualQty: number;
    dailyData: DailyPlanActual[];
  }> {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const actualOutputRaw = await this.prisma.packingSession.groupBy({
      by: ['updatedAt'], // gunakan updatedAt sebagai tanggal closing
      where: {
        status: 'CLOSED',
        updatedAt: { gte: start, lte: end },
      },
      _sum: { totalQty: true },
    });
    const actualMap = new Map<string, number>();
    for (const row of actualOutputRaw) {
      const dateKey = row.updatedAt.toISOString().split('T')[0];
      actualMap.set(dateKey, (actualMap.get(dateKey) || 0) + (row._sum.totalQty || 0));
    }

    const plannedOrders = await this.prisma.plannedOrder.findMany({
      where: {
        dueDate: { gte: start, lte: end },
        status: { in: ['DRAFT', 'SIMULATED', 'EXPORTED'] },
      },
    });
    const totalPlannedQty = plannedOrders.reduce((sum, p) => sum + p.quantity, 0);

    // Buat map planned quantity per due date
    const plannedMap = new Map<string, number>();
    for (const po of plannedOrders) {
      const dueKey = po.dueDate.toISOString().split('T')[0];
      plannedMap.set(dueKey, (plannedMap.get(dueKey) || 0) + po.quantity);
    }

    const doneOps = await this.prisma.productionOrder.findMany({
      where: {
        status: 'DONE',
        updatedAt: { lte: end },
      },
      select: { updatedAt: true, createdAt: true },
    });
    let onTimeCount = 0;
    for (const op of doneOps) {
      const plannedDue = new Date(op.createdAt);
      plannedDue.setDate(plannedDue.getDate() + 7);
      if (op.updatedAt <= plannedDue) onTimeCount++;
    }
    const otdRate = doneOps.length > 0 ? (onTimeCount / doneOps.length) * 100 : 0;

    const dailyData: DailyPlanActual[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dailyData.push({
        date: dateKey,
        planned: plannedMap.get(dateKey) || 0,
        actual: actualMap.get(dateKey) || 0,
      });
    }

    return {
      period: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
      otdRate: Math.round(otdRate),
      totalPlannedQty,
      totalActualQty: Array.from(actualMap.values()).reduce((a, b) => a + b, 0),
      dailyData,
    };
  }
}