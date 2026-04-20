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

    const available = (op.qtyQC || 0) - (op.qtyPacking || 0);
    if (qty > available) {
      throw new BadRequestException(`Not enough available quantity. Available: ${available}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Buat item
      const item = await tx.packingItem.create({
        data: {
          sessionId,
          opId,
          qty,
        },
      });

      // Update totalQty session
      await tx.packingSession.update({
        where: { id: sessionId },
        data: { totalQty: { increment: qty } },
      });

      // Update qtyPacking di OP
      await tx.productionOrder.update({
        where: { id: opId },
        data: { qtyPacking: { increment: qty } },
      });

      return item;
    });
  }

  async closeSession(sessionId: string) {
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: {
            op: {
              include: { line: true },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'OPEN') throw new BadRequestException('Session already closed');

    const firstItem = session.items[0];
    if (!firstItem) throw new BadRequestException('Session has no items');
    const line = firstItem.op.line;
    let packSize = 100;
    if (line && line.packingConfig) {
      const config = line.packingConfig as any;
      if (config && typeof config.packSize === 'number') {
        packSize = config.packSize;
      }
    }

    if (session.totalQty !== packSize) {
      throw new BadRequestException(`Session total is ${session.totalQty}, must be exactly ${packSize}`);
    }

    const qrCode = `PACK-${session.id}`;

    const updated = await this.prisma.packingSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        qrCode,
      },
    });

    return { success: true, qrCode, session: updated };
  }

  async getActiveSession() {
    return this.prisma.packingSession.findFirst({
      where: { status: 'OPEN' },
      include: { items: { include: { op: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHistory() {
    return this.prisma.packingSession.findMany({
      where: { status: 'CLOSED' },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { op: { select: { opNumber: true } } },
        },
      },
    });
  }

  /**
   * Mendapatkan daftar box yang sudah di-pack (CLOSED) tetapi belum diterima di Finished Goods.
   */
  async getPackedBoxes() {
    const sessions = await this.prisma.packingSession.findMany({
      where: {
        status: 'CLOSED',
        receivedAt: null,
      },
      include: {
        items: {
          include: {
            op: { select: { opNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map(session => ({
      id: session.id,
      fgNumber: session.fgNumber,
      totalQty: session.totalQty,
      items: session.items.map(item => ({
        opNumber: item.op.opNumber,
        qty: item.qty,
      })),
      qrCode: session.qrCode,
      createdAt: session.createdAt,
    }));
  }

  // ========== NEW: Get Box by QR Code ==========
  async getPackedBoxByQrCode(qrCode: string) {
    // QR code format: PACK-{sessionId}
    const sessionId = qrCode.replace('PACK-', '');
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: {
            op: { select: { opNumber: true, styleCode: true } }
          }
        }
      }
    });
    if (!session) throw new NotFoundException('Box not found');
    if (session.status !== 'CLOSED') throw new BadRequestException('Box is not closed yet');
    if (session.receivedAt) throw new BadRequestException('Box already received');
    return {
      id: session.id,
      fgNumber: session.fgNumber,
      totalQty: session.totalQty,
      items: session.items.map(item => ({
        opNumber: item.op.opNumber,
        qty: item.qty
      })),
      qrCode: session.qrCode,
      createdAt: session.createdAt
    };
  }

  /**
   * Menandai sesi packing sebagai sudah diterima di Finished Goods.
   */
  async markAsReceived(sessionId: string) {
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'CLOSED') {
      throw new BadRequestException('Only closed sessions can be marked as received');
    }
    if (session.receivedAt) {
      // Sudah diterima, lempar error atau return saja
      throw new BadRequestException('Session already received');
    }

    return this.prisma.packingSession.update({
      where: { id: sessionId },
      data: { receivedAt: new Date() },
    });
  }

  async reprint(sessionId: string) {
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'CLOSED') {
      throw new BadRequestException('Only closed sessions can be reprinted');
    }

    await this.prisma.packingSession.update({
      where: { id: sessionId },
      data: { printed: true },
    });

    return {
      qrCode: session.qrCode,
      fgNumber: session.fgNumber,
      totalQty: session.totalQty,
      createdAt: session.createdAt,
    };
  }

  async cancelSession(sessionId: string) {
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
      include: { items: true }, // ← ambil semua item dalam session
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'OPEN') {
      throw new BadRequestException('Only open sessions can be canceled');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Kembalikan qtyPacking ke masing-masing ProductionOrder
      for (const item of session.items) {
        await tx.productionOrder.update({
          where: { id: item.opId },
          data: { qtyPacking: { decrement: item.qty } },
        });
      }
      // 2. Hapus session (items otomatis terhapus karena cascade)
      await tx.packingSession.delete({
        where: { id: sessionId },
      });
      return { success: true };
    });
  }
}