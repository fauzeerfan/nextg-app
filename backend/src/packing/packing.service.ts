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
      include: {
        items: {
          include: {
            op: {
              include: { line: true }  // ambil line dari OP pertama
            }
          }
        }
      }
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'OPEN') throw new BadRequestException('Session already closed');

    // Ambil pack size dari line (asumsi semua item dari line yang sama)
    const firstItem = session.items[0];
    if (!firstItem) throw new BadRequestException('Session has no items');
    const line = firstItem.op.line;
    let packSize = 50;
    if (line && line.packingConfig) {
      const config = line.packingConfig as any;
      if (config && typeof config.packSize === 'number') {
        packSize = config.packSize;
      }
    }

    if (session.totalQty !== packSize) {
      throw new BadRequestException(`Session total is ${session.totalQty}, must be exactly ${packSize}`);
    }

    // Generate QR code unik (misal berdasarkan ID sesi)
    const qrCode = `PACK-${session.id}`;

    // Update session: status CLOSED, simpan qrCode
    const updated = await this.prisma.packingSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        qrCode: qrCode,
      },
    });

    return { success: true, qrCode, session: updated };
  }

  async getActiveSession() {
    // Asumsikan hanya satu sesi aktif per pengguna atau global.
    // Bisa berdasarkan user atau mengambil sesi dengan status OPEN terbaru.
    return this.prisma.packingSession.findFirst({
      where: { status: 'OPEN' },
      include: { items: { include: { op: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getHistory() {
    // Ambil semua session yang sudah CLOSED, urut descending
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

  async reprint(sessionId: string) {
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'CLOSED') {
      throw new BadRequestException('Only closed sessions can be reprinted');
    }

    // Tandai sebagai telah dicetak ulang (opsional)
    await this.prisma.packingSession.update({
      where: { id: sessionId },
      data: { printed: true },
    });

    // Kembalikan data yang dibutuhkan untuk cetak ulang
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
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'OPEN') {
      throw new BadRequestException('Only open sessions can be canceled');
    }

    // Hapus session (item akan ikut terhapus karena onDelete: Cascade di skema)
    await this.prisma.packingSession.delete({
      where: { id: sessionId },
    });

    return { success: true };
  }
}