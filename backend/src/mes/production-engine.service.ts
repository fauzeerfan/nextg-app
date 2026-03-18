// backend/src/mes/production-engine.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IotDeviceService, PondOp, PondPattern } from '../iot/iot-device.service';
import { StationCode } from '@prisma/client';

@Injectable()
export class ProductionEngineService {
  constructor(
    private prisma: PrismaService,
    private iotDeviceService: IotDeviceService,
  ) {}

  // ================= CUTTING POND MANUAL INPUT =================
  async cuttingPond(opId: string, qty: number) {
    const op = await this.prisma.productionOrder.findUnique({
      where: { id: opId },
      include: { line: true },
    });

    if (!op) throw new NotFoundException('OP not found');

    await this.prisma.productionOrder.update({
      where: { id: op.id },
      data: {
        qtyPond: { increment: qty },
        currentStation: StationCode.CP,
      },
    });

    return { success: true };
  }

// ================= CP SCAN (DHRISTI) =================
async cpScan(qrCode: string, qty: number) {
  const opNumber = qrCode.split('-')[1];
  const op = await this.prisma.productionOrder.findUnique({
    where: { opNumber },
    include: { line: true },
  });
  if (!op) throw new NotFoundException('OP not found');
  if (!op.readyForCP) {
    throw new BadRequestException('OP is not ready for Check Panel');
  }

  // ✅ qty yang dikirim harus sama dengan setsReadyForSewing dari Pond
  if (qty !== op.setsReadyForSewing) {
    throw new BadRequestException(`Quantity mismatch: expected ${op.setsReadyForSewing}, got ${qty}`);
  }

  await this.prisma.productionOrder.update({
    where: { id: op.id },
    data: {
      currentStation: StationCode.CP,
      readyForCP: false,
      qtyCP: op.setsReadyForSewing,  // ✅ SET qtyCP (dalam sets)
      cpGoodQty: 0,                   // ✅ Reset inspection counters
      cpNgQty: 0,
    },
  });

  await this.prisma.productionLog.create({
    data: {
      opId: op.id,
      station: StationCode.CP,
      type: 'RECEIVED',
      qty: op.setsReadyForSewing,
      note: `Received from Pond via scan with qty ${qty} sets`,
    },
  });

  return { success: true };
}

  // ================= SEND TO SEWING VIA SCANNER (PARSIAL) =================
async sendToSewingFromScan(qrCode: string, qty: number) {
  const parts = qrCode.split('-');
  const opNumber = parts.length > 1 ? parts[1] : qrCode;

  const op = await this.prisma.productionOrder.findUnique({
    where: { opNumber },
  });
  if (!op) throw new NotFoundException('OP not found');

  if (op.currentStation !== StationCode.CP) {
    throw new BadRequestException('OP is not at Check Panel');
  }

  if ((op.setsReadyForSewing ?? 0) < qty) {
    throw new BadRequestException(`Insufficient sets ready. Available: ${op.setsReadyForSewing}`);
  }

  return this.prisma.$transaction(async (tx) => {
    const newSetsReady = (op.setsReadyForSewing ?? 0) - qty;
    const updates: any = {
      setsReadyForSewing: { decrement: qty },
      qtySewingIn: { increment: qty },
    };
    // Jika semua set sudah dikirim, pindahkan OP ke Sewing
    if (newSetsReady === 0) {
      updates.currentStation = StationCode.SEWING;
    }
    await tx.productionOrder.update({
      where: { id: op.id },
      data: updates,
    });

    await tx.productionLog.create({
      data: {
        opId: op.id,
        station: StationCode.CP,
        type: 'SEND_TO_SEWING',
        qty,
        note: `Sent ${qty} sets to Sewing via scan`,
      },
    });

    return { success: true, remaining: newSetsReady };
  });
}

