import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

export interface ExternalMaterialItem {
  material: {
    set_artnr_u: string;
    Art_name: string;
    total: number;
    Art_einheit: string;
    Art_ekletzt: number;
  };
  list_batch: string[];
  list_dokumen_bc: BcDocument[];
}

export interface ExternalTraceabilityResponse {
  itemFinishgood: string;
  list_op_number: string[];
  list_material: ExternalMaterialItem[];
}

export interface BcDocument {
  nomor_el: number;      // ganti dari nomor_er
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
  cuttingBatches: CuttingBatchDetail[];
  totalCutQty: number;
  patternProgress: PatternProgressDetail[];
  pondTotalGood: number;
  pondTotalNg: number;
  pondTotalProcessed: number;
  checkPanelInspections: CheckPanelInspectionDetail[];
  cpTotalGood: number;
  cpTotalNg: number;
  cpTotalInspected: number;
  setsReadyForSewing: number;
  sewingStartProgress: { startIndex: number; qty: number }[];
  sewingFinishProgress: { finishIndex: number; qty: number }[];
  sewingIn: number;
  sewingOut: number;
  qcInspections: QcInspectionDetail[];
  qcGood: number;
  qcNg: number;
  packingSessions: PackingSessionDetail[];
  totalPacked: number;
  fgStockQty: number;
  bcDocuments: BcDocument[];
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
    ngByPattern?: { patternName: string; ngQty: number }[];
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
  bcEl: string | null;   // ganti dari bcEr
  relatedShipments: ShipmentSummary[];
}

// ===== TAMBAHAN INTERFACE BARU =====
export interface MaterialConsumptionDetail {
  material: {
    set_artnr_u: string;
    Art_name: string;
    consumptionPerUnit: number; // konsumsi untuk 1 pcs FG (dari external API)
    unit: string;
  };
  totalConsumption: number; // consumptionPerUnit * totalQtyFG
  totalQtyFG: number;
}

export interface FgMaterialSummary {
  fgNumber: string;
  totalQtyShipped: number;
  materials: MaterialConsumptionDetail[];
}
// ===== AKHIR TAMBAHAN =====

