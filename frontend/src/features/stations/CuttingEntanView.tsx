import { useState, useEffect, useCallback } from 'react';
import { TargetSummaryCard } from '../../components/ui/TargetSummaryCard';
import { CuttingReportView } from './CuttingReportView';
import { API_BASE_URL } from '../../lib/api';
import {
  Scissors, Printer, CheckCircle, Loader2, RefreshCw, Package,
  ClipboardCheck, ArrowRight, Database, Target, AlertTriangle, History, X,
  Activity, Layers, Check
} from 'lucide-react';


interface ReadyOp {
  id: string;
  opNumber: string;
  styleCode: string;
  itemNumberFG: string;
  itemNameFG: string;
  qtyOp: number;
  totalCut: number;
  sentToPond: number;
  pending: number;
  batchCount?: number;
  lineCode?: string;
  lastBatch: {
    id: string;
    batchNumber: number;
    qty: number;
    qrCode: string;
    createdAt: string;
  } | null;
}

interface QrData {
  code: string;
  opNumber: string;
  itemNumberFG: string;
  itemNameFG: string;
  qtyOp: number;
  batchQty: number;
  batchNumber: number;
  createdAt?: string; 
}

const StatusBadge = ({ status, variant = 'info' }: { status: string; variant?: 'info' | 'success' | 'warning' | 'danger' }) => (
  <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
    variant === 'info' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800' :
    variant === 'success' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800' :
    variant === 'warning' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800' :
    'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800'
  }`}>{status}</span>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: any;
  color?: 'blue' | 'orange' | 'emerald' | 'purple';
  subtitle?: string;
  suffix?: string;
}

// Modern Solid Metric Card
const MetricCard = ({ title, value, icon: Icon, color = 'blue', subtitle, suffix }: MetricCardProps) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-500', darkBg: 'dark:bg-blue-900/40', darkIcon: 'dark:text-blue-400' },
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-500', darkBg: 'dark:bg-orange-900/40', darkIcon: 'dark:text-orange-400' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-500', darkBg: 'dark:bg-emerald-900/40', darkIcon: 'dark:text-emerald-400' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-500', darkBg: 'dark:bg-purple-900/40', darkIcon: 'dark:text-purple-400' }
  };
  const currentColor = colorClasses[color] || colorClasses.blue;
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${currentColor.border} border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-10 h-10 ${currentColor.bg} ${currentColor.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className={`${currentColor.icon} ${currentColor.darkIcon}`} />
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none">
        {value}{suffix && <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>}
      </div>
      {subtitle && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

export const CuttingEntanView = ({ addLog }: { addLog: (msg: string, type?: 'info' | 'error' | 'success') => void }) => {
  const [ops, setOps] = useState<ReadyOp[]>([]);
  const [selOp, setSelOp] = useState<ReadyOp | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [qr, setQr] = useState<QrData | null>(null);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [all, setAll] = useState<any[]>([]);
  const [totalSent, setTotalSent] = useState(0);
  const [mainTab, setMainTab] = useState<'dispatch' | 'report'>('dispatch');

  // FASE 3 — dialog pilih Pola + Batch saat Generate QR
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispInfo, setDispInfo] = useState<any>(null);
  const [dispLoading, setDispLoading] = useState(false);
  const [selPatterns, setSelPatterns] = useState<number[]>([]);
  const [batchNumberInput, setBatchNumberInput] = useState<string>(''); // nomor batch MANUAL
  const [carriedBatchCode, setCarriedBatchCode] = useState<string>('');  // #2: ID batch dari entan (Cutting Report)
  const [dispQty, setDispQty] = useState<number>(0);

  // Modal konfirmasi Reconcile (aksi berisiko -> perlu konfirmasi eksplisit)
  const [reconcileTarget, setReconcileTarget] = useState<ReadyOp | null>(null);
  const [reconcileAck, setReconcileAck] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  // SWITCH sumber data: INTERNAL (Cutting Report NextG) | EXTERNAL (API lama)
  const [cuttingSource, setCuttingSource] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [sourceLoading, setSourceLoading] = useState(false);

  // FUNGSI BARU: Menyimpan dan Mengingat OP ke LocalStorage
  const updateOpCache = useCallback((opsData: any[]) => {
    try {
      const cache = JSON.parse(localStorage.getItem('cutting_op_cache') || '{}');
      let isUpdated = false;
      opsData.forEach(op => {
        if (op.opNumber && op.itemNumberFG) {
          cache[op.opNumber] = {
            itemNumberFG: op.itemNumberFG,
            itemNameFG: op.itemNameFG,
            qtyOp: op.qtyOp
          };
          isUpdated = true;
        }
      });
      if (isUpdated) {
        localStorage.setItem('cutting_op_cache', JSON.stringify(cache));
      }
    } catch (e) {
      console.error('Failed to update cache', e);
    }
  }, []);

  const fetchOps = useCallback(async () => {
    setRefreshing(true);
    try {
      // Tidak perlu sync lagi
      const res = await fetch(`${API_BASE_URL}/cutting-entan/ops`);
      if (res.ok) {
        const data = await res.json();
        setOps(data);
        updateOpCache(data);
      } else addLog('Failed to fetch cutting entan queue', 'error');
    } catch { addLog('Network error fetching OPs', 'error'); } finally { setRefreshing(false); }
  }, [addLog, updateOpCache]);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/cutting-entan/batches`);
      if (res.ok) setAll(await res.json());
      else addLog('Failed to fetch batch history', 'error');
    } catch { addLog('Network error fetching batches', 'error'); }
  }, [addLog]);

  const fetchTotal = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/cutting-entan/total-sent`);
      if (res.ok) setTotalSent((await res.json()).total);
    } catch { console.error('Failed to fetch total sent'); }
  }, []);

  const fetchCuttingSource = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/cutting-source`);
      if (res.ok) {
        const j = await res.json();
        if (j?.source === 'EXTERNAL' || j?.source === 'INTERNAL') setCuttingSource(j.source);
      }
    } catch { /* diam: default INTERNAL */ }
  }, []);

  const toggleCuttingSource = async () => {
    const next = cuttingSource === 'INTERNAL' ? 'EXTERNAL' : 'INTERNAL';
    const msg =
      next === 'EXTERNAL'
        ? 'Beralih ke API Cutting Report LAMA (eksternal)?\nOP induk akan kembali ditarik dari sistem lama.'
        : 'Beralih ke Cutting Report INTERNAL NextG?\nOP induk berasal dari hasil "Kirim ke Produksi".';
    if (!confirm(msg)) return;
    setSourceLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/cutting-source`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: next }),
      });
      if (res.ok) {
        const j = await res.json();
        setCuttingSource(j.source);
        addLog(`Sumber data Cutting beralih ke ${j.source}`, 'success');
        await fetchOps();
      } else {
        addLog('Gagal mengubah sumber data', 'error');
      }
    } catch {
      addLog('Network error saat mengubah sumber data', 'error');
    } finally {
      setSourceLoading(false);
    }
  };

  const viewAll = async () => { 
    await fetchAll(); 
    setShowAll(true); 
  };

  useEffect(() => {
    fetchOps(); fetchTotal(); fetchCuttingSource();
    const i = setInterval(() => { fetchOps(); fetchTotal(); }, 10000);
    return () => clearInterval(i);
  }, [fetchOps, fetchTotal, fetchCuttingSource]);

  const selectOp = (op: ReadyOp) => setSelOp(op);

  // Buka dialog: pilih pola + batch sebelum generate QR (Fase 3)
  const generateQR = async () => {
    if (!selOp) return;
    setShowDispatch(true);
    setDispInfo(null);
    setSelPatterns([]);
    setBatchNumberInput(''); // nomor batch WAJIB diisi manual oleh operator
    setCarriedBatchCode(''); // #2: reset ID batch terbawa
    setDispLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cutting-entan/op/${selOp.opNumber}/dispatch-info`);
      if (res.ok) {
        const info = await res.json();
        setDispInfo(info);
        setSelPatterns([]); // pola tetap dipilih operator sendiri
        // DEFAULT identitas batch dari entan (1 entan = 1 batch) yang sudah "Kirim ke
        // Produksi" di Cutting Report. Pilih entan yang batch-nya BELUM dibuat; fallback
        // ke entan pertama. Nilai ini hanya DEFAULT — tetap bisa diedit operator (tidak dikunci).
        const posted = (info.postedEntans || []);
        const existingBatchNums = new Set((info.batches || []).map((b: any) => b.batchNumber));
        const defEntan = posted.find((pe: any) => !existingBatchNums.has(pe.entanKe)) || posted[0] || null;
        if (defEntan) {
          setBatchNumberInput(String(defEntan.entanKe));
          setCarriedBatchCode(defEntan.batchCode || '');
          const q = Math.min(Number(defEntan.postedQty || 0), Number(info.pending || 0));
          setDispQty(q > 0 ? q : (info.pending > 0 ? info.pending : 0));
        } else {
          setBatchNumberInput('');
          setCarriedBatchCode('');
          setDispQty(info.pending > 0 ? info.pending : 0);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.message || 'Gagal memuat info dispatch'}`);
        setShowDispatch(false);
      }
    } catch {
      alert('Network error');
      setShowDispatch(false);
    } finally {
      setDispLoading(false);
    }
  };

  const togglePattern = (idx: number) =>
    setSelPatterns((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx],
    );

  // Kirim dispatch (batch baru atau tambah pola ke batch lama) -> generate QR
  // batch existing yang cocok dengan nomor yang diketik (untuk mode "tambah pola")
  const targetBatch = (dispInfo?.batches || []).find(
    (b: any) => b.batchNumber === parseInt(batchNumberInput, 10),
  );
  const isExistingBatch = !!targetBatch;

  const confirmDispatch = async () => {
    if (!selOp) return;
    const pats = [...selPatterns].sort((a, b) => a - b);
    if (pats.length === 0) { alert('Pilih minimal 1 pola.'); return; }
    const bn = parseInt(batchNumberInput, 10);
    if (!bn || bn <= 0) { alert('Masukkan nomor batch manual (mis. 1, 2, 3).'); return; }
    if (!isExistingBatch && dispQty <= 0) { alert('Qty harus lebih dari 0 untuk batch baru.'); return; }
    setLoading(true);
    try {
      const body: any = { patternIndexes: pats, batchNumber: bn };
      // qty SELALU dikirim: batch baru butuh qty>0; batch existing memakai qty>0
      // untuk MENAMBAH pcs (mengurangi PEND) atau 0 untuk sekadar menambah pola.
      body.qty = dispQty;
      if (carriedBatchCode) body.batchCode = carriedBatchCode; // #2: ID batch dari entan (label)
      const res = await fetch(`${API_BASE_URL}/cutting-entan/generate/${selOp.opNumber}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const r = await res.json();
        updateOpCache([selOp]);
        setQr({
          code: r.qr,
          opNumber: r.opNumber || selOp.opNumber,
          itemNumberFG: r.itemNumberFG || selOp.itemNumberFG,
          itemNameFG: r.itemNameFG || selOp.itemNameFG,
          qtyOp: r.qtyOp ?? selOp.qtyOp,
          batchQty: r.batchQty ?? r.qty ?? 0,
          batchNumber: r.batchNumber ?? bn,
          createdAt: r.createdAt || new Date().toISOString(),
        });
        setShowDispatch(false);
        await fetchOps();
        await fetchTotal();
        setSelOp(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.message || 'Gagal generate QR'}`);
      }
    } catch {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const viewHistory = async (op: ReadyOp) => {
    try {
      updateOpCache([op]); // Ingat OP ini
      const res = await fetch(`${API_BASE_URL}/cutting-entan/history/${op.opNumber}`);
      if (res.ok) { 
        setHist(await res.json()); 
        setShowHist(true); 
      }
    } catch { alert('Failed to fetch history'); }
  };

  // Buka modal konfirmasi Reconcile (aksi berisiko). Eksekusi via confirmReconcile().
  const openReconcile = (op: ReadyOp) => {
    setReconcileTarget(op);
    setReconcileAck(false);
  };

  // Reconcile: tandai semua hasil cut OP ini sudah terkirim ke Pond (pending -> 0).
  // Dipakai untuk merapikan data lama saat pending tersangkut padahal Pond sudah full supply.
  const confirmReconcile = async () => {
    const op = reconcileTarget;
    if (!op || !reconcileAck || reconcileLoading) return;
    setReconcileLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cutting-entan/op/${op.opNumber}/reconcile-pending`, { method: 'POST' });
      if (res.ok) {
        setReconcileTarget(null);
        setReconcileAck(false);
        await fetchOps();
        await fetchTotal();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Gagal reconcile: ${err.message || res.status}`);
      }
    } catch { alert('Network error'); }
    finally { setReconcileLoading(false); }
  };

  const reprint = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/cutting-entan/reprint/${id}`);
      if (res.ok) {
        // Backend kini mengembalikan data LENGKAP (dari OP induk + batch), jadi
        // tidak perlu lagi menebak dari cache. Label reprint = label saat generate.
        const r = await res.json();
        setQr({
          code: r.qr || r.code,
          opNumber: r.opNumber || '-',
          itemNumberFG: r.itemNumberFG || r.fgNumber || '-',
          itemNameFG: r.itemNameFG || '-',
          qtyOp: r.qtyOp ?? 0,
          batchQty: r.batchQty ?? r.qty ?? 0,
          batchNumber: r.batchNumber ?? 0,
          createdAt: r.createdAt || new Date().toISOString(),
        });
      } else {
        alert('Failed to reprint');
      }
    } catch { alert('Failed to reprint'); }
  };

  const totalPending = ops.reduce((sum, op) => sum + op.pending, 0);
  const totalTarget = totalSent + totalPending;
  const overallProgress = totalTarget > 0 ? Math.round((totalSent / totalTarget) * 100) : 0;

  // Pola yang TERKUNCI = pola yang sudah ada di batch bernomor sama (target).
  // Untuk batch BARU (nomor belum ada), tidak ada yang terkunci. Setiap batch
  // adalah 1 set terpisah sehingga pola yang sama boleh ada di batch berbeda.
  const dispUsed = new Set<number>(
    (targetBatch?.dispatchedPatterns || []) as number[],
  );

  // Solid Modal for Batches
  const BatchModal = ({ show, onClose, title, data, cols }: any) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-800 dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-lg text-white">
                <History size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{title}</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Review Generated Batches</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm">
              <X size={24} className="text-slate-500" />
            </button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/50">
                  <tr className="text-left font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs">
                    {cols.map((c: any) => <th key={c.key} className="py-4 px-5">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {data.length === 0 ? (
                    <tr><td colSpan={cols.length} className="py-10 text-center font-bold text-slate-500 text-lg">No batches found.</td></tr>
                  ) : (
                    data.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        {cols.map((c: any) => (
                          <td key={c.key} className="py-4 px-5 font-semibold text-slate-800 dark:text-slate-200">
                            {c.render ? c.render(item) : item[c.key]}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const cuttingTabBar = (
    <div className="flex flex-wrap items-center gap-2 mb-5 font-poppins p-4 md:p-6 pb-0">
      {(['dispatch', 'report'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setMainTab(t)}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${mainTab === t ? 'bg-orange-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700'}`}
        >
          {t === 'dispatch' ? 'Generate QR / Dispatch' : 'Cutting Report'}
        </button>
      ))}

      {/* SWITCH sumber data Cutting Entan (default: Internal NextG) */}
      <div className="ml-auto flex items-center gap-2">
        <span
          className={`text-[11px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${cuttingSource === 'INTERNAL'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}
          title="Sumber OP induk untuk dispatch"
        >
          <Database size={13} /> {cuttingSource === 'INTERNAL' ? 'Cutting Report Internal' : 'API Lama (Eksternal)'}
        </span>
        <button
          onClick={toggleCuttingSource}
          disabled={sourceLoading}
          title="Ganti sumber data Cutting Entan"
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 text-white dark:bg-slate-700 hover:bg-slate-900 flex items-center gap-1.5 disabled:opacity-50"
        >
          {sourceLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Switch ke {cuttingSource === 'INTERNAL' ? 'API Lama' : 'Internal'}
        </button>
      </div>
    </div>
  );

  if (mainTab === 'report') {
    return (
      <div className="font-poppins text-slate-800 dark:text-slate-100 min-h-screen animate-in fade-in duration-300 p-4 md:p-6">
        {cuttingTabBar}
        <CuttingReportView />
      </div>
    );
  }

  return (
    <div className="font-poppins text-slate-800 dark:text-slate-100 min-h-screen animate-in fade-in duration-300">
      {cuttingTabBar}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        .font-poppins { font-family: 'Poppins', sans-serif; }
        
        @media print {
          @page {
            size: 7.9cm 3.8cm; 
            margin: 0; 
          }
          html, body {
            width: 7.9cm !important;
            height: 3.8cm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background-color: white !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {qr && (
        <>
          {/* ========================================================= */}
          {/* 1. VERSI CETAK MESIN */}
          {/* ========================================================= */}
          <div className="hidden print:flex w-[7.9cm] h-[3.8cm] bg-white text-black m-0 p-0 box-border flex-col items-center justify-center overflow-hidden fixed top-0 left-0 z-[9999]">
            <div className="flex flex-col h-full justify-center items-center w-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
              <div className="flex flex-col">
                <div className="flex flex-row items-center gap-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qr.code}`}
                    alt="QR Code"
                    className="w-[1.8cm] h-[1.8cm] object-contain shrink-0"
                  />
                  <div className="flex flex-col justify-center text-left font-semibold text-[9pt] leading-[1.1] tracking-wide">
                    <div>{qr.itemNumberFG}</div>
                    <div>{qr.opNumber}</div>
                    <div>Batch {qr.batchNumber} · {qr.batchQty} PCS</div>
                    <div>{formatDate(qr.createdAt ? new Date(qr.createdAt) : new Date())}</div>
                  </div>
                </div>
                <div className="mt-1.5 font-bold text-[11pt] text-left uppercase leading-none tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-[7.5cm]">
                  {qr.itemNameFG}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. VERSI LAYAR MODAL */}
          {/* ========================================================= */}
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:hidden">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              
              <div className="absolute top-5 right-5">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">QR Generated</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Ready for printing</p>
              </div>

              <div
                className="label-container mx-auto border-2 border-dashed border-slate-300 dark:border-slate-600 p-5 rounded-2xl bg-white shadow-sm"
                style={{ width: '100%', maxWidth: '340px' }}
              >
                <div className="w-full bg-white text-black" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  <div className="flex flex-col justify-center items-center">
                    <div className="flex flex-col w-full">
                      <div className="flex flex-row items-center gap-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qr.code}`}
                          alt="QR Code"
                          className="w-20 h-20 object-contain shrink-0"
                        />
                        <div className="flex flex-col justify-center text-left font-bold text-[15px] leading-tight tracking-wide">
                          <div>{qr.itemNumberFG}</div>
                          <div>{qr.opNumber}</div>
                          <div>Batch {qr.batchNumber} · {qr.batchQty} PCS</div>
                          <div>{formatDate(qr.createdAt ? new Date(qr.createdAt) : new Date())}</div>
                        </div>
                      </div>
                      <div className="mt-3 font-black text-lg text-left uppercase leading-none tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                        {qr.itemNameFG}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setQr(null)}
                  className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-base uppercase tracking-wider"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex justify-center items-center gap-2 text-base uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-colors"
                >
                  <Printer size={20} />
                  Print Label
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== FASE 3: Dialog Pilih Pola + Batch ===== */}
      {showDispatch && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg text-white">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">Dispatch ke Cutting Pond</h3>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">{selOp?.opNumber} · pilih pola & batch</p>
                </div>
              </div>
              <button onClick={() => setShowDispatch(false)} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <X size={22} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              {dispLoading || !dispInfo ? (
                <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
              ) : (
                <>
                  <div>
                    {/* #2: Batch dari Cutting Report (kirim per-entan). Klik untuk
                        mengisi otomatis nomor & ID batch tanpa input ulang. */}
                    {(dispInfo.postedEntans || []).length > 0 && (
                      <div className="mb-4">
                        <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Batch dari Cutting Report (klik untuk pakai)</div>
                        <div className="flex flex-wrap gap-2">
                          {(dispInfo.postedEntans || []).map((pe: any, i: number) => {
                            const active = carriedBatchCode === pe.batchCode && parseInt(batchNumberInput, 10) === pe.entanKe;
                            return (
                              <button key={i} type="button"
                                onClick={() => {
                                  setBatchNumberInput(String(pe.entanKe));
                                  setCarriedBatchCode(pe.batchCode || '');
                                  const q = Math.min(Number(pe.postedQty || 0), Number(dispInfo.pending || 0));
                                  if (q > 0) setDispQty(q);
                                }}
                                className={`px-3 py-2 rounded-lg border-2 text-left text-xs transition ${active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'}`}>
                                <div className="font-black text-slate-900 dark:text-white">Batch {pe.batchCode || `#${pe.entanKe}`}</div>
                                <div className="text-slate-500 dark:text-slate-400">Entan ke-{pe.entanKe} · {pe.postedQty} pcs</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">1. Nomor Batch (otomatis dari entan / manual)</div>
                    {carriedBatchCode && (
                      <div className="mb-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                        ID batch dari Cutting Report: <b>{carriedBatchCode}</b> (Entan ke-{batchNumberInput})
                      </div>
                    )}
                    <input
                      type="number" min={1} value={batchNumberInput}
                      onChange={(e) => { setBatchNumberInput(e.target.value.replace(/[^0-9]/g, '')); setCarriedBatchCode(''); }}
                      placeholder="Ketik nomor batch, mis. 1, 2, 3"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-lg text-slate-900 dark:text-white focus:border-orange-500 outline-none"
                    />
                    {isExistingBatch && (
                      <div className="mt-2 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                        Batch {batchNumberInput} sudah ada ({targetBatch.qty} pcs). Isi <b>qty</b> untuk MENAMBAH pcs ke batch ini (mengurangi pending), atau <b>0</b> untuk sekadar menambah pola.
                      </div>
                    )}
                    <div className="mt-3">
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">{isExistingBatch ? 'Qty tambahan (pcs)' : 'Qty (pcs) — batch baru'}</div>
                      <input type="number" min={isExistingBatch ? 0 : 1} max={dispInfo.pending} value={dispQty}
                        onChange={(e) => setDispQty(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-4 py-3 rounded-xl border-2 border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-800 font-black text-lg text-right text-slate-900 dark:text-white outline-none" />
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sisa pending: {dispInfo.pending} pcs</div>
                    </div>
                    {(dispInfo.batches || []).length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Batch sudah ada (klik untuk melanjutkan):</div>
                        <div className="flex flex-wrap gap-2">
                          {(dispInfo.batches || []).map((b: any) => {
                            const names = (b.dispatchedPatterns || []).map((i: number) => (dispInfo.patterns?.[i]?.name ?? (i + 1))).join(', ') || '-';
                            const active = b.batchNumber === parseInt(batchNumberInput, 10);
                            return (
                              <button key={b.id} type="button"
                                onClick={() => setBatchNumberInput(String(b.batchNumber))}
                                className={`px-3 py-2 rounded-lg border-2 text-left text-xs transition ${active ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'}`}>
                                <div className="font-black text-slate-900 dark:text-white">Batch {b.batchNumber}</div>
                                <div className="text-slate-500 dark:text-slate-400">{b.qty} pcs · pola: {names}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">2. Pilih Pola ({selPatterns.length}/{dispInfo.totalPatterns})</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(dispInfo.patterns || []).map((p: any) => {
                        const already = dispUsed.has(p.index);
                        const checked = selPatterns.includes(p.index);
                        return (
                          <button key={p.index} type="button" disabled={already}
                            onClick={() => togglePattern(p.index)}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition ${already ? 'border-slate-200 dark:border-slate-700 opacity-40 cursor-not-allowed' : checked ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'}`}>
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-orange-600 text-white' : 'border-2 border-slate-300 dark:border-slate-600'}`}>
                              {checked && <Check size={14} />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{p.name}</div>
                              {already && <div className="text-[10px] text-slate-400 font-semibold uppercase">sudah di batch</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 leading-relaxed">Pola yang sudah di-dispatch terkunci. Cutting Pond hanya menghitung pola yang dipilih; transfer ke Check Panel baru terbuka setelah <strong>semua pola</strong> lengkap.</p>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3">
              <button onClick={() => setShowDispatch(false)} className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition uppercase tracking-wider text-sm">Batal</button>
              <button onClick={confirmDispatch} disabled={loading || dispLoading || !dispInfo || selPatterns.length === 0 || !batchNumberInput || (!isExistingBatch && dispQty <= 0)}
                className="flex-[2] py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black flex justify-center items-center gap-2 text-sm uppercase tracking-wider shadow-lg shadow-orange-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Printer size={18} /> Generate QR</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. APLIKASI UTAMA BACKGROUND */}
      {/* ========================================================= */}
      <div className="print:hidden">
        <BatchModal show={showHist} onClose={() => setShowHist(false)} title="Batch History" data={hist} cols={[
          { key: 'batchNumber', label: 'Batch', render: (i:any) => <span className="font-black text-slate-900 dark:text-white">#{i.batchNumber}</span> },
          { key: 'qty', label: 'Qty', render: (i:any) => <span className="font-bold">{i.qty} pcs</span> },
          { key: 'createdAt', label: 'Date', render: (i:any) => new Date(i.createdAt).toLocaleString() },
          { key: 'action', label: 'Action', render: (i:any) => <button onClick={() => { setShowHist(false); reprint(i.id); }} className="px-4 py-1.5 bg-blue-600 text-white rounded-md font-bold text-xs hover:bg-blue-700 shadow-sm shadow-blue-600/30 uppercase tracking-wider">Reprint</button> }
        ]} />
        <BatchModal show={showAll} onClose={() => setShowAll(false)} title="All Batch History" data={all} cols={[
          { key: 'opNumber', label: 'OP Number', render: (i:any) => <span className="font-mono font-black">{i.opNumber}</span> },
          { key: 'batchNumber', label: 'Batch', render: (i:any) => <span className="font-black text-slate-900 dark:text-white">#{i.batchNumber}</span> },
          { key: 'qty', label: 'Qty', render: (i:any) => <span className="font-bold">{i.qty} pcs</span> },
          { key: 'createdAt', label: 'Date', render: (i:any) => new Date(i.createdAt).toLocaleString() },
          { key: 'action', label: 'Action', render: (i:any) => <button onClick={() => { setShowAll(false); reprint(i.id); }} className="px-4 py-1.5 bg-blue-600 text-white rounded-md font-bold text-xs hover:bg-blue-700 shadow-sm shadow-blue-600/30 uppercase tracking-wider">Reprint</button> }
        ]} />

        {/* ===== MODAL KONFIRMASI RECONCILE (aksi berisiko — perlu konfirmasi eksplisit) ===== */}
        {reconcileTarget && (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => { if (!reconcileLoading) setReconcileTarget(null); }}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border-2 border-rose-200 dark:border-rose-900/60 overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header danger */}
              <div className="bg-gradient-to-br from-rose-500 to-red-600 px-6 py-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={26} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white leading-tight">Tandai Terkirim (Reconcile)</h3>
                  <p className="text-white/85 text-xs font-semibold mt-0.5">Aksi ini mengubah data pending — lakukan dengan hati-hati</p>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                  Anda akan menandai <b>seluruh sisa cut</b> OP{' '}
                  <b className="font-mono text-slate-900 dark:text-white">{reconcileTarget.opNumber}</b>{' '}
                  sebagai <b>sudah terkirim ke Cutting Pond</b>.
                </p>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 px-4 py-3">
                  <div className="text-center flex-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Sekarang</div>
                    <div className="text-2xl font-black text-orange-600 dark:text-orange-400 leading-none mt-1">{reconcileTarget.pending} <span className="text-xs">pcs</span></div>
                  </div>
                  <ArrowRight size={20} className="text-slate-400 shrink-0" />
                  <div className="text-center flex-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menjadi</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">0 <span className="text-xs">pcs</span></div>
                  </div>
                </div>

                {/* Warning serius */}
                <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-900/60 px-4 py-3.5 flex gap-3">
                  <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-relaxed">
                    Lakukan <b>HANYA</b> bila Cutting Pond untuk OP ini benar-benar sudah <b>full supply</b>.
                    Setelah ditandai, sisa pending <b>tidak bisa di-dispatch lagi</b> dari sini. Salah tekan dapat membuat data cutting tidak akurat.
                  </div>
                </div>

                {/* Checkbox konfirmasi (wajib dicentang agar tombol aktif) */}
                <label className="flex items-start gap-3 cursor-pointer select-none rounded-2xl border-2 border-slate-200 dark:border-slate-700 px-4 py-3 hover:border-rose-300 dark:hover:border-rose-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={reconcileAck}
                    onChange={(e) => setReconcileAck(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-rose-600 shrink-0"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                    Saya paham konsekuensinya dan memastikan Cutting Pond OP ini sudah full supply.
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => setReconcileTarget(null)}
                  disabled={reconcileLoading}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={confirmReconcile}
                  disabled={!reconcileAck || reconcileLoading}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-black text-sm uppercase tracking-wider hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {reconcileLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {reconcileLoading ? 'Memproses...' : 'Ya, Tandai Terkirim'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header - Solid Style */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
          <div className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Scissors size={28} className="text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                    <Database size={14} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    Cutting Entan
                    <span className="text-[11px] px-2.5 py-1 bg-orange-500 text-white rounded-md font-bold uppercase tracking-wider">
                      BATCH SYSTEM
                    </span>
                  </h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Material Preparation & QR Labeling Station</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-4 px-5 py-3 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20">
                  <div className="flex flex-col">
                    <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Pending Cut</div>
                    <div className="text-2xl font-black leading-none mt-1">{totalPending}</div>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Package size={24} className="text-white" />
                  </div>
                </div>
                <button onClick={viewAll} className="px-5 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 text-sm">
                  <History size={18} />
                  History
                </button>
                <button onClick={() => fetchOps()} disabled={refreshing} className="group px-5 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:border-orange-500 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:text-orange-400 transition-colors shadow-sm text-sm">
                  {refreshing ? <RefreshCw size={18} className="animate-spin text-orange-500" /> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />}
                  Refresh
                </button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 md:px-8 pb-6 md:pb-8">
            
            <MetricCard title="Total OPs Loaded" value={ops.length} icon={Package} color="orange" subtitle="From external API" />
            <MetricCard title="Pending Cut" value={totalPending} icon={Scissors} color="blue" subtitle="Ready to generate" />
            <MetricCard title="Sent to Pond" value={totalSent} icon={Database} color="emerald" subtitle="Total all batches" />
            
            {/* Overall Progress Card - Solid */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-blue-500 border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Progress</div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <Activity size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none">{overallProgress}%</div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          </div>
          <div className="px-6 md:px-8 pb-6">
            <TargetSummaryCard lineCode="K1YH" station="CUTTING_ENTAN" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left Column - OPs List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">Production Orders</h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Select OP to generate QR</p>
                </div>
                <div className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-black text-slate-700 dark:text-slate-200">
                  {ops.length} OPs
                </div>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
                {ops.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package size={28} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No pending OPs</p>
                  </div>
                ) : ops.map(op => (
                  <div 
                    key={op.id} 
                    className={`p-4 mb-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                      selOp?.id === op.id 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md ring-1 ring-orange-500' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-orange-400 hover:shadow-sm bg-white dark:bg-slate-800'
                    }`} 
                    onClick={() => selectOp(op)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-mono font-black text-lg leading-none mb-1 text-slate-900 dark:text-white">{op.opNumber}</div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[150px] uppercase tracking-wider">{op.itemNameFG}</div>
                      </div>
                      <StatusBadge status={`${op.pending} pcs`} variant="warning" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 dark:bg-slate-700/30 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Total</div>
                        <div className="font-black text-slate-700 dark:text-slate-300">{op.totalCut}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Sent</div>
                        <div className="font-black text-emerald-600 dark:text-emerald-400">{op.sentToPond}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Pend</div>
                        <div className="font-black text-orange-600 dark:text-orange-400">{op.pending}</div>
                      </div>
                    </div>

                    {op.pending > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openReconcile(op); }}
                        title="Tandai semua hasil cut sudah terkirim ke Pond (pending -> 0). Pakai bila Pond sudah full supply."
                        className="mt-3 w-full py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={13} /> Tandai Terkirim (Reconcile)
                      </button>
                    )}

                    {op.lastBatch && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Last: <span className="text-slate-600 dark:text-slate-300">#{op.lastBatch.batchNumber}</span>
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); viewHistory(op); }} 
                          className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 uppercase tracking-wider text-[10px]"
                        >
                          <History size={12} /> 
                          History
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Detail & Generator */}
          <div className="lg:col-span-2">
            {selOp ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-orange-500 shadow-lg overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                      <ClipboardCheck size={28} className="text-white" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Selected OP</div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-none">{selOp.opNumber}</h2>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1.5 max-w-[350px] truncate">{selOp.itemNameFG}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 md:p-8 flex-1 flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                    <MetricCard title="Target OP" value={selOp.qtyOp} icon={Package} color="orange" suffix="pcs" />
                    <MetricCard title="Total Cut" value={selOp.totalCut} icon={Scissors} color="blue" suffix="pcs" />
                    <MetricCard title="Pending Cut" value={selOp.pending} icon={Target} color="emerald" suffix="pcs" />
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-5 mb-8 flex-1">
                    <div className="flex gap-4">
                      <div className="shrink-0">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/30">
                          <AlertTriangle size={24} className="text-white" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-black text-blue-900 dark:text-blue-100 text-lg mb-1">Batch Information</h4>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 leading-relaxed">
                          This OP has <strong className="font-black text-blue-900 dark:text-white bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded">{selOp.pending} pieces</strong> currently pending.
                          <br className="my-2" />
                          {selOp.lastBatch ? (
                            <span className="block mt-2 text-blue-700 dark:text-blue-400 bg-white/50 dark:bg-slate-900/30 p-2 rounded-lg border border-blue-100 dark:border-blue-800/50">
                              Last batch generated was <strong className="font-black text-blue-900 dark:text-blue-200">#{selOp.lastBatch.batchNumber}</strong> ({selOp.lastBatch.qty} pcs) on <span className="font-semibold">{new Date(selOp.lastBatch.createdAt).toLocaleString()}</span>.
                            </span>
                          ) : (
                            <span className="block mt-2 opacity-80 font-semibold">No previous batches generated.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <button 
                      onClick={generateQR} 
                      disabled={loading || (selOp.pending === 0 && !selOp.batchCount)} 
                      className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xl flex justify-center items-center gap-3 shadow-xl shadow-orange-600/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all hover:-translate-y-1 active:translate-y-0"
                    >
                      {loading ? <Loader2 className="animate-spin" size={24} /> : (
                        <>
                          <Printer size={24} />
                          {selOp.pending > 0
                            ? `Generate QR for ${selOp.pending} pieces`
                            : 'Lanjutkan Dispatch Pola'}
                          <ArrowRight size={22} className="ml-2" />
                        </>
                      )}
                    </button>
                    
                    {selOp.lastBatch && (
                      <div className="mt-5 text-center">
                        <button 
                          onClick={() => viewHistory(selOp)} 
                          className="text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 font-bold text-sm flex items-center gap-2 mx-auto transition-colors uppercase tracking-wider"
                        >
                          <History size={16} /> 
                          View Batch History for this OP
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 shadow-sm">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Scissors size={40} className="text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Select an OP</h3>
                <p className="text-base font-medium text-slate-500 dark:text-slate-400 text-center max-w-md mx-auto leading-relaxed">
                  Choose a Production Order from the queue on the left to review its status and generate QR codes.
                </p>
                <div className="mt-8 flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-5 py-2.5 rounded-full uppercase tracking-wider">
                  <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full animate-pulse"></div>
                  Waiting for selection...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};