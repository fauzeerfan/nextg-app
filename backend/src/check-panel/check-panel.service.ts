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
      // 🔒 Kunci baris CheckPanelInspection untuk pattern ini
      const locked = await tx.$queryRaw`
        SELECT * FROM "CheckPanelInspection"
        WHERE "opId" = ${opId} AND "patternIndex" = ${patternIndex}
        FOR UPDATE
      `;

      // Baca data terbaru (setelah dikunci)
      const existing = await tx.checkPanelInspection.findUnique({
        where: { opId_patternIndex: { opId, patternIndex } },
      });

      // Hitung total setelah inspeksi ini, gunakan nullish coalescing untuk menghindari undefined
      const currentGood = existing?.good ?? 0;
      const currentNg = existing?.ng ?? 0;
      const newTotal = currentGood + currentNg + good + ng;

      if (newTotal > op.qtyEntan) {
        throw new BadRequestException(
          `Cannot exceed target ${op.qtyEntan}. Current: ${currentGood + currentNg}, adding: ${good + ng}`
        );
      }

      // 1. Update ProductionTracking
      await tx.productionTracking.upsert({
        where: { opId_station: { opId, station: StationCode.CP } },
        update: { goodQty: { increment: good }, ngQty: { increment: ng } },
        create: { opId, station: StationCode.CP, goodQty: good, ngQty: ng },
      });

      // 2. Update ProductionOrder
      await tx.productionOrder.update({
        where: { id: opId },
        data: {
          qtyCP: { increment: good + ng },
          cpGoodQty: { increment: good },
          cpNgQty: { increment: ng },
        },
      });

      // 3. Upsert ke CheckPanelInspection
      const completed = newTotal >= op.qtyEntan;

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

      // 4. ProductionLog
      await tx.productionLog.create({
        data: {
          opId,
          station: StationCode.CP,
          type: 'INSPECT',
          qty: good + ng,
          note: ngReasons?.join(', ') || null,
        },
      });

      // 5. Hitung setsReadyForSewing jika semua pattern selesai
      const allInspections = await tx.checkPanelInspection.findMany({
        where: { opId },
      });
      if (allInspections.length > 0) {
        const allCompleted = allInspections.every(i => (i.good + i.ng) >= op.qtyEntan);
        if (allCompleted) {
          const setsReady = Math.min(...allInspections.map(i => i.good));
          await tx.productionOrder.update({
            where: { id: opId },
            data: { 
              setsReadyForSewing: setsReady,
              allPatternsCompleted: true, // <-- tambahan field ini
            },
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