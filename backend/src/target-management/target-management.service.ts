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
        indexValue: dto.indexValue,
        effectiveDate: new Date(dto.effectiveDate),
        note: dto.note,
      },
    });
  }

  async findAll() {
    return this.prisma.targetSetting.findMany({
      orderBy: [{ lineCode: 'asc' }, { effectiveDate: 'desc' }],
    });
  }

  async findByLineAndDate(lineCode: string, date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return this.prisma.targetSetting.findFirst({
      where: {
        lineCode,
        effectiveDate: { gte: start, lte: end },
      },
    });
  }

  async update(id: string, dto: UpdateTargetDto) {
    const existing = await this.prisma.targetSetting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Target setting not found');
    return this.prisma.targetSetting.update({
      where: { id },
      data: {
        indexValue: dto.indexValue,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
        note: dto.note,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.targetSetting.delete({ where: { id } });
  }
}