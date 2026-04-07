import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class ManpowerService {
  private readonly logger = new Logger(ManpowerService.name);
  constructor(private prisma: PrismaService) {}

  private parseDateToUTC(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(Date.UTC(year, month, day, 0, 0, 0));
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  }

  async checkIn(dto: CreateAttendanceDto) {
    const { nik, lineCode, station } = dto;
    this.logger.log(`Check-in attempt for NIK: ${nik}`);
    const employee = await this.prisma.employee.findUnique({ where: { nik } });
    if (!employee) throw new NotFoundException('Employee not found');

    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const existing = await this.prisma.manpowerAttendance.findFirst({
      where: { nik, tanggal: todayUTC },
    });
    if (existing) throw new BadRequestException('Employee already checked in today');

    const attendance = await this.prisma.manpowerAttendance.create({
      data: { nik, tanggal: todayUTC, lineCode, station },
      include: { employee: true },
    });
    return attendance;
  }

  async getTodayAttendance() {
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
    return this.prisma.manpowerAttendance.findMany({
      where: { tanggal: { gte: todayUTC, lt: tomorrowUTC } },
      include: { employee: true },
      orderBy: { scanTime: 'desc' },
    });
  }

  async getAttendanceByDate(date: Date) {
    const startUTC = new Date(date);
    startUTC.setUTCHours(0, 0, 0, 0);
    const endUTC = new Date(startUTC);
    endUTC.setUTCDate(endUTC.getUTCDate() + 1);
    return this.prisma.manpowerAttendance.findMany({
      where: { tanggal: { gte: startUTC, lt: endUTC } },
      include: { employee: true },
      orderBy: { scanTime: 'desc' },
    });
  }

  async getSankeyData(startDate?: string, endDate?: string) {
    let start: Date | null = null;
    let end: Date | null = null;
    if (startDate) {
      start = this.parseDateToUTC(startDate);
      if (!start) start = new Date();
    } else {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setUTCHours(0, 0, 0, 0);
    }
    if (endDate) {
      end = this.parseDateToUTC(endDate);
      if (!end) end = new Date();
      end.setUTCHours(23, 59, 59, 999);
    } else {
      end = new Date();
      end.setUTCHours(23, 59, 59, 999);
    }
    const attendances = await this.prisma.manpowerAttendance.findMany({
      where: { tanggal: { gte: start, lte: end } },
      include: { employee: true },
    });
    const nodesSet = new Set<string>();
    const linksMap = new Map<string, number>();
    attendances.forEach(att => {
      const dept = att.employee.department;
      const line = att.lineCode;
      const station = att.station;
      nodesSet.add(dept);
      nodesSet.add(line);
      nodesSet.add(station);
      const key1 = `${dept}->${line}`;
      const key2 = `${line}->${station}`;
      linksMap.set(key1, (linksMap.get(key1) || 0) + 1);
      linksMap.set(key2, (linksMap.get(key2) || 0) + 1);
    });
    const nodes = Array.from(nodesSet).map(name => ({ name }));
    const links = Array.from(linksMap.entries()).map(([key, value]) => {
      const [source, target] = key.split('->');
      return {
        source: nodes.findIndex(n => n.name === source),
        target: nodes.findIndex(n => n.name === target),
        value,
      };
    });
    return { nodes, links };
  }

  async getEmployeeFlow(
    startDate?: string,
    endDate?: string,
    lineCode?: string,
    station?: string,
    employeeNik?: string,
  ) {
    try {
      const filters: any = {};

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          const start = this.parseDateToUTC(startDate);
          if (start) dateFilter.gte = start;
        }
        if (endDate) {
          let end = this.parseDateToUTC(endDate);
          if (end) {
            end.setUTCHours(23, 59, 59, 999);
            dateFilter.lte = end;
          }
        }
        if (Object.keys(dateFilter).length > 0) {
          filters.tanggal = dateFilter;
        }
      }

      if (lineCode) filters.lineCode = lineCode;
      if (station) filters.station = station;
      if (employeeNik) filters.nik = employeeNik;

      this.logger.log(`getEmployeeFlow filters: ${JSON.stringify(filters)}`);

      const attendances = await this.prisma.manpowerAttendance.findMany({
        where: filters,
        include: { employee: true },
        orderBy: [
          { nik: 'asc' },
          { tanggal: 'asc' }
        ],
      });

      this.logger.log(`Found ${attendances.length} records`);

      if (attendances.length === 0) {
        return { nodes: [], links: [] };
      }

      const nodesSet = new Set<string>();
      const linksMap = new Map<string, number>();

      const employeeMap = new Map<string, typeof attendances>();
      for (const att of attendances) {
        if (!employeeMap.has(att.nik)) employeeMap.set(att.nik, []);
        employeeMap.get(att.nik)!.push(att);
      }

      for (const [nik, atts] of employeeMap) {
        for (const att of atts) {
          const key = `${att.lineCode}->${att.station}`;
          linksMap.set(key, (linksMap.get(key) || 0) + 1);
          nodesSet.add(att.lineCode);
          nodesSet.add(att.station);
        }
        for (let i = 0; i < atts.length - 1; i++) {
          const fromLine = atts[i].lineCode;
          const toLine = atts[i + 1].lineCode;
          if (fromLine !== toLine) {
            const key = `${fromLine}->${toLine}`;
            linksMap.set(key, (linksMap.get(key) || 0) + 1);
            nodesSet.add(fromLine);
            nodesSet.add(toLine);
          }
        }
      }

      const nodes = Array.from(nodesSet).map(name => ({ name }));
      const links = Array.from(linksMap.entries()).map(([key, value]) => {
        const [source, target] = key.split('->');
        return {
          source: nodes.findIndex(n => n.name === source),
          target: nodes.findIndex(n => n.name === target),
          value,
        };
      });

      return { nodes, links };
    } catch (error: any) {
      this.logger.error(`Error in getEmployeeFlow: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get employee flow: ${error.message}`);
    }
  }

  async getEmployeeTimeline(nik: string, startDate?: string, endDate?: string) {
    try {
      const filters: any = { nik };
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          const start = this.parseDateToUTC(startDate);
          if (start) dateFilter.gte = start;
        }
        if (endDate) {
          let end = this.parseDateToUTC(endDate);
          if (end) {
            end.setUTCHours(23, 59, 59, 999);
            dateFilter.lte = end;
          }
        }
        if (Object.keys(dateFilter).length > 0) {
          filters.tanggal = dateFilter;
        }
      }
      return this.prisma.manpowerAttendance.findMany({
        where: filters,
        include: { employee: true },
        orderBy: { tanggal: 'asc' },
      });
    } catch (error: any) {
      this.logger.error(`Error in getEmployeeTimeline: ${error.message}`);
      throw new BadRequestException(`Failed to get employee timeline: ${error.message}`);
    }
  }

  async getEmployeeFlowDetail(
    startDate?: string,
    endDate?: string,
    lineCode?: string,
    station?: string,
    employeeNik?: string,
  ) {
    try {
      const filters: any = {};

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          const start = this.parseDateToUTC(startDate);
          if (start) dateFilter.gte = start;
        }
        if (endDate) {
          let end = this.parseDateToUTC(endDate);
          if (end) {
            end.setUTCHours(23, 59, 59, 999);
            dateFilter.lte = end;
          }
        }
        if (Object.keys(dateFilter).length > 0) {
          filters.tanggal = dateFilter;
        }
      }

      if (lineCode) filters.lineCode = lineCode;
      if (station) filters.station = station;
      if (employeeNik) filters.nik = employeeNik;

      const attendances = await this.prisma.manpowerAttendance.findMany({
        where: filters,
        include: { employee: true },
        orderBy: [
          { nik: 'asc' },
          { tanggal: 'asc' }
        ],
      });

      if (attendances.length === 0) {
        return { nodes: [], links: [] };
      }

      const nodesMap = new Map<string, { name: string; type: 'employee' | 'line' | 'station' }>();
      const linksMap = new Map<string, number>();

      const employeeMap = new Map<string, typeof attendances>();
      for (const att of attendances) {
        if (!employeeMap.has(att.nik)) employeeMap.set(att.nik, []);
        employeeMap.get(att.nik)!.push(att);
      }

      for (const [nik, atts] of employeeMap) {
        const employeeName = `${atts[0].employee.fullName} (${nik})`;
        nodesMap.set(`emp_${nik}`, { name: employeeName, type: 'employee' });

        atts.sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime());

        const lineCount = new Map<string, number>();
        const lineStationMap = new Map<string, number>();
        for (const att of atts) {
          lineCount.set(att.lineCode, (lineCount.get(att.lineCode) || 0) + 1);
          const key = `${att.lineCode}->${att.station}`;
          lineStationMap.set(key, (lineStationMap.get(key) || 0) + 1);
          nodesMap.set(`line_${att.lineCode}`, { name: att.lineCode, type: 'line' });
          nodesMap.set(`station_${att.station}`, { name: att.station, type: 'station' });
        }

        for (const [line, weight] of lineCount.entries()) {
          const linkKey = `emp_${nik}->line_${line}`;
          linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + weight);
        }

        for (const [key, weight] of lineStationMap.entries()) {
          const [line, stationName] = key.split('->');
          const linkKey = `line_${line}->station_${stationName}`;
          linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + weight);
        }
      }

      const nodes = Array.from(nodesMap.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        type: data.type,
      }));

      const links = Array.from(linksMap.entries()).map(([key, value]) => {
        const [sourceId, targetId] = key.split('->');
        const sourceIndex = nodes.findIndex(n => n.id === sourceId);
        const targetIndex = nodes.findIndex(n => n.id === targetId);
        return {
          source: sourceIndex,
          target: targetIndex,
          value,
        };
      }).filter(l => l.source !== -1 && l.target !== -1);

      return { nodes, links };
    } catch (error: any) {
      this.logger.error(`Error in getEmployeeFlowDetail: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get employee flow detail: ${error.message}`);
    }
  }

  async getAttendanceList(
    startDate?: string,
    endDate?: string,
    lineCode?: string,
    station?: string,
    employeeNik?: string,
    limit?: number,
    offset?: number,
  ) {
    try {
      const filters: any = {};

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          const start = this.parseDateToUTC(startDate);
          if (start) dateFilter.gte = start;
        }
        if (endDate) {
          let end = this.parseDateToUTC(endDate);
          if (end) {
            end.setUTCHours(23, 59, 59, 999);
            dateFilter.lte = end;
          }
        }
        if (Object.keys(dateFilter).length > 0) {
          filters.tanggal = dateFilter;
        }
      }

      if (lineCode) filters.lineCode = lineCode;
      if (station) filters.station = station;
      if (employeeNik) filters.nik = employeeNik;

      const take = limit ? Math.min(limit, 100) : 50;
      const skip = offset || 0;

      const [data, total] = await Promise.all([
        this.prisma.manpowerAttendance.findMany({
          where: filters,
          include: { employee: true },
          orderBy: { scanTime: 'desc' },
          take,
          skip,
        }),
        this.prisma.manpowerAttendance.count({ where: filters }),
      ]);

      return {
        data: data.map(att => ({
          id: att.id,
          tanggal: att.tanggal,
          scanTime: att.scanTime,
          nik: att.nik,
          fullName: att.employee.fullName,
          lineCode: att.lineCode,
          station: att.station,
          department: att.employee.department,
          jobTitle: att.employee.jobTitle,
        })),
        total,
        limit: take,
        offset: skip,
      };
    } catch (error: any) {
      this.logger.error(`Error in getAttendanceList: ${error.message}`);
      throw new BadRequestException(`Failed to get attendance list: ${error.message}`);
    }
  }
}