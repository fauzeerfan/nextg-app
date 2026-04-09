import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// ========== EXPORTED INTERFACES ==========
export interface BcDocument {
  nomor_er: number;
  kode_bc: string;
  nomor_dokumen_bc: string;
  tanggal_dokumen_bc: string;
}

export interface CuttingBatchDetail {
  batchNumber: number;
  qty: number;
  qrCode: string;
  createdAt: Date;
}

export interface PatternProgressDetail {
  patternIndex: number;
  patternName: string;
  target: number;
  good: number;
  ng: number;
  completed: boolean;
  updatedAt?: Date;
}

export interface CheckPanelInspectionDetail {
  patternIndex: number;
  patternName: string;
  good: number;
  ng: number;
  ngReasons: string[];
  createdAt: Date;
}

export interface QcInspectionDetail {
  good: number;
  ng: number;
  ngReasons: string[];
  createdAt: Date;
}

export interface SewingProgressDetail {
  startProgress: { startIndex: number; qty: number }[];
  finishProgress: { finishIndex: number; qty: number }[];
}

export interface PackingSessionDetail {
  sessionId: string;
  fgNumber: string;
  qty: number;
  qrCode: string;
  createdAt: Date;
  receivedAt?: Date | null;
}

export interface OpTraceFullResult {
  opNumber: string;
  styleCode: string;
  itemNumberFG: string;
  itemNameFG: string | null;
  qtyOp: number;
  status: string;
  currentStation: string;
  // Cutting Entan
  cuttingBatches: CuttingBatchDetail[];
  totalCutQty: number;
  // Cutting Pond
  patternProgress: PatternProgressDetail[];
  pondTotalGood: number;
  pondTotalNg: number;
  pondTotalProcessed: number;
  // Check Panel
  checkPanelInspections: CheckPanelInspectionDetail[];
  cpTotalGood: number;
  cpTotalNg: number;
  cpTotalInspected: number;
  setsReadyForSewing: number;
  // Sewing
  sewingStartProgress: { startIndex: number; qty: number }[];
  sewingFinishProgress: { finishIndex: number; qty: number }[];
  sewingIn: number;
  sewingOut: number;
  // Quality Control
  qcInspections: QcInspectionDetail[];
  qcGood: number;
  qcNg: number;
  // Packing
  packingSessions: PackingSessionDetail[];
  totalPacked: number;
  // Finished Goods
  fgStockQty: number;
  // BC Documents
  bcDocuments: BcDocument[];
  // Detailed station info
  cuttingEntanDetails?: {
    batches: { batchNumber: number; qty: number; createdAt: string }[];
    totalCutSets: number;
    totalCutPatterns: number;
    targetOpSets: number;
    fulfillmentPercent: number;
    dateRange: string;
  };
  cuttingPondDetails?: {
    inputFromEntanPatterns: number;
    wipPatterns: number;
    goodPatterns: number;
    ngPatterns: number;
    setsReadyForCP: number;
    dateRange: string;
  };
  checkPanelDetails?: {
    inputFromPondSets: number;
    wipSets: number;
    goodSets: number;
    ngSets: number;
    setsReadyForSewing: number;
    ngByPattern: { patternName: string; reason: string; qty: number }[];
    dateRange: string;
  };
  sewingDetails?: {
    inputFromCPSets: number;
    wipSets: number;
    startProgress: { startIndex: number; qty: number }[];
    finishProgress: { finishIndex: number; qty: number }[];
    outputSets: number;
    dateRange: string;
  };
  qcDetails?: {
    inputFromSewingSets: number;
    wipSets: number;
    goodSets: number;
    ngSets: number;
    ngByReason: { reason: string; qty: number }[];
    dateRange: string;
  };
  packingDetails?: {
    inputFromQCSets: number;
    wipSets: number;
    packedSets: number;
    sentToFGSets: number;
    dateRange: string;
  };
  fgDetails?: {
    inputFromPackingSets: number;
    currentStockSets: number;
    shippedSets: number;
    dateRange: string;
  };
  stationProgress: {
    station: string;
    status: 'not_started' | 'in_progress' | 'completed';
    percent?: number;
  }[];
}

export interface TraceResult {
  suratJalan: string;
  shipmentDate: Date;
  totalQty: number;
  fgItems: {
    fgNumber: string;
    totalQty: number;
    ops: OpTraceFullResult[];
  }[];
}

export interface ShipmentSummary {
  suratJalan: string;
  shipmentDate: Date;
  totalQty: number;
  ops: { opNumber: string; qty: number }[];
}

