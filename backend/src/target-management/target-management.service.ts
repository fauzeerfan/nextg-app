import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTargetDto } from './dto/create-target.dto';
import { UpdateTargetDto } from './dto/update-target.dto';

@Injectable()
export class TargetManagementService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTargetDto) {
    return this.prisma.targetSetting.create({
      data: {
        lineCode: dto.lineCode,
        station: dto.station,
        indexValue: dto.indexValue,
        effectiveDate: new Date(dto.effectiveDate),
        note: dto.note,
        isActive: dto.isActive ?? true,   // <-- tambahkan
      },
    });
  }

  async findAll() {
    return this.prisma.targetSetting.findMany({
      orderBy: [{ lineCode: 'asc' }, { station: 'asc' }, { effectiveDate: 'desc' }],
    });
  }

async findByLineStationAndDate(lineCode: string, station: string, date: Date) {
  // Cari target dengan effectiveDate <= date, aktif, dan station/line cocok
  // Urutkan descending (terbaru), ambil satu
  return this.prisma.targetSetting.findFirst({
    where: {
      lineCode,
      station,
      effectiveDate: { lte: date },
      isActive: true,
    },
    orderBy: { effectiveDate: 'desc' },
  });
}

  // Untuk kompatibilitas lama, tetap sediakan method findByLineAndDate (default station SEWING)
  async findByLineAndDate(lineCode: string, date: Date) {
    return this.findByLineStationAndDate(lineCode, 'SEWING', date);
  }

  async update(id: string, dto: UpdateTargetDto) {
    const existing = await this.prisma.targetSetting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Target setting not found');
    return this.prisma.targetSetting.update({
      where: { id },
      data: {
        indexValue: dto.indexValue,
        station: dto.station,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
        note: dto.note,
        isActive: dto.isActive,   // <-- tambahkan
      },
    });
  }

  async remove(id: string) {
    return this.prisma.targetSetting.delete({ where: { id } });
  }
}