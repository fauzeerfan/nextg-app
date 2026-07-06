import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCode, ProductionStatus, OpLevel } from '@prisma/client';

// Grup item yang tergolong AUTOMOTIVE (acuan dari app cutting report lama).
const AUTOMOTIVE_GROUPS = [
  'FGSEXSC01',
  'FGSLCFS01',
  'FGSLCAS01',
  'FGSLCAN01',
  'FGSLCNS01',
];
const DEFAULT_GROUP = process.env.CUTTING_ITEM_GROUP || 'FGSLCAS01';
const GETLISTOP_BASE = (
  process.env.GETLISTOP_API || 'http://192.168.40.254:998/miniapps/admin/api'
).replace(/\/+$/, '');

// Style yang boleh dieksekusi ke produksi (alur NextG). Default: K1YH.
const EXECUTION_STYLES: string[] = (process.env.EXECUTION_STYLES || 'K1YH')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const num = (x: any) => Number(x) || 0;

@Injectable()
export class CuttingReportService {
  constructor(private prisma: PrismaService) {}

  private variantOf(group: string): 'AUT' | 'NAT' {
    return AUTOMOTIVE_GROUPS.includes((group || '').toUpperCase()) ? 'AUT' : 'NAT';
  }

  // =====================================================
  // RUMUS CUTTING (dikonfirmasi dari cutting.php aplikasi lama)
  //   totalSetOrPcs   = entanLembar * entanGambar
  //   aktualPemakaian = markerPanjang * entanLembar
  //   totalLos        = losSambungan + losCacat + losAktual + losWarna
  //   sisa            = panjangAktual - aktualPemakaian - totalLos
  //   aktualMaterial  = aktualPemakaian + sisa
  // Catatan: losWarna hanya dipakai pada alur NON-AUTOMOTIVE (NAT/turunan);
  // untuk AUT nilainya 0 sehingga tidak mengubah hasil.
  // =====================================================
  private compute(d: any) {
    const totalSetOrPcs = Math.round(num(d.entanLembar) * num(d.entanGambar));
    const aktualPemakaian = num(d.markerPanjang) * num(d.entanLembar);
    const totalLos =
      num(d.losSambungan) + num(d.losCacat) + num(d.losAktual) + num(d.losWarna);
    const sisa = num(d.panjangAktual) - aktualPemakaian - totalLos;
    const aktualMaterial = aktualPemakaian + sisa;
    return {
      totalSetOrPcs,
      aktualPemakaian: round2(aktualPemakaian),
      sisa: round2(sisa),
      aktualMaterial: round2(aktualMaterial),
    };
  }

