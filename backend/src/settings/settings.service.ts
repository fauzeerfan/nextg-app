import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CuttingSource = 'INTERNAL' | 'EXTERNAL';

/** Key pengaturan untuk switch sumber data Cutting Entan. */
export const CUTTING_SOURCE_KEY = 'CUTTING_SOURCE';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ===== Generic key-value =====
  async get(key: string, fallback = ''): Promise<string> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? fallback;
  }

  async set(key: string, value: string, updatedBy?: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, updatedBy: updatedBy ?? null },
      create: { key, value, updatedBy: updatedBy ?? null },
    });
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
    return rows.reduce<Record<string, string>>((acc, r) => {
      acc[r.key] = r.value;
      return acc;
    }, {});
  }

  // ===== Switch sumber data Cutting (INTERNAL = Cutting Report NextG, EXTERNAL = API lama) =====
  async getCuttingSource(): Promise<CuttingSource> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: CUTTING_SOURCE_KEY },
    });
    if (row?.value === 'EXTERNAL') return 'EXTERNAL';
    if (row?.value === 'INTERNAL') return 'INTERNAL';

    // Belum pernah diset di DB -> hormati ENV lama agar tetap kompatibel,
    // lalu default ke INTERNAL (sesuai kebutuhan: default pakai Cutting Report internal).
    if (process.env.CUTTING_SYNC_DISABLED === 'true') return 'INTERNAL';
    if ((process.env.CUTTING_SOURCE || '').toUpperCase() === 'EXTERNAL') return 'EXTERNAL';
    return 'INTERNAL';
  }

  async setCuttingSource(source: CuttingSource, updatedBy?: string) {
    const value: CuttingSource = source === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL';
    await this.set(CUTTING_SOURCE_KEY, value, updatedBy);
    return { key: CUTTING_SOURCE_KEY, source: value };
  }

  /** true bila sumber data Cutting memakai API Cutting Report lama (eksternal). */
  async isExternalCuttingSource(): Promise<boolean> {
    return (await this.getCuttingSource()) === 'EXTERNAL';
  }
}