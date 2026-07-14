// backend/src/production-orders/production-orders.service.ts
import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionStatus, StationCode, OpLevel } from '@prisma/client';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ProductionOrdersService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  // ======================================================
  // QUERY
  // ======================================================
  async findAll() {
    return this.prisma.productionOrder.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
  }

  /**
   * Mendapatkan daftar OP aktif untuk suatu stasiun.
   * Untuk stasiun yang dapat berjalan paralel (SEWING, QC, PACKING, CP),
   * digunakan filter berdasarkan kuantitas atau kondisi logis, bukan currentStation.
   */
  async findActiveForStation(station: string, includeProgress = false) {
  // ==========================================
  // CHECK PANEL (CP)
  // ==========================================
if (station === 'CP') {
  const ops = await this.prisma.productionOrder.findMany({
    where: {
      status: ProductionStatus.WIP,
      qtyCP: { gt: 0 },
    },
    include: { line: true, checkPanelInspections: true },
    orderBy: { createdAt: 'asc' },
  });
  return ops.filter(op => {
    const totalInspected = (op.cpGoodQty || 0) + (op.cpNgQty || 0);
    const hasRemainingInspection = totalInspected < (op.qtyCP || 0);
    const hasRemainingToSend = (op.setsReadyForSewing || 0) > 0;
    // OP tetap aktif jika:
    // - masih ada pattern yang belum diinspeksi, ATAU
    // - masih ada set yang belum dikirim ke Sewing
    return hasRemainingInspection || hasRemainingToSend;
  });
}

  // ==========================================
  // SEWING
  // ==========================================
  if (station === 'SEWING') {
    // Tampilkan OP yang masih memiliki input (qtySewingIn) lebih besar dari output (qtySewingOut)
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtySewingIn: { gt: 0 },
      },
      include: {
        line: true,
        sewingStartProgress: true,
        sewingFinishProgress: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return ops.filter(op => (op.qtySewingOut || 0) < (op.qtySewingIn || 0));
  }

  // ==========================================
  // QUALITY CONTROL (QC)
  // ==========================================
  if (station === 'QC') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtySewingOut: { gt: 0 },
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });
    return ops.filter(op => {
      const totalInspected = (op.qtyQC || 0) + (op.qcNgQty || 0);
      return totalInspected < (op.qtySewingOut || 0);
    });
  }

  // ==========================================
  // PACKING
  // ==========================================
  if (station === 'PACKING') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtyQC: { gt: 0 },
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });
    return ops.filter(op => (op.qtyPacking || 0) < (op.qtyQC || 0));
  }

  // ==========================================
  // FINISHED GOODS (FG)
  // ==========================================
  if (station === 'FG') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtyPacking: { gt: 0 },
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });
    return ops.filter(op => (op.qtyFG || 0) < (op.qtyPacking || 0));
  }

  // ==========================================
  // CUTTING POND (tetap pakai currentStation)
  // ==========================================
  if (station === 'CUTTING_POND') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        currentStation: StationCode.CUTTING_POND,
      },
      include: {
        line: true,
        patternProgress: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    // Format patternProgress menjadi array patterns (sama seperti sebelumnya)
    return ops.map(op => ({
      ...op,
      patterns: op.patternProgress?.map(p => ({
        index: p.patternIndex,
        name: p.patternName,
        target: p.target,
        good: p.good,
        ng: p.ng,
        current: p.good + p.ng,
        completed: p.completed,
      })) || [],
      patternProgress: undefined,
    }));
  }

  // ==========================================
  // CUTTING ENTAN (tetap pakai currentStation + qty)
  // ==========================================
  if (station === 'CUTTING_ENTAN') {
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: ProductionStatus.WIP,
        qtyEntan: { gt: this.prisma.productionOrder.fields.qtySentToPond },
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });
    return ops;
  }

  // ==========================================
  // FALLBACK (station lain, misal tidak dikenal)
  // ==========================================
  const where: any = {
    status: ProductionStatus.WIP,
    currentStation: station as StationCode,
  };
  return this.prisma.productionOrder.findMany({
    where,
    include: { line: true },
    orderBy: { createdAt: 'asc' },
  });
}

  async findHistoryForStation(station: string) {
    if (station === 'CUTTING_ENTAN') {
      return this.prisma.productionOrder.findMany({
        where: { qtyEntan: { gt: 0 } },
        orderBy: { updatedAt: 'desc' },
        take: 50
      });
    }

    if (station === 'CUTTING_POND') {
      return this.prisma.productionOrder.findMany({
        where: { qtyPond: { gt: 0 } },
        orderBy: { updatedAt: 'desc' },
        take: 50
      });
    }

    return this.prisma.productionOrder.findMany({
      where: { currentStation: { not: station as StationCode } },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });
  }

  async findOne(id: string) {
    return this.prisma.productionOrder.findUnique({ where: { id } });
  }

  // ======================================================
  // PATTERN PROGRESS
  // ======================================================
  async getPatternProgress(opId: string) {
    const progress = await this.prisma.patternProgress.findMany({
      where: { opId },
      orderBy: { patternIndex: 'asc' },
    });
    return progress;
  }

  // ======================================================
  // CHECK PANEL INSPECTIONS
  // ======================================================
  async getCheckPanelInspections(opId: string) {
    return this.prisma.checkPanelInspection.findMany({
      where: { opId },
      orderBy: { patternIndex: 'asc' },
    });
  }

  // ======================================================
  // SEWING PROGRESS
  // ======================================================
  async getSewingProgress(opId: string) {
    const startProgress = await this.prisma.sewingStartProgress.findMany({
      where: { opId },
      orderBy: { startIndex: 'asc' }
    });
    const finishProgress = await this.prisma.sewingFinishProgress.findMany({
      where: { opId },
      orderBy: { finishIndex: 'asc' }
    });
    return { sewingStartProgress: startProgress, sewingFinishProgress: finishProgress };
  }

  // ======================================================
  // QC INSPECTION
  // ======================================================
  async qcInspect(opId: string, dto: { good: number; ng: number; ngReasons?: string[] }) {
    const { good, ng, ngReasons } = dto;

    if (good < 0 || ng < 0) throw new BadRequestException('good and ng must be non-negative');
    if (good + ng === 0) throw new BadRequestException('No quantity to process');

    return this.prisma.$transaction(async (tx) => {
      const op = await tx.productionOrder.findUnique({
        where: { id: opId },
      });
      if (!op) throw new NotFoundException('OP not found');

      // 🔥 Tidak perlu cek currentStation, karena OP bisa di banyak stasiun
      if (op.qtySewingOut <= 0) {
        throw new BadRequestException('No output from sewing yet');
      }

      // Hitung sisa output yang belum diinspeksi
      const totalInspected = (op.qtyQC || 0) + (op.qcNgQty || 0);
      const available = (op.qtySewingOut || 0) - totalInspected;
      if (available <= 0) {
        throw new BadRequestException('No remaining output to inspect');
      }
      if (good + ng > available) {
        throw new BadRequestException(`Cannot inspect more than remaining ${available} sets`);
      }

      // 1. Update ProductionTracking
      await tx.productionTracking.upsert({
        where: { opId_station: { opId, station: StationCode.QC } },
        update: { goodQty: { increment: good }, ngQty: { increment: ng } },
        create: { opId, station: StationCode.QC, goodQty: good, ngQty: ng },
      });

      // 2. Update ProductionOrder
      await tx.productionOrder.update({
        where: { id: opId },
        data: {
          qtyQC: { increment: good },
          qcNgQty: { increment: ng },
          updatedAt: new Date(), // Paksa update timestamp
        },
      });

      // 3. Simpan ke QcInspection
      await tx.qcInspection.create({
        data: {
          opId,
          good,
          ng,
          ngReasons: ngReasons || [],
        },
      });

      // 4. Buat ProductionLog
      await tx.productionLog.create({
        data: {
          opId,
          station: StationCode.QC,
          type: 'INSPECT',
          qty: good + ng,
          note: ngReasons?.join(', ') || null,
        },
      });

      // 5. Cek apakah semua set sudah diinspeksi
      const allInspections = await tx.qcInspection.aggregate({
        where: { opId },
        _sum: { good: true, ng: true },
      });
      const totalInspectedNow = (allInspections._sum.good || 0) + (allInspections._sum.ng || 0);
      if (totalInspectedNow >= (op.qtySewingOut || 0)) {
        await tx.productionOrder.update({
          where: { id: opId },
          data: { currentStation: StationCode.PACKING },
        });
      }

      return { success: true };
    });
  }

  async getQcInspections(opId: string) {
    return this.prisma.qcInspection.findMany({
      where: { opId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ======================================================
  // STATION HISTORY (per-hari per-OP) — READ ONLY
  // Dibangun sepenuhnya dari data yang SUDAH ada (ProductionLog & QcInspection).
  // Tidak mengubah alur tulis maupun skema database apa pun.
  // ======================================================

  /** Kunci tanggal lokal (YYYY-MM-DD) mengikuti waktu server. */
  private historyDayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Batas awal rentang riwayat (default 90 hari terakhir). */
  private historySince(days?: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - (days && days > 0 ? days : 90));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Agregasi item (ProductionLog / QcInspection) menjadi baris per-hari per-OP.
   * metricsFn menentukan kontribusi angka tiap item (mis. { good, ng, qty }).
   */
  private aggregateDailyByOp(
    items: any[],
    metricsFn: (item: any) => Record<string, number>,
  ) {
    const map = new Map<string, any>();
    for (const it of items) {
      const created: Date = it.createdAt;
      const dateKey = this.historyDayKey(created);
      const key = `${dateKey}|${it.opId}`;
      let row = map.get(key);
      if (!row) {
        row = {
          date: dateKey,
          opId: it.opId,
          opNumber: it.op?.opNumber ?? '-',
          styleCode: it.op?.styleCode ?? '-',
          lineCode: it.op?.line?.code ?? null,
          itemNumberFG: it.op?.itemNumberFG ?? '-',
          itemNameFG: it.op?.itemNameFG ?? null,
          events: 0,
          firstAt: created.toISOString(),
          lastAt: created.toISOString(),
        };
        map.set(key, row);
      }
      const metrics = metricsFn(it);
      for (const [k, v] of Object.entries(metrics)) {
        row[k] = (row[k] || 0) + (v || 0);
      }
      row.events += 1;
      const iso = created.toISOString();
      if (iso < row.firstAt) row.firstAt = iso;
      if (iso > row.lastAt) row.lastAt = iso;
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1; // tanggal desc
      return a.opNumber < b.opNumber ? -1 : 1;
    });
  }

  // ----- CUTTING POND -----
  // Bagian 1: pengecekan per-hari per-OP (log GOOD / NG di Cutting Pond)
  // Bagian 2: pengiriman ke station selanjutnya (log TRANSFER_TO_CP)
  async getCuttingPondHistory(days?: number) {
    const since = this.historySince(days);
    const opInclude = {
      op: {
        select: {
          opNumber: true,
          styleCode: true,
          itemNumberFG: true,
          itemNameFG: true,
          line: { select: { code: true } },
        },
      },
    };

    const checkLogs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.CUTTING_POND,
        type: { in: ['GOOD', 'NG'] },
        createdAt: { gte: since },
      },
      include: opInclude,
      orderBy: { createdAt: 'asc' },
    });
    const checks = this.aggregateDailyByOp(checkLogs, (l) => ({
      good: l.type === 'GOOD' ? l.qty : 0,
      ng: l.type === 'NG' ? l.qty : 0,
      qty: l.qty,
    }));

    const shipLogs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.CUTTING_POND,
        type: 'TRANSFER_TO_CP',
        createdAt: { gte: since },
      },
      include: opInclude,
      orderBy: { createdAt: 'asc' },
    });
    const shipments = this.aggregateDailyByOp(shipLogs, (l) => ({ qty: l.qty }));

    return { station: 'CUTTING_POND', target: 'Check Panel', checks, shipments };
  }

  // ----- CHECK PANEL -----
  // Bagian 1: pengecekan per-hari per-OP (log INSPECT di Check Panel)
  // Bagian 2: pengiriman ke station selanjutnya (log SEND_TO_SEWING)
  async getCheckPanelHistory(days?: number) {
    const since = this.historySince(days);
    const opInclude = {
      op: {
        select: {
          opNumber: true,
          styleCode: true,
          itemNumberFG: true,
          itemNameFG: true,
          line: { select: { code: true } },
        },
      },
    };

    const inspectLogs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.CP,
        type: 'INSPECT',
        createdAt: { gte: since },
      },
      include: opInclude,
      orderBy: { createdAt: 'asc' },
    });
    // Setiap inspeksi Check Panel = 1 pola. Submit GOOD tidak menulis catatan,
    // submit NG selalu menulis catatan (note). Dari sini good/ng per hari bisa
    // diturunkan tanpa perlu mengubah skema atau alur tulis yang ada.
    const checks = this.aggregateDailyByOp(inspectLogs, (l) => {
      const isNg = !!(l.note && String(l.note).trim() !== '');
      return { good: isNg ? 0 : l.qty, ng: isNg ? l.qty : 0, qty: l.qty };
    });

    const shipLogs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.CP,
        type: 'SEND_TO_SEWING',
        createdAt: { gte: since },
      },
      include: opInclude,
      orderBy: { createdAt: 'asc' },
    });
    const shipments = this.aggregateDailyByOp(shipLogs, (l) => ({ qty: l.qty }));

    return { station: 'CP', target: 'Sewing', checks, shipments };
  }

  // ----- SEWING -----
  // Pengerjaan sewing start & sewing finish per-hari per-OP
  async getSewingHistory(days?: number) {
    const since = this.historySince(days);

    const logs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.SEWING,
        type: { in: ['SEWING_START', 'SEWING_FINISH'] },
        createdAt: { gte: since },
      },
      include: {
        op: {
          select: {
            opNumber: true,
            styleCode: true,
            itemNumberFG: true,
            itemNameFG: true,
            line: { select: { code: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const records = this.aggregateDailyByOp(logs, (l) => ({
      start: l.type === 'SEWING_START' ? l.qty : 0,
      finish: l.type === 'SEWING_FINISH' ? l.qty : 0,
      qty: l.qty,
    }));

    return { station: 'SEWING', records };
  }

  // ----- QUALITY CONTROL -----
  // Pengecekan per-hari per-OP (dari tabel QcInspection yang menyimpan good & ng)
  async getQualityControlHistory(days?: number) {
    const since = this.historySince(days);

    const inspections = await this.prisma.qcInspection.findMany({
      where: { createdAt: { gte: since } },
      include: {
        op: {
          select: {
            opNumber: true,
            styleCode: true,
            itemNumberFG: true,
            itemNameFG: true,
            line: { select: { code: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const checks = this.aggregateDailyByOp(inspections, (i) => ({
      good: i.good || 0,
      ng: i.ng || 0,
      qty: (i.good || 0) + (i.ng || 0),
    }));

    return { station: 'QC', checks };
  }

  // ======================================================
  // DASHBOARD ANALYTICS (per-station, rentang bisa dipilih) — READ ONLY
  // range: 'today' (per jam) | '7d' | '30d' (per hari). Semua dari data existing,
  // tanpa perubahan skema / alur tulis / migrasi.
  // ======================================================
  private analyticsWindow(range?: string, startDate?: string, endDate?: string): { start: Date; end: Date; mode: 'hour' | 'day' } {
    // Custom range: tanggal awal & akhir dipilih manual.
    if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      const sameDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();
      return { start, end, mode: sameDay ? 'hour' : 'day' };
    }
    const now = new Date();
    if (range === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start, end: now, mode: 'hour' };
    }
    const days = range === '30d' ? 30 : 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - (days - 1));
    return { start, end: now, mode: 'day' };
  }

  private analyticsBuckets(win: { start: Date; end: Date; mode: 'hour' | 'day' }) {
    const buckets: { key: string; label: string }[] = [];
    if (win.mode === 'hour') {
      const endHour = win.end.getHours();
      for (let h = 0; h <= endHour; h++) {
        buckets.push({ key: `H${h}`, label: `${String(h).padStart(2, '0')}:00` });
      }
    } else {
      const d = new Date(win.start);
      const last = new Date(win.end.getFullYear(), win.end.getMonth(), win.end.getDate());
      while (d <= last) {
        buckets.push({
          key: this.historyDayKey(d),
          label: d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
        });
        d.setDate(d.getDate() + 1);
      }
    }
    return buckets;
  }

  private analyticsBucketKey(date: Date, win: { mode: 'hour' | 'day' }): string {
    return win.mode === 'hour' ? `H${date.getHours()}` : this.historyDayKey(date);
  }

  async getDashboardAnalytics(range?: string, lineCode?: string, startDate?: string, endDate?: string) {
    const win = this.analyticsWindow(range, startDate, endDate);
    const buckets = this.analyticsBuckets(win);
    const idxByKey = new Map<string, number>(buckets.map((b, i) => [b.key, i] as [string, number]));
    const hasLine = !!lineCode && lineCode.trim() !== '';
    const opLineWhere: any = hasLine ? { op: { line: { code: lineCode } } } : {};
    const timeWhere: any = { createdAt: { gte: win.start, lte: win.end } };
    const round1 = (n: number) => Math.round(n * 10) / 10;
    const rate = (part: number, total: number) => (total > 0 ? round1((part / total) * 100) : 0);

    // Rate NG per Komponen/Pola: kelompokkan per patternIndex (urutan pola yang stabil),
    // pakai NAMA POLA TERBARU. Baris diurutkan updatedAt asc sehingga nama dari record
    // terbaru yang menang -> menyatukan data lama (pola 1..4) & baru (pola 3..6) tanpa dobel.
    const ngByComponent = (rows: { patternIndex: number; patternName: string; good: number; ng: number }[]) => {
      const map = new Map<number, { name: string; good: number; ng: number }>();
      for (const r of rows) {
        const cur = map.get(r.patternIndex) || { name: r.patternName || '-', good: 0, ng: 0 };
        cur.good += r.good; cur.ng += r.ng;
        if (r.patternName) cur.name = r.patternName;
        map.set(r.patternIndex, cur);
      }
      return Array.from(map.entries())
        .sort((a, b) => a[0] - b[0]) // urut per index pola (pola pertama, kedua, ...)
        .map(([, v]) => ({ name: v.name, good: v.good, ng: v.ng, total: v.good + v.ng, ngRate: rate(v.ng, v.good + v.ng) }));
    };

    // ---------- CUTTING ENTAN & POND ----------
    const [entanLogs, pondGoodLogs, pondNgLogs] = await Promise.all([
      this.prisma.productionLog.findMany({
        where: { station: StationCode.CUTTING_ENTAN, type: 'QR_GENERATED', ...timeWhere, ...opLineWhere },
        select: { qty: true, createdAt: true },
      }),
      this.prisma.productionLog.findMany({
        where: { station: StationCode.CUTTING_POND, type: 'GOOD', ...timeWhere, ...opLineWhere },
        select: { qty: true, createdAt: true },
      }),
      this.prisma.productionLog.findMany({
        where: { station: StationCode.CUTTING_POND, type: 'NG', ...timeWhere, ...opLineWhere },
        select: { qty: true, createdAt: true },
      }),
    ]);
    // Entan tab: produktivitas Entan & Pond (gabungan). Pond tab: Good vs NG per periode.
    const cuttingProductivity = buckets.map((b) => ({ label: b.label, entan: 0, pond: 0 }));
    const pondProductivity = buckets.map((b) => ({ label: b.label, good: 0, ng: 0 }));
    let totalEntan = 0, pondGood = 0, pondNg = 0;
    for (const l of entanLogs) {
      const i = idxByKey.get(this.analyticsBucketKey(l.createdAt, win));
      if (i != null) cuttingProductivity[i].entan += l.qty;
      totalEntan += l.qty;
    }
    for (const l of pondGoodLogs) {
      const i = idxByKey.get(this.analyticsBucketKey(l.createdAt, win));
      if (i != null) { cuttingProductivity[i].pond += l.qty; pondProductivity[i].good += l.qty; }
      pondGood += l.qty;
    }
    for (const l of pondNgLogs) {
      const i = idxByKey.get(this.analyticsBucketKey(l.createdAt, win));
      if (i != null) pondProductivity[i].ng += l.qty;
      pondNg += l.qty;
    }
    const pondTotal = pondGood + pondNg;
    const patternRows = await this.prisma.patternProgress.findMany({
      where: { updatedAt: { gte: win.start, lte: win.end }, ...(hasLine ? { op: { line: { code: lineCode } } } : {}) },
      select: { patternIndex: true, patternName: true, good: true, ng: true },
      orderBy: { updatedAt: 'asc' },
    });
    const cuttingNgPerComponent = ngByComponent(patternRows);

    // ---------- CHECK PANEL ----------
    const cpInspectLogs = await this.prisma.productionLog.findMany({
      where: { station: StationCode.CP, type: 'INSPECT', ...timeWhere, ...opLineWhere },
      select: { qty: true, note: true, createdAt: true },
    });
    const cpTrend = buckets.map((b) => ({ label: b.label, good: 0, ng: 0, ngRate: 0, qualityRate: 0 }));
    let cpGood = 0, cpNg = 0;
    for (const l of cpInspectLogs) {
      const isNg = !!(l.note && String(l.note).trim() !== '');
      const i = idxByKey.get(this.analyticsBucketKey(l.createdAt, win));
      if (i != null) { if (isNg) cpTrend[i].ng += l.qty; else cpTrend[i].good += l.qty; }
      if (isNg) cpNg += l.qty; else cpGood += l.qty;
    }
    for (const t of cpTrend) {
      const tot = t.good + t.ng;
      t.ngRate = tot > 0 ? round1((t.ng / tot) * 100) : 0;
      t.qualityRate = tot > 0 ? round1((t.good / tot) * 100) : 0;
    }
    const cpTotal = cpGood + cpNg;
    // Rate NG per Komponen/Pola (dari CheckPanelInspection, dikelompokkan per patternIndex + nama terbaru)
    const cpInspRows = await this.prisma.checkPanelInspection.findMany({
      where: { updatedAt: { gte: win.start, lte: win.end }, ...(hasLine ? { op: { line: { code: lineCode } } } : {}) },
      select: { patternIndex: true, patternName: true, good: true, ng: true },
      orderBy: { updatedAt: 'asc' },
    });
    const cpNgPerComponent = ngByComponent(cpInspRows);

    // ---------- SEWING ----------
    const sewingLogs = await this.prisma.productionLog.findMany({
      where: { station: StationCode.SEWING, type: { in: ['SEWING_START', 'SEWING_FINISH'] }, ...timeWhere, ...opLineWhere },
      select: { type: true, qty: true, createdAt: true },
    });
    const sewingProductivity = buckets.map((b) => ({ label: b.label, start: 0, finish: 0 }));
    let totalStart = 0, totalFinish = 0;
    for (const l of sewingLogs) {
      const i = idxByKey.get(this.analyticsBucketKey(l.createdAt, win));
      if (l.type === 'SEWING_START') { if (i != null) sewingProductivity[i].start += l.qty; totalStart += l.qty; }
      else { if (i != null) sewingProductivity[i].finish += l.qty; totalFinish += l.qty; }
    }
    const sewingTrend = sewingProductivity.map((s) => ({ label: s.label, output: s.finish }));

    // ---------- QUALITY CONTROL ----------
    const qcRows = await this.prisma.qcInspection.findMany({
      where: { ...timeWhere, ...(hasLine ? { op: { line: { code: lineCode } } } : {}) },
      select: { good: true, ng: true, ngReasons: true, createdAt: true },
    });
    const qcTrend = buckets.map((b) => ({ label: b.label, good: 0, ng: 0, ngRate: 0, qualityRate: 0 }));
    let qcGood = 0, qcNg = 0;
    const qcCatMap = new Map<string, number>();
    for (const r of qcRows) {
      const i = idxByKey.get(this.analyticsBucketKey(r.createdAt, win));
      if (i != null) { qcTrend[i].good += r.good; qcTrend[i].ng += r.ng; }
      qcGood += r.good; qcNg += r.ng;
      let reasons: any = r.ngReasons;
      if (typeof reasons === 'string') { try { reasons = JSON.parse(reasons); } catch { reasons = [reasons]; } }
      if (Array.isArray(reasons)) {
        for (const rs of reasons) {
          const key = String(rs || '').trim();
          if (!key) continue;
          qcCatMap.set(key, (qcCatMap.get(key) || 0) + 1);
        }
      }
    }
    for (const t of qcTrend) {
      const tot = t.good + t.ng;
      t.ngRate = tot > 0 ? round1((t.ng / tot) * 100) : 0;
      t.qualityRate = tot > 0 ? round1((t.good / tot) * 100) : 0;
    }
    const qcTotal = qcGood + qcNg;
    const qcNgPerCategory = Array.from(qcCatMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      range: startDate && endDate ? 'custom' : range === 'today' ? 'today' : range === '30d' ? '30d' : '7d',
      mode: win.mode,
      cutting: {
        entan: {
          productivity: cuttingProductivity,
          totalEntan,
          totalPond: pondGood,
        },
        pond: {
          productivity: pondProductivity,
          good: pondGood, ng: pondNg, total: pondTotal,
          ngRate: rate(pondNg, pondTotal),
          qualityRate: rate(pondGood, pondTotal),
          ngPerComponent: cuttingNgPerComponent,
        },
      },
      checkPanel: {
        good: cpGood, ng: cpNg, total: cpTotal,
        ngRate: cpTotal > 0 ? round1((cpNg / cpTotal) * 100) : 0,
        qualityRate: cpTotal > 0 ? round1((cpGood / cpTotal) * 100) : 0,
        trend: cpTrend,
        ngPerComponent: cpNgPerComponent,
      },
      sewing: {
        totalStart, totalFinish,
        productivity: sewingProductivity,
        trend: sewingTrend,
      },
      qc: {
        good: qcGood, ng: qcNg, total: qcTotal,
        ngRate: qcTotal > 0 ? round1((qcNg / qcTotal) * 100) : 0,
        qualityRate: qcTotal > 0 ? round1((qcGood / qcTotal) * 100) : 0,
        trend: qcTrend,
        ngPerCategory: qcNgPerCategory,
      },
    };
  }

  // ======================================================
  // DASHBOARD STATS
  // ======================================================
  async getDashboardStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeOps = await this.prisma.productionOrder.findMany({
      where: {
        status: { in: [ProductionStatus.WIP, ProductionStatus.DONE] }
      },
      select: { qtyPond: true, qtyPacking: true, currentStation: true }
    });

    const totalWip = activeOps.reduce((acc, op) => acc + (op.qtyPond - op.qtyPacking), 0);

    const packingLogs = await this.prisma.productionLog.aggregate({
      _sum: { qty: true },
      where: {
        station: StationCode.PACKING,
        type: 'PACKING_OUT',
        createdAt: { gte: startOfDay }
      }
    });

    const inspectionLogs = await this.prisma.productionLog.aggregate({
      _sum: { qty: true },
      where: {
        type: 'INSPECT',
        createdAt: { gte: startOfDay }
      }
    });

    const totalInspected = inspectionLogs._sum.qty || 0;
    const ngRate = 0;

    const stationGroup = await this.prisma.productionOrder.groupBy({
      by: ['currentStation'],
      where: { status: { not: ProductionStatus.DONE } },
      _count: { id: true }
    });

    const recentOps = await this.prisma.productionOrder.findMany({
      where: { status: { not: ProductionStatus.DONE } },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    return {
      kpi: {
        wip: totalWip,
        output: packingLogs._sum.qty || 0,
        ngRate: ngRate.toFixed(1),
        speed: Math.round((packingLogs._sum.qty || 0) / 8)
      },
      stations: stationGroup.map(s => ({
        name: s.currentStation,
        count: s._count.id
      })),
      activeOps: recentOps
    };
  }

  // ======================================================
  // DASHBOARD COMPREHENSIVE (UPDATED: + filter line, + entan output, + sewing fix)
  // ======================================================
  async getDashboardComprehensive(startDateStr?: string, endDateStr?: string, lineCode?: string) {
    // Tentukan rentang tanggal (default: hari ini)
    let startDate: Date;
    let endDate: Date;

    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      endDate.setMilliseconds(-1);
    }

    // ===== Filter line (opsional). Kosong/undefined => semua line. =====
    const hasLine = !!lineCode && lineCode.trim() !== '';
    const lineWhere: any = hasLine ? { line: { code: lineCode } } : {};                          // model punya relasi `line` (ProductionOrder)
    const opLineWhere: any = hasLine ? { op: { line: { code: lineCode } } } : {};                // model punya relasi `op` (ProductionLog/CheckPanelInspection/QcInspection/CuttingBatch)
    const itemsLineWhere: any = hasLine ? { items: { some: { op: { line: { code: lineCode } } } } } : {}; // PackingSession & Shipment (lewat items -> op)

    // 1. KPI UTAMA (dalam rentang tanggal)
    const totalOps = await this.prisma.productionOrder.count({ where: { ...lineWhere, level: { not: OpLevel.PARENT } } });
    const totalWip = await this.prisma.productionOrder.count({ where: { status: 'WIP', ...lineWhere, level: { not: OpLevel.PARENT } } });

    const packingSessionsInRange = await this.prisma.packingSession.aggregate({
      where: { status: 'CLOSED', createdAt: { gte: startDate, lte: endDate }, ...itemsLineWhere },
      _sum: { totalQty: true }
    });
    const todayOutput = packingSessionsInRange._sum.totalQty || 0;

    const activeLines = await this.prisma.lineMaster.count({
      where: {
        ...(hasLine ? { code: lineCode } : {}),
        productionOrders: { some: { status: 'WIP' } },
      }
    });
    const targetOutput = activeLines * 8 * 50;
    const achievement = targetOutput > 0 ? Math.round((todayOutput / targetOutput) * 100) : 0;

    // Defect rate dalam rentang (CP + QC)
    const totalGoodCP = await this.prisma.checkPanelInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate }, ...opLineWhere }, _sum: { good: true }
    });
    const totalNgCP = await this.prisma.checkPanelInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate }, ...opLineWhere }, _sum: { ng: true }
    });
    const totalGoodQC = await this.prisma.qcInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate }, ...opLineWhere }, _sum: { good: true }
    });
    const totalNgQC = await this.prisma.qcInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate }, ...opLineWhere }, _sum: { ng: true }
    });
    const totalGood = (totalGoodCP._sum.good || 0) + (totalGoodQC._sum.good || 0);
    const totalProduced = totalGood + (totalNgCP._sum.ng || 0) + (totalNgQC._sum.ng || 0);
    const defectRate = totalProduced > 0 ? Number(((totalProduced - totalGood) / totalProduced) * 100).toFixed(1) : 0;

    const overallEfficiency = achievement;
    const totalNg = (totalNgCP._sum.ng || 0) + (totalNgQC._sum.ng || 0);

    // 2. WIP per station (kondisi saat ini, difilter line)
    const allWipOps = await this.prisma.productionOrder.findMany({
      where: { status: 'WIP', ...lineWhere },
      select: {
        id: true, opNumber: true, currentStation: true,
        qtyEntan: true, qtySentToPond: true, qtyPond: true, qtyCP: true,
        cpGoodQty: true, cpNgQty: true, setsReadyForSewing: true,
        qtySewingIn: true, qtySewingOut: true, qtyQC: true, qcNgQty: true,
        qtyPacking: true, qtyFG: true,
        line: { select: { patternMultiplier: true } }
      }
    });

    const stationKeys = ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'];
    const stationMap: Record<string, { count: number; wipQty: number }> = {};
    stationKeys.forEach(key => { stationMap[key] = { count: 0, wipQty: 0 }; });

    for (const op of allWipOps) {
      const multiplier = op.line?.patternMultiplier || 1;
      const entanWip = (op.qtyEntan || 0) - (op.qtySentToPond || 0);
      if (entanWip > 0) { stationMap['CUTTING_ENTAN'].count++; stationMap['CUTTING_ENTAN'].wipQty += entanWip; }

      const targetPond = (op.qtySentToPond || 0) * multiplier; // FIX: Pond hanya berisi yang SUDAH dikirim dari Entan (bukan total qtyEntan dari API)
      const pondWip = targetPond - (op.qtyPond || 0);
      if (pondWip > 0) { stationMap['CUTTING_POND'].count++; stationMap['CUTTING_POND'].wipQty += pondWip; }

      const cpInspected = (op.cpGoodQty || 0) + (op.cpNgQty || 0);
      const cpWip = (op.qtyCP || 0) - cpInspected;
      const setsReady = (op.setsReadyForSewing || 0);
      if (cpWip > 0 || setsReady > 0) {
        stationMap['CP'].count++;
        stationMap['CP'].wipQty += cpWip > 0 ? cpWip : setsReady;
      }

      const sewingWip = (op.qtySewingIn || 0) - (op.qtySewingOut || 0);
      if (sewingWip > 0) { stationMap['SEWING'].count++; stationMap['SEWING'].wipQty += sewingWip; }

      const qcInspected = (op.qtyQC || 0) + (op.qcNgQty || 0);
      const qcWip = (op.qtySewingOut || 0) - qcInspected;
      if (qcWip > 0) { stationMap['QC'].count++; stationMap['QC'].wipQty += qcWip; }

      const packingWip = (op.qtyQC || 0) - (op.qtyPacking || 0);
      if (packingWip > 0) { stationMap['PACKING'].count++; stationMap['PACKING'].wipQty += packingWip; }

      const fgWip = (op.qtyPacking || 0) - (op.qtyFG || 0);
      if (fgWip > 0) { stationMap['FG'].count++; stationMap['FG'].wipQty += fgWip; }
    }

    // 3. Hitung input/output/ng per rentang tanggal
    const stationStats: Record<string, { input: number; output: number; ng: number }> = {};
    stationKeys.forEach(key => { stationStats[key] = { input: 0, output: 0, ng: 0 }; });

    // Cutting Pond input dari CuttingBatch dalam rentang
    const batchesInRange = await this.prisma.cuttingBatch.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, ...opLineWhere },
      select: { qty: true }
    });
    stationStats['CUTTING_POND'].input = batchesInRange.reduce((sum, b) => sum + b.qty, 0);

    // Cutting Pond output & NG dari ProductionLog
    const pondLogs = await this.prisma.productionLog.findMany({
      where: {
        station: StationCode.CUTTING_POND,
        createdAt: { gte: startDate, lte: endDate },
        type: { in: ['GOOD', 'NG'] },
        ...opLineWhere,
      },
      select: { type: true, qty: true }
    });
    for (const log of pondLogs) {
      if (log.type === 'GOOD') stationStats['CUTTING_POND'].output += log.qty;
      if (log.type === 'NG') stationStats['CUTTING_POND'].ng += log.qty;
    }

    // CP input dari log TRANSFER_TO_CP
    const cpTransferLogs = await this.prisma.productionLog.findMany({
      where: { station: StationCode.CUTTING_POND, type: 'TRANSFER_TO_CP', createdAt: { gte: startDate, lte: endDate }, ...opLineWhere },
      select: { qty: true }
    });
    stationStats['CP'].input = cpTransferLogs.reduce((sum, l) => sum + l.qty, 0);

    // CP output dari log SEND_TO_SEWING
    const cpSendLogs = await this.prisma.productionLog.findMany({
      where: { station: StationCode.CP, type: 'SEND_TO_SEWING', createdAt: { gte: startDate, lte: endDate }, ...opLineWhere },
      select: { qty: true }
    });
    stationStats['CP'].output = cpSendLogs.reduce((sum, l) => sum + l.qty, 0);

    // CP NG dari CheckPanelInspection
    const cpNgInRange = await this.prisma.checkPanelInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate }, ...opLineWhere }, _sum: { ng: true }
    });
    stationStats['CP'].ng = cpNgInRange._sum.ng || 0;

    // Sewing
    stationStats['SEWING'].input = stationStats['CP'].output;
    const sewingFinishLogs = await this.prisma.productionLog.findMany({
      where: { station: StationCode.SEWING, type: 'SEWING_FINISH', createdAt: { gte: startDate, lte: endDate }, ...opLineWhere },
      select: { qty: true }
    });
    stationStats['SEWING'].output = sewingFinishLogs.reduce((sum, l) => sum + l.qty, 0);

    // QC
    stationStats['QC'].input = stationStats['SEWING'].output;
    const qcGoodInRange = await this.prisma.qcInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate }, ...opLineWhere }, _sum: { good: true }
    });
    stationStats['QC'].output = qcGoodInRange._sum.good || 0;
    const qcNgInRange = await this.prisma.qcInspection.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate }, ...opLineWhere }, _sum: { ng: true }
    });
    stationStats['QC'].ng = qcNgInRange._sum.ng || 0;

    // Packing
    stationStats['PACKING'].input = stationStats['QC'].output;
    const packingOutputInRange = await this.prisma.packingSession.aggregate({
      where: { status: 'CLOSED', createdAt: { gte: startDate, lte: endDate }, ...itemsLineWhere },
      _sum: { totalQty: true }
    });
    stationStats['PACKING'].output = packingOutputInRange._sum.totalQty || 0;

    // FG
    stationStats['FG'].input = stationStats['PACKING'].output;
    const fgOutputInRange = await this.prisma.shipment.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate }, ...itemsLineWhere },
      _sum: { totalQty: true }
    });
    stationStats['FG'].output = fgOutputInRange._sum.totalQty || 0;

    // Cutting Entan — FIX 2: output hari ini = total dikirim ke Pond (QR_GENERATED) dalam rentang
    const entanQrLogs = await this.prisma.productionLog.findMany({
      where: { station: StationCode.CUTTING_ENTAN, type: 'QR_GENERATED', createdAt: { gte: startDate, lte: endDate }, ...opLineWhere },
      select: { qty: true }
    });
    stationStats['CUTTING_ENTAN'].input = 0; // tidak ada sumber "input harian" untuk Entan (qtyEntan dari sync eksternal)
    stationStats['CUTTING_ENTAN'].output = entanQrLogs.reduce((sum, l) => sum + l.qty, 0);
    stationStats['CUTTING_ENTAN'].ng = 0;

    const stationFlow = stationKeys.map(station => ({
      station,
      count: stationMap[station].count,
      wipQty: stationMap[station].wipQty,
      todayInput: stationStats[station].input,
      todayOutput: stationStats[station].output,
      qtyNg: stationStats[station].ng,
      progress: stationStats[station].input > 0 ? Math.round((stationStats[station].output / stationStats[station].input) * 100) : 0
    }));

    // 4. Hourly production (global; tidak dirender di UI saat ini)
    const hourlyRaw = await this.prisma.$queryRaw`
      SELECT EXTRACT(HOUR FROM "createdAt") as hour, SUM("totalQty") as output
      FROM "PackingSession"
      WHERE status = 'CLOSED' AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY hour
      ORDER BY hour
    `;
    const hourlyProduction = (hourlyRaw as any[]).map(row => ({
      hour: `${String(row.hour).padStart(2, '0')}:00`,
      output: Number(row.output),
      target: activeLines * 50
    }));

    // 5. Status distribution (difilter line)
    const statusCounts = await this.prisma.productionOrder.groupBy({
      by: ['status'],
      where: { ...lineWhere, level: { not: OpLevel.PARENT } },
      _count: { status: true }
    });
    const statusDistribution = statusCounts.map(s => ({ status: s.status, count: s._count.status }));

    // 6. Slow moving ops (difilter line)
    const slowOps = await this.prisma.productionOrder.findMany({
      where: { status: 'WIP', ...lineWhere, level: { not: OpLevel.PARENT } },
      orderBy: { updatedAt: 'asc' },
      take: 5,
      select: { opNumber: true, currentStation: true, updatedAt: true }
    });
    const now = new Date();
    const slowMovingOps = slowOps.map(op => ({
      opNumber: op.opNumber,
      currentStation: op.currentStation || 'UNKNOWN',
      hoursInStation: Math.round((now.getTime() - op.updatedAt.getTime()) / (1000 * 60 * 60))
    }));

    // 7. Recent activities (dalam rentang, difilter line)
    const recentLogs = await this.prisma.productionLog.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, ...opLineWhere },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { op: { select: { opNumber: true } } }
    });
    const recentActivities = recentLogs.map(log => ({
      time: log.createdAt.toISOString(),
      opNumber: log.op.opNumber,
      station: log.station,
      action: log.type,
      qty: log.qty
    }));

    // 8. Line summaries — SELALU semua line (dipakai untuk mengisi dropdown)
    const lines = await this.prisma.lineMaster.findMany({ select: { code: true, name: true } });
    const lineSummaries: { lineCode: string; output: number; efficiency: number; defectRate: number; target: number }[] = [];
    for (const line of lines) {
      const lineOps = await this.prisma.productionOrder.findMany({
        where: { line: { code: line.code } },
        select: { id: true }
      });
      const opIds = lineOps.map(o => o.id);
      const lineOutput = await this.prisma.packingSession.aggregate({
        where: {
          status: 'CLOSED',
          createdAt: { gte: startDate, lte: endDate },
          items: { some: { opId: { in: opIds } } }
        },
        _sum: { totalQty: true }
      });
      const output = lineOutput._sum.totalQty || 0;
      const lineTarget = 8 * 50;
      const cpInspections = await this.prisma.checkPanelInspection.findMany({
        where: { op: { line: { code: line.code } }, createdAt: { gte: startDate, lte: endDate } },
        select: { good: true, ng: true }
      });
      const qcInspections = await this.prisma.qcInspection.findMany({
        where: { op: { line: { code: line.code } }, createdAt: { gte: startDate, lte: endDate } },
        select: { good: true, ng: true }
      });
      let lineGood = 0, lineNg = 0;
      cpInspections.forEach(i => { lineGood += i.good; lineNg += i.ng; });
      qcInspections.forEach(i => { lineGood += i.good; lineNg += i.ng; });
      const lineDefect = lineGood + lineNg > 0 ? Number(((lineNg / (lineGood + lineNg)) * 100).toFixed(1)) : 0;
      lineSummaries.push({
        lineCode: line.code,
        output,
        efficiency: lineTarget > 0 ? Math.round((output / lineTarget) * 100) : 0,
        defectRate: lineDefect,
        target: lineTarget
      });
    }

    // 9. Quality trend (7 hari terakhir dari endDate, difilter line)
    const endDateForTrend = endDateStr ? new Date(endDateStr) : new Date();
    const qualityTrend: { date: string; defectRate: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDateForTrend);
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      const dayGood = await this.prisma.checkPanelInspection.aggregate({
        where: { createdAt: { gte: dateStart, lt: dateEnd }, ...opLineWhere }, _sum: { good: true }
      });
      const dayNg = await this.prisma.checkPanelInspection.aggregate({
        where: { createdAt: { gte: dateStart, lt: dateEnd }, ...opLineWhere }, _sum: { ng: true }
      });
      const dayTotal = (dayGood._sum.good || 0) + (dayNg._sum.ng || 0);
      const dayDefect = dayTotal > 0 ? Number(((dayNg._sum.ng || 0) / dayTotal) * 100).toFixed(1) : '0';
      qualityTrend.push({
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
        defectRate: Number(dayDefect)
      });
    }

    return {
      kpi: {
        totalOps, todayOutput, totalWip, overallEfficiency,
        defectRate: Number(defectRate), targetOutput, achievement,
        totalGood, totalNg,
      },
      stationFlow,
      hourlyProduction,
      statusDistribution,
      slowMovingOps,
      recentActivities,
      lineSummaries,
      qualityTrend
    };
  }

  // ======================================================
  // SYNC EXTERNAL (robust: per-OP, anti-timeout, URL dari .env)
  // ======================================================
  async syncExternalData() {
    // ===== FASE 6: CUTOVER KE CUTTING REPORT INTERNAL (switch runtime) =====
    // Sumber data Cutting Entan dikendalikan oleh SystemSetting "CUTTING_SOURCE"
    // (tombol switch di UI), DEFAULT = INTERNAL. Saat INTERNAL, sumber OP induk
    // (qtyEntan) sepenuhnya dari Cutting Report internal NextG (postToProduction),
    // sehingga sync eksternal dilewati. Guard berlaku untuk scheduler MAUPUN
    // endpoint manual /production-orders/sync. ENV CUTTING_SYNC_DISABLED tetap
    // dihormati sebagai pemutus paksa (override) bila diset 'true'.
    const source = await this.settings.getCuttingSource();
    if (process.env.CUTTING_SYNC_DISABLED === 'true' || source === 'INTERNAL') {
      return {
        success: true,
        disabled: true,
        source,
        message:
          'Sync eksternal dilewati. Sumber OP = Cutting Report internal NextG (switch CUTTING_SOURCE=INTERNAL).',
        total: 0,
        fromApi: 0,
        uniqueOps: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      };
    }

    // 1. URL diambil dari .env (EXTERNAL_CUTTING_API) + '/cuttingreport',
    //    dengan fallback ke alamat lama bila env belum diset.
    const base = (
      process.env.EXTERNAL_CUTTING_API ||
      'http://202.52.15.30:998/miniapps/admin/api'
    ).replace(/\/+$/, '');
    const url = `${base}/cuttingreport`;

    // 2. Ambil data dari API eksternal (dengan validasi respons).
    let externalData: any[];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      externalData = await response.json();
    } catch (error: any) {
      console.error('[sync] Gagal fetch API cutting:', error?.message ?? error);
      throw new InternalServerErrorException(
        `Sync failed (fetch ${url}): ${error?.message ?? error}`,
      );
    }

    if (!Array.isArray(externalData)) {
      throw new InternalServerErrorException('Sync failed: respons API bukan array');
    }

    // 3. Parser angka tahan-format ("1.250" / "1,250" / "1250 pcs" -> 1250).
    const toInt = (v: any) =>
      parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10) || 0;

    // 4. Dedupe per nomorOp (ambil nilai terbesar) agar tidak terpotong bila API
    //    mengirim beberapa baris untuk satu OP yang sama.
    const byOp = new Map<
      string,
      {
        opNumber: string;
        itemNumberFG: string | null;
        itemNameFG: string | null;
        qtyOp: number;
        qtyEntan: number;
      }
    >();
    for (const item of externalData) {
      const opNumber = item?.nomorOp;
      if (!opNumber || typeof opNumber !== 'string') continue;
      const prev = byOp.get(opNumber);
      byOp.set(opNumber, {
        opNumber,
        itemNumberFG: item.itemNumberFinishGood ?? prev?.itemNumberFG ?? null,
        itemNameFG: item.itemNameFinishGood ?? prev?.itemNameFG ?? null,
        qtyOp: Math.max(toInt(item.qtyOp), prev?.qtyOp ?? 0),
        qtyEntan: Math.max(toInt(item.grandTotalCutting), prev?.qtyEntan ?? 0),
      });
    }

    // 5. Tulis PER-OP (BUKAN dalam satu transaksi besar) agar:
    //    - tidak terkena batas waktu transaksi Prisma (default 5 dtk) saat data
    //      banyak — ini sering terjadi TEPAT setelah reset karena semua baris
    //      adalah INSERT baru; dan
    //    - satu baris bermasalah tidak membatalkan SEMUA OP lain (ambil semua yang valid).
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const lineCache = new Map<string, string>(); // styleCode -> lineId

    for (const op of byOp.values()) {
      try {
        // itemNumberFG wajib (NOT NULL di schema). Bila kosong, lewati & catat
        // (jangan biarkan satu baris invalid menggagalkan seluruh sync).
        if (!op.itemNumberFG) {
          skipped++;
          console.warn(`[sync] OP ${op.opNumber} dilewati: itemNumberFinishGood kosong`);
          continue;
        }

        const styleCode = op.opNumber.substring(0, 4).toUpperCase();

        // FIND / CREATE LINE (pakai cache agar hemat query).
        let lineId = lineCache.get(styleCode);
        if (!lineId) {
          let line = await this.prisma.lineMaster.findUnique({
            where: { code: styleCode },
          });
          if (!line) {
            line = await this.prisma.lineMaster.create({
              data: { code: styleCode, name: `Line ${styleCode}`, patternMultiplier: 4 },
            });
          }
          lineId = line.id;
          lineCache.set(styleCode, lineId);
        }

        // Baca data lama untuk: (a) bedakan create vs update, dan
        // (b) menjaga qtyEntan KUMULATIF & hanya NAIK (lihat catatan di bawah).
        const existing = await this.prisma.productionOrder.findUnique({
          where: { opNumber: op.opNumber },
          select: { qtyEntan: true },
        });

        // qtyEntan = total hasil cutting kumulatif; secara fisik hanya bertambah,
        // tidak mungkin berkurang. Mengunci agar monotonik (hanya naik) menjaga
        // konsistensi terhadap batch yang SUDAH dikirim ke Pond (qtySentToPond),
        // sehingga hasil cutting baru selalu MENAMBAH pending (jadi batch berikutnya),
        // bukan menimpa/menghapus yang sudah dikirim.
        const nextEntan = existing
          ? Math.max(existing.qtyEntan, op.qtyEntan)
          : op.qtyEntan;

        await this.prisma.productionOrder.upsert({
          where: { opNumber: op.opNumber },
          update: {
            itemNumberFG: op.itemNumberFG,
            itemNameFG: op.itemNameFG,
            qtyOp: op.qtyOp,
            qtyEntan: nextEntan,
            cuttingSource: 'EXTERNAL', // OP ini milik sumber EXTERNAL (API lama)
          },
          create: {
            opNumber: op.opNumber,
            styleCode,
            lineId,
            itemNumberFG: op.itemNumberFG,
            itemNameFG: op.itemNameFG,
            qtyOp: op.qtyOp,
            qtyEntan: nextEntan,
            currentStation: StationCode.CUTTING_ENTAN,
            status: ProductionStatus.WIP,
            level: OpLevel.PARENT, // OP baru = induk (penampung Entan); batch dibuat saat Generate QR
            cuttingSource: 'EXTERNAL',
          },
        });
        if (existing) updated++; else created++;
      } catch (err: any) {
        errors++;
        console.error(`[sync] Gagal memproses OP ${op.opNumber}: ${err?.message ?? err}`);
      }
    }

    const summary = {
      success: true,
      total: created + updated, // jumlah OP yang berhasil ditulis
      fromApi: externalData.length, // jumlah baris mentah dari API
      uniqueOps: byOp.size,
      created,
      updated,
      skipped,
      errors,
    };
    console.log('[sync] Selesai:', summary);
    return summary;
  }

  // ======================================================
  // CREATE SIMULATION
  // ======================================================
  async createSimulation(dto: any) {
    let line = await this.prisma.lineMaster.findUnique({
      where: { code: dto.styleCode }
    });

    if (!line) {
      line = await this.prisma.lineMaster.create({
        data: {
          code: dto.styleCode,
          name: `Line ${dto.styleCode}`,
          patternMultiplier: 4
        }
      });
    }

    return this.prisma.productionOrder.create({
      data: {
        opNumber: dto.opNumber,
        styleCode: dto.styleCode,
        lineId: line.id,
        itemNumberFG: dto.itemNumberFG || 'N/A',
        itemNameFG: dto.itemNameFG || null,
        qtyOp: Number(dto.qtyOp),

        status: ProductionStatus.WIP,
        currentStation: StationCode.CUTTING_ENTAN,

        qtyEntan: 0,
        qtyPond: 0,
        qtyCP: 0,
        qtySewingIn: 0,
        qtySewingOut: 0,
        qtyQC: 0,
        qtyPacking: 0,
        qtyFG: 0
      }
    });
  }

  // ======================================================
  // RESET SYSTEM
  // ======================================================
  async resetSystemData() {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.productionLog.deleteMany({});

        if ('materialRequest' in tx) {
          await (tx as any).materialRequest.deleteMany({});
        }
        if ('opReplacement' in tx) {
          await (tx as any).opReplacement.deleteMany({});
        }

        await tx.fGStock.deleteMany({});
        await tx.productionOrder.deleteMany({});
      });

      return { message: 'Factory Reset Successful' };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Reset failed');
    }
  }
}