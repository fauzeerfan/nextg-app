// frontend/src/features/stations/CuttingReportView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, RefreshCw, X, ChevronRight, ArrowLeft, Search,
  Layers, Scissors, ClipboardList, Trash2, CheckCircle2, Package, Copy, SendHorizontal,
  Edit, AlertCircle, Loader2
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders, apiFetch } from '../../lib/api';

const DEFAULT_GROUP = 'FGSLCAS01';

const n = (x: any) => Number(x) || 0;
const round2 = (x: number) => Math.round(x * 100) / 100;

// Rumus cutting (sama dengan backend). losWarna hanya relevan untuk NAT/turunan.
const computeCutting = (d: any) => {
  const totalSetOrPcs = Math.round(n(d.entanLembar) * n(d.entanGambar));
  const aktualPemakaian = n(d.markerPanjang) * n(d.entanLembar);
  const totalLos =
    n(d.losSambungan) + n(d.losCacat) + n(d.losAktual) + n(d.losWarna);
  const sisa = n(d.panjangAktual) - aktualPemakaian - totalLos;
  const aktualMaterial = aktualPemakaian + sisa;
  return {
    totalSetOrPcs,
    aktualPemakaian: round2(aktualPemakaian),
    sisa: round2(sisa),
    aktualMaterial: round2(aktualMaterial),
  };
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

// ---- Helper: baca error body dari response ----
const readErrMsg = async (res: Response, fallback = 'Terjadi kesalahan'): Promise<string> => {
  try {
    const j = await res.json();
    if (Array.isArray(j.message)) return j.message.join(', ');
    return j.message || fallback;
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
};

// ====================== KOMPONEN UI ======================

const Modal = ({ title, onClose, children, wide, maxHeight }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
    <div
      className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-hidden flex flex-col`}
      onClick={(e) => e.stopPropagation()}
      style={{ maxHeight: maxHeight || '90vh' }}
    >
      <div className="flex items-center justify-between p-5 border-b-2 border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
        <h3 className="text-lg font-black text-slate-800 dark:text-white">{title}</h3>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <X size={20} />
        </button>
      </div>
      <div className="p-5 overflow-y-auto flex-1">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }: any) => (
  <div>
    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
    {children}
  </div>
);

const inputCls =
  'w-full px-3 py-2.5 text-sm font-bold bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:border-orange-500 transition-colors';

// ===== TIPE UNTUK METRIC CARD =====
type MetricColor = 'orange' | 'blue' | 'emerald' | 'purple';

const MetricCard = ({ title, value, icon: Icon, color = 'orange', subtitle, suffix }: any) => {
  const colors: Record<MetricColor, any> = {
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-500', darkBg: 'dark:bg-orange-900/40', darkIcon: 'dark:text-orange-400' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-500', darkBg: 'dark:bg-blue-900/40', darkIcon: 'dark:text-blue-400' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-500', darkBg: 'dark:bg-emerald-900/40', darkIcon: 'dark:text-emerald-400' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-500', darkBg: 'dark:bg-purple-900/40', darkIcon: 'dark:text-purple-400' },
  };
  const c = colors[color as MetricColor] || colors.orange;
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${c.border} border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-9 h-9 ${c.bg} ${c.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={`${c.icon} ${c.darkIcon}`} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
        {value}{suffix && <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>}
      </div>
      {subtitle && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

// ====================== COMPONENT UTAMA ======================

export const CuttingReportView = () => {
  const [tab, setTab] = useState<'sessions' | 'review'>('sessions');
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [review, setReview] = useState<any[]>([]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createFd, setCreateFd] = useState({ shipDate: '', creatorName: '' });
  const [createLoading, setCreateLoading] = useState(false); // ← BARU: loading state untuk tombol Buat
  const [addOpOpen, setAddOpOpen] = useState(false);
  const [opSearch, setOpSearch] = useState({ style: '', group: DEFAULT_GROUP });
  const [opList, setOpList] = useState<any[]>([]);
  const [opListLoading, setOpListLoading] = useState(false);
  const [cutModal, setCutModal] = useState<any | null>(null);
  const [cutFd, setCutFd] = useState<any>({});
  const [cutLoading, setCutLoading] = useState(false); // ← BARU: loading state simpan detail
  const [opNumberInput, setOpNumberInput] = useState('');
  const [opResolving, setOpResolving] = useState(false);
  const [postModal, setPostModal] = useState<any | null>(null);
  const [postQty, setPostQty] = useState<number>(0);
  const [postLoading, setPostLoading] = useState(false); // ← BARU: loading state kirim produksi
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null); // ← BARU: loading untuk copy/delete

  // ===== Turunan / NAT (non-automotive) =====
  const [turunanModal, setTurunanModal] = useState<{ entanId: string; material: any } | null>(null);
  const [turunanData, setTurunanData] = useState<any | null>(null);
  const [turunanLoading, setTurunanLoading] = useState(false);

  // ========== FETCH ==========
  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/forms`, { headers: getAuthHeaders() });
      if (res.ok) {
        setForms(await res.json());
      } else {
        const msg = await readErrMsg(res, 'Gagal memuat daftar sesi');
        console.error('[fetchForms]', msg);
      }
    } catch (e: any) {
      console.error('[fetchForms] network error:', e);
      alert(`Gagal memuat daftar sesi:\n${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReview = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/review`, { headers: getAuthHeaders() });
      if (res.ok) {
        setReview(await res.json());
      } else {
        const msg = await readErrMsg(res, 'Gagal memuat review');
        console.error('[fetchReview]', msg);
      }
    } catch (e: any) {
      console.error('[fetchReview] network error:', e);
    }
  }, []);

  const openForm = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/forms/${id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setSelected(await res.json());
      } else {
        const msg = await readErrMsg(res, 'Gagal membuka form');
        alert(msg);
      }
    } catch (e: any) {
      console.error('[openForm] network error:', e);
      alert(`Gagal membuka form:\n${e.message}`);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);
  useEffect(() => { if (tab === 'review') fetchReview(); }, [tab, fetchReview]);

  // ========== ACTIONS ==========

  // FIX: Tambah createLoading state agar tombol tidak bisa diklik ganda
  const createForm = async () => {
    if (!createFd.creatorName?.trim()) {
      alert('Nama pembuat tidak boleh kosong');
      return;
    }
    if (createLoading) return; // guard double-click
    setCreateLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/forms`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          shipDate: createFd.shipDate || undefined, // kirim undefined jika kosong, bukan string kosong
          creatorName: createFd.creatorName.trim(),
        }),
      });

      if (res.ok) {
        setCreateOpen(false);
        setCreateFd({ shipDate: '', creatorName: '' });
        await fetchForms();
      } else {
        const errMsg = await readErrMsg(res, 'Gagal membuat sesi');
        alert(`Gagal membuat sesi:\n${errMsg}`);
      }
    } catch (error: any) {
      console.error('[createForm] error:', error);
      alert(
        `Gagal terhubung ke server.\n\n` +
        `Periksa:\n` +
        `1. Backend berjalan di ${API_BASE_URL}\n` +
        `2. Tidak ada firewall yang memblokir\n` +
        `3. Browser tidak memblokir mixed-content (http/https)\n\n` +
        `Detail: ${error.message}`
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const searchOps = async () => {
    if (!opSearch.style.trim()) return;
    setOpListLoading(true);
    setOpList([]);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/cutting-report/oplist/${opSearch.group}/${opSearch.style.trim()}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        setOpList(await res.json());
      } else {
        const msg = await readErrMsg(res, 'Gagal ambil daftar OP dari API');
        alert(msg);
      }
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    } finally {
      setOpListLoading(false);
    }
  };

  const addOp = async (opNumber: string) => {
    if (!selected) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/forms/${selected.id}/ops`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ opNumber, style: opSearch.style.trim(), group: opSearch.group }),
      });
      if (res.ok) {
        setAddOpOpen(false);
        setOpList([]);
        await openForm(selected.id);
        await fetchForms();
      } else {
        const msg = await readErrMsg(res, 'Gagal menambah OP');
        alert(msg);
      }
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    }
  };

  const addOpByNumber = async () => {
    if (!selected || !opNumberInput.trim()) return;
    setOpResolving(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/forms/${selected.id}/ops-by-number`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ opNumber: opNumberInput.trim() }),
      });
      if (res.ok) {
        setOpNumberInput('');
        setAddOpOpen(false);
        await openForm(selected.id);
        await fetchForms();
      } else {
        const msg = await readErrMsg(res, 'OP tidak ditemukan di getlistop');
        alert(msg);
      }
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    } finally {
      setOpResolving(false);
    }
  };

  // FIX: Tambah error handling yang proper
  const addEntan = async (opId: string) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/ops/${opId}/entans`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        if (selected) await openForm(selected.id);
      } else {
        const msg = await readErrMsg(res, 'Gagal menambah entan');
        alert(msg);
      }
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    }
  };

  // opts: dipakai saat dibuka dari Turunan manager (kunci variant NAT + turunanId)
  const openCut = (
    entanId: string,
    material: any,
    existingDetail?: any,
    opts?: { variant?: 'AUT' | 'NAT'; sumber?: string; turunanId?: string; turunanName?: string },
  ) => {
    if (existingDetail) {
      setEditingDetailId(existingDetail.id);
      setCutFd({
        ...existingDetail,
        materialId: existingDetail.materialId || material.id,
        variant: existingDetail.variant || material.variant || 'AUT',
        sumber: existingDetail.sumber || 'NORMAL',
        turunanKe: existingDetail.turunanKe ?? '',
        turunanId: existingDetail.turunanId ?? opts?.turunanId ?? null,
        losWarna: existingDetail.losWarna ?? 0,
      });
    } else {
      setEditingDetailId(null);
      setCutFd({
        materialId: material.id,
        noLot: '',
        variant: opts?.variant || material.variant || 'AUT',
        sumber: opts?.sumber || 'NORMAL',
        turunanKe: '',
        turunanId: opts?.turunanId ?? null,
        panjangPackingList: '',
        panjangAktual: '',
        lebar: '',
        markerPanjang: '',
        markerLebar: '',
        entanLembar: '',
        entanGambar: '',
        losSambungan: 0,
        losCacat: 0,
        losAktual: 0,
        losWarna: 0,
      });
    }
    setCutModal({ entanId, material, turunanName: opts?.turunanName, lockNat: !!opts?.turunanId });
  };

  // FIX: Tambah cutLoading state + try/catch network error
  const saveCut = async () => {
    if (!cutModal) return;
    if (cutLoading) return; // guard double-click
    setCutLoading(true);
    try {
      const url = editingDetailId
        ? `${API_BASE_URL}/cutting-report/details/${editingDetailId}`
        : `${API_BASE_URL}/cutting-report/entans/${cutModal.entanId}/details`;
      const method = editingDetailId ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(cutFd),
      });
      if (res.ok) {
        const matId = cutFd.materialId;
        setCutModal(null);
        setEditingDetailId(null);
        if (selected) await openForm(selected.id);
        if (turunanModal && matId) await refreshTurunan(matId);
      } else {
        const msg = await readErrMsg(res, 'Gagal simpan detail');
        alert(msg);
      }
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    } finally {
      setCutLoading(false);
    }
  };

  // FIX: Tambah try/catch + loading state per baris
  const deleteDetail = async (id: string) => {
    if (!confirm('Hapus baris cutting ini?')) return;
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/details/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        if (selected) await openForm(selected.id);
        if (turunanModal) await refreshTurunan(turunanModal.material.id);
      } else {
        const msg = await readErrMsg(res, 'Gagal menghapus baris');
        alert(msg);
      }
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // FIX: Tambah try/catch + loading state
  const copyDetail = async (id: string) => {
    setActionLoadingId(`copy-${id}`);
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/details/${id}/copy`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        if (selected) await openForm(selected.id);
        if (turunanModal) await refreshTurunan(turunanModal.material.id);
      } else {
        const msg = await readErrMsg(res, 'Gagal menyalin baris');
        alert(msg);
      }
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ===== Turunan / NAT handlers =====
  const refreshTurunan = async (materialId: string) => {
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/cutting-report/materials/${materialId}/turunan`,
        { headers: getAuthHeaders() },
      );
      if (res.ok) setTurunanData(await res.json());
    } catch {
      /* abaikan; UI tetap menampilkan data terakhir */
    }
  };

  const openTurunan = async (entanId: string, material: any) => {
    setTurunanModal({ entanId, material });
    setTurunanData(null);
    setTurunanLoading(true);
    await refreshTurunan(material.id);
    setTurunanLoading(false);
  };

  const addTurunanGroup = async (materialId: string) => {
    setTurunanLoading(true);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/cutting-report/materials/${materialId}/turunan`,
        { method: 'POST', headers: getAuthHeaders() },
      );
      if (res.ok) await refreshTurunan(materialId);
      else alert(await readErrMsg(res, 'Gagal membuat turunan'));
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    } finally {
      setTurunanLoading(false);
    }
  };

  const removeTurunanGroup = async (turunanId: string, materialId: string) => {
    if (!confirm('Hapus grup turunan ini beserta seluruh baris NAT di dalamnya?')) return;
    setTurunanLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/turunan/${turunanId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await refreshTurunan(materialId);
        if (selected) await openForm(selected.id);
      } else {
        alert(await readErrMsg(res, 'Gagal menghapus turunan'));
      }
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    } finally {
      setTurunanLoading(false);
    }
  };

  const openPostModal = (op: any) => {
    // Set lengkap = dibatasi material AUT dengan hasil paling sedikit (MIN),
    // konsisten dengan backend & app lama (grandTotalCutting = MIN(totalCutting)).
    const setMaterials = (op.materials || []).filter(
      (m: any) => (m.variant || 'AUT') === 'AUT' && Number(m.qtyRequirement || 0) > 0,
    );
    const suggested = setMaterials.length
      ? Math.min(...setMaterials.map((m: any) => Number(m.qtySetPcs || 0)))
      : 0;
    setPostQty(suggested);
    setPostModal({ op, suggested });
  };

  // FIX: Tambah postLoading + try/catch
  const confirmPostToProduction = async () => {
    if (!postModal) return;
    if (postLoading) return;
    const qty = Math.trunc(Number(postQty) || 0);
    if (qty <= 0) { alert('Jumlah set harus lebih dari 0.'); return; }
    setPostLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/ops/${postModal.op.id}/post-to-production`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ qtyEntan: qty }),
      });
      if (res.ok) {
        const r = await res.json();
        setPostModal(null);
        if (selected) await openForm(selected.id);
        alert(`Terkirim ke Produksi.\nOP ${r.opNumber} — qtyEntan = ${r.qtyEntan} set (Line ${r.lineCode}).\nMuncul di tab "Generate QR / Dispatch" bila style termasuk eksekusi (default K1YH).`);
      } else {
        const msg = await readErrMsg(res, 'Gagal mengirim ke produksi');
        alert(msg);
      }
    } catch (e: any) {
      alert(`Gagal terhubung ke server:\n${e.message}`);
    } finally {
      setPostLoading(false);
    }
  };

  // ========== RENDER ==========

  if (selected) {
    const totalEntan = (selected.ops || []).reduce((s: number, op: any) => s + (op.entans || []).length, 0);
    const totalSetPcs = (selected.ops || []).reduce((s: number, op: any) =>
      s + (op.entans || []).reduce((ss: number, en: any) =>
        ss + (en.details || []).reduce((sss: number, d: any) => sss + (d.totalSetOrPcs || 0), 0), 0), 0);

    return (
      <div className="space-y-5">
        {/* Header Sesi */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelected(null); fetchForms(); }} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 text-slate-600 hover:border-orange-400 transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selected.kodeForm}</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ship date: {selected.shipDate ? new Date(selected.shipDate).toLocaleDateString('id-ID') : '-'} · {selected.creatorName || '-'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => { setAddOpOpen(true); setOpList([]); }} className="px-4 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition-colors">
                <Plus size={16} /> Tambah OP
              </button>
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Entan</span>
                <span className="text-xl font-black text-orange-600 dark:text-orange-400">{totalEntan}</span>
                <span className="text-xs font-bold text-slate-400">|</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Set/Pcs</span>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400">{totalSetPcs}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daftar OP */}
        {(selected.ops || []).length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
            <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-500">Belum ada OP. Klik "Tambah OP".</p>
          </div>
        )}

        {(selected.ops || []).map((op: any) => (
          <div key={op.id} className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600"><Scissors size={18} /></div>
              <div>
                <p className="font-black text-slate-800 dark:text-white">{op.opNumber} <span className="text-xs font-bold text-slate-400">· {op.styleCode}</span></p>
                <p className="text-xs font-semibold text-slate-500">{op.itemNumberFG} — {op.itemNameFG} · qtyOp {op.qtyOp?.toLocaleString()}</p>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <button onClick={() => addEntan(op.id)} className="px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-200 transition-colors">
                  <Plus size={14} /> Entan
                </button>
                <button onClick={() => openPostModal(op)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition-colors">
                  <Package size={14} /> Kirim ke Produksi
                </button>
              </div>
            </div>

            {/* Material */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {(op.materials || []).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">{m.setArtnr}</span>
                    <span className={`ml-2 text-[9px] font-black px-1.5 py-0.5 rounded ${m.variant === 'AUT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>{m.variant}</span>
                    <p className="text-[10px] text-slate-500 truncate">{m.artName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400">Req {round2(m.qtyRequirement)}</p>
                    <p className="text-xs font-black text-emerald-600">{m.qtySetPcs} set</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Entans */}
            <div className="space-y-3">
              {(op.entans || []).map((en: any) => (
                <div key={en.id} className="rounded-2xl border-2 border-slate-100 dark:border-slate-700 p-3 bg-slate-50/30 dark:bg-slate-700/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg">Entan ke-{en.entanKe}</span>
                    <span className="text-[10px] text-slate-400">{fmtDate(en.startAt)}</span>
                    {en.approved && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Approved</span>}
                  </div>
                  {/* Tombol input per material: AUT (potong utama) + Turunan/NAT */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(op.materials || []).map((m: any) => {
                      const existing = (en.details || []).find(
                        (d: any) => d.materialId === m.id && (d.variant || 'AUT') === 'AUT',
                      );
                      const natCount = (en.details || []).filter(
                        (d: any) => d.materialId === m.id && d.variant === 'NAT',
                      ).length;
                      return (
                        <div key={m.id} className="flex items-stretch rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => openCut(en.id, m, existing, { variant: 'AUT' })}
                            className={`px-2.5 py-1.5 text-[11px] font-bold transition-colors ${existing
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100'
                            }`}
                          >
                            {existing ? <CheckCircle2 size={12} className="inline mr-1" /> : <Plus size={12} className="inline mr-1" />}
                            {m.setArtnr} <span className="opacity-60">AUT</span>
                          </button>
                          <button
                            onClick={() => openTurunan(en.id, m)}
                            title="Turunan / Non-Automotive (NAT)"
                            className="px-2 py-1.5 text-[11px] font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border-l border-slate-200 dark:border-slate-700 flex items-center gap-1"
                          >
                            <Layers size={12} /> NAT{natCount > 0 ? ` (${natCount})` : ''}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {/* Tabel detail */}
                  {(en.details || []).length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead className="text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                          <tr className="text-left">
                            <th className="py-1 pr-2">Material</th>
                            <th className="py-1 px-2">Lembar×Gambar</th>
                            <th className="py-1 px-2">Set/Pcs</th>
                            <th className="py-1 px-2">Pemakaian</th>
                            <th className="py-1 px-2">Sisa</th>
                            <th className="py-1 px-2">akt.Material</th>
                            <th className="py-1 px-2">Var</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(en.details || []).map((d: any) => (
                            <tr key={d.id} className="border-t border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="py-1.5 pr-2 font-mono">{d.material?.setArtnr}</td>
                              <td className="py-1.5 px-2">{d.entanLembar}×{d.entanGambar}</td>
                              <td className="py-1.5 px-2 font-black text-blue-600">{d.totalSetOrPcs}</td>
                              <td className="py-1.5 px-2">{d.aktualPemakaian}</td>
                              <td className={`py-1.5 px-2 ${d.sisa < 0 ? 'text-rose-600' : ''}`}>{d.sisa}</td>
                              <td className="py-1.5 px-2">{d.aktualMaterial}</td>
                              <td className="py-1.5 px-2">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${d.variant === 'NAT' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                  {d.variant || 'AUT'}
                                </span>
                              </td>
                              <td className="py-1.5">
                                <div className="flex items-center gap-1.5">
                                  {/* FIX: loading state per tombol aksi */}
                                  <button
                                    onClick={() => openCut(en.id, d.material, d)}
                                    disabled={actionLoadingId === d.id || actionLoadingId === `copy-${d.id}`}
                                    title="Edit"
                                    className="text-blue-500 hover:text-blue-700 disabled:opacity-40"
                                  >
                                    <Edit size={13} />
                                  </button>
                                  <button
                                    onClick={() => copyDetail(d.id)}
                                    disabled={actionLoadingId === `copy-${d.id}`}
                                    title="Copy"
                                    className="text-slate-400 hover:text-blue-600 disabled:opacity-40"
                                  >
                                    {actionLoadingId === `copy-${d.id}` ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                                  </button>
                                  <button
                                    onClick={() => deleteDetail(d.id)}
                                    disabled={actionLoadingId === d.id}
                                    title="Hapus"
                                    className="text-rose-500 hover:text-rose-700 disabled:opacity-40"
                                  >
                                    {actionLoadingId === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add OP Modal */}
        {addOpOpen && (
          <Modal title="Tambah OP ke Sesi" onClose={() => setAddOpOpen(false)} wide>
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800">
              <Field label="Tambah cepat - Nomor OP">
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="mis. K1YH250153 / K3VA260051 / NSCT260039"
                    value={opNumberInput}
                    onChange={(e) => setOpNumberInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') addOpByNumber(); }}
                  />
                  <button onClick={addOpByNumber} disabled={opResolving} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shrink-0 disabled:opacity-50 flex items-center gap-2">
                    {opResolving ? <Loader2 size={14} className="animate-spin" /> : null}
                    {opResolving ? 'Mencari...' : 'Tambah'}
                  </button>
                </div>
              </Field>
              <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 mt-1.5">Mendukung SEMUA style OP. Style diambil dari 4 huruf depan; group dicari otomatis.</p>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">- atau cari per style -</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Field label="Item Group"><input className={inputCls} value={opSearch.group} onChange={(e) => setOpSearch({ ...opSearch, group: e.target.value })} /></Field>
              <Field label="Style"><input className={inputCls} placeholder="mis. K1YH" value={opSearch.style} onChange={(e) => setOpSearch({ ...opSearch, style: e.target.value })} /></Field>
              <div className="flex items-end"><button onClick={searchOps} disabled={opListLoading} className="w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {opListLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {opListLoading ? 'Mencari...' : 'Cari OP'}
              </button></div>
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {opList.map((o: any) => (
                <div key={o.opnumber} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                  <div className="min-w-0">
                    <p className="font-mono font-black text-slate-800 dark:text-white text-sm">{o.opnumber}</p>
                    <p className="text-[11px] text-slate-500 truncate">{o.kodefinishgood} — {o.finishgood} · qty {o.qtyop} · {(o.list_material || []).length} material</p>
                  </div>
                  <button onClick={() => addOp(o.opnumber)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs shrink-0">Tambah</button>
                </div>
              ))}
            </div>
          </Modal>
        )}

        {/* Cutting Input Modal */}
        {cutModal && (
          <Modal title={`Input Cutting — ${cutModal.material?.setArtnr}${cutFd.variant === 'NAT' ? ' · NAT' : ''}${cutModal.turunanName ? ` · ${cutModal.turunanName}` : ''}`} onClose={() => { setCutModal(null); setEditingDetailId(null); }} wide maxHeight="85vh">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="No Lot"><input className={inputCls} value={cutFd.noLot || ''} onChange={(e) => setCutFd({ ...cutFd, noLot: e.target.value })} /></Field>
              <Field label="Tipe Potong">
                <select className={inputCls} value={cutFd.variant || 'AUT'} disabled={cutModal.lockNat} onChange={(e) => setCutFd({ ...cutFd, variant: e.target.value })}>
                  <option value="AUT">AUT - potong utama</option>
                  <option value="NAT">NAT - turunan (dari sisa)</option>
                </select>
              </Field>
              <Field label="Sumber">
                <select className={inputCls} value={cutFd.sumber || 'NORMAL'} onChange={(e) => setCutFd({ ...cutFd, sumber: e.target.value })}>
                  <option value="NORMAL">Normal</option>
                  <option value="SISA">Sisa</option>
                  <option value="MR">Material Request</option>
                </select>
              </Field>
              {cutModal.lockNat ? (
                <Field label="Grup Turunan">
                  <input className={`${inputCls} opacity-70`} value={cutModal.turunanName || '-'} disabled />
                </Field>
              ) : (
                cutFd.variant === 'NAT' && (
                  <Field label="Turunan Ke (untuk NAT)">
                    <input type="number" className={inputCls} value={cutFd.turunanKe ?? ''} onChange={(e) => setCutFd({ ...cutFd, turunanKe: e.target.value })} />
                  </Field>
                )
              )}
              {[
                ['panjangPackingList', 'Panjang PackingList'],
                ['panjangAktual', 'Panjang Aktual'],
                ['lebar', 'Lebar'],
                ['markerPanjang', 'Marker Panjang'],
                ['markerLebar', 'Marker Lebar'],
                ['entanLembar', 'Entan Lembar'],
                ['entanGambar', 'Entan Gambar'],
                ['losSambungan', 'Loss Sambungan'],
                ['losCacat', 'Loss Cacat'],
                ['losAktual', 'Loss Aktual'],
                ...(cutFd.variant === 'NAT' ? [['losWarna', 'Loss Warna (NAT)']] : []),
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <input type="number" step="any" className={inputCls} value={cutFd[key] ?? ''} onChange={(e) => setCutFd({ ...cutFd, [key]: e.target.value })} />
                </Field>
              ))}
            </div>

            {/* Hasil perhitungan */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border-2 border-slate-100 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hasil Perhitungan (otomatis)</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Total Set/Pcs', 'totalSetOrPcs', 'text-blue-600'],
                  ['aktualPemakaian', 'aktualPemakaian', 'text-slate-800 dark:text-white'],
                  ['Sisa', 'sisa', (val: number) => val < 0 ? 'text-rose-600' : 'text-emerald-600'],
                  ['aktualMaterial', 'aktualMaterial', 'text-slate-800 dark:text-white'],
                ].map(([label, key, clsOrFn]: any) => {
                  const result = computeCutting(cutFd) as Record<string, number>;
                  const val = result[key] ?? 0;
                  const cls = typeof clsOrFn === 'function' ? clsOrFn(val) : clsOrFn;
                  return (
                    <div key={key}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                      <p className={`text-xl font-black ${cls}`}>{val}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setCutModal(null); setEditingDetailId(null); }} disabled={cutLoading} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-sm disabled:opacity-50">Batal</button>
              <button onClick={saveCut} disabled={cutLoading} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50">
                {cutLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                {cutLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </Modal>
        )}

        {/* Post to Production Modal */}
        {postModal && (
          <Modal title={`Kirim ke Produksi - ${postModal.op.opNumber}`} onClose={() => setPostModal(null)}>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Masukkan <b>jumlah SET lengkap</b> yang siap dikirim ke eksekusi (jadi <b>qtyEntan</b> induk untuk dispatch ke Cutting Pond).
            </p>
            <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-500">
              Saran = set lengkap (material AUT paling sedikit): <span className="text-blue-600">{postModal.suggested}</span>
            </div>
            <Field label="Jumlah Set">
              <input type="number" min={1} className={inputCls} value={postQty} onChange={(e) => setPostQty(Number(e.target.value))} />
            </Field>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPostModal(null)} disabled={postLoading} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-sm disabled:opacity-50">Batal</button>
              <button onClick={confirmPostToProduction} disabled={postLoading} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50">
                {postLoading ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
                {postLoading ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </Modal>
        )}

        {/* Turunan / NAT (Non-Automotive) Manager Modal */}
        {turunanModal && (
          <Modal
            title={`Turunan / NAT — ${turunanModal.material?.setArtnr}`}
            onClose={() => { setTurunanModal(null); setTurunanData(null); }}
            wide
            maxHeight="88vh"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Potong non-automotive memakai SISA material dari potong utama (AUT). Kelola grup turunan & catat hasilnya di sini.
              </p>
              <button
                onClick={() => addTurunanGroup(turunanModal.material.id)}
                disabled={turunanLoading}
                className="px-3 py-2 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={14} /> Tambah Turunan
              </button>
            </div>

            {/* Ringkasan sisa per lot (bahan turunan) */}
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Sisa tersedia per Lot (dari potong AUT)</div>
              {(turunanData?.sisaByLot || []).length === 0 ? (
                <p className="text-[11px] text-slate-500">Belum ada sisa tercatat.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(turunanData?.sisaByLot || []).map((s: any) => (
                    <span key={s.noLot} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800">
                      {s.noLot}: <span className={s.sisa < 0 ? 'text-rose-600' : 'text-emerald-600'}>{round2(s.sisa)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {turunanLoading && !turunanData ? (
              <div className="py-10 text-center text-slate-400"><Loader2 size={22} className="animate-spin inline" /></div>
            ) : (turunanData?.turunans || []).length === 0 ? (
              <div className="py-10 text-center font-bold text-slate-400">Belum ada turunan. Klik "Tambah Turunan".</div>
            ) : (
              <div className="space-y-3">
                {(turunanData?.turunans || []).map((t: any) => {
                  const turunanName = `Turunan ${t.noTurun}`;
                  return (
                    <div key={t.id} className="rounded-2xl border-2 border-purple-100 dark:border-purple-900/40 p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2.5 py-1 rounded-lg">{turunanName}</span>
                        <span className="text-[10px] text-slate-400">{fmtDate(t.createdAt)}</span>
                        <div className="ml-auto flex gap-2">
                          <button
                            onClick={() => openCut(turunanModal.entanId, turunanModal.material, undefined, { variant: 'NAT', sumber: 'NORMAL', turunanId: t.id, turunanName })}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-bold text-[11px] flex items-center gap-1"
                          >
                            <Plus size={12} /> New Cutting
                          </button>
                          <button
                            onClick={() => openCut(turunanModal.entanId, turunanModal.material, undefined, { variant: 'NAT', sumber: 'SISA', turunanId: t.id, turunanName })}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] flex items-center gap-1"
                          >
                            <Plus size={12} /> Add Sisa
                          </button>
                          <button
                            onClick={() => removeTurunanGroup(t.id, turunanModal.material.id)}
                            title="Hapus turunan"
                            className="px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {(t.details || []).length === 0 ? (
                        <p className="text-[11px] text-slate-400 px-1 py-2">Belum ada baris NAT pada turunan ini.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead className="text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                              <tr className="text-left">
                                <th className="py-1 pr-2">No Lot</th>
                                <th className="py-1 px-2">Lembar×Gambar</th>
                                <th className="py-1 px-2">Set/Pcs</th>
                                <th className="py-1 px-2">Sisa</th>
                                <th className="py-1 px-2">Los Warna</th>
                                <th className="py-1 px-2">Sumber</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(t.details || []).map((d: any) => (
                                <tr key={d.id} className="border-t border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold">
                                  <td className="py-1.5 pr-2">{d.noLot || '-'}</td>
                                  <td className="py-1.5 px-2">{d.entanLembar}×{d.entanGambar}</td>
                                  <td className="py-1.5 px-2 font-black text-purple-600">{d.totalSetOrPcs}</td>
                                  <td className={`py-1.5 px-2 ${d.sisa < 0 ? 'text-rose-600' : ''}`}>{d.sisa}</td>
                                  <td className="py-1.5 px-2">{d.losWarna ?? 0}</td>
                                  <td className="py-1.5 px-2"><span className="text-[9px] font-bold text-slate-500">{d.sumber || 'NORMAL'}</span></td>
                                  <td className="py-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <button onClick={() => openCut(turunanModal.entanId, turunanModal.material, d, { variant: 'NAT', turunanId: t.id, turunanName })} title="Edit" className="text-blue-500 hover:text-blue-700"><Edit size={13} /></button>
                                      <button onClick={() => copyDetail(d.id)} disabled={actionLoadingId === `copy-${d.id}`} title="Copy" className="text-slate-400 hover:text-blue-600 disabled:opacity-40">
                                        {actionLoadingId === `copy-${d.id}` ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                                      </button>
                                      <button onClick={() => deleteDetail(d.id)} disabled={actionLoadingId === d.id} title="Hapus" className="text-rose-500 hover:text-rose-700 disabled:opacity-40">
                                        {actionLoadingId === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Modal>
        )}
      </div>
    );
  }

  // ========== LIST SESSION & REVIEW ==========
  const totalEntanAll = forms.reduce((s, f) => s + (f.jumlahEntan || 0), 0);
  const totalOpsAll = forms.reduce((s, f) => s + (f.listOp || []).length, 0);

  return (
    <div className="space-y-5 font-poppins min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-5 text-slate-800 dark:text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap'); .font-poppins { font-family: 'Poppins', sans-serif; }`}</style>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Cutting Report
                  <span className="text-[11px] px-2.5 py-1 bg-orange-500 text-white rounded-md font-bold uppercase tracking-wider">INTERNAL</span>
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Manage cutting sessions and material usage</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { fetchForms(); fetchReview(); }} className="p-2.5 rounded-xl bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-600 hover:border-orange-400 transition-colors">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              {tab === 'sessions' && (
                <button onClick={() => setCreateOpen(true)} className="px-4 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition-colors shadow-md shadow-orange-600/30">
                  <Plus size={16} /> Buat Sesi
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 pb-5 pt-5">
          <MetricCard title="Total Sessions" value={forms.length} icon={FileText} color="orange" subtitle={`${forms.length} form`} />
          <MetricCard title="Total Entan" value={totalEntanAll} icon={Layers} color="blue" subtitle={`${totalEntanAll} entan`} />
          <MetricCard title="Total OP" value={totalOpsAll} icon={ClipboardList} color="emerald" subtitle={`${totalOpsAll} OP`} />
          <MetricCard title="Total Set/Pcs" value={review.reduce((s, r) => s + r.totalSetOrPcs, 0)} icon={Package} color="purple" suffix="pcs" />
        </div>

        <div className="px-5 pb-5 flex gap-2">
          {(['sessions', 'review'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${tab === t ? 'bg-orange-600 text-white shadow-md' : 'bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-orange-300'}`}
            >
              {t === 'sessions' ? '📋 Sesi Cutting' : '📊 Review Cutting'}
            </button>
          ))}
        </div>
      </div>

      {/* Konten Tab */}
      {tab === 'sessions' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr className="text-left">
                  <th className="py-3 px-5">Kode Form</th>
                  <th className="py-3 px-5">Jml Entan</th>
                  <th className="py-3 px-5">Creator</th>
                  <th className="py-3 px-5">Tanggal</th>
                  <th className="py-3 px-5">List OP</th>
                  <th className="py-3 px-5"></th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => (
                  <tr key={f.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors" onClick={() => openForm(f.id)}>
                    <td className="py-3 px-5 font-mono font-black text-slate-800 dark:text-white">{f.kodeForm}</td>
                    <td className="py-3 px-5">
                      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black px-2.5 py-1 rounded-lg text-xs">
                        {f.jumlahEntan || 0}
                      </span>
                    </td>
                    <td className="py-3 px-5 font-semibold text-slate-600 dark:text-slate-300">{f.creatorName || '-'}</td>
                    <td className="py-3 px-5 text-slate-500 text-xs">{fmtDate(f.createdAt)}</td>
                    <td className="py-3 px-5 font-mono text-xs text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{(f.listOp || []).join(', ') || '-'}</td>
                    <td className="py-3 px-5 text-right"><ChevronRight size={16} className="text-slate-400" /></td>
                  </tr>
                ))}
                {forms.length === 0 && !loading && (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400 font-bold">Belum ada sesi cutting. Klik "Buat Sesi".</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={6} className="py-10 text-center">
                    <Loader2 size={24} className="animate-spin mx-auto text-orange-500" />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr className="text-left">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Kode Form</th>
                  <th className="py-3 px-4">Entan</th>
                  <th className="py-3 px-4">OP</th>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Var</th>
                  <th className="py-3 px-4">Set/Pcs</th>
                  <th className="py-3 px-4">Pemakaian</th>
                  <th className="py-3 px-4">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {review.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-2.5 px-4 text-xs text-slate-500">{fmtDate(r.tanggal)}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{r.kodeForm}</td>
                    <td className="py-2.5 px-4">{r.entanKe}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{r.opNumber}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{r.itemNumber}</td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${r.variant === 'AUT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                        {r.variant || 'AUT'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-black text-blue-600">{r.totalSetOrPcs}</td>
                    <td className="py-2.5 px-4">{r.aktualPemakaian}</td>
                    <td className={`py-2.5 px-4 ${r.sisa < 0 ? 'text-rose-600' : ''}`}>{r.sisa}</td>
                  </tr>
                ))}
                {review.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-slate-400 font-bold">Belum ada hasil cutting.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {createOpen && (
        <Modal title="Buat Sesi Cutting Baru" onClose={() => !createLoading && setCreateOpen(false)}>
          <div className="space-y-3">
            <Field label="Ship Date"><input type="date" className={inputCls} value={createFd.shipDate} onChange={(e) => setCreateFd({ ...createFd, shipDate: e.target.value })} /></Field>
            <Field label="Creator *">
              <input
                className={inputCls}
                placeholder="Nama pembuat (wajib)"
                value={createFd.creatorName}
                onChange={(e) => setCreateFd({ ...createFd, creatorName: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') createForm(); }}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setCreateOpen(false)} disabled={createLoading} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-sm disabled:opacity-50">Batal</button>
            <button
              onClick={createForm}
              disabled={createLoading || !createFd.creatorName.trim()}
              className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {createLoading ? 'Membuat...' : 'Buat'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CuttingReportView;