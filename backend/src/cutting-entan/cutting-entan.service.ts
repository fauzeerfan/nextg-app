import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCode, OpLevel } from '@prisma/client';
import { SettingsService } from '../settings/settings.service';

const EXECUTION_STYLES: string[] = (process.env.EXECUTION_STYLES || 'K1YH')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

@Injectable()
export class CuttingEntanService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  getExecutionStyles(): string[] {
    return EXECUTION_STYLES;
  }

  async getReadyOps() {
    // Sumber data aktif dari switch (INTERNAL / EXTERNAL). Daftar OP di Cutting
    // Entan hanya menampilkan OP milik sumber tersebut (satu sumber/waktu).
    // Dibuat TAHAN-ERROR: kalau pembacaan setting gagal, default ke INTERNAL
    // supaya daftar tidak pernah kosong gara-gara error setting.
    let source: 'INTERNAL' | 'EXTERNAL' = 'INTERNAL';
    try {
      source = await this.settings.getCuttingSource();
    } catch {
      source = 'INTERNAL';
    }

    // Ambil OP INDUK (parentOpId null) untuk style eksekusi. Visibilitas final
    // (masih perlu dispatch atau tidak) DIHITUNG DI BAWAH — bukan lewat pending>0
    // di query, supaya OP dengan batch yang polanya belum lengkap tetap tampil.
    // Filter sumber TIDAK memakai kolom cuttingSource (yang bisa belum ter-update),
    // melainkan keberadaan OP di Cutting Report internal (cutting_form_ops).
    // Batch yang sudah masuk Cutting Pond adalah child (parentOpId != null) &
    // tidak diikutkan di sini, jadi proses Pond dst. tidak terpengaruh switch.
    const ops = await this.prisma.productionOrder.findMany({
      where: {
        status: 'WIP',
        parentOpId: null,
        OR: [
          { line: { code: { in: EXECUTION_STYLES } } },
          { styleCode: { in: EXECUTION_STYLES } },
        ],
        // CATATAN: sengaja TIDAK memfilter pending>0 di query. OP dengan pending 0
        // tetap perlu tampil bila masih ada BATCH yang POLANYA belum lengkap
        // (kasus multi-material / multi-entan: entan berikutnya menambah pola ke
        // batch yang sama). Visibilitas final dihitung di bawah.
      },
      orderBy: { createdAt: 'desc' },
      include: {
        cuttingBatches: { orderBy: { batchNumber: 'desc' }, take: 1 },
        line: {
          select: {
            code: true,
            patternMultiplier: true,
            patterns: { take: 1, select: { parts: { select: { id: true } } } },
          },
        },
        batches: {
          select: { id: true, patternProgress: { select: { patternIndex: true } } },
        },
      },
    });

    // Klasifikasi sumber berdasarkan KEBERADAAN OP di Cutting Report internal
    // (tabel cutting_form_ops) — sumber kebenaran yang pasti. OP hasil
    // "Kirim ke Produksi" SELALU ada di sana, jadi PASTI tampil saat switch INTERNAL.
    const internalRows = await this.prisma.cuttingFormOp.findMany({
      where: { opNumber: { in: ops.map((o) => o.opNumber) } },
      select: { opNumber: true },
    });
    const internalSet = new Set(internalRows.map((r) => r.opNumber));

    const visible = ops.filter((op) => {
      // (1) cocokkan dengan sumber aktif
      const matchSource =
        source === 'EXTERNAL'
          ? !internalSet.has(op.opNumber)
          : internalSet.has(op.opNumber);
      if (!matchSource) return false;

      // (2) masih ada yang perlu didispatch:
      //     a) masih ada sisa qty (bisa buat batch baru), ATAU
      //     b) ada batch yang POLANYA BELUM LENGKAP (bisa tambah pola untuk
      //        melengkapi set — mis. material dipotong di entan berbeda lalu
      //        dikirim menyusul ke batch yang sama).
      const pending = (op.qtyEntan ?? 0) - (op.qtySentToPond ?? 0);
      if (pending > 0) return true;

      const totalPatterns =
        (op as any).line?.patterns?.[0]?.parts?.length ||
        (op as any).line?.patternMultiplier ||
        0;
      if (totalPatterns <= 0) return false;

      return ((op as any).batches || []).some((b: any) => {
        const distinct = new Set(
          (b.patternProgress || []).map((pp: any) => pp.patternIndex),
        );
        return distinct.size < totalPatterns;
      });
    });

    return visible.map(op => ({
      id: op.id,
      opNumber: op.opNumber,
      styleCode: op.styleCode,
      lineCode: op.line?.code ?? op.styleCode,
      itemNumberFG: op.itemNumberFG,
      itemNameFG: op.itemNameFG,
      qtyOp: op.qtyOp,
      totalCut: op.qtyEntan,
      sentToPond: op.qtySentToPond,
      pending: op.qtyEntan - op.qtySentToPond,
      batchCount: op.batches.length,
      lastBatch: op.cuttingBatches[0] || null,
    }));
  }

  // =====================================================
  // FASE 3: Dispatch pola + batch
  // =====================================================
  async dispatchPatterns(
    parent: any,
    dto: { qty?: number; patternIndexes?: number[]; batchNumber?: number; batchTarget?: string; batchCode?: string },
  ) {
    const patternIndexes = [
      ...new Set((dto.patternIndexes || []).map((x) => Math.trunc(Number(x)))),
    ].filter((x) => x >= 0);
    if (patternIndexes.length === 0) {
      throw new BadRequestException('Pola belum dipilih');
    }

    // NOMOR BATCH WAJIB DIINPUT MANUAL (mis. 1, 2, 3). Tidak lagi auto-increment.
    const bn = Math.trunc(Number(dto.batchNumber));
    if (!bn || bn <= 0) {
      throw new BadRequestException('Nomor batch wajib diisi manual (mis. 1, 2, 3)');
    }

    const line = await this.prisma.lineMaster.findUnique({
      where: { id: parent.lineId },
      include: { patterns: { include: { parts: true } } },
    });
    const parts = line?.patterns?.[0]?.parts || [];
    const patternName = (idx: number) => parts[idx]?.name || `Pola ${idx + 1}`;

    return this.prisma.$transaction(async (tx) => {
      // Cari batch (child) milik OP induk ini dengan nomor batch yang diinput.
      let batch = await tx.productionOrder.findFirst({
        where: { parentOpId: parent.id, batchNumber: bn },
      });
      let isNewBatch = false;

      if (!batch) {
        // ----- BATCH BARU (nomor manual) -----
        const pending = parent.qtyEntan - parent.qtySentToPond;
        const qty = dto.qty && dto.qty > 0 ? Math.trunc(dto.qty) : pending;
        if (qty <= 0) {
          throw new ConflictException('Tidak ada sisa qty untuk membuat batch baru');
        }
        if (qty > pending) {
          throw new BadRequestException(
            `Qty (${qty}) melebihi sisa pending (${pending}) untuk OP ini`,
          );
        }
        isNewBatch = true;
        const batchCode = `${parent.opNumber}-B${bn}`;
        batch = await tx.productionOrder.create({
          data: {
            opNumber: batchCode,
            batchCode,
            batchNumber: bn,
            level: OpLevel.BATCH,
            parentOpId: parent.id,
            styleCode: parent.styleCode,
            lineId: parent.lineId,
            itemNumberFG: parent.itemNumberFG,
            itemNameFG: parent.itemNameFG,
            qtyOp: qty,
            qtyEntan: qty,
            qtySentToPond: qty,
            currentStation: StationCode.CUTTING_POND,
            status: 'WIP',
          },
        });
        await tx.cuttingBatch.create({
          data: {
            opId: batch.id,
            batchNumber: bn,
            qty,
            qrCode: `${parent.itemNumberFG}-${batchCode}`,
          },
        });
        await tx.productionOrder.update({
          where: { id: parent.id },
          data: { qtySentToPond: { increment: qty } },
        });
      }
      // else: batch dengan nomor ini SUDAH ADA -> tambah pola (melengkapi set),
      // qty batch tetap & qtySentToPond induk tidak berubah.

      const target = batch.qtyEntan || 0;
      for (const idx of patternIndexes) {
        await tx.patternProgress.upsert({
          where: { opId_patternIndex: { opId: batch.id, patternIndex: idx } },
          update: { target, patternName: patternName(idx) },
          create: {
            opId: batch.id,
            patternIndex: idx,
            patternName: patternName(idx),
            target,
            good: 0,
            ng: 0,
            completed: false,
          },
        });
      }

      await tx.cuttingDispatch.create({
        data: {
          productionOrderId: parent.id,
          batchOpId: batch.id,
          // Utamakan ID batch dari entan (carried) sebagai label bila ada.
          batchLabel: (dto.batchCode && dto.batchCode.trim()) || batch.batchCode || batch.opNumber,
          qty: batch.qtyEntan,
          patternIndexes,
        },
      });

      await tx.productionLog.create({
        data: {
          opId: batch.id,
          station: StationCode.CUTTING_ENTAN,
          type: 'QR_GENERATED',
          qty: batch.qtyEntan,
          note: `Batch ${batch.batchCode} pola [${patternIndexes
            .map((i) => patternName(i))
            .join(', ')}]${isNewBatch ? ' (batch baru)' : ' (tambah pola)'}`,
        },
      });

      return {
        success: true,
        qr: `${parent.itemNumberFG}-${batch.batchCode}`,
        opNumber: parent.opNumber,
        itemNumberFG: parent.itemNumberFG,
        itemNameFG: parent.itemNameFG,
        qtyOp: parent.qtyOp,
        batchCode: batch.batchCode,
        batchNumber: batch.batchNumber,
        qty: batch.qtyEntan,
        batchQty: batch.qtyEntan,
        createdAt: new Date(),
        patternIndexes,
        isNewBatch,
        entanBatchCode: (dto.batchCode && dto.batchCode.trim()) || null,
      };
    });
  }

  // =====================================================
  // Info untuk dialog pilih pola + batch
  // =====================================================
  async getDispatchInfo(opNumber: string) {
    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
      include: {
        batches: { include: { patternProgress: true }, orderBy: { batchNumber: 'asc' } },
      },
    });
    if (!op) throw new NotFoundException('OP not found');

    const line = await this.prisma.lineMaster.findUnique({
      where: { id: op.lineId },
      include: { patterns: { include: { parts: true } } },
    });
    const parts = line?.patterns?.[0]?.parts || [];
    const multiplier = line?.patternMultiplier || 1;
    const patterns = parts.length
      ? parts.map((p, i) => ({ index: i, name: p.name }))
      : Array.from({ length: multiplier }, (_, i) => ({ index: i, name: `Pola ${i + 1}` }));

    // #2: Entan yang sudah "Kirim ke Produksi" (postedQty>0) beserta identitas
    // batch-nya. Dipakai frontend untuk MENGISI OTOMATIS nomor & ID batch saat
    // dispatch (tanpa input ulang). entanKe dipakai sebagai nomor batch stabil
    // (unik per OP), batchCode = ID batch yang diinput operator saat kirim.
    const formOps = await this.prisma.cuttingFormOp.findMany({
      where: { opNumber: op.opNumber },
      include: {
        entans: {
          where: { postedQty: { gt: 0 } },
          orderBy: { entanKe: 'asc' },
          select: { id: true, entanKe: true, batchCode: true, postedQty: true },
        },
      },
    });
    const postedEntans = formOps
      .flatMap((f) => f.entans)
      .map((e) => ({
        entanKe: e.entanKe,
        batchCode: e.batchCode,
        postedQty: e.postedQty,
      }));

    return {
      opNumber: op.opNumber,
      styleCode: op.styleCode,
      level: op.level,
      pending: op.qtyEntan - op.qtySentToPond,
      totalPatterns: patterns.length,
      patterns,
      postedEntans,
      batches: op.batches.map((b: any) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        batchCode: b.batchCode,
        qty: b.qtyEntan,
        dispatchedPatterns: b.patternProgress
          .map((pp: any) => pp.patternIndex)
          .sort((a: number, c: number) => a - c),
      })),
    };
  }

  // =====================================================
  // Method lain (generateQR, reprint, history, dll) tetap seperti sebelumnya
  // =====================================================
  async generateQR(opNumber: string, dto?: any) {
    const op = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
      include: {
        cuttingBatches: { orderBy: { batchNumber: 'desc' }, take: 1 },
        batches: { orderBy: { batchNumber: 'desc' }, take: 1 },
      },
    });
    if (!op) throw new NotFoundException('OP not found');

    if (
      op.level === OpLevel.PARENT &&
      Array.isArray(dto?.patternIndexes) &&
      dto!.patternIndexes.length > 0
    ) {
      return this.dispatchPatterns(op, dto!);
    }

    const pending = op.qtyEntan - op.qtySentToPond;
    if (pending <= 0) {
      throw new ConflictException('No pending cut quantity for this OP');
    }

    if (op.level === OpLevel.PARENT) {
      const nextBatchNumber = (op.batches[0]?.batchNumber || 0) + 1;
      const batchCode = `${op.opNumber}-B${nextBatchNumber}`;
      const qrString = `${op.itemNumberFG}-${batchCode}`;

      return this.prisma.$transaction(async (tx) => {
        const child = await tx.productionOrder.create({
          data: {
            opNumber: batchCode,
            batchCode,
            batchNumber: nextBatchNumber,
            level: OpLevel.BATCH,
            parentOpId: op.id,
            styleCode: op.styleCode,
            lineId: op.lineId,
            itemNumberFG: op.itemNumberFG,
            itemNameFG: op.itemNameFG,
            qtyOp: pending,
            qtyEntan: pending,
            qtySentToPond: pending,
            currentStation: StationCode.CUTTING_POND,
            status: 'WIP',
          },
        });

        await tx.cuttingBatch.create({
          data: { opId: child.id, batchNumber: nextBatchNumber, qty: pending, qrCode: qrString },
        });

        await tx.productionOrder.update({
          where: { id: op.id },
          data: { qtySentToPond: { increment: pending } },
        });

        await tx.productionLog.create({
          data: {
            opId: child.id,
            station: StationCode.CUTTING_ENTAN,
            type: 'QR_GENERATED',
            qty: pending,
            note: `Batch ${nextBatchNumber} (${batchCode})`,
          },
        });

        return {
          success: true,
          qr: qrString,
          opNumber: op.opNumber,
          batchCode,
          fgNumber: op.itemNumberFG,
          qty: pending,
          batchNumber: nextBatchNumber,
        };
      });
    }

    // OP level BATCH (lama) atau single unit
    const nextBatchNumber = (op.cuttingBatches[0]?.batchNumber || 0) + 1;
    const qrString = `${op.itemNumberFG}-${op.opNumber}-B${nextBatchNumber}`;

    await this.prisma.cuttingBatch.create({
      data: { opId: op.id, batchNumber: nextBatchNumber, qty: pending, qrCode: qrString },
    });

    await this.prisma.productionOrder.update({
      where: { id: op.id },
      data: { qtySentToPond: { increment: pending }, currentStation: StationCode.CUTTING_POND },
    });

    await this.prisma.productionLog.create({
      data: {
        opId: op.id,
        station: StationCode.CUTTING_ENTAN,
        type: 'QR_GENERATED',
        qty: pending,
        note: `Batch ${nextBatchNumber} generated`,
      },
    });

    return {
      success: true,
      qr: qrString,
      opNumber: op.opNumber,
      fgNumber: op.itemNumberFG,
      qty: pending,
      batchNumber: nextBatchNumber,
    };
  }

  async reprintQR(batchId: string) {
    const batch = await this.prisma.cuttingBatch.findUnique({
      where: { id: batchId },
      include: { op: { include: { parent: true } } },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    await this.prisma.cuttingBatch.update({
      where: { id: batchId },
      data: { printed: true },
    });

    // batch.op = OP batch (child). Untuk label QR pakai identitas OP INDUK
    // (nomor OP asli, item FG, qtyOp) agar sama persis dengan saat pertama generate.
    // Bila batch lama tanpa induk (legacy), pakai OP itu sendiri.
    const child = batch.op as any;
    const parent = child.parent || child;

    return {
      success: true,
      qr: batch.qrCode,
      code: batch.qrCode,
      opNumber: parent.opNumber,
      fgNumber: parent.itemNumberFG,
      itemNumberFG: parent.itemNumberFG,
      itemNameFG: parent.itemNameFG,
      qtyOp: parent.qtyOp,
      qty: batch.qty,
      batchQty: batch.qty,
      batchNumber: batch.batchNumber,
      batchCode: child.batchCode ?? null,
      createdAt: batch.createdAt,
    };
  }

  async getBatchHistory(opNumber: string) {
    const op = await this.prisma.productionOrder.findUnique({ where: { opNumber } });
    if (!op) throw new NotFoundException('OP not found');

    // Di alur baru, CuttingBatch dibuat pada OP BATCH (child), jadi cuttingBatches
    // pada OP induk kosong. Ambil batch dari OP ini SENDIRI (legacy) + semua child-nya.
    const children = await this.prisma.productionOrder.findMany({
      where: { parentOpId: op.id },
      select: { id: true },
    });
    const opIds = [op.id, ...children.map((c) => c.id)];

    const batches = await this.prisma.cuttingBatch.findMany({
      where: { opId: { in: opIds } },
      orderBy: { batchNumber: 'asc' },
      include: { op: { select: { opNumber: true, batchCode: true } } },
    });

    return batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      qty: b.qty,
      qrCode: b.qrCode,
      createdAt: b.createdAt,
      printed: b.printed,
      opNumber: op.opNumber, // OP induk (untuk cache & tampilan)
      batchCode: b.op.batchCode ?? null,
    }));
  }

  async getAllBatches() {
    const batches = await this.prisma.cuttingBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: { op: { select: { opNumber: true } } },
    });
    return batches.map(b => ({
      id: b.id,
      opNumber: b.op.opNumber,
      batchNumber: b.batchNumber,
      qty: b.qty,
      qrCode: b.qrCode,
      createdAt: b.createdAt,
      printed: b.printed,
    }));
  }

  async getTotalSent() {
    const result = await this.prisma.cuttingBatch.aggregate({
      _sum: { qty: true },
    });
    return { total: result._sum.qty || 0 };
  }
}