@Injectable()
export class TraceabilityExtendedService {
  private readonly externalApiUrl = 'http://202.52.15.30:998/miniapps/admin/api/traceability';
  private readonly logger = new Logger(TraceabilityExtendedService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Normalize BC document number by removing leading zeros
   * Example: "018463" -> "18463"
   */
  private normalizeDocNumber(docNumber: string): string {
    if (!docNumber) return '';
    return docNumber.replace(/^0+/, '');
  }

  async getBcDocumentsForOp(op_number: string, item_fg: string): Promise<BcDocument[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.externalApiUrl, [{ op_number, item_fg }]).pipe(timeout(10000))
      );
      const data = response.data;
      if (Array.isArray(data) && data.length > 0 && data[0].list_dokumen_bc) {
        return data[0].list_dokumen_bc.map((doc: any) => ({
          nomor_el: doc.nomor_el,
          kode_bc: doc.kode_bc,
          nomor_dokumen_bc: doc.nomor_dokumen_bc,
          tanggal_dokumen_bc: doc.tanggal_dokumen_bc
        }));
      }
      return [];
    } catch (error) {
      console.error(`Error fetching BC for OP ${op_number}:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

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

    const cuttingBatches: CuttingBatchDetail[] = op.cuttingBatches.map(b => ({
      batchNumber: b.batchNumber,
      qty: b.qty,
      qrCode: b.qrCode,
      createdAt: b.createdAt,
    }));

    const multiplier = op.line?.patternMultiplier || 1;
    const totalCutQty = (op.qtyEntan || 0) * multiplier;

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

    // EKSTRAKSI NG REASONS CHECK PANEL SECARA KETAT
    const checkPanelInspections: CheckPanelInspectionDetail[] = op.checkPanelInspections.map(c => {
      let reasons: string[] = [];
      const raw = c.ngReasons as any;
      
      if (Array.isArray(raw)) {
        reasons = raw;
      } else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          reasons = Array.isArray(parsed) ? parsed : [raw];
        } catch {
          reasons = [raw];
        }
      }

      // Pastikan flat, hapus null/undefined/string kosong, ubah jadi string murni
      reasons = reasons.flat().filter(r => r && String(r).trim() !== '').map(String);

      return {
        patternIndex: c.patternIndex,
        patternName: c.patternName,
        good: c.good,
        ng: c.ng,
        ngReasons: reasons,
        createdAt: c.createdAt,
      };
    });

    const cpTotalGood = op.cpGoodQty || 0;
    const cpTotalNg = op.cpNgQty || 0;
    const cpTotalInspected = cpTotalGood + cpTotalNg;
    const setsReadyForSewing = op.setsReadyForSewing || 0;

    const sewingStartProgress = op.sewingStartProgress.map(s => ({ startIndex: s.startIndex, qty: s.qty }));
    const sewingFinishProgress = op.sewingFinishProgress.map(f => ({ finishIndex: f.finishIndex, qty: f.qty }));
    const sewingIn = op.qtySewingIn || 0;
    const sewingOut = op.qtySewingOut || 0;

    const qcInspections: QcInspectionDetail[] = op.qcInspections.map(q => {
      let reasons = q.ngReasons as any;
      if (Array.isArray(reasons) && reasons.length > 0 && Array.isArray(reasons[0])) {
        reasons = reasons.flat();
      }
      if (!Array.isArray(reasons)) reasons = [];
      return {
        good: q.good,
        ng: q.ng,
        ngReasons: reasons,
        createdAt: q.createdAt,
      };
    });
    const qcGood = op.qtyQC || 0;
    const qcNg = op.qcNgQty || 0;

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

    const totalPackedAll = packingSessions.reduce((sum, s) => sum + s.qty, 0);
    const packedSetsNotReceived = packingSessions
      .filter(s => !s.receivedAt)
      .reduce((sum, s) => sum + s.qty, 0);
    const packedSetsReceived = totalPackedAll - packedSetsNotReceived;
    const packingInputSets = op.qtyQC || 0;
    const packingWipSets = packingInputSets - totalPackedAll;
    const packingDates = packingSessions.map(p => p.createdAt);

    const fgStockQty = op.fgItems.reduce((sum, f) => sum + f.qty, 0);
    const bcDocuments = await this.getBcDocumentsForOp(op.opNumber, op.itemNumberFG);

    const getDateRange = (dates: Date[]): string => {
      if (dates.length === 0) return '-';
      const uniqueDates = [...new Set(dates.map(d => d.toISOString().split('T')[0]))].sort();
      if (uniqueDates.length === 1) return uniqueDates[0];
      return `${uniqueDates[0]} s/d ${uniqueDates[uniqueDates.length - 1]}`;
    };

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

    const pondDates = patternProgress.map(p => p.updatedAt ? new Date(p.updatedAt) : new Date());
    const pondInputPatterns = totalCutQty;
    const pondGoodPatterns = pondTotalGood;
    const pondNgPatterns = pondTotalNg;
    const pondProcessedPatterns = pondGoodPatterns + pondNgPatterns;
    const pondWipPatterns = pondInputPatterns - pondProcessedPatterns;
    const pondSetsReadyForCP = op.qtyCP;
    const ngByPatternPond = patternProgress.filter(p => p.ng > 0).map(p => ({ patternName: p.patternName, ngQty: p.ng }));
    
    const cuttingPondDetails = {
      inputFromEntanPatterns: pondInputPatterns,
      wipPatterns: pondWipPatterns,
      goodPatterns: pondGoodPatterns,
      ngPatterns: pondNgPatterns,
      setsReadyForCP: pondSetsReadyForCP,
      dateRange: getDateRange(pondDates),
      ngByPattern: ngByPatternPond
    };

    // CHECK PANEL DETAILS MAP
    const cpDates = checkPanelInspections.map(i => i.createdAt);
    const cpInputSets = op.qtyCP;
    const cpGoodSets = cpTotalGood;
    const cpNgSets = cpTotalNg;
    const cpInspectedSets = cpGoodSets + cpNgSets;
    const cpWipSets = cpInputSets > cpInspectedSets ? cpInputSets - cpInspectedSets : 0;
    const cpSetsReadyForSewing = op.setsReadyForSewing;
    
    // Summary by Pattern (Optional display)
    const ngByPatternMap = new Map<string, Map<string, number>>();
    for (const insp of checkPanelInspections) {
      if (insp.ng > 0 && insp.ngReasons.length > 0) {
        const patternName = insp.patternName;
        for (const reason of insp.ngReasons) {
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

    const packingDetails = {
      inputFromQCSets: packingInputSets,
      wipSets: packingWipSets,
      packedSets: packedSetsNotReceived,
      sentToFGSets: packedSetsReceived,
      dateRange: getDateRange(packingDates)
    };

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

    const stationProgress = [
      { station: 'CUTTING_ENTAN', status: (entanTotalCutSets >= entanTargetSets ? 'completed' : (entanTotalCutSets > 0 ? 'in_progress' : 'not_started')) as any, percent: Math.min(100, entanFulfillment) },
      { station: 'CUTTING_POND', status: (pondSetsReadyForCP > 0 ? 'completed' : (pondProcessedPatterns > 0 ? 'in_progress' : 'not_started')) as any, percent: (pondProcessedPatterns / (pondInputPatterns || 1)) * 100 },
      { station: 'CP', status: (cpSetsReadyForSewing > 0 ? 'completed' : (cpInspectedSets > 0 ? 'in_progress' : 'not_started')) as any, percent: (cpInspectedSets / (cpInputSets || 1)) * 100 },
      { station: 'SEWING', status: (sewingOutputSets >= sewingInputSets ? 'completed' : (sewingOutputSets > 0 ? 'in_progress' : 'not_started')) as any, percent: (sewingOutputSets / (sewingInputSets || 1)) * 100 },
      { station: 'QC', status: (qcInspectedSets >= qcInputSets ? 'completed' : (qcInspectedSets > 0 ? 'in_progress' : 'not_started')) as any, percent: (qcInspectedSets / (qcInputSets || 1)) * 100 },
      { station: 'PACKING', status: (packedSetsNotReceived >= packingInputSets ? 'completed' : (packedSetsNotReceived > 0 ? 'in_progress' : 'not_started')) as any, percent: (packedSetsNotReceived / (packingInputSets || 1)) * 100 },
      { station: 'FG', status: (fgShippedSets >= fgInputSets ? 'completed' : (fgCurrentStockSets > 0 ? 'in_progress' : 'not_started')) as any, percent: (fgShippedSets / (fgInputSets || 1)) * 100 }
    ];

    return {
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
      cuttingEntanDetails,
      cuttingPondDetails,
      checkPanelDetails,
      sewingDetails,
      qcDetails,
      packingDetails,
      fgDetails,
      stationProgress,
    };
  }

  // ===== METHOD BARU =====
  /**
   * Mendapatkan detail material untuk surat jalan, dengan perhitungan total konsumsi per FG.
   * @param suratJalan Nomor surat jalan
   * @returns Array summary per FG beserta material dan total konsumsi
   */
  async getSuratJalanMaterialDetailsWithTotals(suratJalan: string): Promise<FgMaterialSummary[]> {
    // 1. Cari shipment dan items
    const shipment = await this.prisma.shipment.findFirst({
      where: { suratJalan },
      include: {
        items: {
          include: {
            op: {
              select: {
                opNumber: true,
                itemNumberFG: true,
              }
            }
          }
        }
      }
    });

    if (!shipment) {
      throw new NotFoundException(`Surat Jalan ${suratJalan} tidak ditemukan`);
    }

    // 2. Kelompokkan OP per FG dan hitung total qty per FG
    const fgMap = new Map<string, { totalQty: number; opNumbers: string[] }>();
    for (const item of shipment.items) {
      const fgNumber = item.op.itemNumberFG;
      if (!fgMap.has(fgNumber)) {
        fgMap.set(fgNumber, { totalQty: 0, opNumbers: [] });
      }
      const entry = fgMap.get(fgNumber)!;
      entry.totalQty += item.qty;
      entry.opNumbers.push(item.op.opNumber);
    }

    // 3. Ambil data material dari external API (per OP unik)
    const uniqueOpNumbers = [...new Set(shipment.items.map(item => item.op.opNumber))];

    // Rebuild requestBody dengan item_fg yang sesuai (itemNumberFG dari OP)
    const requestBodyFixed = uniqueOpNumbers.map(opNumber => {
      const op = shipment.items.find(i => i.op.opNumber === opNumber)?.op;
      return {
        op_number: opNumber,
        item_fg: op?.itemNumberFG || shipment.fgNumber,
      };
    });

    let externalData: any[] = [];
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://202.52.15.30:998/miniapps/admin/api/traceability', requestBodyFixed).pipe(timeout(10000))
      );
      externalData = response.data;
    } catch (error) {
      this.logger.warn(`Gagal mengambil data material dari external untuk surat jalan ${suratJalan}`);
      externalData = [];
    }

    // 4. Kelompokkan material per FG berdasarkan external data
    const fgMaterialMap = new Map<string, Map<string, { consumptionPerUnit: number; unit: string; name: string }>>();

    for (const fgEntry of externalData) {
      const fgNumber = fgEntry.itemFinishgood;
      if (!fgMaterialMap.has(fgNumber)) {
        fgMaterialMap.set(fgNumber, new Map());
      }
      const materialMap = fgMaterialMap.get(fgNumber)!;
      for (const materialItem of fgEntry.list_material) {
        const partNumber = materialItem.material.set_artnr_u;
        const consumption = materialItem.material.total; // konsumsi per unit FG
        const unit = materialItem.material.Art_einheit;
        const name = materialItem.material.Art_name;
        if (!materialMap.has(partNumber)) {
          materialMap.set(partNumber, { consumptionPerUnit: consumption, unit, name });
        }
      }
    }

    // 5. Buat summary per FG dengan total konsumsi
    const result: FgMaterialSummary[] = [];
    for (const [fgNumber, { totalQty }] of fgMap.entries()) {
      const materialMap = fgMaterialMap.get(fgNumber) || new Map();
      const materials: MaterialConsumptionDetail[] = [];
      for (const [partNumber, detail] of materialMap.entries()) {
        materials.push({
          material: {
            set_artnr_u: partNumber,
            Art_name: detail.name,
            consumptionPerUnit: detail.consumptionPerUnit,
            unit: detail.unit,
          },
          totalConsumption: detail.consumptionPerUnit * totalQty,
          totalQtyFG: totalQty,
        });
      }
      result.push({
        fgNumber,
        totalQtyShipped: totalQty,
        materials,
      });
    }

    return result;
  }
  // ===== AKHIR METHOD BARU =====

  // ===== METHOD traceBySuratJalanFull YANG DIPERBARUI =====
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

    // Ambil material summary per FG
    const materialSummaries = await this.getSuratJalanMaterialDetailsWithTotals(suratJalan);

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

    // Gabungkan materialSummaries ke dalam response
    const fgItems = Array.from(fgMap.values()).map(fg => {
      const materialSummary = materialSummaries.find(m => m.fgNumber === fg.fgNumber);
      return {
        ...fg,
        materials: materialSummary?.materials || [],
      };
    });

    return {
      suratJalan: shipment.suratJalan,
      shipmentDate: shipment.createdAt,
      totalQty: shipment.totalQty,
      fgItems,
    };
  }
  // ===== AKHIR PERUBAHAN =====

  async traceByBcDocument(bcNomorDokumen: string, bcNomorEl?: string): Promise<any> {
    // Validasi input
    if (!bcNomorDokumen && !bcNomorEl) {
      throw new BadRequestException('Harap isi nomor dokumen BC atau nomor EL');
    }

    this.logger.log(`🔍 Searching BC document: doc=${bcNomorDokumen}, el=${bcNomorEl}`);

    // Normalisasi input (hilangkan leading zero)
    const searchDoc = bcNomorDokumen ? this.normalizeDocNumber(bcNomorDokumen) : null;
    const searchEl = bcNomorEl ? bcNomorEl.toString() : null;

    // 1. Ambil semua surat jalan (shipment) dari database
    const shipments = await this.prisma.shipment.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        suratJalan: true,
        createdAt: true,
        totalQty: true,
      },
    });

    this.logger.log(`📦 Total shipments: ${shipments.length}`);

    const matchedShipments: {
      suratJalan: string;
      shipmentDate: Date;
      totalQty: number;
      ops: { opNumber: string; qty: number }[];
      matchedMaterials: {
        materialName: string;
        bcDocuments: BcDocument[];
      }[];
    }[] = [];

    // 2. Untuk setiap shipment, cek material & dokumen BC dari external API
    for (const shipment of shipments) {
      try {
        // Ambil detail material dari external API
        const externalData = await this.getSuratJalanMaterialDetails(shipment.suratJalan);
        
        if (!externalData || !externalData.list_material) continue;

        // Cari material yang memiliki dokumen BC cocok
        const matchedMaterials: any[] = [];
        for (const materialItem of externalData.list_material) {
          const matchedDocs = materialItem.list_dokumen_bc.filter(doc => {
            const docNum = this.normalizeDocNumber(doc.nomor_dokumen_bc);
            const docEl = doc.nomor_el.toString();
            return (searchDoc && docNum === searchDoc) || (searchEl && docEl === searchEl);
          });
          if (matchedDocs.length > 0) {
            matchedMaterials.push({
              materialName: materialItem.material.Art_name,
              bcDocuments: matchedDocs,
            });
          }
        }

        if (matchedMaterials.length > 0) {
          // Ambil OP list dari externalData
          const opsList = externalData.list_op_number.map(op => ({ opNumber: op, qty: 0 })); // qty tidak tersedia, bisa diisi 0 atau diambil dari shipment items jika perlu
          matchedShipments.push({
            suratJalan: shipment.suratJalan,
            shipmentDate: shipment.createdAt,
            totalQty: shipment.totalQty,
            ops: opsList,
            matchedMaterials,
          });
          this.logger.log(`✅ Match found in shipment: ${shipment.suratJalan}`);
        }
  } catch (error) {
    // ✅ Perbaikan: gunakan type guard atau konversi ke string
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.warn(`⚠️ Failed to get material for shipment ${shipment.suratJalan}: ${errorMessage}`);
        // Lanjutkan ke shipment berikutnya
      }
    }

    if (matchedShipments.length === 0) {
      throw new NotFoundException(
        `Tidak ditemukan surat jalan yang menggunakan dokumen BC ${bcNomorDokumen || bcNomorEl}. ` +
        `Pastikan nomor dokumen BC atau EL benar.`
      );
    }

    // Format response sesuai dengan yang diharapkan frontend
    const relatedShipments = matchedShipments.map(s => ({
      suratJalan: s.suratJalan,
      shipmentDate: s.shipmentDate,
      totalQty: s.totalQty,
      ops: s.ops,
      matchedMaterials: s.matchedMaterials, // tambahan info material yang match
    }));

    return {
      bcDocument: bcNomorDokumen,
      bcEl: bcNomorEl || null,
      relatedShipments,
    };
  }

  /**
   * Mengambil detail material dari external API berdasarkan Surat Jalan.
   * @param suratJalan Nomor Surat Jalan
   * @returns Data dari external API atau fallback jika gagal
   */
async getSuratJalanMaterialDetails(suratJalan: string): Promise<any> {
  // 1. Cari shipment berdasarkan surat jalan
  const shipment = await this.prisma.shipment.findFirst({
    where: { suratJalan },
    include: {
      items: {
        include: { op: true }
      }
    }
  });

  if (!shipment) {
    throw new NotFoundException(`Surat Jalan ${suratJalan} tidak ditemukan`);
  }

  // 2. Kumpulkan semua OP number dan FG number unik
  const opNumbers = [...new Set(shipment.items.map(item => item.op.opNumber))];
  const fgNumber = shipment.fgNumber;

  // 3. Hitung total quantity per FG (jumlah semua OP untuk FG ini)
  const totalQtyFG = shipment.items.reduce((sum, item) => sum + item.qty, 0);

  // 4. Panggil external API untuk setiap OP
  const requestBody = opNumbers.map(opNumber => ({
    op_number: opNumber,
    item_fg: fgNumber
  }));

  try {
    const response = await firstValueFrom(
      this.httpService.post('http://202.52.15.30:998/miniapps/admin/api/traceability', requestBody).pipe(timeout(10000))
    );
    
    // 5. Enrich response dengan total konsumsi per material
    const enrichedData = Array.isArray(response.data) ? response.data[0] : response.data;
    if (enrichedData && enrichedData.list_material) {
      enrichedData.list_material = enrichedData.list_material.map((materialItem: any) => ({
        ...materialItem,
        totalQtyShipped: totalQtyFG,
        totalConsumption: (materialItem.material.total || 0) * totalQtyFG
      }));
    }
    
    return enrichedData;
  } catch (error) {
    console.error('Failed to fetch external traceability data:', error);
    return {
      itemFinishgood: fgNumber,
      list_op_number: opNumbers,
      list_material: []
    };
  }
}
}