export interface BcTraceResult {
  bcDocument: string;
  bcEr: string | null;
  relatedShipments: ShipmentSummary[];
}

@Injectable()
export class TraceabilityExtendedService {
  private readonly externalApiUrl = 'http://202.52.15.30:998/miniapps/admin/api/traceability';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Memanggil API eksternal untuk mendapatkan dokumen BC berdasarkan satu OP + FG
   */
  async getBcDocumentsForOp(op_number: string, item_fg: string): Promise<BcDocument[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.externalApiUrl, [{ op_number, item_fg }]),
      );
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching BC for OP ${op_number}:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Trace lengkap berdasarkan OP Number (detail dari semua station)
   */
  async traceByOpNumberFull(opNumber: string): Promise<OpTraceFullResult> {
    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
      include: {
        line: true,
        cuttingBatches: { orderBy: { batchNumber: 'asc' } },
        patternProgress: { orderBy: { patternIndex: 'asc' } },
        checkPanelInspections: { orderBy: { patternIndex: 'asc' } },
        qcInspections: { orderBy: { createdAt: 'asc' } },
        sewingStartProgress: { orderBy: { startIndex: 'asc' } },
        sewingFinishProgress: { orderBy: { finishIndex: 'asc' } },
        packingItems: {
          include: { session: true },
          orderBy: { session: { createdAt: 'asc' } }
        },
        fgItems: true,
        shipmentItems: { include: { shipment: true } },
      },
    });

    if (!op) {
      throw new NotFoundException(`OP ${opNumber} tidak ditemukan`);
    }

    // Format Cutting Batches
    const cuttingBatches: CuttingBatchDetail[] = op.cuttingBatches.map(b => ({
      batchNumber: b.batchNumber,
      qty: b.qty,
      qrCode: b.qrCode,
      createdAt: b.createdAt,
    }));

    const multiplier = op.line?.patternMultiplier || 1;
    const totalCutQty = (op.qtyEntan || 0) * multiplier;

    // Format Pattern Progress (Cutting Pond)
    const patternProgress: PatternProgressDetail[] = op.patternProgress.map(p => ({
      patternIndex: p.patternIndex,
      patternName: p.patternName,
      target: p.target,
      good: p.good,
      ng: p.ng,
      completed: p.completed,
      updatedAt: p.updatedAt,
    }));

    const pondTotalGood = op.patternProgress.reduce((sum, p) => sum + p.good, 0);
    const pondTotalNg = op.patternProgress.reduce((sum, p) => sum + p.ng, 0);
    const pondTotalProcessed = pondTotalGood + pondTotalNg;

    // Format Check Panel Inspections
    const checkPanelInspections: CheckPanelInspectionDetail[] = op.checkPanelInspections.map(c => ({
      patternIndex: c.patternIndex,
      patternName: c.patternName,
      good: c.good,
      ng: c.ng,
      ngReasons: (c.ngReasons as string[]) || [],
      createdAt: c.createdAt,
    }));

    const cpTotalGood = op.cpGoodQty || 0;
    const cpTotalNg = op.cpNgQty || 0;
    const cpTotalInspected = cpTotalGood + cpTotalNg;
    const setsReadyForSewing = op.setsReadyForSewing || 0;

    // Sewing Progress
    const sewingStartProgress = op.sewingStartProgress.map(s => ({ startIndex: s.startIndex, qty: s.qty }));
    const sewingFinishProgress = op.sewingFinishProgress.map(f => ({ finishIndex: f.finishIndex, qty: f.qty }));
    const sewingIn = op.qtySewingIn || 0;
    const sewingOut = op.qtySewingOut || 0;

    // QC Inspections
    const qcInspections: QcInspectionDetail[] = op.qcInspections.map(q => ({
      good: q.good,
      ng: q.ng,
      ngReasons: (q.ngReasons as string[]) || [],
      createdAt: q.createdAt,
    }));
    const qcGood = op.qtyQC || 0;
    const qcNg = op.qcNgQty || 0;

    // ========== PACKING SESSIONS (FIX) ==========
    const packingSessionsMap = new Map<string, PackingSessionDetail & { receivedAt: Date | null }>();
    for (const item of op.packingItems) {
      const session = item.session;
      if (!packingSessionsMap.has(session.id)) {
        packingSessionsMap.set(session.id, {
          sessionId: session.id,
          fgNumber: session.fgNumber,
          qty: 0,
          qrCode: session.qrCode || '',
          createdAt: session.createdAt,
          receivedAt: session.receivedAt || null,
        });
      }
      packingSessionsMap.get(session.id)!.qty += item.qty;
    }
    const packingSessions = Array.from(packingSessionsMap.values());

    // Total semua packing (untuk date range)
    const totalPackedAll = packingSessions.reduce((sum, s) => sum + s.qty, 0);
    // Pisahkan yang sudah diterima FG vs belum
    const packedSetsNotReceived = packingSessions
      .filter(s => !s.receivedAt)
      .reduce((sum, s) => sum + s.qty, 0);
    const packedSetsReceived = totalPackedAll - packedSetsNotReceived;

    // Input dari QC (langsung dari op.qtyQC)
    const packingInputSets = op.qtyQC || 0;
    // WIP = yang belum dipacking sama sekali
    const packingWipSets = packingInputSets - totalPackedAll;

    // Date range untuk packing
    const packingDates = packingSessions.map(p => p.createdAt);
    // ========== END OF PACKING SESSIONS ==========

    // Finished Goods
    const fgStockQty = op.fgItems.reduce((sum, f) => sum + f.qty, 0);

    // BC Documents from external API
    const bcDocuments = await this.getBcDocumentsForOp(op.opNumber, op.itemNumberFG);

    // Build result
    const result: OpTraceFullResult = {
      opNumber: op.opNumber,
      styleCode: op.styleCode,
      itemNumberFG: op.itemNumberFG,
      itemNameFG: op.itemNameFG ?? null,
      qtyOp: op.qtyOp,
      status: op.status,
      currentStation: op.currentStation || 'UNKNOWN',
      cuttingBatches,
      totalCutQty,
      patternProgress,
      pondTotalGood,
      pondTotalNg,
      pondTotalProcessed,
      checkPanelInspections,
      cpTotalGood,
      cpTotalNg,
      cpTotalInspected,
      setsReadyForSewing,
      sewingStartProgress,
      sewingFinishProgress,
      sewingIn,
      sewingOut,
      qcInspections,
      qcGood,
      qcNg,
      packingSessions,
      totalPacked: totalPackedAll,
      fgStockQty,
      bcDocuments,
      stationProgress: [],
    };

    // ========== BUILD DETAILED STATION INFO ==========
    const getDateRange = (dates: Date[]): string => {
      if (dates.length === 0) return '-';
      const uniqueDates = [...new Set(dates.map(d => d.toISOString().split('T')[0]))].sort();
      if (uniqueDates.length === 1) return uniqueDates[0];
      return `${uniqueDates[0]} s/d ${uniqueDates[uniqueDates.length - 1]}`;
    };

    // 1. Cutting Entan
    const entanDates = cuttingBatches.map(b => b.createdAt);
    const entanTargetSets = op.qtyOp;
    const entanTotalCutSets = op.qtyEntan || 0;
    const entanTotalCutPatterns = totalCutQty;
    const entanFulfillment = entanTargetSets > 0 ? (entanTotalCutSets / entanTargetSets) * 100 : 0;
    const cuttingEntanDetails = {
      batches: cuttingBatches.map(b => ({ batchNumber: b.batchNumber, qty: b.qty, createdAt: b.createdAt.toISOString() })),
      totalCutSets: entanTotalCutSets,
      totalCutPatterns: entanTotalCutPatterns,
      targetOpSets: entanTargetSets,
      fulfillmentPercent: Math.round(entanFulfillment),
      dateRange: getDateRange(entanDates)
    };

    // 2. Cutting Pond
    const pondDates = patternProgress.map(p => p.updatedAt ? new Date(p.updatedAt) : new Date());
    const pondInputPatterns = totalCutQty;
    const pondGoodPatterns = pondTotalGood;
    const pondNgPatterns = pondTotalNg;
    const pondProcessedPatterns = pondGoodPatterns + pondNgPatterns;
    const pondWipPatterns = pondInputPatterns - pondProcessedPatterns;
    const pondSetsReadyForCP = op.qtyCP;
    const cuttingPondDetails = {
      inputFromEntanPatterns: pondInputPatterns,
      wipPatterns: pondWipPatterns,
      goodPatterns: pondGoodPatterns,
      ngPatterns: pondNgPatterns,
      setsReadyForCP: pondSetsReadyForCP,
      dateRange: getDateRange(pondDates)
    };

    // 3. Check Panel
    const cpDates = checkPanelInspections.map(i => i.createdAt);
    const cpInputSets = op.qtyCP;
    const cpGoodSets = cpTotalGood;
    const cpNgSets = cpTotalNg;
    const cpInspectedSets = cpGoodSets + cpNgSets;
    const cpWipSets = cpInputSets > cpInspectedSets ? cpInputSets - cpInspectedSets : 0;
    const cpSetsReadyForSewing = op.setsReadyForSewing;
    const ngByPatternMap = new Map<string, Map<string, number>>();
    for (const insp of checkPanelInspections) {
      if (insp.ng > 0 && insp.ngReasons) {
        const patternName = insp.patternName;
        const reasons = Array.isArray(insp.ngReasons) ? insp.ngReasons : [];
        for (const reason of reasons) {
          if (!ngByPatternMap.has(patternName)) ngByPatternMap.set(patternName, new Map());
          const reasonMap = ngByPatternMap.get(patternName)!;
          reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
        }
      }
    }
    const ngByPattern: { patternName: string; reason: string; qty: number }[] = [];
    for (const [patternName, reasonMap] of ngByPatternMap.entries()) {
      for (const [reason, qty] of reasonMap.entries()) {
        ngByPattern.push({ patternName, reason, qty });
      }
    }
    const checkPanelDetails = {
      inputFromPondSets: cpInputSets,
      wipSets: cpWipSets,
      goodSets: cpGoodSets,
      ngSets: cpNgSets,
      setsReadyForSewing: cpSetsReadyForSewing,
      ngByPattern,
      dateRange: getDateRange(cpDates)
    };

    // 4. Sewing
    const sewingDates = [...sewingStartProgress.map(s => new Date()), ...sewingFinishProgress.map(f => new Date())];
    const sewingInputSets = op.qtySewingIn;
    const sewingOutputSets = op.qtySewingOut;
    const sewingWipSets = sewingInputSets - sewingOutputSets;
    const sewingDetails = {
      inputFromCPSets: sewingInputSets,
      wipSets: sewingWipSets,
      startProgress: sewingStartProgress.map(s => ({ startIndex: s.startIndex, qty: s.qty })),
      finishProgress: sewingFinishProgress.map(f => ({ finishIndex: f.finishIndex, qty: f.qty })),
      outputSets: sewingOutputSets,
      dateRange: getDateRange(sewingDates)
    };

    // 5. Quality Control
    const qcDates = qcInspections.map(q => q.createdAt);
    const qcInputSets = op.qtySewingOut;
    const qcGoodSets = qcGood;
    const qcNgSets = qcNg;
    const qcInspectedSets = qcGoodSets + qcNgSets;
    const qcWipSets = qcInputSets - qcInspectedSets;
    const ngByReasonMap = new Map<string, number>();
    for (const insp of qcInspections) {
      if (insp.ng > 0 && insp.ngReasons) {
        const reasons = Array.isArray(insp.ngReasons) ? insp.ngReasons : [];
        for (const reason of reasons) {
          ngByReasonMap.set(reason, (ngByReasonMap.get(reason) || 0) + 1);
        }
      }
    }
    const ngByReason = Array.from(ngByReasonMap.entries()).map(([reason, qty]) => ({ reason, qty }));
    const qcDetails = {
      inputFromSewingSets: qcInputSets,
      wipSets: qcWipSets,
      goodSets: qcGoodSets,
      ngSets: qcNgSets,
      ngByReason,
      dateRange: getDateRange(qcDates)
    };

    // 6. Packing
    const packingDetails = {
      inputFromQCSets: packingInputSets,
      wipSets: packingWipSets,
      packedSets: packedSetsNotReceived,
      sentToFGSets: packedSetsReceived,
      dateRange: getDateRange(packingDates)
    };

    // 7. Finished Goods
    const fgDates = op.fgItems.map(f => f.createdAt);
    const fgInputSets = totalPackedAll;
    const fgCurrentStockSets = fgStockQty;
    const fgShippedSets = op.shipmentItems.reduce((sum, si) => sum + si.qty, 0);
    const fgDetails = {
      inputFromPackingSets: fgInputSets,
      currentStockSets: fgCurrentStockSets,
      shippedSets: fgShippedSets,
      dateRange: getDateRange(fgDates)
    };

    // 8. Station Progress
    const stationProgress = [
      { station: 'CUTTING_ENTAN', status: (entanTotalCutSets >= entanTargetSets ? 'completed' : (entanTotalCutSets > 0 ? 'in_progress' : 'not_started')) as any, percent: Math.min(100, entanFulfillment) },
      { station: 'CUTTING_POND', status: (pondSetsReadyForCP > 0 ? 'completed' : (pondProcessedPatterns > 0 ? 'in_progress' : 'not_started')) as any, percent: (pondProcessedPatterns / (pondInputPatterns || 1)) * 100 },
      { station: 'CP', status: (cpSetsReadyForSewing > 0 ? 'completed' : (cpInspectedSets > 0 ? 'in_progress' : 'not_started')) as any, percent: (cpInspectedSets / (cpInputSets || 1)) * 100 },
      { station: 'SEWING', status: (sewingOutputSets >= sewingInputSets ? 'completed' : (sewingOutputSets > 0 ? 'in_progress' : 'not_started')) as any, percent: (sewingOutputSets / (sewingInputSets || 1)) * 100 },
      { station: 'QC', status: (qcInspectedSets >= qcInputSets ? 'completed' : (qcInspectedSets > 0 ? 'in_progress' : 'not_started')) as any, percent: (qcInspectedSets / (qcInputSets || 1)) * 100 },
      { station: 'PACKING', status: (packedSetsNotReceived >= packingInputSets ? 'completed' : (packedSetsNotReceived > 0 ? 'in_progress' : 'not_started')) as any, percent: (packedSetsNotReceived / (packingInputSets || 1)) * 100 },
      { station: 'FG', status: (fgShippedSets >= fgInputSets ? 'completed' : (fgCurrentStockSets > 0 ? 'in_progress' : 'not_started')) as any, percent: (fgShippedSets / (fgInputSets || 1)) * 100 }
    ];

    // Assign ke result
    result.cuttingEntanDetails = cuttingEntanDetails;
    result.cuttingPondDetails = cuttingPondDetails;
    result.checkPanelDetails = checkPanelDetails;
    result.sewingDetails = sewingDetails;
    result.qcDetails = qcDetails;
    result.packingDetails = packingDetails;
    result.fgDetails = fgDetails;
    result.stationProgress = stationProgress;

    return result;
  }

  /**
   * Trace lengkap dari Surat Jalan → FG → OP → Dokumen BC
   */
  async traceBySuratJalanFull(suratJalan: string): Promise<TraceResult> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { suratJalan },
      include: {
        items: {
          include: {
            op: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Surat Jalan ${suratJalan} tidak ditemukan di database. Pastikan sudah dilakukan proses shipping.`);
    }

    const fgMap = new Map<string, { fgNumber: string; totalQty: number; ops: OpTraceFullResult[] }>();

    for (const item of shipment.items) {
      const opTrace = await this.traceByOpNumberFull(item.op.opNumber);
      const fgNumber = item.op.itemNumberFG;
      if (!fgMap.has(fgNumber)) {
        fgMap.set(fgNumber, {
          fgNumber,
          totalQty: 0,
          ops: [],
        });
      }
      const fgEntry = fgMap.get(fgNumber)!;
      fgEntry.totalQty += item.qty;
      fgEntry.ops.push(opTrace);
    }

    return {
      suratJalan: shipment.suratJalan,
      shipmentDate: shipment.createdAt,
      totalQty: shipment.totalQty,
      fgItems: Array.from(fgMap.values()),
    };
  }

  /**
   * Trace balik dari nomor dokumen BC → semua Surat Jalan yang terkait
   */
  async traceByBcDocument(bcNomorDokumen: string, bcNomorEr?: string): Promise<BcTraceResult> {
    const allShipments = await this.prisma.shipment.findMany({
      include: {
        items: {
          include: {
            op: true,
          },
        },
      },
    });

    const matchedShipments: ShipmentSummary[] = [];

    for (const shipment of allShipments) {
      let found = false;
      for (const item of shipment.items) {
        const bcDocs = await this.getBcDocumentsForOp(item.op.opNumber, item.op.itemNumberFG);
        const matched = bcDocs.some(doc =>
          doc.nomor_dokumen_bc === bcNomorDokumen ||
          (bcNomorEr && doc.nomor_er.toString() === bcNomorEr)
        );
        if (matched) {
          found = true;
          break;
        }
      }
      if (found) {
        matchedShipments.push({
          suratJalan: shipment.suratJalan,
          shipmentDate: shipment.createdAt,
          totalQty: shipment.totalQty,
          ops: shipment.items.map(i => ({ opNumber: i.op.opNumber, qty: i.qty })),
        });
      }
    }

    if (matchedShipments.length === 0) {
      throw new NotFoundException(`Tidak ditemukan surat jalan yang menggunakan dokumen BC ${bcNomorDokumen}`);
    }

    return {
      bcDocument: bcNomorDokumen,
      bcEr: bcNomorEr || null,
      relatedShipments: matchedShipments,
    };
  }
}