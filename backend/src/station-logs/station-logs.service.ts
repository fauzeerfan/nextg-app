import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StationLogsService {
  constructor(private prisma: PrismaService) {}

  // =====================================================
  // NEW CUTTING ENTAN PROCESS (QR + AUTO MOVE TO POND)
  // =====================================================
  async processCuttingEntan(dto: { opId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const op = await (tx as any).productionOrder.findUnique({ 
        where: { id: dto.opId },
        include: { line: true }
      });

      if (!op) throw new NotFoundException('OP not found');

      const multiplier = op.line?.patternMultiplier || 1;
      const pondTarget = op.qtyOp * multiplier;

      const qrCode = `CE-${op.opNumber}-${Date.now()}`;

      await (tx as any).stationLog.create({
        data: {
          opId: op.id,
          station: 'CUTTING_ENTAN',
          actionType: 'PROCESSED',
          qtyGood: op.qtyOp,
          deviceType: 'MANUAL',
          timestamp: new Date()
        }
      });

      await (tx as any).productionOrder.update({
        where: { id: op.id },
        data: {
          currentStation: 'CUTTING_POND',
          qrCodeEntan: qrCode,
          qrCode: qrCode, // UPDATE: Update QR utama agar bisa discan stasiun berikutnya
          qtyPondOp: pondTarget,
          status: 'WIP',
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        qrCode,
        opNumber: op.opNumber,
        pondTarget,
        multiplier
      };
    });
  }

  // =====================================================
// NEW CUTTING POND PROCESS (PER PATTERN - IOT SPARSHA)
// =====================================================
async processCuttingPond(dto: {
  opId: string;
  patternIndex: number;
  qtyGood: number;
  qtyNG: number;
  deviceId: string;
}) {
  return this.prisma.$transaction(async (tx) => {
    const op = await (tx as any).productionOrder.findUnique({
      where: { id: dto.opId },
      include: { line: true }
    });

    if (!op) throw new NotFoundException('OP not found');

    // 2. Update pattern progress
    const patternProgress = op.patternProgress || [];
    const currentPattern = patternProgress[dto.patternIndex] || {
      patternIndex: dto.patternIndex,
      pondActual: 0,
      cpActual: 0,
      status: 'IN_PROGRESS'
    };

    currentPattern.pondActual += dto.qtyGood;
    patternProgress[dto.patternIndex] = currentPattern;

    // 3. Check target per pattern
    const multiplier = op.line?.patternMultiplier || 1;
    const patternTarget = op.qtyPondOp / multiplier;

    if (currentPattern.pondActual >= patternTarget) {
      currentPattern.status = 'COMPLETED';
    }

    // 4. Update total cut qty
    const newqtyPond = op.qtyPond + dto.qtyGood;

    // 5. Log Sparsha
    await (tx as any).stationLog.create({
      data: {
        opId: op.id,
        station: 'CUTTING_POND',
        actionType: 'PATTERN_OUT',
        qtyGood: dto.qtyGood,
        qtyNG: dto.qtyNG,
        patternIndex: dto.patternIndex,
        deviceId: dto.deviceId,
        deviceType: 'SPARSHA',
        timestamp: new Date()
      }
    });

    // 6. Update OP progress
    const updatedOp = await (tx as any).productionOrder.update({
      where: { id: op.id },
      data: {
        qtyPond: newqtyPond,
        patternProgress: patternProgress,
        currentPatternIndex: dto.patternIndex,
        updatedAt: new Date()
      }
    });

    // 7. Check semua pattern selesai
    const allPatternsCompleted = patternProgress.every((p: any) => p.status === 'COMPLETED');

    if (allPatternsCompleted && newqtyPond >= op.qtyPondOp) {
      await (tx as any).productionOrder.update({
        where: { id: op.id },
        data: {
          currentStation: 'CP',
          status: 'READY_FOR_CP'
        }
      });
    }

    return updatedOp;
  });
}

// =====================================================
// NEW CHECK PANEL PROCESS (DRISTI DEVICE)
// =====================================================
async processCheckPanel(dto: {
  opId: string;
  patternIndex: number;
  qtyGood: number;
  qtyNG: number;
  ngReasons: string[];
  deviceId: string;
}) {
  return this.prisma.$transaction(async (tx) => {
    const op = await (tx as any).productionOrder.findUnique({
      where: { id: dto.opId }
    });

    if (!op) throw new NotFoundException('OP not found');

    // 2. Update CP qty
    const newCpInQty = (op.cpInQty || 0) + dto.qtyGood + dto.qtyNG;
    const newCpGoodQty = (op.cpGoodQty || 0) + dto.qtyGood;
    const newCpNgQty = (op.cpNgQty || 0) + dto.qtyNG;

    // 3. Pattern progress update
    const patternProgress = op.patternProgress || [];
    const currentPattern = patternProgress[dto.patternIndex];

    if (currentPattern) {
      currentPattern.cpActual = (currentPattern.cpActual || 0) + dto.qtyGood;

      if (currentPattern.cpTarget && currentPattern.cpActual >= currentPattern.cpTarget) {
        currentPattern.status = 'CP_COMPLETED';
      }
    }

    // 4. Log DRISTI inspection
    await (tx as any).stationLog.create({
      data: {
        opId: op.id,
        station: 'CP',
        actionType: 'INSPECTION',
        qtyGood: dto.qtyGood,
        qtyNG: dto.qtyNG,
        patternIndex: dto.patternIndex,
        ngReason: dto.ngReasons?.join(', ') || null,
        deviceId: dto.deviceId,
        deviceType: 'DRISTI',
        timestamp: new Date()
      }
    });

    // 5. Update OP
    const updatedOp = await (tx as any).productionOrder.update({
      where: { id: op.id },
      data: {
        cpInQty: newCpInQty,
        cpGoodQty: newCpGoodQty,
        cpNgQty: newCpNgQty,
        patternProgress: patternProgress,
        updatedAt: new Date()
      }
    });

    // 6. Check all pattern inspected
    const allPatternsInspected = patternProgress.length > 0 &&
      patternProgress.every((p: any) => p.status === 'CP_COMPLETED');

    if (allPatternsInspected && newCpGoodQty >= newCpInQty) {
      await (tx as any).productionOrder.update({
        where: { id: op.id },
        data: {
          currentStation: 'SEWING',
          status: 'READY_FOR_SEWING'
        }
      });
    }

    return updatedOp;
  });
}



  // ==========================================
  // 1. CUTTING STATION (LEGACY / STANDARD)
  // ==========================================
  async createCuttingLog(dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
      
      if (!op) throw new BadRequestException('OP Not Found');
      
      if (['COMPLETED', 'HOLD', 'CLOSED_FG'].includes(op.status)) {
        throw new BadRequestException('OP is locked.');
      }

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

      const newqtyPond = op.qtyPond + dto.qty;
      let newStatus = 'WIP';
      let qrCode: string | null = op.qrCode; 
      let nextStation = 'CUTTING'; 

      if (newqtyPond >= op.qtyOp) {
        newStatus = 'COMPLETED'; 
        nextStation = 'CP'; 
        if (!qrCode) qrCode = `${op.opNumber}-${op.styleCode}`;
      }

      await (tx as any).productionOrder.update({
        where: { id: dto.opId },
        data: {
          qtyPond: newqtyPond,
          status: newStatus,
          currentStation: nextStation,
          qrCode: qrCode 
        }
      });

      return { log, newqtyPond, qrCode };
    });
  }

  // ==========================================
  // 1.1 CUTTING ENTAN (LEGACY FLOW - KEEP)
  // ==========================================
  async cuttingEntanInput(dto: { opId: string }) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          if (!op) throw new BadRequestException('OP Not Found');

          const patternKey = op.opNumber.substring(0, 4).toUpperCase();
          
          const patternMaster = await (tx as any).patternMaster.findUnique({
              where: { styleCode: patternKey }
          });

          let multiplier = 1;
          if (patternMaster && patternMaster.patterns && Array.isArray(patternMaster.patterns)) {
              multiplier = patternMaster.patterns.length > 0 ? patternMaster.patterns.length : 1;
          }

          const pondTarget = op.qtyOp * multiplier;

          const log = await (tx as any).stationLog.create({
              data: {
                  opId: dto.opId,
                  station: 'CUTTING_ENTAN',
                  actionType: 'OUT',
                  qtyGood: op.qtyOp,
                  timestamp: new Date()
              }
          });

          let qrCode = op.qrCode;
          if (!qrCode) qrCode = `${op.opNumber}-${op.styleCode}`;

          await (tx as any).productionOrder.update({
              where: { id: dto.opId },
              data: {
                  entanQty: op.qtyOp,
                  qtyPond: pondTarget,
                  currentStation: 'CUTTING_POND',
                  status: 'WIP',
                  qrCode: qrCode
              }
          });

          return { 
              log, 
              success: true, 
              qrCode, 
              moveTo: 'CUTTING_POND', 
              multiplier: multiplier,
              pondTarget: pondTarget 
          };
      });
  }

  // =====================================================
  // SISA FILE TIDAK DIUBAH (CUTTING POND → FG)
  // =====================================================


  // ==========================================
  // 1.2 CUTTING POND (IOT SPARSHA)
  // ==========================================
  async cuttingPondInput(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          if (!op) throw new BadRequestException('OP Not Found');

          const newqtyPond = op.qtyPond + dto.qty;
          
          // Validasi: Output Pond tidak boleh melebihi Target Pond (qtyPond)
          // qtyPond diset saat Entan Finish. Jika 0 (legacy), gunakan logika entanQty.
          const maxLimit = op.qtyPond > 0 ? op.qtyPond : (op.entanQty * 1); // Fallback 1:1 if qtyPond missing

          if (newqtyPond > maxLimit) {
              throw new BadRequestException(`Over Cut! Max Pond Target: ${maxLimit}`);
          }

          const log = await (tx as any).stationLog.create({
              data: {
                  opId: dto.opId,
                  station: 'CUTTING_POND',
                  actionType: 'OUT',
                  qtyGood: dto.qty,
                  timestamp: new Date()
              }
          });

          // qtyPond adalah final output dari departemen Cutting (Supply ke CP)
          await (tx as any).productionOrder.update({
              where: { id: dto.opId },
              data: { qtyPond: newqtyPond }
          });

          return { log, newqtyPond };
      });
  }

  // ==========================================
  // 2. CHECKPANEL (CP) STATION - PARTIAL RECEIVE
  // ==========================================
  
  async scanInCP(dto: { qrCode: string, qty?: number }) {
    const qrCode = dto.qrCode ? dto.qrCode.trim() : "";
    console.log(`🔍 [Service] CP Scan: '${qrCode}' Input Qty: ${dto.qty}`);

    // 1. Smart Lookup
    let op = await (this.prisma as any).productionOrder.findUnique({ where: { qrCode } });
    if (!op) {
        const parts = qrCode.split('-');
        if (parts.length >= 1) {
            const potentialOpNumber = parts[0];
            op = await (this.prisma as any).productionOrder.findUnique({ 
                where: { opNumber: potentialOpNumber } 
            });
            // Auto-heal QR
            if (op) {
                await (this.prisma as any).productionOrder.update({
                    where: { id: op.id },
                    data: { qrCode: qrCode }
                });
            }
        }
    }

    if (!op) throw new NotFoundException(`OP Not Found for QR: ${qrCode}`);

    // Validasi Alur
    const validStations = ['CUTTING', 'CUTTING_ENTAN', 'CUTTING_POND', 'CP'];
    if (!validStations.includes(op.currentStation)) {
        throw new BadRequestException(`OP at ${op.currentStation}, not ready for CP.`);
    }

    // --- LOGIC PARSIAL ---
    const currentReceived = op.cpInQty || 0;
    // Supply CP sekarang adalah output dari POND (qtyPond)
    const remainingToReceive = op.qtyPond - currentReceived;

    // Jika input 0/kosong dari IoT, asumsikan terima SEMUA sisa
    let inputQty = dto.qty && Number(dto.qty) > 0 ? Number(dto.qty) : remainingToReceive;

    if (remainingToReceive <= 0 && inputQty > 0) {
        throw new BadRequestException(`All items (${op.qtyPond}) already received at CP!`);
    }

    if (inputQty > remainingToReceive) {
        throw new BadRequestException(`OVER LIMIT! Sisa: ${remainingToReceive}, Input: ${inputQty}`);
    }

    // Update DB
    await (this.prisma as any).productionOrder.update({
        where: { id: op.id },
        data: { 
            currentStation: 'CP', 
            status: 'WIP',
            cpInQty: { increment: inputQty }
        }
    });
    
    // Log Transaksi Masuk
    await (this.prisma as any).stationLog.create({
        data: {
            opId: op.id,
            station: 'CP',
            actionType: 'IN',
            qtyGood: inputQty, 
            timestamp: new Date()
        }
    });

    console.log(`🚀 [Service] CP Partial In: +${inputQty}. Total: ${currentReceived + inputQty}/${op.qtyPond}`);
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
                  patternName: dto.patternName || null, 
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

  async scanInSewing(dto: { qrCode: string, qty?: number }) {
    const qrCode = dto.qrCode ? dto.qrCode.trim() : "";
    console.log(`🧵 [Service] Sewing Scan: '${qrCode}'`);

    let op = await (this.prisma as any).productionOrder.findUnique({ where: { qrCode } });
    if (!op) {
        const parts = qrCode.split('-');
        if (parts.length >= 1) op = await (this.prisma as any).productionOrder.findUnique({ where: { opNumber: parts[0] } });
    }
    
    if (!op) throw new NotFoundException('QR Invalid / OP Not Found');

    if (op.cpGoodQty <= 0) {
        throw new BadRequestException(`No CP Stock available yet!`);
    }

    if (op.currentStation === 'CP') {
        await (this.prisma as any).productionOrder.update({
            where: { id: op.id },
            data: { currentStation: 'SEWING', status: 'WIP' }
        });
        
        await (this.prisma as any).stationLog.create({
            data: {
                opId: op.id,
                station: 'SEWING',
                actionType: 'IN',
                qtyGood: op.cpGoodQty, 
                timestamp: new Date()
            }
        });
    }
    return op;
  }

  async sewingStart(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          
          const incrementQty = dto.qty || 1;
          const newStartQty = op.sewingInQty + incrementQty;
          
          // Validasi Supply dari CP
          if (newStartQty > op.cpGoodQty) {
              throw new BadRequestException(`Over Supply! CP Stock: ${op.cpGoodQty}, Started: ${op.sewingInQty}`);
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
          const newFinishQty = op.sewingOutQty + dto.qty;
          
          // Validasi Output vs Input (WIP)
          if (newFinishQty > op.sewingInQty) {
              throw new BadRequestException(`Invalid Output! Started: ${op.sewingInQty}, Finished: ${op.sewingOutQty}`);
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

          let nextStation = 'SEWING';
          // Auto move to QC jika FULL target (opsional)
          // Note: Target di Sewing adalah qtyPond (Parts), bukan qtyOp (Set)
          const targetCheck = op.qtyPond > 0 ? op.qtyPond : op.qtyOp;
          
          if (newFinishQty >= targetCheck) nextStation = 'QC';

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
  // 4. QC STATION
  // ==========================================

  async scanInQC(qrCode: string) {
    let op = await (this.prisma as any).productionOrder.findUnique({ where: { qrCode } });
    if (!op) {
         const parts = qrCode.split('-');
         if (parts.length >= 1) op = await (this.prisma as any).productionOrder.findUnique({ where: { opNumber: parts[0] } });
    }
    
    if (!op) throw new NotFoundException('QR Invalid');

    if (op.currentStation !== 'SEWING' && op.currentStation !== 'QC') {
        throw new BadRequestException(`OP at ${op.currentStation}. Not ready for QC.`);
    }

    if (op.currentStation === 'SEWING') { 
         if (op.sewingOutQty <= 0) throw new BadRequestException("No output from Sewing.");
        await (this.prisma as any).productionOrder.update({ where: { id: op.id }, data: { currentStation: 'QC', status: 'WIP' } });
        await (this.prisma as any).stationLog.create({ data: { opId: op.id, station: 'QC', actionType: 'IN', qtyGood: op.sewingOutQty, timestamp: new Date() } });
    }
    return op;
  }

  async submitQcResult(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          const log = await (tx as any).stationLog.create({
              data: { opId: dto.opId, station: 'QC', actionType: 'INSPECT', qtyGood: dto.good, qtyNG: dto.ng, ngReason: dto.ngReason || null, timestamp: new Date() }
          });
          const newQcGood = op.qcGoodQty + dto.good;
          await (tx as any).productionOrder.update({ where: { id: dto.opId }, data: { qcGoodQty: newQcGood } });
          return { log, newQcGood };
      });
  }

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

  // Helper Buffer
  async getPackingBuffer(styleCode: string) {
    const ops = await (this.prisma as any).productionOrder.findMany({
        where: { styleCode },
        select: { packedQty: true }
    });
    const totalPacked = ops.reduce((acc, curr) => acc + (curr.packedQty || 0), 0);
    const buffer = totalPacked % 100;
    return { styleCode, totalPacked, buffer };
  }
  
  async getPackingHistory() {
      return (this.prisma as any).stationLog.findMany({
          where: { actionType: 'PACKING_BOX' },
          include: { op: true },
          orderBy: { timestamp: 'desc' },
          take: 50
      });
  }

  async packingInput(dto: { opId: string, qty: number, isBox: boolean }) {
    return this.prisma.$transaction(async (tx) => {
      const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
      const wipPacking = op.qcGoodQty - op.packedQty;
      
      if (dto.qty > wipPacking) throw new BadRequestException(`Over Packing! Limit: ${wipPacking}`);

      if (op.currentStation !== 'PACKING' && op.currentStation === 'QC') {
         await (tx as any).productionOrder.update({ where: { id: op.id }, data: { currentStation: 'PACKING', status: 'WIP' } });
      }

      const actionType = dto.isBox ? 'PACKING_BOX' : 'PACKING_HOLD';
      const qrBoxCode = dto.isBox ? `${op.opNumber}-${op.styleCode}` : null;

      const log = await (tx as any).stationLog.create({
        data: { 
            opId: dto.opId, 
            station: 'PACKING', 
            actionType: actionType, 
            qtyGood: dto.qty, 
            timestamp: new Date(),
            patternName: qrBoxCode 
        }
      });

      const newPackedQty = op.packedQty + dto.qty;
      let qrCode = op.qrCode;

      // Logic Close: Cek apakah packedQty sudah >= Target Parts (qtyPond)
      // Jika qtyPond belum ada (legacy), gunakan qtyOp
      const target = op.qtyPond > 0 ? op.qtyPond : op.qtyOp;

      if (newPackedQty >= target) {
          if (!qrCode) qrCode = `${op.opNumber}-${op.styleCode}`;
      }

      await (tx as any).productionOrder.update({
        where: { id: dto.opId },
        data: { 
            packedQty: newPackedQty,
            qrCode: qrCode 
        }
      });
      return { log, newPackedQty, qrCode: qrBoxCode };
    });
  }

  async packingFinish(dto: any) {
      return { success: true };
  }

  // ==========================================
  // 6. FINISHED GOODS (FG)
  // ==========================================
  
  async scanInFG(qrCode: string) {
      let op = await (this.prisma as any).productionOrder.findUnique({ where: { qrCode } });
      if (!op) {
           const parts = qrCode.split('-');
           if (parts.length >= 1) op = await (this.prisma as any).productionOrder.findUnique({ where: { opNumber: parts[0] } });
      }
      
      if (!op) throw new NotFoundException('QR Invalid');
      
      if (op.packedQty <= 0) {
          throw new BadRequestException('OP has 0 qty packed.');
      }

      if (op.currentStation !== 'FG' && op.currentStation !== 'CLOSED_FG') {
          await (this.prisma as any).productionOrder.update({ 
              where: { id: op.id }, 
              data: { currentStation: 'FG', status: 'WIP' } 
          });
      }
      return op;
  }

  async submitFG(dto: any) {
      return this.prisma.$transaction(async (tx) => {
          const op = await (tx as any).productionOrder.findUnique({ where: { id: dto.opId } });
          
          if(op.status === 'CLOSED_FG') throw new BadRequestException("OP already stocked in.");

          await (tx as any).stationLog.create({
              data: { opId: dto.opId, station: 'FG', actionType: 'FG_IN', qtyGood: op.packedQty, timestamp: new Date() }
          });

          await (tx as any).finishedGoodStock.upsert({
              where: { customerPartNo: op.styleCode }, 
              update: { totalStock: { increment: op.packedQty }, totalBoxes: { increment: 1 } },
              create: { styleCode: op.styleCode, customerPartNo: op.styleCode, totalStock: op.packedQty, totalBoxes: 1 }
          });

          await (tx as any).productionOrder.update({ where: { id: dto.opId }, data: { status: 'CLOSED_FG' } });
          return { success: true };
      });
  }

  async shipping(dto: { styleCode: string, qty: number }) {
      return this.prisma.$transaction(async (tx) => {
          const stock = await (tx as any).finishedGoodStock.findUnique({ where: { customerPartNo: dto.styleCode } });
          if (!stock) throw new NotFoundException('Stock not found');
          if (dto.qty > stock.totalStock) throw new BadRequestException(`Insufficient Stock! Available: ${stock.totalStock}`);

          await (tx as any).finishedGoodStock.update({
              where: { customerPartNo: dto.styleCode },
              data: { totalStock: { decrement: dto.qty } }
          });
          return { success: true, remaining: stock.totalStock - dto.qty };
      });
  }
  
  async getFgStocks() {
      return (this.prisma as any).finishedGoodStock.findMany({ orderBy: { lastUpdated: 'desc' } });
  }
}