import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCode } from '@prisma/client';

@Injectable()
export class CuttingEntanService {
  constructor(private prisma: PrismaService) {}

  async getReadyOps() {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: 'WIP',
        qtyEntan: { gt: this.prisma.productionOrder.fields.qtySentToPond },
      },
      orderBy: { createdAt: 'desc' },
      include: { cuttingBatches: { orderBy: { batchNumber: 'desc' }, take: 1 } },
    });

    return ops.map(op => ({
      id: op.id,
      opNumber: op.opNumber,
      styleCode: op.styleCode,
      itemNumberFG: op.itemNumberFG,
      itemNameFG: op.itemNameFG,
      qtyOp: op.qtyOp,
      totalCut: op.qtyEntan,
      sentToPond: op.qtySentToPond,
      pending: op.qtyEntan - op.qtySentToPond,
      lastBatch: op.cuttingBatches[0] || null,
    }));
  }

  async generateQR(opNumber: string) {
    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
      include: { cuttingBatches: { orderBy: { batchNumber: 'desc' }, take: 1 } },
    });

    if (!op) throw new NotFoundException('OP not found');

    const pending = op.qtyEntan - op.qtySentToPond;
    if (pending <= 0) {
      throw new ConflictException('No pending cut quantity for this OP');
    }

    const nextBatchNumber = (op.cuttingBatches[0]?.batchNumber || 0) + 1;
    const qrString = `${op.itemNumberFG}-${op.opNumber}-B${nextBatchNumber}`;

    const batch = await this.prisma.cuttingBatch.create({
      data: {
        opId: op.id,
        batchNumber: nextBatchNumber,
        qty: pending,
        qrCode: qrString,
      },
    });

    await this.prisma.productionOrder.update({
      where: { id: op.id },
      data: {
        qtySentToPond: { increment: pending },
        currentStation: StationCode.CUTTING_POND,
      },
    });

    await this.prisma.productionLog.create({
      data: {
        opId: op.id,
        station: StationCode.CUTTING_ENTAN,
        type: 'QR_GENERATED',
        qty: pending,
        note: `Batch ${nextBatchNumber} generated`,
      },
    });

    return {
      success: true,
      qr: qrString,
      opNumber: op.opNumber,
      fgNumber: op.itemNumberFG,
      qty: pending,
      batchNumber: nextBatchNumber,
    };
  }

  async reprintQR(batchId: string) {
    const batch = await this.prisma.cuttingBatch.findUnique({
      where: { id: batchId },
      include: { op: true },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    await this.prisma.cuttingBatch.update({
      where: { id: batchId },
      data: { printed: true },
    });

    return {
      qr: batch.qrCode,
      opNumber: batch.op.opNumber,
      fgNumber: batch.op.itemNumberFG,
      qty: batch.qty,
      batchNumber: batch.batchNumber,
    };
  }

  async getBatchHistory(opNumber: string) {
    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
      include: {
        cuttingBatches: {
          orderBy: { batchNumber: 'asc' },
        },
      },
    });

    if (!op) throw new NotFoundException('OP not found');

    return op.cuttingBatches.map(b => ({
      id: b.id,
      batchNumber: b.batchNumber,
      qty: b.qty,
      qrCode: b.qrCode,
      createdAt: b.createdAt,
      printed: b.printed,
    }));
  }

  async getAllBatches() {
    const batches = await this.prisma.cuttingBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: { op: { select: { opNumber: true } } },
    });
    return batches.map(b => ({
      id: b.id,
      opNumber: b.op.opNumber,
      batchNumber: b.batchNumber,
      qty: b.qty,
      qrCode: b.qrCode,
      createdAt: b.createdAt,
      printed: b.printed,
    }));
  }

  async getTotalSent() {
    const result = await this.prisma.cuttingBatch.aggregate({
      _sum: { qty: true },
    });
    return { total: result._sum.qty || 0 };
  }
}