import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExternalShippingService } from './external-shipping.service';

@Injectable()
export class FinishedGoodsService {
  constructor(
    private prisma: PrismaService,
    private externalShipping: ExternalShippingService,
  ) {}

  /**
   * Menerima box dari packing (scan QR)
   */
  async receive(qrCode: string) {
    // Asumsi QR code berisi "PACK-{sessionId}"
    const sessionId = qrCode.replace('PACK-', '');
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
      include: { items: { include: { op: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'CLOSED') throw new BadRequestException('Session not closed yet');

    // 🔥 TAMBAHAN: cegah double scan
    if (session.receivedAt) {
      throw new BadRequestException('QR code already received');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Untuk setiap item di session: buat FGStockItem + tuntaskan OP-nya
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

        // ✅ FIX: saat barang diterima di FG, update OP-nya supaya:
        //  (a) qtyFG terisi -> WIP FG (qtyPacking - qtyFG) ikut berkurang;
        //  (b) currentStation pindah ke FG;
        //  (c) status ditandai DONE HANYA bila seluruh rantai sudah tuntas
        //      (kondisi konservatif: bila belum, OP tetap WIP — aman, = perilaku lama,
        //       tidak akan pernah menandai DONE terlalu dini).
        const op = item.op;
        const newQtyFG = (op.qtyFG || 0) + item.qty;
        const fullyReceived = newQtyFG >= (op.qtyPacking || 0);
        const allPacked = (op.qtyPacking || 0) >= (op.qtyQC || 0) && (op.qtyQC || 0) > 0;
        const allQCd = (op.qtyQC || 0) + (op.qcNgQty || 0) >= (op.qtySewingOut || 0);
        const allSewn =
          (op.qtySewingOut || 0) >= (op.qtySewingIn || 0) && (op.qtySewingIn || 0) > 0;
        const isComplete = fullyReceived && allPacked && allQCd && allSewn;

        const opData: any = {
          qtyFG: { increment: item.qty },
          currentStation: 'FG',
        };
        if (isComplete) opData.status = 'DONE';

        await tx.productionOrder.update({
          where: { id: item.opId },
          data: opData,
        });
      }

      // 2. Update totalQty di FGStock
      const totalQty = session.items.reduce((sum, item) => sum + item.qty, 0);
      await tx.fGStock.upsert({
        where: { fgNumber: session.fgNumber },
        update: { totalQty: { increment: totalQty } },
        create: { fgNumber: session.fgNumber, totalQty },
      });

      // 3. Tandai session sudah diterima (receivedAt) -- PERUBAHAN DI SINI
      await tx.packingSession.update({
        where: { id: sessionId },
        data: { receivedAt: new Date() },
      });

      return { success: true, totalQty };
    });
  }

  /**
   * Melakukan pengiriman barang jadi
   */
  async ship(fgNumber: string, qty: number, suratJalan: string) {
    // Validasi surat jalan eksternal
    const isValid = await this.externalShipping.validateSuratJalan(suratJalan);
    if (!isValid) {
      throw new BadRequestException(`Nomor surat jalan ${suratJalan} tidak valid`);
    }

    // Cari stock items untuk fgNumber, urut berdasarkan createdAt (FIFO)
    const stockItems = await this.prisma.fGStockItem.findMany({
      where: { fg: { fgNumber } },
      orderBy: { createdAt: 'asc' },
      include: { op: true },
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

  /**
   * Mendapatkan semua stok finished goods beserta item-itemnya
   */
  async getStock() {
    const stocks = await this.prisma.fGStock.findMany({
      include: {
        items: {
          include: { op: { include: { parent: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Additive: ringkasan per OP induk (batch digabung kembali menjadi satu OP),
    // tanpa menghapus field lama (items tetap ada). Frontend boleh memakai `byOp`.
    return stocks.map((s) => {
      const byOpMap = new Map<
        string,
        { opNumber: string; qty: number; batches: { batchCode: string; qty: number }[] }
      >();
      for (const it of s.items as any[]) {
        const rootOpNumber = it.op?.parent?.opNumber || it.op?.opNumber;
        if (!rootOpNumber) continue;
        const cur: { opNumber: string; qty: number; batches: { batchCode: string; qty: number }[] } =
          byOpMap.get(rootOpNumber) || { opNumber: rootOpNumber, qty: 0, batches: [] };
        cur.qty += it.qty;
        cur.batches.push({ batchCode: it.op?.batchCode || it.op?.opNumber, qty: it.qty });
        byOpMap.set(rootOpNumber, cur);
      }
      return { ...s, byOp: Array.from(byOpMap.values()) };
    });
  }

  /**
   * Mendapatkan history pengiriman
   */
  async getShipments() {
    return this.prisma.shipment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            op: { select: { opNumber: true } },
          },
        },
      },
    });
  }

  /**
   * Mendapatkan info box dari QR code untuk proses shipping
   * Box harus sudah CLOSED dan sudah di-receive ke FG inventory
   */
  async getBoxForShipping(qrCode: string) {
    const sessionId = qrCode.replace('PACK-', '');
    const session = await this.prisma.packingSession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: {
            op: { select: { opNumber: true, styleCode: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Box not found');
    if (session.status !== 'CLOSED') throw new BadRequestException('Box is not packed/closed yet');
    if (!session.receivedAt) throw new BadRequestException('Box has not been received to Finished Goods yet');

    return {
      fgNumber: session.fgNumber,
      totalQty: session.totalQty,
      items: session.items.map((item) => ({
        opNumber: item.op.opNumber,
        qty: item.qty,
      })),
      qrCode: session.qrCode,
    };
  }
}