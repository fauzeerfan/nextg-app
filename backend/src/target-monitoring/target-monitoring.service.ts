import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TargetManagementService } from '../target-management/target-management.service';

@Injectable()
export class TargetMonitoringService {
  constructor(
    private prisma: PrismaService,
    private targetService: TargetManagementService,
  ) {}

  async getMonitoringData(lineCode: string, dateStr: string) {
    const date = new Date(dateStr);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Ambil target setting untuk line dan tanggal
let targetSetting = await this.targetService.findByLineAndDate(lineCode, date);
if (!targetSetting) {
  // Auto-create default target dengan index 125
  const startOfDayAuto = new Date(date);
  startOfDayAuto.setHours(0, 0, 0, 0);
  targetSetting = await this.prisma.targetSetting.create({
    data: {
      lineCode,
      indexValue: 125,
      effectiveDate: startOfDayAuto,
      note: 'Auto-created default target',
    },
  });
  console.log(`Auto-created default target for ${lineCode} on ${dateStr}`);
}
    const indexValue = targetSetting.indexValue;

    // 2. Hitung total MP yang hadir di line tersebut pada hari itu (dari ManpowerAttendance)
    const manpowerCount = await this.prisma.manpowerAttendance.count({
      where: {
        lineCode,
        tanggal: { gte: startOfDay, lt: endOfDay },
      },
    });
    const totalMP = manpowerCount;

    // 3. Target harian = index * MP
    const dailyTarget = indexValue * totalMP;

    // 4. Target per jam = dailyTarget / 8
    const hourlyTarget = dailyTarget / 8;

    // 5. Actual production per jam dari station SEWING (ProductionLog dengan type SEWING_FINISH)
    const productionLogs = await this.prisma.productionLog.findMany({
      where: {
        station: 'SEWING',
        type: 'SEWING_FINISH',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { qty: true, createdAt: true },
    });

    // Kelompokkan per jam (0-7)
    const hourlyActual: number[] = new Array(8).fill(0);
    for (const log of productionLogs) {
      const hour = new Date(log.createdAt).getHours();
      // Jam kerja dimulai jam 8? Kita asumsikan jam 8-16 (shift). Tapi bisa disesuaikan.
      // Untuk sederhana, kita gunakan jam lokal 0-23, tampilkan semua jam yang ada.
      // Tapi kita batasi jam 8-15 (8 jam). Mari kita mapping: jam 8 -> index 0, jam 9 ->1, ... jam 15 ->7.
      let idx = hour - 8;
      if (idx >= 0 && idx < 8) {
        hourlyActual[idx] += log.qty;
      } else {
        // Jam di luar shift, kita abaikan atau masukkan ke jam terakhir? Kita masukkan ke jam 7 (jam 15) jika >15.
        if (hour >= 16) hourlyActual[7] += log.qty;
        if (hour < 8) hourlyActual[0] += log.qty; // asumsikan jam sebelum 8 masuk jam pertama
      }
    }

    // 6. Hitung capaian per jam dan kumulatif
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

    // 7. Total actual hari ini
    const totalActual = hourlyActual.reduce((a, b) => a + b, 0);
    const dailyAchievement = dailyTarget > 0 ? (totalActual / dailyTarget) * 100 : 0;

    return {
      lineCode,
      date: dateStr,
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