  // ================= SEWING START =================
  async sewingStart(deviceId: string, opId: string, qty: number) {
  const device = await this.prisma.iotDevice.findUnique({ where: { deviceId } });
  if (!device) throw new NotFoundException('Device not found');

  const op = await this.prisma.productionOrder.findUnique({
    where: { id: opId },
    include: { sewingStartProgress: true }
  });
  if (!op) throw new NotFoundException('OP not found');

  // Tentukan startIndex dari device (fungsi extractIndexFromDevice sudah ada)
  const startIndex = this.extractIndexFromDevice(device, 'start');
  if (startIndex !== 1 && startIndex !== 2) {
    throw new BadRequestException('Invalid start index for this device');
  }

  // Ambil nilai saat ini untuk startIndex tersebut
  const startProgress = op.sewingStartProgress || [];
  const currentStart = startProgress.find(s => s.startIndex === startIndex)?.qty || 0;

  // Batas maksimum adalah qtySewingIn (dalam set utuh), karena setiap set utuh membutuhkan 1 setengah set dari start ini
  if (currentStart + qty > op.qtySewingIn) {
    throw new BadRequestException(`Cannot exceed available sets. Max: ${op.qtySewingIn - currentStart}`);
  }

  // Lakukan update dengan transaksi untuk menghindari race condition
  return this.prisma.$transaction(async (tx) => {
    // Lock baris start progress yang akan diupdate
    await tx.$executeRaw`
      SELECT * FROM "SewingStartProgress"
      WHERE "opId" = ${opId} AND "startIndex" = ${startIndex}
      FOR UPDATE
    `;

    await tx.sewingStartProgress.upsert({
      where: { opId_startIndex: { opId, startIndex } },
      update: { qty: { increment: qty } },
      create: { opId, startIndex, qty },
    });

    // Tidak perlu mengupdate qtySewingIn karena itu hanya bertambah saat pengiriman dari Check Panel
    return { success: true };
  });
}

  // ================= SEWING FINISH (dengan row locking) =================
  async sewingFinish(deviceId: string, opId: string, qty: number) {
    return this.prisma.$transaction(async (tx) => {
      const device = await tx.iotDevice.findUnique({ where: { deviceId } });
      if (!device) throw new NotFoundException('Device not found');

      const line = await tx.lineMaster.findUnique({ where: { code: device.lineCode } });
      const sewingConfig = line?.sewingConfig as any;

      let finishIndex = this.extractIndexFromDevice(device, 'finish');
      let finishConfig = sewingConfig?.finishes?.find((f: any) => f.id === finishIndex);
      if (!finishConfig && line?.code === 'K1YH') {
        finishConfig = { inputStarts: [1, 2] };
      }
      if (!finishConfig) {
        throw new BadRequestException(`No configuration for finish index ${finishIndex} on line ${line?.code}`);
      }
      const inputStartIndices = finishConfig.inputStarts;

      for (const startIdx of inputStartIndices) {
        await tx.$executeRaw`
          SELECT * FROM "SewingStartProgress"
          WHERE "opId" = ${opId} AND "startIndex" = ${startIdx}
          FOR UPDATE
        `;
      }

      const startProgresses = await tx.sewingStartProgress.findMany({
        where: { opId, startIndex: { in: inputStartIndices } }
      });

      if (startProgresses.length === 0) {
        throw new BadRequestException('No start progress found for this finish');
      }

      const finishProgress = await tx.sewingFinishProgress.findUnique({
        where: { opId_finishIndex: { opId, finishIndex } }
      });
      const currentFinish = finishProgress?.qty || 0;

      const minStart = Math.min(...startProgresses.map(p => p.qty));
      const available = Math.max(0, minStart - currentFinish);
      const possibleSets = Math.min(available, qty);

      if (possibleSets > 0) {
        await tx.sewingFinishProgress.upsert({
          where: { opId_finishIndex: { opId, finishIndex } },
          update: { qty: { increment: possibleSets } },
          create: { opId, finishIndex, qty: possibleSets }
        });

        await tx.productionOrder.update({
          where: { id: opId },
          data: { qtySewingOut: { increment: possibleSets } }
        });
      }

      return { success: true, setsProduced: possibleSets };
    });
  }

