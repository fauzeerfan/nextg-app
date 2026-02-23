import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PackingService {
  constructor(private prisma: PrismaService) {}

  async createSession(fgNumber: string) {
    return this.prisma.packingSession.create({
      data: {
        fgNumber,
        totalQty: 0,
        status: 'OPEN',
      },
    });
  }

  async addItem(sessionId: string, opId: string, qty: number) {
    // Validasi session
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'OPEN') throw new BadRequestException('Session is closed');

    // Validasi OP dan sisa qty
    const op = await this.prisma.productionOrder.findUnique({
      where: { id: opId },
    });
    if (!op) throw new NotFoundException('OP not found');

    const available = op.qtyQC - op.qtyPacking;
    if (qty > available) {
      throw new BadRequestException(`Not enough available quantity. Available: ${available}`);
    }

    // Buat item
    const item = await this.prisma.packingItem.create({
      data: {
        sessionId,
        opId,
        qty,
      },
    });

    // Update totalQty session
    await this.prisma.packingSession.update({
      where: { id: sessionId },
      data: { totalQty: { increment: qty } },
    });

    // Update qtyPacking di OP
    await this.prisma.productionOrder.update({
      where: { id: opId },
      data: { qtyPacking: { increment: qty } },
    });

    return item;
  }

  async closeSession(sessionId: string) {
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
      include: { items: { include: { op: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'OPEN') throw new BadRequestException('Session already closed');

    if (session.totalQty !== 100) {
      throw new BadRequestException(`Session total is ${session.totalQty}, must be exactly 100`);
    }

    // Generate QR code
    const qrCode = `PACK-${session.fgNumber}-${Date.now()}`;

    // Update session status
    await this.prisma.packingSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' },
    });

    // Opsional: simpan QR code di field baru jika ada

    return { success: true, qrCode, session };
  }
}