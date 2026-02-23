import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCode } from '@prisma/client';

@Injectable()
export class CheckPanelService {
  constructor(private prisma: PrismaService) {}

  async inspect(dto: {
    opId: string;
    patternIndex: number;
    patternName: string;
    good: number;
    ng: number;
    ngReasons?: string[];
  }) {
    const { opId, patternIndex, patternName, good, ng, ngReasons } = dto;

    if (good < 0 || ng < 0) throw new BadRequestException('good and ng must be non-negative');
    if (good + ng === 0) throw new BadRequestException('No quantity to process');

    const op = await this.prisma.productionOrder.findUnique({
      where: { id: opId },
      include: { line: true },
    });
    if (!op) throw new NotFoundException('OP not found');
    if (op.currentStation !== StationCode.CP) {
      throw new BadRequestException(`OP not at Check Panel (current: ${op.currentStation})`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update ProductionTracking (opsional, untuk riwayat)
      await tx.productionTracking.upsert({
        where: { opId_station: { opId, station: StationCode.CP } },
        update: { goodQty: { increment: good }, ngQty: { increment: ng } },
        create: { opId, station: StationCode.CP, goodQty: good, ngQty: ng },
      });

      // 2. Update ProductionOrder (akumulasi inspeksi)
      await tx.productionOrder.update({
        where: { id: opId },
        data: {
          qtyCP: { increment: good + ng },
          cpGoodQty: { increment: good },
          cpNgQty: { increment: ng },
        },
      });

      // 3. Upsert ke CheckPanelInspection (bukan PatternProgress)
      const existing = await tx.checkPanelInspection.findUnique({
        where: { opId_patternIndex: { opId, patternIndex } },
      });

      if (existing && (existing.good + existing.ng) >= op.qtyEntan) {
        throw new BadRequestException('Pattern already fully inspected');
      }

      const newGood = (existing?.good || 0) + good;
      const newNg = (existing?.ng || 0) + ng;
      const completed = newGood + newNg >= op.qtyEntan;

      await tx.checkPanelInspection.upsert({
        where: { opId_patternIndex: { opId, patternIndex } },
        update: {
          good: { increment: good },
          ng: { increment: ng },
          ngReasons: ngReasons ? { push: ngReasons } : undefined,
          updatedAt: new Date(),
        },
        create: {
          opId,
          patternIndex,
          patternName,
          good,
          ng,
          ngReasons: ngReasons || [],
        },
      });

      // 4. Buat ProductionLog
      await tx.productionLog.create({
        data: {
          opId,
          station: StationCode.CP,
          type: 'INSPECT',
          qty: good + ng,
          note: ngReasons?.join(', ') || null,
        },
      });

      // 5. Hitung setsReadyForSewing berdasarkan hasil inspeksi
      const allInspections = await tx.checkPanelInspection.findMany({
        where: { opId },
      });
      if (allInspections.length > 0) {
        const allCompleted = allInspections.every(i => (i.good + i.ng) >= op.qtyEntan);
        if (allCompleted) {
          const setsReady = Math.min(...allInspections.map(i => i.good));
          await tx.productionOrder.update({
            where: { id: opId },
            data: { setsReadyForSewing: setsReady },
          });
          console.log(`setsReadyForSewing updated to ${setsReady} for OP ${op.opNumber}`);
        }
      }

      return { success: true };
    });
  }

  async sendToSewing(dto: { opId: string; qty: number }) {
    console.log('sendToSewing dto:', dto);
    const { opId, qty } = dto;
    return this.prisma.$transaction(async (tx) => {
      const op = await tx.productionOrder.findUnique({ where: { id: opId } });
      if (!op) throw new NotFoundException('OP not found');
      if (op.currentStation !== StationCode.CP) {
        throw new BadRequestException('OP not at Check Panel');
      }
      if ((op.setsReadyForSewing ?? 0) < qty) {
        throw new BadRequestException(`Not enough sets ready. Available: ${op.setsReadyForSewing}`);
      }

      await tx.productionOrder.update({
        where: { id: opId },
        data: {
          setsReadyForSewing: { decrement: qty },
          qtySewingIn: { increment: qty },
        },
      });
      console.log(`OP ${opId} updated: setsReady-${qty}, qtySewingIn+${qty}`);

      await tx.productionLog.create({
        data: {
          opId,
          station: StationCode.CP,
          type: 'SEND_TO_SEWING',
          qty,
          note: `Sent ${qty} sets to Sewing`,
        },
      });
      console.log(`ProductionLog for SEND_TO_SEWING created for OP ${opId}`);

      return { success: true };
    });
  }
}