import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginStatus } from '@prisma/client';

@Injectable()
export class LoginLogService {
  constructor(private prisma: PrismaService) {}

  async getLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    username?: string;
    role?: string;
    status?: LoginStatus;
    station?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    // Helper function to set endDate to end of day
    const normalizeEndDate = (date?: Date): Date | undefined => {
      if (!date) return undefined;
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return end;
    };

    const start = filters.startDate;
    const end = normalizeEndDate(filters.endDate);

    if (start && end) {
      where.timestamp = {
        gte: start,
        lte: end,
      };
    } else if (start) {
      where.timestamp = { gte: start };
    } else if (end) {
      where.timestamp = { lte: end };
    }

    if (filters.username) {
      where.username = { contains: filters.username, mode: 'insensitive' };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.station) {
      where.station = filters.station;
    }

    const take = filters.limit ? Math.min(filters.limit, 200) : 50;
    const skip = filters.offset || 0;

    const logs = await this.prisma.userLoginLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take,
      skip,
    });

    // Ambil semua userId unik untuk query user
    const userIds = [...new Set(logs.map(log => log.userId).filter(id => id !== null))] as string[];
    let usersMap = new Map();
    if (userIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, role: true, allowedStations: true, lineCode: true, department: true, jobTitle: true },
      });
      usersMap = new Map(users.map(u => [u.id, u]));
    }

    // Filter role secara manual
    let filteredLogs = logs;
    if (filters.role) {
      filteredLogs = logs.filter(log => {
        const user = log.userId ? usersMap.get(log.userId) : null;
        return user?.role === filters.role;
      });
    }

    const data = filteredLogs.map(log => {
      const user = log.userId ? usersMap.get(log.userId) : null;
      return {
        id: log.id,
        timestamp: log.timestamp,
        username: log.username,
        fullName: user?.fullName || 'Unknown',
        role: user?.role || '-',
        station: log.station || (user?.allowedStations?.[0] || '-'),
        ipAddress: log.ipAddress,
        status: log.status,
        errorMessage: log.errorMessage,
      };
    });

    const total = filteredLogs.length;

    return {
      data,
      total,
      limit: take,
      offset: skip,
    };
  }

  async getStats(startDate?: Date, endDate?: Date) {
    const where: any = {};

    // Helper function to set endDate to end of day
    const normalizeEndDate = (date?: Date): Date | undefined => {
      if (!date) return undefined;
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return end;
    };

    const start = startDate;
    const end = normalizeEndDate(endDate);

    if (start && end) {
      where.timestamp = { gte: start, lte: end };
    } else if (start) {
      where.timestamp = { gte: start };
    } else if (end) {
      where.timestamp = { lte: end };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalSuccessToday, totalFailedToday, topUsers, hourlyDistribution, stationDistribution] = await Promise.all([
      this.prisma.userLoginLog.count({ where: { ...where, status: 'SUCCESS', timestamp: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.userLoginLog.count({ where: { ...where, status: 'FAILED', timestamp: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.userLoginLog.groupBy({
        by: ['username'],
        where: { ...where, status: 'SUCCESS' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.prisma.$queryRaw`
        SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count
        FROM "UserLoginLog"
        WHERE status = 'SUCCESS' AND timestamp >= ${startDate || todayStart} AND timestamp <= ${endDate || todayEnd}
        GROUP BY hour
        ORDER BY hour
      `,
      this.prisma.userLoginLog.groupBy({
        by: ['station'],
        where: { ...where, status: 'SUCCESS', station: { not: null } },
        _count: { id: true },
      }),
    ]);

    return {
      todaySuccess: totalSuccessToday,
      todayFailed: totalFailedToday,
      topUsers: topUsers.map(u => ({ username: u.username, count: u._count.id })),
      hourlyDistribution: (hourlyDistribution as any[]).map(h => ({ hour: h.hour, count: Number(h.count) })),
      stationDistribution: stationDistribution.map(s => ({ station: s.station || 'Unknown', count: s._count.id })),
    };
  }
}