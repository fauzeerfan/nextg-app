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
      await tx.$queryRaw`
        SELECT * FROM "CheckPanelInspection"
        WHERE "opId" = ${opId} AND "patternIndex" = ${patternIndex}
        FOR UPDATE
      `;

      // Baca data terbaru (setelah dikunci)
      const existing = await tx.checkPanelInspection.findUnique({
        where: { opId_patternIndex: { opId, patternIndex } },
      });

      // Hitung total setelah inspeksi ini
      const currentGood = existing?.good ?? 0;
      const currentNg = existing?.ng ?? 0;
      const newTotal = currentGood + currentNg + good + ng;

      // ✅ Target per pattern = qtyCP (jumlah set)
      const targetPatterns = op.qtyCP;

      if (op.qtyCP <= 0) {
        throw new BadRequestException('OP has not been transferred from Cutting Pond yet');
      }

      if (newTotal > targetPatterns) {
        throw new BadRequestException(
          `Cannot exceed target ${targetPatterns} inspections per pattern. Current: ${currentGood + currentNg}, adding: ${good + ng}`
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
          cpGoodQty: { increment: good },
          cpNgQty: { increment: ng },
        },
      });

      // 3. Upsert ke CheckPanelInspection dengan handling array yang sangat ketat
      let incomingReasons: string[] = [];
      if (ngReasons) {
        if (Array.isArray(ngReasons)) {
          incomingReasons = ngReasons;
        } else if (typeof ngReasons === 'string') {
          try {
            const parsed = JSON.parse(ngReasons);
            incomingReasons = Array.isArray(parsed) ? parsed : [ngReasons];
          } catch {
            incomingReasons = [ngReasons];
          }
        }
      }

      let existingReasons: string[] = [];
      if (existing?.ngReasons) {
        const rawExist = existing.ngReasons as any;
        if (Array.isArray(rawExist)) {
          existingReasons = rawExist;
        } else if (typeof rawExist === 'string') {
          try {
            const parsed = JSON.parse(rawExist);
            existingReasons = Array.isArray(parsed) ? parsed : [rawExist];
          } catch {
            existingReasons = [rawExist];
          }
        }
      }

      // Gabungkan, bersihkan elemen kosong, pastikan semua berbentuk string murni
      const allReasons = [...existingReasons, ...incomingReasons]
        .flat()
        .filter(r => r && String(r).trim() !== '')
        .map(String);

      // Simpan sebagai JSON array
      await tx.checkPanelInspection.upsert({
        where: { opId_patternIndex: { opId, patternIndex } },
        update: {
          good: { increment: good },
          ng: { increment: ng },
          ngReasons: allReasons,
          updatedAt: new Date(),
        },
        create: {
          opId,
          patternIndex,
          patternName,
          good,
          ng,
          ngReasons: allReasons,
        },
      });

      // 4. ProductionLog
      const logNote = allReasons.length > 0 ? `NG Reasons: ${incomingReasons.join(', ')}` : null;
      await tx.productionLog.create({
        data: {
          opId,
          station: StationCode.CP,
          type: 'INSPECT',
          qty: good + ng,
          note: logNote,
        },
      });

      // 5. Hitung setsReadyForSewing jika SEMUA pattern selesai
      const allInspections = await tx.checkPanelInspection.findMany({
        where: { opId },
      });
      if (allInspections.length > 0) {
        const allCompleted = allInspections.every(i => (i.good + i.ng) >= targetPatterns);
        if (allCompleted) {
          // ✅ setsReady = nilai minimum good dari semua pattern
          const setsReady = Math.min(...allInspections.map(i => i.good));
          await tx.productionOrder.update({
            where: { id: opId },
            data: { 
              setsReadyForSewing: setsReady,
              allPatternsCompleted: true,
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