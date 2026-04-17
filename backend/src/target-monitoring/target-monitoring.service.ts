import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TargetManagementService } from '../target-management/target-management.service';
import { StationCode } from '@prisma/client';

@Injectable()
export class TargetMonitoringService {
  constructor(
    private prisma: PrismaService,
    private targetService: TargetManagementService,
  ) {}

  async getMonitoringData(lineCode: string, station: string, dateStr: string) {
    const date = new Date(dateStr);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Ambil target setting
    let targetSetting = await this.targetService.findByLineStationAndDate(lineCode, station, date);
    if (!targetSetting) {
      return {
        lineCode,
        station,
        date: dateStr,
        isActive: false,
        message: 'No target setting found',
        manpower: 0,
        dailyTarget: 0,
        dailyActual: 0,
        dailyAchievement: 0,
        hourlyTarget: 0,
        hourlyData: [],
      };
    }

    // Jika target tidak aktif, langsung return tanpa hitung apapun
    if (!targetSetting.isActive) {
      return {
        lineCode,
        station,
        date: dateStr,
        isActive: false,
        message: 'Target is disabled',
        manpower: 0,
        dailyTarget: 0,
        dailyActual: 0,
        dailyAchievement: 0,
        hourlyTarget: 0,
        hourlyData: [],
      };
    }

    const indexValue = targetSetting.indexValue;

    // 2. Hitung total MP (sama seperti sebelumnya)
    const manpowerCount = await this.prisma.manpowerAttendance.count({
      where: {
        lineCode,
        station,
        tanggal: { gte: startOfDay, lt: endOfDay },
      },
    });
    const totalMP = manpowerCount;

    const dailyTarget = indexValue * totalMP;
    const hourlyTarget = dailyTarget / 8;

    // 3. Actual production per station (sama seperti sebelumnya, tidak berubah)
    let productionLogs: any[] = [];
    let totalActual = 0;

    switch (station) {
      case 'CUTTING_ENTAN':
        // Output = total qtyEntan yang diproses (dari productionLog type QR_GENERATED)
        productionLogs = await this.prisma.productionLog.findMany({
          where: {
            station: StationCode.CUTTING_ENTAN,
            type: 'QR_GENERATED',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
          select: { qty: true, createdAt: true },
        });
        break;
      case 'CUTTING_POND':
        // Output = total GOOD pattern dari productionLog
        productionLogs = await this.prisma.productionLog.findMany({
          where: {
            station: StationCode.CUTTING_POND,
            type: 'GOOD',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
          select: { qty: true, createdAt: true },
        });
        break;
      case 'CP':
        // Output = total good dari checkPanelInspection
        const cpInspections = await this.prisma.checkPanelInspection.findMany({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            op: {
              line: {
                code: lineCode
              }
            }
          },
          select: { good: true, createdAt: true },
        });
        productionLogs = cpInspections.map(i => ({ qty: i.good, createdAt: i.createdAt }));
        break;
      case 'SEWING':
        productionLogs = await this.prisma.productionLog.findMany({
          where: {
            station: StationCode.SEWING,
            type: 'SEWING_FINISH',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
          select: { qty: true, createdAt: true },
        });
        break;
      case 'QC':
        const qcInspections = await this.prisma.qcInspection.findMany({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            op: {
              line: {
                code: lineCode
              }
            }
          },
          select: { good: true, createdAt: true },
        });
        productionLogs = qcInspections.map(i => ({ qty: i.good, createdAt: i.createdAt }));
        break;
      case 'PACKING':
        const packingSessions = await this.prisma.packingSession.findMany({
          where: {
            status: 'CLOSED',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
          select: { totalQty: true, createdAt: true },
        });
        productionLogs = packingSessions.map(s => ({ qty: s.totalQty, createdAt: s.createdAt }));
        break;
      default:
        productionLogs = [];
    }

    // Kelompokkan per jam (0-7) jam kerja 8-16
    const hourlyActual: number[] = new Array(8).fill(0);
    for (const log of productionLogs) {
      const hour = new Date(log.createdAt).getHours();
      let idx = hour - 8;
      if (idx >= 0 && idx < 8) {
        hourlyActual[idx] += log.qty;
      } else {
        if (hour >= 16) hourlyActual[7] += log.qty;
        if (hour < 8) hourlyActual[0] += log.qty;
      }
    }

    totalActual = hourlyActual.reduce((a, b) => a + b, 0);

    // Hitung capaian per jam dan kumulatif
    const hourlyData: Array<{
      hour: number;
      target: number;
      actual: number;
      achievement: number;
      cumulativeTarget: number;
      cumulativeActual: number;
      cumulativeAchievement: number;
    }> = [];
    let cumulativeTarget = 0;
    let cumulativeActual = 0;
    for (let i = 0; i < 8; i++) {
      cumulativeTarget += hourlyTarget;
      cumulativeActual += hourlyActual[i];
      const achievement = hourlyTarget > 0 ? (hourlyActual[i] / hourlyTarget) * 100 : 0;
      const cumulativeAchievement = cumulativeTarget > 0 ? (cumulativeActual / cumulativeTarget) * 100 : 0;
      hourlyData.push({
        hour: i + 1,
        target: Math.round(hourlyTarget),
        actual: hourlyActual[i],
        achievement: Math.round(achievement),
        cumulativeTarget: Math.round(cumulativeTarget),
        cumulativeActual: cumulativeActual,
        cumulativeAchievement: Math.round(cumulativeAchievement),
      });
    }

    const dailyAchievement = dailyTarget > 0 ? (totalActual / dailyTarget) * 100 : 0;

    return {
      lineCode,
      station,
      date: dateStr,
      isActive: true,
      targetSetting: {
        indexValue,
        effectiveDate: targetSetting.effectiveDate,
        note: targetSetting.note,
      },
      manpower: totalMP,
      dailyTarget: Math.round(dailyTarget),
      dailyActual: totalActual,
      dailyAchievement: Math.round(dailyAchievement),
      hourlyTarget: Math.round(hourlyTarget),
      hourlyData,
    };
  }
}