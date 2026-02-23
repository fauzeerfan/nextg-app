import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCode } from '@prisma/client';

@Injectable()
export class LineMastersService {
  constructor(private prisma: PrismaService) {}

  // Default stations (full flow)
  private defaultStations: { station: StationCode; required: boolean; order: number }[] = [
    { station: 'CUTTING_ENTAN', required: true, order: 1 },
    { station: 'CUTTING_POND', required: true, order: 2 },
    { station: 'CP', required: true, order: 3 },
    { station: 'SEWING', required: true, order: 4 },
    { station: 'QC', required: true, order: 5 },
    { station: 'PACKING', required: true, order: 6 },
    { station: 'FG', required: true, order: 7 },
  ];

  // CREATE LINE
  async createLineMaster(dto: {
    code: string;
    name: string;
    description?: string;
    patternMultiplier?: number;
    stations?: { station: StationCode; required: boolean; order: number }[];
    sewingConfig?: any; // <-- tambahkan field sewingConfig
  }) {
    const exist = await this.prisma.lineMaster.findUnique({
      where: { code: dto.code },
    });

    if (exist) {
      throw new ConflictException(`Line ${dto.code} already exists`);
    }

    const stations = dto.stations?.length ? dto.stations : this.defaultStations;

    return this.prisma.lineMaster.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        patternMultiplier: dto.patternMultiplier ?? 1,
        sewingConfig: dto.sewingConfig, // <-- simpan sewingConfig
        stations: {
          create: stations.map((s) => ({
            station: s.station,
            required: s.required,
            order: s.order,
          })),
        },
      },
      include: {
        stations: true,
      },
    });
  }

  // GET ALL LINES (with user count)
  async findAll() {
    const lines = await this.prisma.lineMaster.findMany({
      orderBy: { code: 'asc' },
      include: {
        stations: { orderBy: { order: 'asc' } },
        productionOrders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            opNumber: true,
            status: true,
            currentStation: true,
          },
        },
      },
    });

    // Add user count for each line
    const linesWithUserCount = await Promise.all(
      lines.map(async (line) => {
        const userCount = await this.prisma.user.count({
          where: { lineCode: line.code },
        });
        return { ...line, userCount };
      })
    );

    return linesWithUserCount;
  }

  // GET ONE LINE (with user count)
  async findOne(code: string) {
    const line = await this.prisma.lineMaster.findUnique({
      where: { code },
      include: {
        stations: { orderBy: { order: 'asc' } },
        productionOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!line) {
      throw new NotFoundException(`Line ${code} not found`);
    }

    const userCount = await this.prisma.user.count({
      where: { lineCode: line.code },
    });

    return { ...line, userCount };
  }

  // UPDATE LINE
  async updateLineMaster(
    code: string,
    dto: {
      name?: string;
      description?: string;
      patternMultiplier?: number;
      stations?: { station: StationCode; required: boolean; order: number }[];
      sewingConfig?: any; // <-- tambahkan field sewingConfig
    },
  ) {
    const existing = await this.prisma.lineMaster.findUnique({
      where: { code },
    });

    if (!existing) throw new NotFoundException(`Line ${code} not found`);

    // update basic (termasuk sewingConfig)
    await this.prisma.lineMaster.update({
      where: { code },
      data: {
        name: dto.name,
        description: dto.description,
        patternMultiplier: dto.patternMultiplier,
        sewingConfig: dto.sewingConfig, // <-- update sewingConfig
      },
    });

    // update stations if provided
    if (dto.stations) {
      // delete old
      await this.prisma.lineStation.deleteMany({
        where: { lineId: existing.id },
      });

      // create new
      await this.prisma.lineStation.createMany({
        data: dto.stations.map((s) => ({
          lineId: existing.id,
          station: s.station,
          required: s.required,
          order: s.order,
        })),
      });
    }

    return this.findOne(code);
  }

  // DELETE LINE
  async deleteLineMaster(code: string) {
    const line = await this.prisma.lineMaster.findUnique({
      where: { code },
      include: { productionOrders: true },
    });

    if (!line) throw new NotFoundException(`Line ${code} not found`);

    if (line.productionOrders.length > 0) {
      throw new ConflictException(
        `Cannot delete line ${code}, production orders still exist`,
      );
    }

    return this.prisma.lineMaster.delete({
      where: { code },
    });
  }

  // LINE STATS (for dashboard)
  async getLineStats(code: string) {
    const line = await this.prisma.lineMaster.findUnique({
      where: { code },
      include: {
        productionOrders: true,
      },
    });

    if (!line) throw new NotFoundException('Line not found');

    const stationDistribution: Record<string, number> = {};
    const statusDistribution: Record<string, number> = {};

    line.productionOrders.forEach((op) => {
      if (op.currentStation) {
        stationDistribution[op.currentStation] =
          (stationDistribution[op.currentStation] || 0) + 1;
      }

      statusDistribution[op.status] =
        (statusDistribution[op.status] || 0) + 1;
    });

    return {
      line: line.code,
      totalOP: line.productionOrders.length,
      stationDistribution,
      statusDistribution,
    };
  }

  // ACTIVE LINES (has WIP)
  async getActiveLines() {
    return this.prisma.lineMaster.findMany({
      where: {
        productionOrders: {
          some: {
            status: 'WIP',
          },
        },
      },
      include: {
        stations: true,
        productionOrders: {
          where: { status: 'WIP' },
        },
      },
    });
  }

  // ========== METHOD UNTUK SEWING CONFIG ==========

  /**
   * Memperbarui sewingConfig untuk suatu line
   * @param lineCode Kode line
   * @param sewingConfig Data konfigurasi sewing (JSON)
   */
  async updateSewingConfig(lineCode: string, sewingConfig: any) {
    const line = await this.prisma.lineMaster.findUnique({
      where: { code: lineCode },
    });
    if (!line) throw new NotFoundException('Line not found');

    return this.prisma.lineMaster.update({
      where: { code: lineCode },
      data: { sewingConfig },
    });
  }

  /**
   * Mendapatkan sewingConfig dari suatu line
   * Mengembalikan default { starts: [], finishes: [] } jika belum ada
   * @param lineCode Kode line
   */
  async getSewingConfig(lineCode: string) {
    const line = await this.prisma.lineMaster.findUnique({
      where: { code: lineCode },
      select: { sewingConfig: true },
    });
    if (!line) throw new NotFoundException('Line not found');
    return line.sewingConfig || { starts: [], finishes: [] };
  }

  // ================================================

  // ========== METHOD YANG SUDAH ADA SEBELUMNYA ==========
  async getNgCategories(lineCode: string): Promise<string[]> {
    const line = await this.prisma.lineMaster.findUnique({
      where: { code: lineCode },
    });
    if (!line) throw new NotFoundException('Line not found');
    // Jika belum ada, kembalikan default dari dokumen
    const defaultCategories = [
      'Garis', 'Lubang jarum/dekok', 'Bentol/jendol', 'Noda garis putih',
      'Noda titik putih/hitam', 'Emboss halus', 'Backing cloth', 'Bowing',
      'Shiwa', 'Cacat cutting dimensi', 'Cacat cutting kirikomi', 'Cacat cutting scrim tertarik'
    ];
    return (line.ngCategories as string[]) || defaultCategories;
  }
  // =====================================================
}