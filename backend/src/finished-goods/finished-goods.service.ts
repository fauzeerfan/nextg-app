import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinishedGoodsService {
  constructor(private prisma: PrismaService) {}

  async receiveBox(qrCode: string) {
    // Parse QR code untuk mendapatkan sessionId
    // Asumsi QR code berisi sessionId: "PACK-{sessionId}"
    const sessionId = qrCode.replace('PACK-', '');
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
      include: { items: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'CLOSED') throw new BadRequestException('Session not closed yet');

    // Gunakan transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Untuk setiap item di session, buat FGStockItem
      for (const item of session.items) {
        await tx.fGStockItem.create({
          data: {
            fg: {
              connectOrCreate: {
                where: { fgNumber: session.fgNumber },
                create: { fgNumber: session.fgNumber, totalQty: 0 },
              },
            },
            op: { connect: { id: item.opId } },
            qty: item.qty,
          },
        });
      }

      // 2. Update totalQty di FGStock
      const totalQty = session.items.reduce((sum, item) => sum + item.qty, 0);
      await tx.fGStock.upsert({
        where: { fgNumber: session.fgNumber },
        update: { totalQty: { increment: totalQty } },
        create: { fgNumber: session.fgNumber, totalQty },
      });

      // 3. Tandai session sebagai RECEIVED (opsional)
      await tx.packingSession.update({
        where: { id: sessionId },
        data: { status: 'RECEIVED' },
      });

      return { success: true, totalQty };
    });
  }

  async ship(fgNumber: string, qty: number, suratJalan: string) {
    // Cari stock items untuk fgNumber tersebut, urut berdasarkan createdAt (FIFO)
    const stockItems = await this.prisma.fGStockItem.findMany({
      where: { fg: { fgNumber } },
      orderBy: { createdAt: 'asc' },
    });

    const totalAvailable = stockItems.reduce((sum, item) => sum + item.qty, 0);
    if (qty > totalAvailable) {
      throw new BadRequestException(`Insufficient stock. Available: ${totalAvailable}`);
    }

    // Gunakan transaction
    return this.prisma.$transaction(async (tx) => {
      let remainingQty = qty;
      const shipment = await tx.shipment.create({
        data: {
          suratJalan,
          fgNumber,
          totalQty: qty,
        },
      });

      for (const item of stockItems) {
        if (remainingQty <= 0) break;

        const take = Math.min(item.qty, remainingQty);
        await tx.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            opId: item.opId,
            qty: take,
          },
        });

        if (take === item.qty) {
          // Hapus item jika habis
          await tx.fGStockItem.delete({ where: { id: item.id } });
        } else {
          // Kurangi qty item
          await tx.fGStockItem.update({
            where: { id: item.id },
            data: { qty: { decrement: take } },
          });
        }

        remainingQty -= take;
      }

      // Update totalQty di FGStock
      await tx.fGStock.update({
        where: { fgNumber },
        data: { totalQty: { decrement: qty } },
      });

      return { success: true, shipmentId: shipment.id };
    });
  }

  async getStock() {
    return this.prisma.fGStock.findMany({
      include: {
        items: {
          include: { op: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}