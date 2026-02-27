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

  // ================= CP SCAN (DRISTI) =================
  async cpScan(qrCode: string, qty: number) {
    const opNumber = qrCode.split('-')[1];
    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
    });
    if (!op) throw new NotFoundException('OP not found');

    if (!op.readyForCP) {
      throw new BadRequestException('OP is not ready for Check Panel');
    }

    if (qty !== op.qtyCP) {
      throw new BadRequestException(`Quantity mismatch: expected ${op.qtyCP}, got ${qty}`);
    }

    await this.prisma.productionOrder.update({
      where: { id: op.id },
      data: {
        currentStation: StationCode.CP,
        readyForCP: false,
      },
    });

    await this.prisma.productionLog.create({
      data: {
        opId: op.id,
        station: StationCode.CP,
        type: 'RECEIVED',
        qty: op.qtyCP,
        note: `Received from Pond via scan with qty ${qty}`,
      },
    });

    return { success: true };
  }

  // ================= SEWING RECEIVE (SCAN FROM CHECK PANEL) =================
  async sewingReceive(qrCode: string, qty: number) {
    const parts = qrCode.split('-');
    const opNumber = parts.length > 1 ? parts[1] : qrCode;

    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
    });
    if (!op) throw new NotFoundException('OP not found');

    // Pastikan OP berada di Check Panel
    if (op.currentStation !== StationCode.CP) {
      throw new BadRequestException('OP is not at Check Panel');
    }

    // 🔥 Validasi: harus ada set yang siap untuk sewing
    if ((op.setsReadyForSewing ?? 0) <= 0) {
      throw new BadRequestException(
        'No sets ready for sewing. Possible cause: all patterns have 0 good pieces.'
      );
    }

    // Pindahkan ke Sewing
    await this.prisma.productionOrder.update({
      where: { id: op.id },
      data: { currentStation: StationCode.SEWING },
    });

    // Catat log penerimaan
    await this.prisma.productionLog.create({
      data: {
        opId: op.id,
        station: StationCode.SEWING,
        type: 'RECEIVED',
        qty: qty,
        note: `Received from Check Panel via scan`,
      },
    });

    return { success: true, opNumber: op.opNumber, qty };
  }

  // ================= SEWING START =================
  async sewingStart(deviceId: string, opId: string, qty: number) {
    const device = await this.prisma.iotDevice.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException('Device not found');

    const op = await this.prisma.productionOrder.findUnique({
      where: { id: opId },
      select: { setsReadyForSewing: true, qtySewingIn: true, currentStation: true }
    });
    if (!op) throw new NotFoundException('OP not found');
    if (op.currentStation !== StationCode.SEWING) {
      throw new BadRequestException('OP is not at Sewing station');
    }

    const remaining = op.setsReadyForSewing - op.qtySewingIn;
    if (qty > remaining) {
      throw new BadRequestException(`Cannot start more than remaining ${remaining} sets`);
    }

    const line = await this.prisma.lineMaster.findUnique({ where: { code: device.lineCode } });
    const sewingConfig = line?.sewingConfig as any;

    let startIndex = this.extractIndexFromDevice(device, 'start');

    await this.prisma.sewingStartProgress.upsert({
      where: { opId_startIndex: { opId, startIndex } },
      update: { qty: { increment: qty } },
      create: { opId, startIndex, qty },
    });

    const totalIn = await this.prisma.sewingStartProgress.aggregate({
      where: { opId },
      _sum: { qty: true },
    });
    await this.prisma.productionOrder.update({
      where: { id: opId },
      data: { qtySewingIn: totalIn._sum.qty || 0 },
    });

    return { success: true };
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

    // Jika tidak ada OP, reset session
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
        // Jika OP yang dipilih sudah tidak ada (misal karena selesai), pilih OP pertama
        session.pondOpIndex = 0;
        session.pondSelectedOpId = session.pondOps[0].id;
        session.pondPatternIndex = 0;
        session.pondState = 'SELECT_OP';
      }
    } else {
      // Belum ada pilihan, set ke OP pertama
      session.pondOpIndex = 0;
      session.pondSelectedOpId = session.pondOps[0].id;
      session.pondPatternIndex = 0;
      session.pondState = 'SELECT_OP';
    }

    const currentOp = session.pondOps[session.pondOpIndex];

    // ===== SELECT OP =====
    if (session.pondState === 'SELECT_OP') {
      if (button === 'YELLOW') {
        // Pindah ke OP berikutnya
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
        const setComplete = Math.min(...currentOp.patterns.map(p => p.good));
        await this.prisma.productionOrder.update({
          where: { id: currentOp.id },
          data: {
            qtyCP: setComplete,
            readyForCP: true,
          },
        });
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
        itemNumberFG: op.itemNumberFG, // <-- ditambahkan
        qtyEntan: op.qtyEntan,
        qtyPond: op.qtyPond,
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