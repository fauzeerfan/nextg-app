// backend/src/pattern-masters/pattern-masters.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatternMastersService {
  constructor(private prisma: PrismaService) {}

  // =========================
  // FRONTEND MAPPER FIX
  // =========================
  private mapToFrontend(pattern: any) {
    return {
      id: pattern.id,
      styleCode: pattern.styleCode,
      lineId: pattern.lineId,
      imgSetGood: pattern.imgSetGood,
      imgSetNg: pattern.imgSetNg,
      createdAt: pattern.createdAt,
      updatedAt: pattern.updatedAt,
      patterns: (pattern.parts || []).map((p: any) => ({
        name: p.name,
        imgGood: p.imgGood,
        imgNg: p.imgNg,
      })),
    };
  }

  /**
   * Create or update pattern master
   */
  async upsert(dto: any) {
    if (!dto.lineCode) {
      throw new BadRequestException('lineCode is required');
    }
    if (!dto.styleCode) {
      throw new BadRequestException('styleCode is required');
    }
    if (!Array.isArray(dto.patterns) || dto.patterns.length === 0) {
      throw new BadRequestException('patterns must be a non-empty array');
    }

    const line = await this.prisma.lineMaster.findUnique({
      where: { code: dto.lineCode },
    });
    if (!line) {
      throw new NotFoundException(`Line with code ${dto.lineCode} not found`);
    }

    for (const p of dto.patterns) {
      if (!p.name || p.name.trim() === '') {
        throw new BadRequestException('Each pattern must have a name');
      }
    }

    const result = await this.prisma.patternMaster.upsert({
      where: {
        styleCode_lineId: {
          styleCode: dto.styleCode,
          lineId: line.id,
        },
      },
      update: {
        imgSetGood: dto.imgSetGood,
        imgSetNg: dto.imgSetNg,
        parts: {
          deleteMany: {},
          create: dto.patterns.map((p: any) => ({
            name: p.name,
            imgGood: p.imgGood,
            imgNg: p.imgNg,
          })),
        },
      },
      create: {
        styleCode: dto.styleCode,
        lineId: line.id,
        imgSetGood: dto.imgSetGood,
        imgSetNg: dto.imgSetNg,
        parts: {
          create: dto.patterns.map((p: any) => ({
            name: p.name,
            imgGood: p.imgGood,
            imgNg: p.imgNg,
          })),
        },
      },
      include: { parts: true },
    });

    return this.mapToFrontend(result);
  }

  /**
   * Get all pattern masters
   */
  async findAll() {
    const data = await this.prisma.patternMaster.findMany({
      orderBy: { styleCode: 'asc' },
      include: { parts: true },
    });

    return data.map((p) => this.mapToFrontend(p));
  }

  /**
   * Find by style
   */
  async findByStyle(styleCode: string) {
    const data = await this.prisma.patternMaster.findFirst({
      where: { styleCode },
      include: { parts: true },
    });

    if (!data) return null;
    return this.mapToFrontend(data);
  }

  /**
   * Find by line code (INI YANG DIPAKAI UI)
   */
  async findByLineCode(lineCode: string) {
    const line = await this.prisma.lineMaster.findUnique({
      where: { code: lineCode },
    });
    if (!line) return [];

    const data = await this.prisma.patternMaster.findMany({
      where: { lineId: line.id },
      include: { parts: true },
      orderBy: { styleCode: 'asc' },
    });

    return data.map((p) => this.mapToFrontend(p));
  }

  /**
   * Update pattern master
   */
  async update(id: string, dto: any) {
    const { lineCode, ...data } = dto;

    if (data.patterns) {
      if (!Array.isArray(data.patterns) || data.patterns.length === 0) {
        throw new BadRequestException('patterns must be a non-empty array');
      }
      for (const p of data.patterns) {
        if (!p.name || p.name.trim() === '') {
          throw new BadRequestException('Each pattern must have a name');
        }
      }
    }

    const result = await this.prisma.patternMaster.update({
      where: { id },
      data: {
        imgSetGood: data.imgSetGood,
        imgSetNg: data.imgSetNg,
        parts: data.patterns
          ? {
              deleteMany: {},
              create: data.patterns.map((p: any) => ({
                name: p.name,
                imgGood: p.imgGood,
                imgNg: p.imgNg,
              })),
            }
          : undefined,
      },
      include: { parts: true },
    });

    return this.mapToFrontend(result);
  }

  /**
   * Delete pattern master
   */
  async remove(id: string) {
    return this.prisma.patternMaster.delete({ where: { id } });
  }
}