  // ================= QC PROCESS =================
  async qcProcess(opId: string, good: number, ng: number) {
    const op = await this.prisma.productionOrder.findUnique({
      where: { id: opId },
    });

    if (!op) throw new NotFoundException('OP not found');

    await this.prisma.productionOrder.update({
      where: { id: op.id },
      data: {
        qtyQC: { increment: good },
        qcNgQty: { increment: ng },
        currentStation: StationCode.PACKING,
      },
    });

    return { success: true };
  }

  // ================= PACKING =================
  async packing(opId: string, qty: number) {
    const op = await this.prisma.productionOrder.findUnique({
      where: { id: opId },
    });

    if (!op) throw new NotFoundException('OP not found');

    await this.prisma.productionOrder.update({
      where: { id: op.id },
      data: {
        qtyPacking: { increment: qty },
        currentStation: StationCode.FG,
      },
    });

    return { success: true };
  }

  // ================= FG SCAN =================
  async fgScan(qrCode: string, qty: number) {
    const opNumber = qrCode.split('-')[1];

    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
    });

    if (!op) throw new NotFoundException('OP not found');

    await this.prisma.productionOrder.update({
      where: { id: op.id },
      data: {
        qtyFG: { increment: qty },
        status: 'DONE',
        currentStation: StationCode.FG,
      },
    });

    return { success: true };
  }

  // =====================================================
  // NEW METHOD - Transfer dari Cutting Pond ke Check Panel
  // =====================================================
  async pondToCPTransfer(qrCode: string, qty: number) {
    // Extract OP number dari QR Code
    const parts = qrCode.split('-');
    const opNumber = parts.length > 1 ? parts[1] : qrCode;
    
    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
    });
    
    if (!op) {
      throw new NotFoundException('OP not found');
    }
    
    // ✅ Validasi 1: OP harus masih di Cutting Pond
    if (op.currentStation !== StationCode.CUTTING_POND) {
      throw new BadRequestException(
        `OP is not at Cutting Pond (current: ${op.currentStation})`
      );
    }
    
    // ✅ Validasi 2: OP harus sudah readyForCP
    if (!op.readyForCP) {
      throw new BadRequestException('OP is not ready for Check Panel yet');
    }
    
    // ✅ Validasi 3: allPatternsCompleted harus true
    if (!op.allPatternsCompleted) {
      throw new BadRequestException('Not all patterns have been completed at Pond');
    }
    
    // ✅ Validasi 4: Qty harus sama dengan setsReadyForSewing (NO PARTIAL)
    if (qty !== op.setsReadyForSewing) {
      throw new BadRequestException(
        `Quantity must match setsReadyForSewing (${op.setsReadyForSewing}). Got: ${qty}. Partial transfer not allowed from Pond to CP.`
      );
    }
    
    return this.prisma.$transaction(async (tx) => {
      // Update ProductionOrder
      await tx.productionOrder.update({
        where: { id: op.id },
        data: {
          currentStation: StationCode.CP,  // ✅ Sekarang pindah ke CP
          readyForCP: false,               // ✅ Reset flag
          qtyCP: qty,                      // ✅ Qty yang diterima di CP
          cpGoodQty: 0,                    // ✅ Reset CP inspection counters
          cpNgQty: 0,
        },
      });
      
      // Create ProductionLog
      await tx.productionLog.create({
        data: {
          opId: op.id,
          station: StationCode.CUTTING_POND,
          type: 'TRANSFER_TO_CP',
          qty: qty,
          note: `Transferred ${qty} sets from Cutting Pond to Check Panel`,
        },
      });
      
      console.log(`✅ OP ${op.opNumber} transferred from Pond to CP: ${qty} sets`);
      
      return { success: true, qty };
    });
  }

  // ================= POND QUEUE (frontend) =================
  async getPondQueue() {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: 'WIP',
        currentStation: StationCode.CUTTING_POND,
        qtyEntan: { gt: 0 },
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });

    return ops.map(op => {
      const multiplier = op.line?.patternMultiplier || 1;
      const targetPond = op.qtyEntan * multiplier;
      return {
        id: op.id,
        opNumber: op.opNumber,
        style: op.styleCode,
        entanQty: op.qtyEntan,
        cutQty: op.qtyPond,
        sisa: targetPond - op.qtyPond,
      };
    });
  }

  // ================= POND MACHINE (IOT SPARSHA) =================
  async handlePondButton(deviceId: string, button: 'YELLOW' | 'RED' | 'GREEN') {
    const device = await this.prisma.iotDevice.findUnique({
      where: { deviceId },
    });
    if (!device) throw new NotFoundException('Device not registered');

    let session = this.iotDeviceService.getSession(deviceId);
    if (!session) {
      session = {
        deviceId,
        station: device.station,
        line: device.lineCode,
      };
      this.iotDeviceService.setSession(deviceId, session);
    }

    // 🔄 Refresh daftar OP setiap kali tombol ditekan
    const freshOps = await this.getPondOps(device.lineCode);
    session.pondOps = freshOps;
    session.lastRefresh = Date.now();

    if (!session.pondOps || session.pondOps.length === 0) {
      session.pondOps = undefined;
      session.pondOpIndex = undefined;
      session.pondSelectedOpId = undefined;
      session.pondPatternIndex = undefined;
      session.pondState = undefined;
      return { line1: 'No OP', line2: 'Waiting...' };
    }

    // Cari indeks berdasarkan selectedOpId jika ada
    if (session.pondSelectedOpId) {
      const newIndex = session.pondOps.findIndex(op => op.id === session.pondSelectedOpId);
      if (newIndex >= 0) {
        session.pondOpIndex = newIndex;
      } else {
        // Jika OP yang dipilih sudah tidak ada, pilih OP pertama
        session.pondOpIndex = 0;
        session.pondSelectedOpId = session.pondOps[0].id;
        session.pondPatternIndex = 0;
        session.pondState = 'SELECT_OP';
      }
    } else {
      session.pondOpIndex = 0;
      session.pondSelectedOpId = session.pondOps[0].id;
      session.pondPatternIndex = 0;
      session.pondState = 'SELECT_OP';
    }

    const currentOp = session.pondOps[session.pondOpIndex];

    // ===== SELECT OP =====
    if (session.pondState === 'SELECT_OP') {
      if (button === 'YELLOW') {
        session.pondOpIndex = ((session.pondOpIndex ?? 0) + 1) % session.pondOps.length;
        session.pondSelectedOpId = session.pondOps[session.pondOpIndex].id;
      } else if (button === 'RED') {
        session.pondOpIndex = ((session.pondOpIndex ?? 0) - 1 + session.pondOps.length) % session.pondOps.length;
        session.pondSelectedOpId = session.pondOps[session.pondOpIndex].id;
      } else if (button === 'GREEN') {
        session.pondState = 'SELECT_PATTERN';
        session.pondPatternIndex = 0;
      }
    }

    // ===== SELECT PATTERN =====
    else if (session.pondState === 'SELECT_PATTERN') {
      const availablePatterns = currentOp.patterns.filter(p => !p.completed);
      if (availablePatterns.length === 0) {
        session.pondState = 'SELECT_OP';
        return this.handlePondButton(deviceId, button);
      }

      const idx = session.pondPatternIndex ?? 0;
      if (idx >= availablePatterns.length) {
        session.pondPatternIndex = 0;
      }
      const pattern = availablePatterns[session.pondPatternIndex!];

      if (button === 'YELLOW') {
        session.pondState = 'SELECT_OP';
        session.pondPatternIndex = 0;
      } else if (button === 'RED') {
        session.pondPatternIndex = (session.pondPatternIndex! + 1) % availablePatterns.length;
      } else if (button === 'GREEN') {
        session.pondState = 'COUNTING';
      }
    }

    // ===== COUNTING =====
    else if (session.pondState === 'COUNTING') {
      const availablePatterns = currentOp.patterns.filter(p => !p.completed);
      const idx = session.pondPatternIndex ?? 0;
      if (idx >= availablePatterns.length) {
        session.pondState = 'SELECT_PATTERN';
        return this.handlePondButton(deviceId, button);
      }
      const pattern = availablePatterns[idx];

      if (button === 'GREEN') {
        // GOOD
        await this.prisma.$transaction([
          this.prisma.productionOrder.update({
            where: { id: currentOp.id },
            data: { qtyPond: { increment: 1 } },
          }),
          this.prisma.productionLog.create({
            data: {
              opId: currentOp.id,
              station: StationCode.CUTTING_POND,
              type: 'GOOD',
              qty: 1,
              note: `Pattern: ${pattern.name}`,
            },
          }),
          this.prisma.patternProgress.upsert({
            where: {
              opId_patternIndex: {
                opId: currentOp.id,
                patternIndex: pattern.index,
              },
            },
            update: {
              good: { increment: 1 },
              ng: pattern.ng,
              completed: pattern.completed,
            },
            create: {
              opId: currentOp.id,
              patternIndex: pattern.index,
              patternName: pattern.name,
              target: pattern.target,
              good: 1,
              ng: 0,
              completed: false,
            },
          }),
        ]);
        pattern.good++;
        pattern.current++;
        currentOp.qtyPond++;

        if (pattern.current >= pattern.target) {
          pattern.completed = true;
          await this.prisma.patternProgress.update({
            where: {
              opId_patternIndex: {
                opId: currentOp.id,
                patternIndex: pattern.index,
              },
            },
            data: { completed: true },
          });
          session.pondState = 'SELECT_PATTERN';
          session.pondPatternIndex = 0;
        }
      } else if (button === 'RED') {
        // NOT GOOD
        await this.prisma.$transaction([
          this.prisma.productionOrder.update({
            where: { id: currentOp.id },
            data: { qtyPondNg: { increment: 1 } },
          }),
          this.prisma.productionLog.create({
            data: {
              opId: currentOp.id,
              station: StationCode.CUTTING_POND,
              type: 'NG',
              qty: 1,
              note: `Pattern: ${pattern.name}`,
            },
          }),
          this.prisma.patternProgress.upsert({
            where: {
              opId_patternIndex: {
                opId: currentOp.id,
                patternIndex: pattern.index,
              },
            },
            update: {
              ng: { increment: 1 },
              good: pattern.good,
              completed: pattern.completed,
            },
            create: {
              opId: currentOp.id,
              patternIndex: pattern.index,
              patternName: pattern.name,
              target: pattern.target,
              good: 0,
              ng: 1,
              completed: false,
            },
          }),
        ]);
        pattern.ng++;
        pattern.current++;
      } else if (button === 'YELLOW') {
        session.pondState = 'SELECT_PATTERN';
      }

      // Cek apakah semua pola selesai
      const allDone = currentOp.patterns.every(p => p.completed);
      if (allDone) {
        // 🔥 FIX: Hitung setsReadyForSewing dari minimum good patterns
        const setComplete = Math.min(...currentOp.patterns.map(p => p.good));
        
        await this.prisma.productionOrder.update({
          where: { id: currentOp.id },
          data: {
            qtyPond: currentOp.qtyPond,        // Total pieces counted
            qtyPondNg: currentOp.qtyPondNg,    // Total NG pieces
            setsReadyForSewing: setComplete,   // ✅ Sets yang bisa dibentuk (MIN good)
            allPatternsCompleted: true,        // ✅ Semua pattern selesai dicek
            readyForCP: true,                  // ✅ Siap dipindah ke CP
            // ❌ JANGAN UBAH currentStation - Tetap di CUTTING_POND
            // currentStation: StationCode.CP,  // ❌ HAPUS INI
          },
        });
        
        console.log(`✅ Pond completed for OP ${currentOp.opNumber}: ${setComplete} sets ready for CP`);
        
        // Hapus OP dari session
        session.pondOps = session.pondOps.filter(o => o.id !== currentOp.id);
        if (session.pondOps.length === 0) {
          session.pondOps = undefined;
          session.pondOpIndex = undefined;
          session.pondSelectedOpId = undefined;
        } else {
          session.pondOpIndex = Math.min(session.pondOpIndex!, session.pondOps.length - 1);
          session.pondSelectedOpId = session.pondOps[session.pondOpIndex].id;
        }
        session.pondState = 'SELECT_OP';
      }
    }

    // ===== DISPLAY =====
    if (!session.pondOps || session.pondOps.length === 0) {
      return { line1: 'No OP', line2: 'Waiting...' };
    }
    const op = session.pondOps[session.pondOpIndex ?? 0];
    const availablePatterns = op.patterns.filter(p => !p.completed);

    if (session.pondState === 'SELECT_OP') {
      let line1 = op.opNumber;
      if (line1.length > 16) line1 = line1.substring(0, 13) + '...';
      let line2 = op.itemNumberFG;
      if (line2.length > 16) line2 = line2.substring(0, 13) + '...';
      return { line1, line2 };
    } else if (session.pondState === 'SELECT_PATTERN') {
      const pattern = availablePatterns[session.pondPatternIndex ?? 0];
      let line1 = pattern.name;
      if (line1.length > 16) line1 = line1.substring(0, 13) + '...';
      let line2 = `G:${pattern.good} NG:${pattern.ng} S:${pattern.target - pattern.current}`;
      if (line2.length > 16) line2 = line2.substring(0, 13) + '...';
      return { line1, line2 };
    } else if (session.pondState === 'COUNTING') {
      const pattern = availablePatterns[session.pondPatternIndex ?? 0];
      const remaining = pattern.target - pattern.current;
      let line1 = `${op.opNumber} +${pattern.good + pattern.ng}`;
      if (line1.length > 16) line1 = line1.substring(0, 13) + '...';
      let line2 = `${pattern.name} sisa ${remaining}`;
      if (line2.length > 16) line2 = line2.substring(0, 13) + '...';
      return { line1, line2 };
    }
    return { line1: 'Ready', line2: '' };
  }

  /**
   * Mendapatkan tampilan LCD untuk Sparsha Pond berdasarkan sesi saat ini
   * @param deviceId ID perangkat
   * @returns Object berisi line1 dan line2 untuk ditampilkan di LCD
   */
  async getPondDisplay(deviceId: string): Promise<{ line1: string; line2: string }> {
    const device = await this.prisma.iotDevice.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException('Device not registered');

    let session = this.iotDeviceService.getSession(deviceId);
    if (!session) {
      session = { deviceId, station: device.station, line: device.lineCode };
      this.iotDeviceService.setSession(deviceId, session);
    }

    // Ambil data terbaru
    const freshOps = await this.getPondOps(device.lineCode);
    session.pondOps = freshOps;
    session.lastRefresh = Date.now();

    if (!session.pondOps || session.pondOps.length === 0) {
      session.pondOps = undefined;
      session.pondOpIndex = undefined;
      session.pondSelectedOpId = undefined;
      session.pondPatternIndex = undefined;
      session.pondState = undefined;
      return { line1: 'No OP', line2: 'Waiting...' };
    }

    // Cari indeks berdasarkan selectedOpId
    if (session.pondSelectedOpId) {
      const newIndex = session.pondOps.findIndex(op => op.id === session.pondSelectedOpId);
      if (newIndex >= 0) {
        session.pondOpIndex = newIndex;
      } else {
        session.pondOpIndex = 0;
        session.pondSelectedOpId = session.pondOps[0].id;
        session.pondPatternIndex = 0;
        session.pondState = 'SELECT_OP';
      }
    } else {
      session.pondOpIndex = 0;
      session.pondSelectedOpId = session.pondOps[0].id;
      session.pondPatternIndex = 0;
      session.pondState = 'SELECT_OP';
    }

    const op = session.pondOps[session.pondOpIndex];
    const availablePatterns = op.patterns.filter(p => !p.completed);

    if (session.pondState === 'SELECT_OP') {
      let line1 = op.opNumber;
      if (line1.length > 16) line1 = line1.substring(0, 13) + '...';
      let line2 = op.itemNumberFG;
      if (line2.length > 16) line2 = line2.substring(0, 13) + '...';
      return { line1, line2 };
    } else if (session.pondState === 'SELECT_PATTERN') {
      const pattern = availablePatterns[session.pondPatternIndex ?? 0];
      let line1 = pattern.name;
      if (line1.length > 16) line1 = line1.substring(0, 13) + '...';
      let line2 = `G:${pattern.good} NG:${pattern.ng} S:${pattern.target - pattern.current}`;
      if (line2.length > 16) line2 = line2.substring(0, 13) + '...';
      return { line1, line2 };
    } else if (session.pondState === 'COUNTING') {
      const pattern = availablePatterns[session.pondPatternIndex ?? 0];
      const remaining = pattern.target - pattern.current;
      let line1 = `${op.opNumber} +${pattern.good + pattern.ng}`;
      if (line1.length > 16) line1 = line1.substring(0, 13) + '...';
      let line2 = `${pattern.name} sisa ${remaining}`;
      if (line2.length > 16) line2 = line2.substring(0, 13) + '...';
      return { line1, line2 };
    }

    return { line1: 'Ready', line2: '' };
  }

  // ================= GET POND OPS =================
  private async getPondOps(lineCode: string): Promise<PondOp[]> {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        currentStation: StationCode.CUTTING_POND,
        status: 'WIP',
        readyForCP: false,
        line: { code: lineCode },
        qtyEntan: { gt: 0 },
      },
      include: {
        line: {
          include: {
            patterns: {
              include: { parts: true },
            },
          },
        },
        patternProgress: true,
      },
    });

    console.log(`getPondOps for line ${lineCode} found ${ops.length} ops`);
    ops.forEach(op => console.log(`- ${op.opNumber} station=${op.currentStation} readyForCP=${op.readyForCP}`));

    return ops.map(op => {
      const multiplier = op.line.patternMultiplier || 1;
      const patterns: PondPattern[] = [];

      const patternMaster = op.line.patterns?.[0];
      const progressMap = new Map(op.patternProgress?.map(p => [p.patternIndex, p]) || []);

      if (patternMaster && patternMaster.parts) {
        patternMaster.parts.forEach((part, idx) => {
          const prog = progressMap.get(idx);
          patterns.push({
            index: idx,
            name: part.name,
            target: op.qtyEntan,
            good: prog?.good || 0,
            ng: prog?.ng || 0,
            current: (prog?.good || 0) + (prog?.ng || 0),
            completed: prog?.completed || false,
          });
        });
      } else {
        for (let i = 0; i < multiplier; i++) {
          const prog = progressMap.get(i);
          patterns.push({
            index: i,
            name: `Pola ${i + 1}`,
            target: op.qtyEntan,
            good: prog?.good || 0,
            ng: prog?.ng || 0,
            current: (prog?.good || 0) + (prog?.ng || 0),
            completed: prog?.completed || false,
          });
        }
      }

      return {
        id: op.id,
        opNumber: op.opNumber,
        style: op.styleCode,
        itemNumberFG: op.itemNumberFG,
        qtyEntan: op.qtyEntan,
        qtyPond: op.qtyPond,
        qtyPondNg: op.qtyPondNg,  // 🔥 TAMBAH INI
        multiplier,
        patterns,
      };
    });
  }

  // ================= UTILITY: Ekstrak index dari device =================
  private extractIndexFromDevice(device: any, type: 'start' | 'finish'): number {
    if (device.config && typeof device.config === 'object' && 'sewingIndex' in device.config) {
      return (device.config as any).sewingIndex;
    }
    const match = device.deviceId.match(/(\d+)$/);
    if (match) return parseInt(match[1]);
    return 1;
  }
}