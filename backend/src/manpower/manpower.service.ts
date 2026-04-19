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

  // Cari attendance terakhir hari ini
  const lastAttendance = await this.prisma.manpowerAttendance.findFirst({
    where: { nik, tanggal: todayUTC },
    orderBy: { scanTime: 'desc' },
  });

  // Catat perubahan line jika ada
  if (lastAttendance && (lastAttendance.lineCode !== lineCode || lastAttendance.station !== station)) {
    await this.prisma.employeeLineChange.create({
      data: {
        nik: employee.nik,
        fullName: employee.fullName,
        oldLineCode: lastAttendance.lineCode,
        newLineCode: lineCode,
        oldStation: lastAttendance.station,
        newStation: station,
        changeDate: todayUTC,
        note: `Line change from ${lastAttendance.lineCode} to ${lineCode}`,
      },
    });
  }

  // Selalu buat record baru (multiple attendance per hari)
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

  async getEmployeeFlowHistory(
    startDate?: string,
    endDate?: string,
    lineCode?: string,
    station?: string,
    employeeNik?: string,
  ) {
    try {
      const filters: any = {};
      if (startDate) {
        const start = this.parseDateToUTC(startDate);
        if (start) filters.changeDate = { gte: start };
      }
      if (endDate) {
        let end = this.parseDateToUTC(endDate);
        if (end) {
          end.setUTCHours(23, 59, 59, 999);
          if (!filters.changeDate) filters.changeDate = {};
          filters.changeDate.lte = end;
        }
      }
      if (lineCode) {
        filters.OR = [
          { oldLineCode: lineCode },
          { newLineCode: lineCode },
        ];
      }
      if (station) {
        filters.OR = filters.OR || [];
        filters.OR.push(
          { oldStation: station },
          { newStation: station },
        );
      }
      if (employeeNik) filters.nik = employeeNik;

      const changes = await this.prisma.employeeLineChange.findMany({
        where: filters,
        orderBy: { changeTime: 'asc' },
        include: { employee: true },
      });

      // Bangun nodes dan links untuk sankey
      const nodeMap = new Map<string, { id: string; name: string; type: string; employees?: any[] }>();
      const linkMap = new Map<string, number>();

      // Kelompokkan perubahan per karyawan
      const changesByNik = new Map<string, typeof changes>();
      for (const ch of changes) {
        if (!changesByNik.has(ch.nik)) changesByNik.set(ch.nik, []);
        changesByNik.get(ch.nik)!.push(ch);
      }

      for (const [nik, chList] of changesByNik.entries()) {
        // Urutkan berdasarkan waktu
        chList.sort((a, b) => a.changeTime.getTime() - b.changeTime.getTime());

        // Node karyawan
        const empNodeId = `emp-${nik}`;
        if (!nodeMap.has(empNodeId)) {
          nodeMap.set(empNodeId, {
            id: empNodeId,
            name: `${chList[0].fullName} (${nik})`,
            type: 'employee',
          });
        }

        // Buat link dari karyawan ke line pertama
        const first = chList[0];
        const firstDate = new Date(first.changeDate).toISOString().split('T')[0];
        const firstNodeId = `line-${first.newLineCode}-${firstDate}`;
        if (!nodeMap.has(firstNodeId)) {
          nodeMap.set(firstNodeId, {
            id: firstNodeId,
            name: `${first.newLineCode} (${firstDate})`,
            type: 'line-date',
            employees: [],
          });
        }
        const firstNode = nodeMap.get(firstNodeId)!;
        if (!firstNode.employees!.some(e => e.nik === nik)) {
          firstNode.employees!.push({ nik, name: chList[0].fullName, exLine: null });
        }

        const linkKeyFirst = `${empNodeId}->${firstNodeId}`;
        linkMap.set(linkKeyFirst, (linkMap.get(linkKeyFirst) || 0) + 1);

        // Buat link antar perubahan
        for (let i = 0; i < chList.length - 1; i++) {
          const curr = chList[i];
          const next = chList[i+1];
          const currDate = new Date(curr.changeDate).toISOString().split('T')[0];
          const nextDate = new Date(next.changeDate).toISOString().split('T')[0];
          const currNodeId = `line-${curr.newLineCode}-${currDate}`;
          const nextNodeId = `line-${next.newLineCode}-${nextDate}`;

          if (!nodeMap.has(currNodeId)) {
            nodeMap.set(currNodeId, {
              id: currNodeId,
              name: `${curr.newLineCode} (${currDate})`,
              type: 'line-date',
              employees: [],
            });
          }
          if (!nodeMap.has(nextNodeId)) {
            nodeMap.set(nextNodeId, {
              id: nextNodeId,
              name: `${next.newLineCode} (${nextDate})`,
              type: 'line-date',
              employees: [],
            });
          }
          // Tambahkan karyawan ke node curr dan next (dengan exLine jika pernah pindah)
          const currNode = nodeMap.get(currNodeId)!;
          const nextNode = nodeMap.get(nextNodeId)!;
          if (!currNode.employees!.some(e => e.nik === nik)) {
            currNode.employees!.push({ nik, name: chList[0].fullName, exLine: curr.oldLineCode });
          }
          if (!nextNode.employees!.some(e => e.nik === nik)) {
            nextNode.employees!.push({ nik, name: chList[0].fullName, exLine: next.oldLineCode });
          }

          const linkKey = `${currNodeId}->${nextNodeId}`;
          linkMap.set(linkKey, (linkMap.get(linkKey) || 0) + 1);
        }
      }

      // Konversi ke array untuk SankeyChart
      const nodes = Array.from(nodeMap.values());
      const nodeIndexMap = new Map<string, number>();
      nodes.forEach((node, idx) => nodeIndexMap.set(node.id, idx));

      const links = Array.from(linkMap.entries()).map(([key, value]) => {
        const [sourceId, targetId] = key.split('->');
        return {
          source: nodeIndexMap.get(sourceId)!,
          target: nodeIndexMap.get(targetId)!,
          value,
        };
      });

      return { nodes, links };
    } catch (error: any) {
      this.logger.error(`Error in getEmployeeFlowHistory: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get employee flow history: ${error.message}`);
    }
  }
}