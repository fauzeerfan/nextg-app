import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StationLogsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. CUTTING STATION
  // ==========================================
  async createCuttingLog(dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
      
      if (!op) throw new BadRequestException('OP Not Found');
      
      // Validasi: OP harus di Cutting dan belum selesai (kecuali jika dilanjutkan admin)
      if (['COMPLETED', 'HOLD', 'CLOSED_FG'].includes(op.status) || op.currentStation !== 'CUTTING') {
        throw new BadRequestException('OP is locked or moved.');
      }

      // 1. Log Aktivitas
      const log = await (tx as any).stationLog.create({
        data: {
          opId: dto.opId,
          station: 'CUTTING',
          actionType: 'OUT',
          qtyGood: dto.qty,
          qtyNG: 0, 
          timestamp: new Date(),
        }
      });

      // 2. Update Saldo OP
      const newCutQty = op.cutQty + dto.qty;
      let newStatus = 'WIP';
      let qrCode: string | null = null; 
      let nextStation = 'CUTTING'; 

      // 3. Auto Close jika Target Tercapai
      if (newCutQty >= op.targetQty) {
        newStatus = 'COMPLETED'; 
        nextStation = 'CP'; 
        qrCode = `QR-${op.opNumber}-${Date.now().toString().slice(-6)}`;
      }

      await (tx as any).productionOrder.update({
        where: { id: dto.opId },
        data: {
          cutQty: newCutQty,
          status: newStatus,
          currentStation: nextStation,
          qrCode: qrCode 
        }
      });

      return { log, newCutQty, qrCode };
    });
  }

  // ==========================================
  // 2. CHECKPANEL (CP) STATION
  // ==========================================
  
  async scanInCP(qrCode: string) {
    const op = await (this.prisma as any).productionOrder.findUnique({ where: { qrCode } });
    if (!op) throw new NotFoundException('QR Code Invalid or OP not found.');

    // Validasi Flow
    if (op.currentStation !== 'CUTTING' && op.currentStation !== 'CP') {
        throw new BadRequestException(`OP is at ${op.currentStation}, cannot scan at CP.`);
    }

    // Logic Penerimaan: Jika status COMPLETED (dari Cutting), ubah jadi WIP
    if (op.status !== 'WIP') {
        await (this.prisma as any).productionOrder.update({
            where: { id: op.id },
            data: { currentStation: 'CP', status: 'WIP' }
        });
        
        // Log Masuk
        await (this.prisma as any).stationLog.create({
            data: {
                opId: op.id,
                station: 'CP',
                actionType: 'IN',
                qtyGood: op.cutQty, 
                timestamp: new Date()
            }
        });
    }
    return op;
  }

  async submitCpResult(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          if (!op) throw new NotFoundException('OP Not Found');

          const log = await (tx as any).stationLog.create({
              data: {
                  opId: dto.opId,
                  station: 'CP',
                  actionType: 'INSPECT',
                  qtyGood: dto.good,
                  qtyNG: dto.ng,
                  ngReason: dto.ngReason || null,
                  patternName: dto.patternName || null, // Menyimpan Pattern
                  timestamp: new Date()
              }
          });

          const newCpGood = op.cpGoodQty + dto.good;
          
          await (tx as any).productionOrder.update({
              where: { id: dto.opId },
              data: { cpGoodQty: newCpGood }
          });

          return { log, newCpGood };
      });
  }

  // ==========================================
  // 3. SEWING STATION
  // ==========================================

  async scanInSewing(qrCode: string) {
    const op = await (this.prisma as any).productionOrder.findUnique({ where: { qrCode } });
    if (!op) throw new NotFoundException('QR Invalid');

    // Validasi Flow: Harus dari CP atau sedang di Sewing
    if (op.currentStation !== 'CP' && op.currentStation !== 'SEWING') {
        throw new BadRequestException(`OP posisi di ${op.currentStation}. Belum lulus CP atau sudah lanjut.`);
    }

    // Pindah Status ke Sewing (jika baru masuk)
    if (op.currentStation === 'CP') {
        await (this.prisma as any).productionOrder.update({
            where: { id: op.id },
            data: { currentStation: 'SEWING', status: 'WIP' }
        });
        // Log kedatangan material
        await (this.prisma as any).stationLog.create({
            data: {
                opId: op.id,
                station: 'SEWING',
                actionType: 'IN',
                qtyGood: op.cpGoodQty, // Bawa saldo dari CP
                timestamp: new Date()
            }
        });
    }
    return op;
  }

  async sewingStart(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          
          // Validasi Supply: Tidak boleh start melebihi supply dari CP
          const newStartQty = op.sewingInQty + dto.qty;
          if (newStartQty > op.cpGoodQty) {
              throw new BadRequestException(`Over Supply! Max start allowed: ${op.cpGoodQty - op.sewingInQty}`);
          }

          const log = await (tx as any).stationLog.create({
              data: {
                  opId: dto.opId,
                  station: 'SEWING',
                  actionType: 'SEWING_START',
                  qtyGood: dto.qty,
                  timestamp: new Date()
              }
          });

          await (tx as any).productionOrder.update({
              where: { id: dto.opId },
              data: { sewingInQty: newStartQty }
          });

          return { log, newStartQty };
      });
  }

  async sewingFinish(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });

          // Validasi WIP: Tidak boleh finish melebihi apa yang sudah di-start
          const newFinishQty = op.sewingOutQty + dto.qty;
          if (newFinishQty > op.sewingInQty) {
              throw new BadRequestException(`Invalid Output! Max finish allowed: ${op.sewingInQty - op.sewingOutQty} (Check WIP)`);
          }

          const log = await (tx as any).stationLog.create({
              data: {
                  opId: dto.opId,
                  station: 'SEWING',
                  actionType: 'SEWING_FINISH',
                  qtyGood: dto.qty,
                  timestamp: new Date()
              }
          });

          // Logic Pindah Station: Jika Output >= Target, otomatis dorong ke QC
          let nextStation = 'SEWING';
          if (newFinishQty >= op.targetQty) {
             nextStation = 'QC';
          }

          await (tx as any).productionOrder.update({
              where: { id: dto.opId },
              data: { 
                  sewingOutQty: newFinishQty,
                  currentStation: nextStation
              }
          });

          return { log, newFinishQty, nextStation };
      });
  }

  // ==========================================
  // 4. QUALITY CONTROL (QC) STATION
  // ==========================================

  async scanInQC(qrCode: string) {
    const op = await (this.prisma as any).productionOrder.findUnique({ where: { qrCode } });
    if (!op) throw new NotFoundException('QR Invalid');

    if (op.currentStation !== 'SEWING' && op.currentStation !== 'QC') {
        throw new BadRequestException(`OP is at ${op.currentStation}. Not ready for QC.`);
    }

    if (op.currentStation === 'SEWING') { 
         if (op.sewingOutQty <= 0) throw new BadRequestException("No output from Sewing yet.");

        await (this.prisma as any).productionOrder.update({
            where: { id: op.id },
            data: { currentStation: 'QC', status: 'WIP' }
        });
        
        await (this.prisma as any).stationLog.create({
            data: {
                opId: op.id,
                station: 'QC',
                actionType: 'IN',
                qtyGood: op.sewingOutQty, 
                timestamp: new Date()
            }
        });
    }
    return op;
  }

  async submitQcResult(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          if (!op) throw new NotFoundException('OP Not Found');
          
          const log = await (tx as any).stationLog.create({
              data: {
                  opId: dto.opId,
                  station: 'QC',
                  actionType: 'INSPECT',
                  qtyGood: dto.good,
                  qtyNG: dto.ng,
                  ngReason: dto.ngReason || null,
                  timestamp: new Date()
              }
          });

          const newQcGood = op.qcGoodQty + dto.good;
          
          // NO Auto Move to Packing. Waiting for Manual Finish.
          
          await (tx as any).productionOrder.update({
              where: { id: dto.opId },
              data: { qcGoodQty: newQcGood }
          });

          return { log, newQcGood };
      });
  }

  // Manual Finish QC Session (Force Move to Packing)
  async qcFinish(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          if (!op) throw new NotFoundException('OP Not Found');

          await (tx as any).productionOrder.update({
              where: { id: dto.opId },
              data: { currentStation: 'PACKING' }
          });

          await (tx as any).stationLog.create({
              data: {
                  opId: dto.opId,
                  station: 'QC',
                  actionType: 'QC_FINISH',
                  qtyGood: 0,
                  timestamp: new Date()
              }
          });

          return { success: true };
      });
  }

  // ==========================================
  // 5. PACKING STATION
  // ==========================================

  async packingInput(dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
      if (!op) throw new NotFoundException('OP Not Found');

      const wipPacking = op.qcGoodQty - op.packedQty;
      if (dto.qty > wipPacking) {
        throw new BadRequestException(`Over Packing! Available: ${wipPacking}`);
      }

      // Auto-Move: Jika Packing mulai bekerja, tarik status ke PACKING (jika masih di QC)
      if (op.currentStation !== 'PACKING' && op.currentStation === 'QC') {
         await (tx as any).productionOrder.update({
            where: { id: op.id },
            data: { currentStation: 'PACKING', status: 'WIP' }
         });
      }

      const log = await (tx as any).stationLog.create({
        data: {
          opId: dto.opId,
          station: 'PACKING',
          actionType: 'PACKING_OUT',
          qtyGood: dto.qty,
          timestamp: new Date(),
        }
      });

      const newPackedQty = op.packedQty + dto.qty;
      
      // NO Auto Move to FG. Waiting for Manual Finish.

      await (tx as any).productionOrder.update({
        where: { id: dto.opId },
        data: { packedQty: newPackedQty }
      });

      return { log, newPackedQty };
    });
  }

  // Manual Finish Packing Session (Force Move to FG)
  async packingFinish(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          if (!op) throw new NotFoundException('OP Not Found');

          await (tx as any).productionOrder.update({
              where: { id: dto.opId },
              data: { currentStation: 'FG' }
          });

          await (tx as any).stationLog.create({
              data: {
                  opId: dto.opId,
                  station: 'PACKING',
                  actionType: 'PACKING_FINISH',
                  qtyGood: 0,
                  timestamp: new Date()
              }
          });
          return { success: true };
      });
  }

  // ==========================================
  // 6. FINISHED GOODS (FG)
  // ==========================================

  async scanInFG(qrCode: string) {
      const op = await (this.prisma as any).productionOrder.findUnique({ where: { qrCode } });
      if (!op) throw new NotFoundException('QR Invalid');

      // Validasi: Harus sudah di FG (dipindahkan oleh Packing Finish) atau masih di Packing tapi full
      // Kita izinkan pindah jika status Packing sudah Finish atau barang datang
      
      if (op.currentStation !== 'FG' && op.currentStation !== 'PACKING') {
         throw new BadRequestException('OP not ready for FG');
      }

      if (op.currentStation === 'PACKING') {
          await (this.prisma as any).productionOrder.update({
              where: { id: op.id },
              data: { currentStation: 'FG' }
          });
      }
      return op;
  }

  async submitFG(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          
          await (tx as any).stationLog.create({
              data: {
                  opId: dto.opId,
                  station: 'FG',
                  actionType: 'FG_IN', 
                  qtyGood: op.packedQty,
                  timestamp: new Date()
              }
          });

          await (tx as any).finishedGoodStock.upsert({
              where: { customerPartNo: op.styleCode }, 
              update: { 
                  totalStock: { increment: op.packedQty },
                  totalBoxes: { increment: 1 }
              },
              create: {
                  styleCode: op.styleCode,
                  customerPartNo: op.styleCode,
                  totalStock: op.packedQty,
                  totalBoxes: 1
              }
          });

          await (tx as any).productionOrder.update({
              where: { id: dto.opId },
              data: { status: 'CLOSED_FG' }
          });

          return { success: true };
      });
  }
  
  async getFgStocks() {
      return (this.prisma as any).finishedGoodStock.findMany({
          orderBy: { lastUpdated: 'desc' }
      });
  }
}