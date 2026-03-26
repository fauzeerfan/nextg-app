import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCode } from '@prisma/client';

export interface TraceabilityResult {
  opNumber: string;
  styleCode: string;
  itemNumberFG: string;
  currentStatus: string;
  currentStation: string;
  timeline: TraceabilityEvent[];
  summary: {
    totalGood: number;
    totalNg: number;
    totalPacked: number;
    totalShipped: number;
  };
}

export interface TraceabilityEvent {
  timestamp: Date;
  station: string;
  action: string;
  qty: number;
  details: any;
}

@Injectable()
export class TraceabilityService {
  constructor(private prisma: PrismaService) {}

  async traceByOpNumber(opNumber: string): Promise<TraceabilityResult> {
    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
      include: {
        line: {
          select: {
            code: true,
            name: true,
          },
        },
        cuttingBatches: {
          orderBy: { batchNumber: 'asc' },
        },
        patternProgress: {
          orderBy: { patternIndex: 'asc' },
        },
        checkPanelInspections: {
          orderBy: { createdAt: 'asc' },
        },
        sewingStartProgress: {
          orderBy: { startIndex: 'asc' },
        },
        sewingFinishProgress: {
          orderBy: { finishIndex: 'asc' },
        },
        qcInspections: {
          orderBy: { createdAt: 'asc' },
        },
        packingItems: {
          include: {
            session: {
              select: {
                id: true,
                fgNumber: true,
                totalQty: true,
                status: true,
                qrCode: true,
                createdAt: true,
                receivedAt: true,
              },
            },
          },
        },
        fgItems: {
          include: {
            fg: {
              select: {
                fgNumber: true,
                totalQty: true,
              },
            },
          },
        },
        shipmentItems: {
          include: {
            shipment: {
              select: {
                suratJalan: true,
                totalQty: true,
                createdAt: true,
              },
            },
          },
        },
        logs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!op) {
      throw new NotFoundException(`OP ${opNumber} not found`);
    }

    // Build timeline
    const timeline: TraceabilityEvent[] = [];

    // 1. Cutting Entan
    if (op.cuttingBatches.length > 0) {
      op.cuttingBatches.forEach((batch) => {
        timeline.push({
          timestamp: batch.createdAt,
          station: 'CUTTING_ENTAN',
          action: 'Batch Generated',
          qty: batch.qty,
          details: {
            batchNumber: batch.batchNumber,
            qrCode: batch.qrCode,
            printed: batch.printed,
          },
        });
      });
    }

    // 2. Cutting Pond
    if (op.patternProgress.length > 0) {
      const pondGood = op.patternProgress.reduce(
        (sum, p) => sum + p.good,
        0
      );
      const pondNg = op.patternProgress.reduce((sum, p) => sum + p.ng, 0);
      timeline.push({
        timestamp: op.updatedAt,
        station: 'CUTTING_POND',
        action: 'Pattern Cutting Completed',
        qty: pondGood + pondNg,
        details: {
          good: pondGood,
          ng: pondNg,
          patterns: op.patternProgress.map((p) => ({
            name: p.patternName,
            good: p.good,
            ng: p.ng,
            completed: p.completed,
          })),
        },
      });
    }

    // 3. Check Panel
    if (op.checkPanelInspections.length > 0) {
      const cpGood = op.checkPanelInspections.reduce(
        (sum, i) => sum + i.good,
        0
      );
      const cpNg = op.checkPanelInspections.reduce((sum, i) => sum + i.ng, 0);
      timeline.push({
        timestamp:
          op.checkPanelInspections[op.checkPanelInspections.length - 1]
            .createdAt,
        station: 'CHECK_PANEL',
        action: 'Inspection Completed',
        qty: cpGood + cpNg,
        details: {
          good: cpGood,
          ng: cpNg,
          setsReady: op.setsReadyForSewing,
          inspections: op.checkPanelInspections.map((i) => ({
            pattern: i.patternName,
            good: i.good,
            ng: i.ng,
            reasons: i.ngReasons,
          })),
        },
      });
    }

    // 4. Sewing
    if (op.sewingStartProgress.length > 0 || op.sewingFinishProgress.length > 0) {
      const startTotal = op.sewingStartProgress.reduce(
        (sum, s) => sum + s.qty,
        0
      );
      const finishTotal = op.sewingFinishProgress.reduce(
        (sum, f) => sum + f.qty,
        0
      );
      timeline.push({
        timestamp: op.updatedAt,
        station: 'SEWING',
        action: 'Sewing Process',
        qty: finishTotal,
        details: {
          started: startTotal,
          finished: finishTotal,
          starts: op.sewingStartProgress,
          finishes: op.sewingFinishProgress,
        },
      });
    }

    // 5. QC
    if (op.qcInspections.length > 0) {
      const qcGood = op.qcInspections.reduce((sum, i) => sum + i.good, 0);
      const qcNg = op.qcInspections.reduce((sum, i) => sum + i.ng, 0);
      timeline.push({
        timestamp: op.qcInspections[op.qcInspections.length - 1].createdAt,
        station: 'QUALITY_CONTROL',
        action: 'QC Inspection Completed',
        qty: qcGood + qcNg,
        details: {
          good: qcGood,
          ng: qcNg,
          inspections: op.qcInspections.map((i) => ({
            good: i.good,
            ng: i.ng,
            reasons: i.ngReasons,
          })),
        },
      });
    }

    // 6. Packing
    if (op.packingItems.length > 0) {
      const packingSessions = new Map();
      op.packingItems.forEach((item) => {
        if (!packingSessions.has(item.session.id)) {
          packingSessions.set(item.session.id, {
            ...item.session,
            items: [],
          });
        }
        packingSessions.get(item.session.id).items.push(item);
      });

      packingSessions.forEach((session: any) => {
        timeline.push({
          timestamp: session.createdAt,
          station: 'PACKING',
          action: `Packing Session ${session.status}`,
          qty: session.totalQty,
          details: {
            sessionId: session.id,
            fgNumber: session.fgNumber,
            qrCode: session.qrCode,
            receivedAt: session.receivedAt,
            items: session.items.map((i: any) => ({
              opNumber: opNumber,
              qty: i.qty,
            })),
          },
        });
      });
    }

    // 7. Finished Goods
    if (op.fgItems.length > 0) {
      const fgGroups = new Map();
      op.fgItems.forEach((item) => {
        if (!fgGroups.has(item.fg.fgNumber)) {
          fgGroups.set(item.fg.fgNumber, {
            fgNumber: item.fg.fgNumber,
            totalQty: item.fg.totalQty,
            items: [],
          });
        }
        fgGroups.get(item.fg.fgNumber).items.push(item);
      });

      fgGroups.forEach((fg: any) => {
        timeline.push({
          timestamp: fg.items[0].createdAt,
          station: 'FINISHED_GOODS',
          action: 'Stocked In',
          qty: fg.items.reduce((sum: number, i: any) => sum + i.qty, 0),
          details: {
            fgNumber: fg.fgNumber,
            totalStock: fg.totalQty,
            items: fg.items.map((i: any) => ({
              opNumber: opNumber,
              qty: i.qty,
            })),
          },
        });
      });
    }

    // 8. Shipping
    if (op.shipmentItems.length > 0) {
      const shipmentGroups = new Map();
      op.shipmentItems.forEach((item) => {
        if (!shipmentGroups.has(item.shipment.suratJalan)) {
          shipmentGroups.set(item.shipment.suratJalan, {
            ...item.shipment,
            items: [],
          });
        }
        shipmentGroups.get(item.shipment.suratJalan).items.push(item);
      });

      shipmentGroups.forEach((shipment: any) => {
        timeline.push({
          timestamp: shipment.createdAt,
          station: 'SHIPPING',
          action: 'Shipped',
          qty: shipment.totalQty,
          details: {
            suratJalan: shipment.suratJalan,
            items: shipment.items.map((i: any) => ({
              opNumber: opNumber,
              qty: i.qty,
            })),
          },
        });
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate summary
    const totalGood =
      (op.cpGoodQty || 0) + (op.qtyQC || 0);
    const totalNg =
      (op.cpNgQty || 0) + (op.qcNgQty || 0);
    const totalPacked = op.packingItems.reduce(
      (sum, item) => sum + item.qty,
      0
    );
    const totalShipped = op.shipmentItems.reduce(
      (sum, item) => sum + item.qty,
      0
    );

    return {
      opNumber: op.opNumber,
      styleCode: op.styleCode,
      itemNumberFG: op.itemNumberFG,
      currentStatus: op.status,
      currentStation: op.currentStation || 'UNKNOWN',
      timeline,
      summary: {
        totalGood,
        totalNg,
        totalPacked,
        totalShipped,
      },
    };
  }

  async traceBySuratJalan(suratJalan: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { suratJalan },
      include: {
        items: {
          include: {
            op: {
              select: {
                opNumber: true,
                styleCode: true,
                itemNumberFG: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Surat Jalan ${suratJalan} not found`);
    }

    // Get traceability for each OP in shipment
    const opTraces = await Promise.all(
      shipment.items.map((item) => this.traceByOpNumber(item.op.opNumber))
    );

    return {
      suratJalan: shipment.suratJalan,
      shipmentDate: shipment.createdAt,
      totalQty: shipment.totalQty,
      ops: opTraces,
    };
  }

  async traceByFGNumber(fgNumber: string) {
    const fgStock = await this.prisma.fGStock.findUnique({
      where: { fgNumber },
      include: {
        items: {
          include: {
            op: {
              select: {
                opNumber: true,
                styleCode: true,
                itemNumberFG: true,
              },
            },
          },
        },
      },
    });

    if (!fgStock) {
      throw new NotFoundException(`FG Number ${fgNumber} not found`);
    }

    // Get traceability for each OP in FG stock
    const opTraces = await Promise.all(
      fgStock.items.map((item) => this.traceByOpNumber(item.op.opNumber))
    );

    return {
      fgNumber: fgStock.fgNumber,
      totalQty: fgStock.totalQty,
      ops: opTraces,
    };
  }

  async traceByQrCode(qrCode: string) {
    // Try to find OP by QR code in cutting batches
    const batch = await this.prisma.cuttingBatch.findUnique({
      where: { qrCode },
      include: {
        op: {
          select: {
            opNumber: true,
          },
        },
      },
    });

    if (batch) {
      return this.traceByOpNumber(batch.op.opNumber);
    }

    // Try to find packing session by QR code
    const session = await this.prisma.packingSession.findFirst({
      where: { qrCode },
      include: {
        items: {
          include: {
            op: {
              select: {
                opNumber: true,
              },
            },
          },
        },
      },
    });

    if (session && session.items.length > 0) {
      return this.traceByOpNumber(session.items[0].op.opNumber);
    }

    throw new NotFoundException(`QR Code ${qrCode} not found in any record`);
  }
}