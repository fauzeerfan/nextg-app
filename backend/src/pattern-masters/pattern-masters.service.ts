import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatternMastersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    return (this.prisma as any).patternMaster.create({
      data: {
        styleCode: dto.styleCode,
        patterns: dto.patterns // Array of strings
      }
    });
  }

  async findAll() {
    return (this.prisma as any).patternMaster.findMany({
        orderBy: { styleCode: 'asc' }
    });
  }

  // Cari berdasarkan Style (untuk Checkpanel dropdown)
  async findByStyle(styleCode: string) {
    return (this.prisma as any).patternMaster.findUnique({
      where: { styleCode }
    });
  }

  async update(id: string, dto: any) {
    return (this.prisma as any).patternMaster.update({
      where: { id },
      data: dto
    });
  }

  async remove(id: string) {
    return (this.prisma as any).patternMaster.delete({ where: { id } });
  }
}