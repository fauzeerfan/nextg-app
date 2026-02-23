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
    console.log('CheckPanel inspect dto:', JSON.stringify(dto, null, 2));

    const { opId, patternIndex, patternName, good, ng, ngReasons } = dto;

    // Validasi input
    if (good < 0 || ng < 0) {
      throw new BadRequestException('good and ng must be non-negative');
    }
    if (good + ng === 0) {
      throw new BadRequestException('No quantity to process');
    }

    const op = await this.prisma.productionOrder.findUnique({
      where: { id: opId },
      include: { line: true, patternProgress: true },
    });
    if (!op) throw new NotFoundException('OP not found');
    if (op.currentStation !== StationCode.CP) {
      throw new BadRequestException(`OP not at Check Panel station (current: ${op.currentStation})`);
    }

    // Target per pola = qtyEntan (sesuai kebutuhan K1YH)
    const targetPerPattern = op.qtyEntan;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update ProductionTracking
      await tx.productionTracking.upsert({
        where: { opId_station: { opId, station: StationCode.CP } },
        update: { goodQty: { increment: good }, ngQty: { increment: ng } },
        create: { opId, station: StationCode.CP, goodQty: good, ngQty: ng },
      });
      console.log(`ProductionTracking for OP ${opId} at CP updated: good+${good}, ng+${ng}`);

      // 2. Update ProductionOrder
      await tx.productionOrder.update({
        where: { id: opId },
        data: {
          qtyCP: { increment: good + ng },
          cpGoodQty: { increment: good },
          cpNgQty: { increment: ng },
        },
      });
      console.log(`ProductionOrder ${opId} updated: qtyCP+${good+ng}, cpGood+${good}, cpNg+${ng}`);

      // 3. Ambil progress yang sudah ada (jika ada)
      const existingProgress = await tx.patternProgress.findUnique({
        where: { opId_patternIndex: { opId, patternIndex } }
      });

      // Validasi: pola sudah completed tidak boleh diinspect lagi
      if (existingProgress && existingProgress.completed) {
        throw new BadRequestException('Pattern already completed');
      }

      const newGood = (existingProgress?.good || 0) + good;
      const newNg = (existingProgress?.ng || 0) + ng;
      const completed = newGood + newNg >= targetPerPattern;

      // 4. Update atau buat PatternProgress
      await tx.patternProgress.upsert({
        where: { opId_patternIndex: { opId, patternIndex } },
        update: {
          good: { increment: good },
          ng: { increment: ng },
          completed: completed,
        },
        create: {
          opId,
          patternIndex,
          patternName,
          target: targetPerPattern,
          good,
          ng,
          completed,
        },
      });
      // 🔥 Log untuk memastikan data tersimpan
      console.log(`PatternProgress for ${opId}:${patternIndex} upserted`);

      // 5. Buat ProductionLog
      await tx.productionLog.create({
        data: {
          opId,
          station: StationCode.CP,
          type: 'INSPECT',
          qty: good + ng,
          note: ngReasons?.join(', ') || null,
        },
      });
      console.log(`ProductionLog created for OP ${opId}: qty ${good+ng}`);

      // 6. Hitung setsReadyForSewing
      const allProgress = await tx.patternProgress.findMany({ where: { opId } });
      if (allProgress.length > 0) {
        const allCompleted = allProgress.every(p => p.completed);
        if (allCompleted) {
          const setsReady = Math.min(...allProgress.map(p => p.good));
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