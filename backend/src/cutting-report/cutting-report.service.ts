import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCode, ProductionStatus, OpLevel } from '@prisma/client';

// Role yang selalu boleh edit/hapus & approve request (ralat: hanya Administrator).
// Selain itu, user dengan flag canEditCuttingReport juga berwenang.
const PRIVILEGED_ROLES = ['ADMINISTRATOR'];

// Identitas pemanggil (dari JWT) untuk cek hak akses lock.
type Actor = { userId?: string; role?: string; username?: string };

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

  // ===== LOCK OTOMATIS (released) + AKSES (admin / user berwenang / grant) =====
  private isPrivilegedRole(role?: string): boolean {
    return !!role && PRIVILEGED_ROLES.includes(role.toUpperCase());
  }

  // "released" = OTOMATIS terkunci saat ada entan yang sudah dikirim ke produksi.
  private async isReleased(formId: string): Promise<boolean> {
    const c = await this.prisma.cuttingEntan.count({ where: { postedQty: { gt: 0 }, formOp: { formId } } });
    return c > 0;
  }

  // Hak edit Cutting Report terkunci: Administrator, atau user ber-flag canEditCuttingReport.
  private async actorHasEditRight(actor?: Actor): Promise<boolean> {
    if (this.isPrivilegedRole(actor?.role)) return true;
    if (actor?.userId) {
      const u = await this.prisma.user.findUnique({ where: { id: actor.userId }, select: { role: true, canEditCuttingReport: true } });
      if (u && (this.isPrivilegedRole(u.role) || u.canEditCuttingReport)) return true;
    }
    return false;
  }

  private async assertCanEditForm(formId: string | null | undefined, actor?: Actor) {
    if (!formId) return;
    if (!(await this.isReleased(formId))) return;            // belum released -> bebas
    if (await this.actorHasEditRight(actor)) return;         // admin / user berwenang
    const form = await this.prisma.cuttingForm.findUnique({ where: { id: formId }, select: { editGrantUserIds: true } });
    const grants = Array.isArray((form as any)?.editGrantUserIds) ? ((form as any).editGrantUserIds as string[]) : [];
    if (actor?.userId && grants.includes(actor.userId)) return; // sudah di-approve untuk form ini
    throw new ForbiddenException(
      'Cutting Report ini sudah dikirim ke produksi (terkunci). Edit/hapus hanya oleh Administrator atau user berwenang. Silakan ajukan request.',
    );
  }
  private async assertCanEditByOp(opId: string, actor?: Actor) {
    const o = await this.prisma.cuttingFormOp.findUnique({ where: { id: opId }, select: { formId: true } });
    await this.assertCanEditForm(o?.formId, actor);
  }
  private async assertCanEditByEntan(entanId: string, actor?: Actor) {
    const e = await this.prisma.cuttingEntan.findUnique({ where: { id: entanId }, select: { formOp: { select: { formId: true } } } });
    await this.assertCanEditForm((e as any)?.formOp?.formId, actor);
  }
  private async assertCanEditByDetail(detailId: string, actor?: Actor) {
    const d = await this.prisma.cuttingDetail.findUnique({ where: { id: detailId }, select: { entan: { select: { formOp: { select: { formId: true } } } } } });
    await this.assertCanEditForm((d as any)?.entan?.formOp?.formId, actor);
  }
  private async assertCanEditByMaterial(materialId: string, actor?: Actor) {
    const m = await this.prisma.cuttingFormOpMaterial.findUnique({ where: { id: materialId }, select: { formOp: { select: { formId: true } } } });
    await this.assertCanEditForm((m as any)?.formOp?.formId, actor);
  }
  private async assertCanEditByTurunan(turunanId: string, actor?: Actor) {
    const t = await this.prisma.cuttingTurunan.findUnique({ where: { id: turunanId }, select: { material: { select: { formOp: { select: { formId: true } } } } } });
    await this.assertCanEditForm((t as any)?.material?.formOp?.formId, actor);
  }

  // ===== REQUEST edit/hapus + APPROVAL (untuk notifikasi) =====
  async createEditRequest(dto: { formId: string; requestType?: string; targetLabel?: string; note?: string }, actor?: Actor) {
    const form = await this.prisma.cuttingForm.findUnique({ where: { id: dto.formId }, select: { id: true, kodeForm: true } });
    if (!form) throw new NotFoundException('Form not found');
    return this.prisma.cuttingReportRequest.create({
      data: {
        formId: form.id,
        kodeForm: form.kodeForm,
        requestType: dto.requestType === 'DELETE' ? 'DELETE' : 'EDIT',
        targetLabel: dto.targetLabel ?? null,
        note: dto.note ?? null,
        requestedById: actor?.userId ?? null,
        requestedByName: actor?.username ?? 'Operator',
        status: 'PENDING',
      },
    });
  }

  async listRequests(actor?: Actor) {
    const isApprover = await this.actorHasEditRight(actor);
    const where = isApprover ? {} : { requestedById: actor?.userId ?? '__none__' };
    const requests = await this.prisma.cuttingReportRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
    const pendingCount = isApprover ? await this.prisma.cuttingReportRequest.count({ where: { status: 'PENDING' } }) : 0;
    return { isApprover, pendingCount, requests };
  }

  async reviewRequest(id: string, action: 'APPROVE' | 'REJECT', actor?: Actor) {
    if (!(await this.actorHasEditRight(actor))) {
      throw new ForbiddenException('Hanya Administrator atau user berwenang yang bisa menyetujui/menolak.');
    }
    const req = await this.prisma.cuttingReportRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'PENDING') return req;
    if (action === 'APPROVE') {
      const form = await this.prisma.cuttingForm.findUnique({ where: { id: req.formId }, select: { editGrantUserIds: true } });
      const grants = Array.isArray((form as any)?.editGrantUserIds) ? ((form as any).editGrantUserIds as string[]) : [];
      if (req.requestedById && !grants.includes(req.requestedById)) grants.push(req.requestedById);
      await this.prisma.cuttingForm.update({ where: { id: req.formId }, data: { editGrantUserIds: grants } });
    }
    return this.prisma.cuttingReportRequest.update({
      where: { id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewedById: actor?.userId ?? null,
        reviewedByName: actor?.username ?? null,
        reviewedAt: new Date(),
      },
    });
  }

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
  async addOpByNumber(formId: string, dto: { opNumber: string }, actor?: Actor) {
    const info = await this.resolveOpInfo(dto.opNumber);
    return this.addOp(formId, {
      opNumber: info.opNumber,
      style: info.style,
      group: info.group,
    }, actor);
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
        ops: { select: { opNumber: true, entans: { select: { id: true, postedQty: true } } } },
      },
    });
    return forms.map((f) => {
      // Lock OTOMATIS: terkunci saat ada entan yang sudah dikirim ke produksi.
      const locked = f.ops.some((o) => o.entans.some((e) => (e.postedQty || 0) > 0));
      return {
        id: f.id,
        kodeForm: f.kodeForm,
        shipDate: f.shipDate,
        creatorName: f.creatorName,
        status: f.status,
        locked,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        listOp: f.ops.map((o) => o.opNumber),
        jumlahEntan: f.ops.reduce((s, o) => s + o.entans.length, 0),
      };
    });
  }

  async getForm(id: string, actor?: Actor) {
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
    // Lock OTOMATIS (released) + apakah actor boleh mengedit form ini.
    const locked = (form.ops as any[]).some((o) => (o.entans as any[]).some((e) => (e.postedQty || 0) > 0));
    let canEdit = !locked;
    if (locked) {
      if (await this.actorHasEditRight(actor)) canEdit = true;
      else {
        const grants = Array.isArray((form as any).editGrantUserIds) ? ((form as any).editGrantUserIds as string[]) : [];
        canEdit = !!(actor?.userId && grants.includes(actor.userId));
      }
    }
    return { ...form, locked, canEdit };
  }

  async deleteForm(id: string, actor?: Actor) {
    const form = await this.prisma.cuttingForm.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');
    await this.assertCanEditForm(id, actor);
    return this.prisma.cuttingForm.delete({ where: { id } });
  }

  // =====================================================
  // OP DALAM FORM (snapshot dari getlistop) + 1 entan default
  // =====================================================
  async addOp(
    formId: string,
    dto: { opNumber: string; style: string; group?: string },
    _actor?: Actor,
  ) {
    const form = await this.prisma.cuttingForm.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException('Form not found');

    // KESEPAKATAN: 1 sesi/dokumen CR = 1 OP. Bila form ini sudah memiliki OP,
    // tolak penambahan OP kedua. (Frontend juga menonaktifkan tombol Tambah OP.)
    const existingOpCount = await this.prisma.cuttingFormOp.count({
      where: { formId },
    });
    if (existingOpCount > 0) {
      throw new BadRequestException(
        'Satu sesi Cutting Report hanya untuk 1 OP. OP sudah ditambahkan pada sesi ini.',
      );
    }

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

  async removeOp(opId: string, actor?: Actor) {
    const op = await this.prisma.cuttingFormOp.findUnique({ where: { id: opId } });
    if (!op) throw new NotFoundException('OP not found');
    await this.assertCanEditByOp(opId, actor);
    return this.prisma.cuttingFormOp.delete({ where: { id: opId } });
  }

  // =====================================================
  // ENTAN
  // =====================================================
  async addEntan(opId: string, _actor?: Actor) {
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

  async approveEntan(entanId: string, _actor?: Actor) {
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

  async saveDetail(entanId: string, dto: any, _actor?: Actor) {
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

  async updateDetail(id: string, dto: any, actor?: Actor) {
    const existing = await this.prisma.cuttingDetail.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Detail not found');
    await this.assertCanEditByDetail(id, actor);
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

  async deleteDetail(id: string, actor?: Actor) {
    const existing = await this.prisma.cuttingDetail.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Detail not found');
    await this.assertCanEditByDetail(id, actor);
    await this.prisma.cuttingDetail.delete({ where: { id } });
    await this.recalcMaterialProgress(existing.materialId);
    return { success: true };
  }

  async copyDetail(id: string, _actor?: Actor) {
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
  async createTurunan(materialId: string, _actor?: Actor) {
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

  async deleteTurunan(turunanId: string, actor?: Actor) {
    const t = await this.prisma.cuttingTurunan.findUnique({ where: { id: turunanId } });
    if (!t) throw new NotFoundException('Turunan tidak ditemukan');
    await this.assertCanEditByTurunan(turunanId, actor);
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
  async postToProduction(opId: string, dto: { qtyEntan?: number }, _actor?: Actor) {
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

  // =====================================================
  // #2: KIRIM KE PRODUKSI PER-ENTAN (1 entan = 1 batch)
  // =====================================================
  // Satuan = PCS (bukan set). "Hasil cut" satu entan = TOTAL pcs dari seluruh
  // baris potong AUT di entan ini (jumlah totalSetOrPcs). Nilai ini hanya sebagai
  // REFERENSI hasil cut; jumlah yang dikirim diinput bebas oleh operator (parsial &
  // berulang). Keputusan berapa pola dilakukan operator saat dispatch di Cutting Entan.
  private async computeEntanPcs(
    entanId: string,
  ): Promise<{ entanPcs: number; op: any; entan: any }> {
    const entan = await this.prisma.cuttingEntan.findUnique({
      where: { id: entanId },
      include: {
        formOp: { include: { materials: true } },
        details: true,
      },
    });
    if (!entan) throw new NotFoundException('Entan tidak ditemukan');

    // Total pcs hasil cut = jumlah seluruh baris potong AUT (potong utama) di entan ini.
    let entanPcs = 0;
    for (const d of entan.details as any[]) {
      if (d.variant !== 'AUT') continue;
      entanPcs += d.totalSetOrPcs || 0;
    }
    return { entanPcs: Math.max(0, Math.trunc(entanPcs)), op: entan.formOp, entan };
  }

  // Info untuk dialog "Kirim ke Produksi" per-entan (pcs hasil cut, sudah dikirim,
  // sisa referensi, dan batchCode = identitas batch entan ini).
  async getEntanPostInfo(entanId: string) {
    const { entanPcs, op, entan } = await this.computeEntanPcs(entanId);
    const posted = entan.postedQty || 0;
    return {
      entanId: entan.id,
      entanKe: entan.entanKe,
      opNumber: op.opNumber,
      itemNumberFG: op.itemNumberFG,
      itemNameFG: op.itemNameFG,
      // ID batch standar (otomatis) = B + nomor urut entan. 1 entan = 1 batch.
      batchCode: entan.batchCode || `B${entan.entanKe}`,
      entanPcs,
      postedQty: posted,
      remaining: Math.max(0, entanPcs - posted),
    };
  }

  // Kirim SET dari SATU entan ke produksi. Bisa berulang (incremental): tiap
  // panggilan menambah qty (dibatasi <= sisa set entan). batchCode diinput sekali
  // (pengiriman pertama) lalu disimpan di entan & dipakai otomatis di dispatch.
  async postEntanToProduction(
    entanId: string,
    dto: { batchCode?: string; qty?: number },
    _actor?: Actor,
  ) {
    const { entanPcs, op, entan } = await this.computeEntanPcs(entanId);

    if (!op.itemNumberFG) {
      throw new BadRequestException(
        'Item Number FG kosong; tidak bisa dikirim ke produksi',
      );
    }
    const styleCode = op.opNumber.substring(0, 4).toUpperCase();
    if (!EXECUTION_STYLES.includes(styleCode)) {
      throw new BadRequestException(
        `Style ${styleCode} tidak termasuk daftar eksekusi (${EXECUTION_STYLES.join(', ')}). ` +
          `Hasil cutting tetap tersimpan, tetapi tidak dikirim ke produksi.`,
      );
    }

    const posted = entan.postedQty || 0;

    // Satuan PCS. Jumlah yang dikirim = INPUT BEBAS operator (parsial & berulang,
    // sesuai hasil cut riil). Tidak ada lagi pembatasan "set lengkap". Default bila
    // qty tidak dikirim = sisa referensi (hasil cut - sudah dikirim). Hanya wajib > 0.
    const reqQty = Math.trunc(Number(dto?.qty));
    const qty = reqQty > 0 ? reqQty : Math.max(0, entanPcs - posted);
    if (qty <= 0) {
      throw new BadRequestException(
        'Jumlah pcs yang dikirim harus lebih dari 0.',
      );
    }

    // #2: ID batch DISTANDARKAN = "B" + nomor urut entan (B1, B2, B3, ...).
    // Otomatis & konsisten, tidak perlu input manual. Nilai ini juga dipakai
    // sebagai identitas batch saat dispatch di Cutting Entan. Parameter
    // dto.batchCode diabaikan (dipertahankan agar kompatibel dengan pemanggil lama).
    const batchCode = `B${entan.entanKe}`;
    void dto?.batchCode;

    let line = await this.prisma.lineMaster.findUnique({ where: { code: styleCode } });
    if (!line) {
      line = await this.prisma.lineMaster.create({
        data: { code: styleCode, name: `Line ${styleCode}`, patternMultiplier: 4 },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.productionOrder.findUnique({
        where: { opNumber: op.opNumber },
        select: { id: true },
      });
      if (existing) {
        await tx.productionOrder.update({
          where: { opNumber: op.opNumber },
          data: {
            itemNumberFG: op.itemNumberFG,
            itemNameFG: op.itemNameFG ?? undefined,
            qtyOp: op.qtyOp,
            qtyEntan: { increment: qty }, // akumulasi qty kiriman entan
            cuttingSource: 'INTERNAL',
          },
        });
      } else {
        await tx.productionOrder.create({
          data: {
            opNumber: op.opNumber,
            styleCode,
            lineId: line!.id,
            itemNumberFG: op.itemNumberFG,
            itemNameFG: op.itemNameFG,
            qtyOp: op.qtyOp,
            qtyEntan: qty,
            currentStation: StationCode.CUTTING_ENTAN,
            status: ProductionStatus.WIP,
            level: OpLevel.PARENT,
            cuttingSource: 'INTERNAL',
          },
        });
      }

      await tx.cuttingEntan.update({
        where: { id: entan.id },
        data: {
          batchCode,
          postedQty: { increment: qty },
          finishAt: entan.finishAt ?? new Date(),
        },
      });
    });

    return {
      success: true,
      opNumber: op.opNumber,
      lineCode: styleCode,
      entanKe: entan.entanKe,
      batchCode,
      qtySent: qty,
      postedQty: posted + qty,
      entanPcs,
      remaining: Math.max(0, entanPcs - (posted + qty)),
    };
  }
}