  // =====================================================
  // MASTER OP dari API getlistop (dipertahankan)
  // =====================================================
  async getOpList(group: string, style: string) {
    const url = `${GETLISTOP_BASE}/getlistop/${group}/${style}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e: any) {
      throw new InternalServerErrorException(
        `Gagal mengambil getlistop (${url}): ${e?.message ?? e}`,
      );
    }
  }

  // =====================================================
  // RESOLUSI 1 OP LANGSUNG DARI NOMOR OP
  // =====================================================
  async resolveOpInfo(opNumber: string) {
    const op = (opNumber || '').trim().toUpperCase();
    if (!op) throw new BadRequestException('Nomor OP wajib diisi');
    const style = op.substring(0, 4);
    const groups = [...new Set([...AUTOMOTIVE_GROUPS, DEFAULT_GROUP])];
    for (const group of groups) {
      let list: any[] = [];
      try {
        list = await this.getOpList(group, style);
      } catch {
        continue;
      }
      const found = (list || []).find(
        (o: any) => (o.opnumber || '').toUpperCase() === op,
      );
      if (found) {
        return {
          found: true,
          group,
          style,
          variant: this.variantOf(group),
          opNumber: found.opnumber,
          itemNumberFG: found.kodefinishgood ?? '',
          itemNameFG: found.finishgood ?? null,
          qtyOp: Math.round(num(found.qtyop)),
          releaseDate: found.releasedate ?? null,
          materials: (found.list_material || []).map((m: any) => ({
            setArtnr: m.set_artnr_u ?? '',
            artName: m.Art_name ?? null,
            unit: m.Art_einheit ?? null,
            pricePerUnit: num(m.Art_ekletzt),
            usagePerSet: num(m.total),
          })),
        };
      }
    }
    throw new NotFoundException(
      `OP ${op} tidak ditemukan di getlistop (style ${style}; grup dicoba: ${groups.join(', ')})`,
    );
  }

  // Tambah OP ke form cukup dengan nomor OP (auto-resolve)
  async addOpByNumber(formId: string, dto: { opNumber: string }) {
    const info = await this.resolveOpInfo(dto.opNumber);
    return this.addOp(formId, {
      opNumber: info.opNumber,
      style: info.style,
      group: info.group,
    });
  }

  // =====================================================
  // FORM / SESI CUTTING
  // =====================================================
  private async nextKodeForm(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `CR${year}`;
    const last = await this.prisma.cuttingForm.findFirst({
      where: { kodeForm: { startsWith: prefix } },
      orderBy: { kodeForm: 'desc' },
      select: { kodeForm: true },
    });

    let lastNum = 0;
    if (last) {
      const numPart = last.kodeForm.slice(prefix.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed)) {
        lastNum = parsed;
      } else {
        const match = last.kodeForm.match(/\d+$/);
        if (match) {
          lastNum = parseInt(match[0], 10) || 0;
        }
      }
    }
    return `${prefix}${String(lastNum + 1).padStart(6, '0')}`;
  }

  async createForm(dto: { shipDate?: string; creatorName?: string; createdById?: string }) {
    if (!dto.creatorName?.trim()) {
      throw new BadRequestException('Nama pembuat wajib diisi');
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const kodeForm = await this.nextKodeForm();
      try {
        return await this.prisma.cuttingForm.create({
          data: {
            kodeForm,
            shipDate: dto.shipDate ? new Date(dto.shipDate) : null,
            creatorName: dto.creatorName.trim(),
            createdById: dto.createdById ?? null,
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt < 4) continue;
        throw new InternalServerErrorException(
          `Gagal membuat sesi: ${e.message || 'Unknown error'}`,
        );
      }
    }
    throw new InternalServerErrorException('Gagal membuat kodeForm unik setelah 5 percobaan');
  }

  async listForms() {
    const forms = await this.prisma.cuttingForm.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ops: { select: { opNumber: true, entans: { select: { id: true } } } },
      },
    });
    return forms.map((f) => ({
      id: f.id,
      kodeForm: f.kodeForm,
      shipDate: f.shipDate,
      creatorName: f.creatorName,
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      listOp: f.ops.map((o) => o.opNumber),
      jumlahEntan: f.ops.reduce((s, o) => s + o.entans.length, 0),
    }));
  }

  async getForm(id: string) {
    const form = await this.prisma.cuttingForm.findUnique({
      where: { id },
      include: {
        ops: {
          orderBy: { createdAt: 'asc' },
          include: {
            materials: true,
            entans: {
              orderBy: { entanKe: 'asc' },
              include: { details: { include: { material: true } } },
            },
          },
        },
      },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async deleteForm(id: string) {
    const form = await this.prisma.cuttingForm.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.cuttingForm.delete({ where: { id } });
  }

  // =====================================================
  // OP DALAM FORM (snapshot dari getlistop) + 1 entan default
  // =====================================================
  async addOp(
    formId: string,
    dto: { opNumber: string; style: string; group?: string },
  ) {
    const form = await this.prisma.cuttingForm.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException('Form not found');

    const group = (dto.group || DEFAULT_GROUP).toUpperCase();
    const list = await this.getOpList(group, dto.style);
    const op = list.find((o: any) => o.opnumber === dto.opNumber);
    if (!op) {
      throw new NotFoundException(
        `OP ${dto.opNumber} tidak ditemukan di getlistop ${group}/${dto.style}`,
      );
    }

    const variant = this.variantOf(group);
    const qtyOp = Math.round(num(op.qtyop));

    return this.prisma.cuttingFormOp.create({
      data: {
        formId,
        opNumber: op.opnumber,
        styleCode: dto.style,
        itemNumberFG: op.kodefinishgood ?? '',
        itemNameFG: op.finishgood ?? null,
        qtyOp,
        releaseDate: op.releasedate ? new Date(op.releasedate) : null,
        materials: {
          create: (op.list_material || []).map((m: any) => ({
            setArtnr: m.set_artnr_u ?? '',
            artName: m.Art_name ?? null,
            unit: m.Art_einheit ?? null,
            pricePerUnit: num(m.Art_ekletzt),
            usagePerSet: num(m.total),
            variant: variant as any,
            qtyRequirement: round2(num(m.total) * qtyOp),
          })),
        },
        entans: { create: [{ entanKe: 1 }] },
      },
      include: { materials: true, entans: true },
    });
  }

  async removeOp(opId: string) {
    const op = await this.prisma.cuttingFormOp.findUnique({ where: { id: opId } });
    if (!op) throw new NotFoundException('OP not found');
    return this.prisma.cuttingFormOp.delete({ where: { id: opId } });
  }

  // =====================================================
  // ENTAN
  // =====================================================
  async addEntan(opId: string) {
    const op = await this.prisma.cuttingFormOp.findUnique({ where: { id: opId } });
    if (!op) throw new NotFoundException('OP not found');
    const last = await this.prisma.cuttingEntan.findFirst({
      where: { formOpId: opId },
      orderBy: { entanKe: 'desc' },
    });
    return this.prisma.cuttingEntan.create({
      data: { formOpId: opId, entanKe: (last?.entanKe || 0) + 1 },
    });
  }

  async approveEntan(entanId: string) {
    const entan = await this.prisma.cuttingEntan.findUnique({ where: { id: entanId } });
    if (!entan) throw new NotFoundException('Entan not found');
    return this.prisma.cuttingEntan.update({
      where: { id: entanId },
      data: { approved: true, approvedAt: new Date(), finishAt: new Date() },
    });
  }

  // =====================================================
  // DETAIL CUTTING (input + hitung otomatis)
  // =====================================================
  // Resolusi grup turunan dari dto. Bila turunanId dikirim, ambil noTurun-nya
  // agar turunanKe tetap konsisten. Bila hanya turunanKe (kompat lama), pakai itu.
  private async resolveTurunan(
    dto: any,
  ): Promise<{ turunanId: string | null; turunanKe: number | null }> {
    if (dto.turunanId) {
      const t = await this.prisma.cuttingTurunan.findUnique({
        where: { id: dto.turunanId },
      });
      if (!t) throw new NotFoundException('Grup turunan tidak ditemukan');
      return { turunanId: t.id, turunanKe: t.noTurun };
    }
    if (dto.turunanKe != null && dto.turunanKe !== '') {
      return { turunanId: null, turunanKe: Math.round(num(dto.turunanKe)) };
    }
    return { turunanId: null, turunanKe: null };
  }

  async saveDetail(entanId: string, dto: any) {
    const entan = await this.prisma.cuttingEntan.findUnique({ where: { id: entanId } });
    if (!entan) throw new NotFoundException('Entan not found');
    if (!dto.materialId) throw new BadRequestException('materialId wajib diisi');

    const variant = dto.variant === 'NAT' ? 'NAT' : 'AUT';
    const { turunanId, turunanKe } =
      variant === 'NAT'
        ? await this.resolveTurunan(dto)
        : { turunanId: null, turunanKe: null };

    const computed = this.compute(dto);
    const detail = await this.prisma.cuttingDetail.create({
      data: {
        entanId,
        materialId: dto.materialId,
        noLot: dto.noLot ?? null,
        panjangPackingList: num(dto.panjangPackingList),
        panjangAktual: num(dto.panjangAktual),
        lebar: num(dto.lebar),
        markerPanjang: num(dto.markerPanjang),
        markerLebar: num(dto.markerLebar),
        entanLembar: Math.round(num(dto.entanLembar)),
        entanGambar: Math.round(num(dto.entanGambar)),
        losSambungan: num(dto.losSambungan),
        losCacat: num(dto.losCacat),
        losAktual: num(dto.losAktual),
        losWarna: num(dto.losWarna),
        variant,
        sumber: dto.sumber ?? 'NORMAL',
        turunanId,
        turunanKe,
        ...computed,
      },
    });
    await this.recalcMaterialProgress(dto.materialId);
    return detail;
  }

  async updateDetail(id: string, dto: any) {
    const existing = await this.prisma.cuttingDetail.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Detail not found');
    const merged = { ...existing, ...dto };
    const computed = this.compute(merged);

    const variant =
      (dto.variant ?? (existing as any).variant) === 'NAT' ? 'NAT' : 'AUT';

    // Default: pertahankan grup turunan lama. Hanya re-resolve bila dto mengirim
    // turunanId/turunanKe. Untuk AUT, kosongkan turunan.
    let turunanId: string | null = (existing as any).turunanId ?? null;
    let turunanKe: number | null = (existing as any).turunanKe ?? null;
    if (variant === 'AUT') {
      turunanId = null;
      turunanKe = null;
    } else if (dto.turunanId !== undefined || dto.turunanKe !== undefined) {
      const r = await this.resolveTurunan(dto);
      turunanId = r.turunanId;
      turunanKe = r.turunanKe;
    }

    const detail = await this.prisma.cuttingDetail.update({
      where: { id },
      data: {
        noLot: dto.noLot ?? existing.noLot,
        panjangPackingList: num(merged.panjangPackingList),
        panjangAktual: num(merged.panjangAktual),
        lebar: num(merged.lebar),
        markerPanjang: num(merged.markerPanjang),
        markerLebar: num(merged.markerLebar),
        entanLembar: Math.round(num(merged.entanLembar)),
        entanGambar: Math.round(num(merged.entanGambar)),
        losSambungan: num(merged.losSambungan),
        losCacat: num(merged.losCacat),
        losAktual: num(merged.losAktual),
        losWarna: num(merged.losWarna),
        variant,
        sumber: dto.sumber ?? (existing as any).sumber ?? 'NORMAL',
        turunanId,
        turunanKe,
        ...computed,
      },
    });
    await this.recalcMaterialProgress(existing.materialId);
    return detail;
  }

  async deleteDetail(id: string) {
    const existing = await this.prisma.cuttingDetail.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Detail not found');
    await this.prisma.cuttingDetail.delete({ where: { id } });
    await this.recalcMaterialProgress(existing.materialId);
    return { success: true };
  }

  async copyDetail(id: string) {
    const src = await this.prisma.cuttingDetail.findUnique({ where: { id } });
    if (!src) throw new NotFoundException('Detail not found');
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = src as any;
    const copy = await this.prisma.cuttingDetail.create({ data: { ...rest } });
    await this.recalcMaterialProgress(src.materialId);
    return copy;
  }

  private async recalcMaterialProgress(materialId: string) {
    // qtySetPcs (progress hasil set) HANYA dihitung dari potong utama AUT.
    // Baris NAT (turunan) tidak menambah set lengkap, hanya memanfaatkan sisa.
    const agg = await this.prisma.cuttingDetail.aggregate({
      where: { materialId, variant: 'AUT' },
      _sum: { totalSetOrPcs: true },
    });
    await this.prisma.cuttingFormOpMaterial.update({
      where: { id: materialId },
      data: { qtySetPcs: agg._sum.totalSetOrPcs || 0 },
    });
  }

  // =====================================================
  // TURUNAN (NON-AUTOMOTIVE) — mirror cuttingturunan/cuttingnat app lama
  // =====================================================
  // Daftar grup turunan untuk sebuah material + baris NAT-nya + ringkasan sisa.
  async listTurunan(materialId: string) {
    const material = await this.prisma.cuttingFormOpMaterial.findUnique({
      where: { id: materialId },
    });
    if (!material) throw new NotFoundException('Material tidak ditemukan');

    const turunans = await this.prisma.cuttingTurunan.findMany({
      where: { materialId },
      orderBy: { noTurun: 'asc' },
      include: {
        details: {
          orderBy: { createdAt: 'asc' },
          include: { entan: { select: { id: true, entanKe: true } } },
        },
      },
    });

    return {
      material: {
        id: material.id,
        setArtnr: material.setArtnr,
        artName: material.artName,
        variant: material.variant,
      },
      turunans,
      sisaByLot: await this.getSisaByLot(materialId),
    };
  }

  // Buat grup turunan baru (noTurun = max + 1). Anti balapan nomor unik.
  async createTurunan(materialId: string) {
    const material = await this.prisma.cuttingFormOpMaterial.findUnique({
      where: { id: materialId },
    });
    if (!material) throw new NotFoundException('Material tidak ditemukan');

    for (let attempt = 0; attempt < 5; attempt++) {
      const last = await this.prisma.cuttingTurunan.findFirst({
        where: { materialId },
        orderBy: { noTurun: 'desc' },
      });
      const noTurun = (last?.noTurun || 0) + 1;
      try {
        return await this.prisma.cuttingTurunan.create({
          data: { materialId, noTurun },
        });
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt < 4) continue; // bentrok unik -> coba lagi
        throw e;
      }
    }
    throw new InternalServerErrorException('Gagal membuat nomor turunan unik');
  }

  async deleteTurunan(turunanId: string) {
    const t = await this.prisma.cuttingTurunan.findUnique({ where: { id: turunanId } });
    if (!t) throw new NotFoundException('Turunan tidak ditemukan');
    // Hapus baris NAT di dalam grup secara eksplisit lalu hapus grupnya,
    // supaya tidak ada baris NAT yatim (turunanId null tapi tetap NAT).
    await this.prisma.cuttingDetail.deleteMany({ where: { turunanId } });
    await this.prisma.cuttingTurunan.delete({ where: { id: turunanId } });
    await this.recalcMaterialProgress(t.materialId);
    return { success: true };
  }

  // Ringkasan sisa material per No Lot dari potong UTAMA (AUT) -> bahan untuk turunan.
  async getSisaByLot(materialId: string) {
    const details = await this.prisma.cuttingDetail.findMany({
      where: { materialId, variant: 'AUT' },
      select: { noLot: true, sisa: true },
    });
    const map = new Map<string, number>();
    for (const d of details) {
      const lot = d.noLot || '(tanpa lot)';
      map.set(lot, round2((map.get(lot) || 0) + num(d.sisa)));
    }
    return [...map.entries()].map(([noLot, sisa]) => ({ noLot, sisa }));
  }

  // =====================================================
  // REVIEW CUTTING REPORT (dengan filter)
  // =====================================================
  async reviewWithFilters(filter: { startDate?: string; endDate?: string; variant?: string }) {
    const where: any = {};
    if (filter.startDate && filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: new Date(filter.startDate), lte: end };
    }
    if (filter.variant === 'AUT' || filter.variant === 'NAT') {
      where.variant = filter.variant;
    }
    const details = await this.prisma.cuttingDetail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        material: true,
        entan: { include: { formOp: { include: { form: true } } } },
      },
    });
    return details.map((d) => ({
      id: d.id,
      tanggal: d.createdAt,
      kodeForm: d.entan.formOp.form.kodeForm,
      entanKe: d.entan.entanKe,
      opNumber: d.entan.formOp.opNumber,
      styleCode: d.entan.formOp.styleCode,
      itemNumber: d.material.setArtnr,
      itemName: d.material.artName,
      noLot: d.noLot,
      variant: (d as any).variant,
      sumber: (d as any).sumber,
      turunanKe: (d as any).turunanKe,
      totalSetOrPcs: d.totalSetOrPcs,
      aktualPemakaian: d.aktualPemakaian,
      sisa: d.sisa,
      aktualMaterial: d.aktualMaterial,
      losWarna: (d as any).losWarna,
    }));
  }

  // =====================================================
  // FASE 5: KIRIM HASIL CUTTING REPORT -> PRODUKSI (hanya style diizinkan)
  // =====================================================
  async postToProduction(opId: string, dto: { qtyEntan?: number }) {
    const op = await this.prisma.cuttingFormOp.findUnique({
      where: { id: opId },
      include: { materials: true },
    });
    if (!op) throw new NotFoundException('OP cutting report tidak ditemukan');
    if (!op.itemNumberFG) {
      throw new BadRequestException(
        'Item Number FG kosong; tidak bisa dikirim ke produksi',
      );
    }

    // Validasi style: hanya style yang ada di EXECUTION_STYLES yang boleh dieksekusi
    const styleCode = op.opNumber.substring(0, 4).toUpperCase();
    if (!EXECUTION_STYLES.includes(styleCode)) {
      throw new BadRequestException(
        `Style ${styleCode} tidak termasuk dalam daftar eksekusi (${EXECUTION_STYLES.join(', ')}). ` +
        `Hasil cutting tetap disimpan, tetapi tidak dikirim ke produksi.`,
      );
    }

    // Jumlah SET lengkap dibatasi material dengan hasil potong PALING SEDIKIT (MIN),
    // identik dengan grandTotalCutting = MIN(totalCutting) pada app lama. Memakai MAX
    // (implementasi sebelumnya) melebih-lebihkan set yang siap dikirim. Hanya material
    // AUT yang ada di BOM (qtyRequirement > 0) yang menentukan kelengkapan set.
    const setMaterials = op.materials.filter(
      (x) => x.variant === 'AUT' && (x.qtyRequirement || 0) > 0,
    );
    const suggested = setMaterials.length
      ? Math.min(...setMaterials.map((x) => x.qtySetPcs || 0))
      : 0;
    const qty = Math.trunc(
      Number(dto?.qtyEntan) > 0 ? Number(dto.qtyEntan) : suggested,
    );
    if (qty <= 0)
      throw new BadRequestException(
        'Jumlah set lengkap masih 0. Pastikan SEMUA material BOM sudah dipotong (set lengkap = material paling sedikit).',
      );

    let line = await this.prisma.lineMaster.findUnique({
      where: { code: styleCode },
    });
    if (!line) {
      line = await this.prisma.lineMaster.create({
        data: { code: styleCode, name: `Line ${styleCode}`, patternMultiplier: 4 },
      });
    }

    const existing = await this.prisma.productionOrder.findUnique({
      where: { opNumber: op.opNumber },
      select: { qtyEntan: true },
    });
    const nextEntan = existing ? Math.max(existing.qtyEntan, qty) : qty;

    await this.prisma.productionOrder.upsert({
      where: { opNumber: op.opNumber },
      update: {
        itemNumberFG: op.itemNumberFG,
        itemNameFG: op.itemNameFG ?? undefined,
        qtyOp: op.qtyOp,
        qtyEntan: nextEntan,
        cuttingSource: 'INTERNAL', // OP ini milik sumber INTERNAL (Cutting Report NextG)
      },
      create: {
        opNumber: op.opNumber,
        styleCode,
        lineId: line.id,
        itemNumberFG: op.itemNumberFG,
        itemNameFG: op.itemNameFG,
        qtyOp: op.qtyOp,
        qtyEntan: nextEntan,
        currentStation: StationCode.CUTTING_ENTAN,
        status: ProductionStatus.WIP,
        level: OpLevel.PARENT,
        cuttingSource: 'INTERNAL',
      },
    });

    return {
      success: true,
      opNumber: op.opNumber,
      lineCode: styleCode,
      suggested,
      qtyEntan: nextEntan,
    };
  }
}