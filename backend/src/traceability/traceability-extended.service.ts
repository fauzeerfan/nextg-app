import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// Ekspor tipe untuk digunakan di controller
export interface BcDocument {
  nomor_er: number;
  kode_bc: string;
  nomor_dokumen_bc: string;
  tanggal_dokumen_bc: string;
}

export interface OpTraceDetail {
  opNumber: string;
  qty: number;
  styleCode: string;
  cuttingBatches: any[];
  patternProgress: any[];
  checkPanelInspections: any[];
  qcInspections: any[];
  packingSessions: any[];
  bcDocuments: BcDocument[];
}

export interface FgTraceItem {
  fgNumber: string;
  totalQty: number;
  ops: OpTraceDetail[];
}

export interface TraceResult {
  suratJalan: string;
  shipmentDate: Date;
  totalQty: number;
  fgItems: FgTraceItem[];
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

  async traceBySuratJalanFull(suratJalan: string): Promise<TraceResult> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { suratJalan },
      include: {
        items: {
          include: {
            op: {
              include: {
                fgItems: { include: { fg: true } },
                packingItems: { include: { session: true } },
                cuttingBatches: true,
                patternProgress: true,
                checkPanelInspections: true,
                qcInspections: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Surat Jalan ${suratJalan} tidak ditemukan di database. Pastikan sudah dilakukan proses shipping.`);
    }

    const opsWithBc: OpTraceDetail[] = [];
    for (const item of shipment.items) {
      const op = item.op;
      const bcDocuments = await this.getBcDocumentsForOp(op.opNumber, op.itemNumberFG);
      opsWithBc.push({
        opNumber: op.opNumber,
        qty: item.qty,
        styleCode: op.styleCode,
        cuttingBatches: op.cuttingBatches,
        patternProgress: op.patternProgress,
        checkPanelInspections: op.checkPanelInspections,
        qcInspections: op.qcInspections,
        packingSessions: op.packingItems.map(pi => pi.session),
        bcDocuments: bcDocuments,
      });
    }

    const fgMap = new Map<string, FgTraceItem>();
    for (const opData of opsWithBc) {
      const fgNumber = shipment.items.find(i => i.op.opNumber === opData.opNumber)?.op.itemNumberFG;
      if (!fgNumber) continue;
      if (!fgMap.has(fgNumber)) {
        fgMap.set(fgNumber, {
          fgNumber,
          totalQty: 0,
          ops: [],
        });
      }
      const fgEntry = fgMap.get(fgNumber)!;
      fgEntry.totalQty += opData.qty;
      fgEntry.ops.push(opData);
    }

    return {
      suratJalan: shipment.suratJalan,
      shipmentDate: shipment.createdAt,
      totalQty: shipment.totalQty,
      fgItems: Array.from(fgMap.values()),
    };
  }

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