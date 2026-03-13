import { useState, useEffect, useCallback } from 'react';
import {
  Scissors, Printer, CheckCircle, Loader2, RefreshCw, Package,
  ClipboardCheck, ArrowRight, Database, Target, AlertTriangle, History, X,
  Activity
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

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
  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
    variant === 'info' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
    variant === 'success' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' :
    variant === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' :
    'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
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

const MetricCard = ({ title, value, icon: Icon, color = 'blue', subtitle, suffix }: MetricCardProps) => {
  const colorClasses = {
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/20 to-blue-900/10' },
    orange: { bg: 'from-orange-100 to-orange-50', icon: 'text-orange-600', darkBg: 'from-orange-900/20 to-orange-900/10' },
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    purple: { bg: 'from-purple-100 to-purple-50', icon: 'text-purple-600', darkBg: 'from-purple-900/20 to-purple-900/10' }
  };
  const currentColor = colorClasses[color];
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-8 h-8 bg-gradient-to-br ${currentColor.bg} dark:${currentColor.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className={currentColor.icon} />
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
        {value}{suffix && <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>}
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

  const fetchOps = useCallback(async (skipSync = false) => {
    setRefreshing(true);
    try {
      if (!skipSync) await fetch(`${API_BASE_URL}/production-orders/sync`, { method: 'POST' });
      const res = await fetch(`${API_BASE_URL}/cutting-entan/ops`);
      if (res.ok) {
        const data = await res.json();
        setOps(data);
        updateOpCache(data); // Simpan ingatan saat antrean di-load
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

  const viewAll = async () => { 
    await fetchAll(); 
    setShowAll(true); 
  };

  useEffect(() => {
    fetchOps(); fetchTotal();
    const i = setInterval(() => { fetchOps(true); fetchTotal(); }, 10000);
    return () => clearInterval(i);
  }, [fetchOps, fetchTotal]);

  const selectOp = (op: ReadyOp) => setSelOp(op);

  const generateQR = async () => {
    if (!selOp) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cutting-entan/generate/${selOp.opNumber}`, { method: 'POST' });
      if (res.ok) {
        const r = await res.json();
        
        // Simpan ingatan OP ini sebelum menghilang
        updateOpCache([selOp]);

        setQr({
          code: r.qr,
          opNumber: r.opNumber,
          itemNumberFG: selOp.itemNumberFG,
          itemNameFG: selOp.itemNameFG,
          qtyOp: selOp.qtyOp,
          batchQty: r.qty,
          batchNumber: r.batchNumber,
          createdAt: new Date().toISOString()
        });
        await fetchOps(true);
        await fetchTotal();
        setSelOp(null);
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'Failed to generate QR'}`);
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

  const reprint = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/cutting-entan/reprint/${id}`);
      if (res.ok) {
        const r = await res.json();
        
        // 1. Ambil data batch
        const batch = all.find(b => b.id === id) || hist.find(b => b.id === id);
        const opNum = batch?.opNumber || r?.opNumber;
        
        // 2. Ambil ingatan dari LocalStorage (CACHE SAKTI)
        const cache = JSON.parse(localStorage.getItem('cutting_op_cache') || '{}');
        const cachedOp = cache[opNum] || {};

        // 3. Gabungkan semua sumber data (Prioritaskan Cache > Database langsung)
        const finalItemNumberFG = cachedOp.itemNumberFG || batch?.productionOrder?.itemNumberFG || r?.itemNumberFG || batch?.itemNumberFG || '-';
        const finalItemNameFG = cachedOp.itemNameFG || batch?.productionOrder?.itemNameFG || r?.itemNameFG || batch?.itemNameFG || '-';
        const finalQtyOp = cachedOp.qtyOp || batch?.productionOrder?.qty || r?.qtyOp || batch?.qtyOp || 0;

        setQr({
          code: r.qr,
          opNumber: opNum || '-',
          itemNumberFG: finalItemNumberFG,
          itemNameFG: finalItemNameFG,
          qtyOp: finalQtyOp,
          batchQty: r.qty || batch?.qty || 0,
          batchNumber: r.batchNumber || batch?.batchNumber || 0,
          createdAt: batch?.createdAt || r?.createdAt || new Date().toISOString()
        });
      }
    } catch { alert('Failed to reprint'); }
  };

  const totalPending = ops.reduce((sum, op) => sum + op.pending, 0);
  const totalTarget = totalSent + totalPending;
  const overallProgress = totalTarget > 0 ? Math.round((totalSent / totalTarget) * 100) : 0;

  const BatchModal = ({ show, onClose, title, data, cols }: any) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} /></button>
          </div>
          <div className="p-4 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left font-semibold text-slate-600 dark:text-slate-300">{cols.map((c: any) => <th key={c.key} className="pb-2">{c.label}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? <tr><td colSpan={cols.length} className="py-8 text-center text-slate-500">No batches found.</td></tr> :
                  data.map((item: any) => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700">{cols.map((c: any) => <td key={c.key} className="py-2">{c.render ? c.render(item) : item[c.key]}</td>)}</tr>)}
              </tbody>
            </table>
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

  return (
    <div className="animate-in fade-in duration-300">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap');
        
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
                    <div>{qr.qtyOp} PCS</div>
                    <div>{formatDate(qr.createdAt ? new Date(qr.createdAt) : new Date())}</div>
                  </div>
                </div>
                <div className="mt-1.5 font-semibold text-[11pt] text-left uppercase leading-none tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-[7.5cm]">
                  {qr.itemNameFG}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. VERSI LAYAR MODAL */}
          {/* ========================================================= */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
              
              <div className="absolute top-4 right-4">
                <CheckCircle size={20} className="text-emerald-500" />
              </div>

              <div
                className="label-container mx-auto border border-dashed border-slate-300 dark:border-slate-700 p-4 rounded bg-white"
                style={{ width: '100%', maxWidth: '340px' }}
              >
                <div className="w-full bg-white text-black" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  <div className="flex flex-col justify-center items-center">
                    <div className="flex flex-col">
                      <div className="flex flex-row items-center gap-2">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qr.code}`}
                          alt="QR Code"
                          className="w-16 h-16 object-contain shrink-0"
                        />
                        <div className="flex flex-col justify-center text-left font-semibold text-sm leading-tight tracking-wide">
                          <div>{qr.itemNumberFG}</div>
                          <div>{qr.opNumber}</div>
                          <div>{qr.qtyOp} PCS</div>
                          <div>{formatDate(qr.createdAt ? new Date(qr.createdAt) : new Date())}</div>
                        </div>
                      </div>
                      <div className="mt-2 font-semibold text-base text-left uppercase leading-none tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                        {qr.itemNameFG}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setQr(null)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-semibold flex justify-center items-center gap-2 text-sm"
                >
                  <Printer size={16} />
                  Print Label
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 3. APLIKASI UTAMA BACKGROUND */}
      {/* ========================================================= */}
      <div className="print:hidden">
        <BatchModal show={showHist} onClose={() => setShowHist(false)} title="Batch History" data={hist} cols={[
          { key: 'batchNumber', label: 'Batch', render: (i:any) => `#${i.batchNumber}` },
          { key: 'qty', label: 'Qty' },
          { key: 'createdAt', label: 'Date', render: (i:any) => new Date(i.createdAt).toLocaleString() },
          { key: 'action', label: 'Action', render: (i:any) => <button onClick={() => { setShowHist(false); reprint(i.id); }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Reprint</button> }
        ]} />
        <BatchModal show={showAll} onClose={() => setShowAll(false)} title="All Batch History" data={all} cols={[
          { key: 'opNumber', label: 'OP Number' },
          { key: 'batchNumber', label: 'Batch', render: (i:any) => `#${i.batchNumber}` },
          { key: 'qty', label: 'Qty' },
          { key: 'createdAt', label: 'Date', render: (i:any) => new Date(i.createdAt).toLocaleString() },
          { key: 'action', label: 'Action', render: (i:any) => <button onClick={() => { setShowAll(false); reprint(i.id); }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Reprint</button> }
        ]} />

        <div className="bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-900 dark:to-orange-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-6">
          <div className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg"><Scissors size={24} className="text-white" /></div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg"><Database size={14} className="text-white" /></div>
                </div>
                <div><h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">Cutting Entan<span className="text-xs px-2 py-1 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-full font-bold">BATCH SYSTEM</span></h1></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg">
                  <div className="flex flex-col"><div className="text-xs font-medium opacity-90">Pending Cut</div><div className="text-xl font-bold">{totalPending}</div></div>
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"><Package size={18} className="text-white" /></div>
                </div>
                <button onClick={viewAll} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-purple-600 transition-all shadow-sm text-sm"><History size={16} />Batch History</button>
                <button onClick={() => fetchOps(false)} disabled={refreshing} className="group px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-orange-300 dark:hover:border-orange-700 text-sm">
                  {refreshing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform" />}Refresh
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-6">
            <MetricCard title="Total OPs Loaded" value={ops.length} icon={Package} color="orange" subtitle="From external API" />
            <MetricCard title="Pending Cut" value={totalPending} icon={Scissors} color="blue" subtitle="Ready to generate" />
            <MetricCard title="Sent to Pond" value={totalSent} icon={Database} color="emerald" subtitle="Total all batches" />
            {/* Overall Progress Card */}
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Overall Progress</div>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg flex items-center justify-center">
                  <Activity size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{overallProgress}%</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700/50"><h3 className="font-bold text-slate-900 dark:text-white">Production Orders</h3><p className="text-xs text-slate-500 dark:text-slate-400">Select an OP to generate QR</p></div>
              <div className="p-3 max-h-[450px] overflow-y-auto">
                {ops.length === 0 ? (
                  <div className="text-center py-6"><div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3"><Package size={20} className="text-slate-400" /></div><p className="text-sm text-slate-500 dark:text-slate-400">No pending OPs</p></div>
                ) : ops.map(op => (
                  <div key={op.id} className={`p-3 mb-2 rounded-xl border-2 cursor-pointer transition-all ${selOp?.id === op.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'}`} onClick={() => selectOp(op)}>
                    <div className="flex justify-between items-start">
                      <div><div className="font-mono font-bold text-base">{op.opNumber}</div><div className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{op.itemNameFG}</div></div>
                      <StatusBadge status={`${op.pending} pcs`} variant="warning" />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs">
                      <div><div className="text-slate-500">Total Cut</div><div className="font-bold">{op.totalCut}</div></div>
                      <div><div className="text-slate-500">Sent</div><div className="font-bold">{op.sentToPond}</div></div>
                      <div><div className="text-slate-500">Pending</div><div className="font-bold text-orange-600">{op.pending}</div></div>
                    </div>
                    {op.lastBatch && <div className="mt-2 flex justify-between items-center text-xs"><span className="text-slate-400">Last: #{op.lastBatch.batchNumber}</span><button onClick={(e) => { e.stopPropagation(); viewHistory(op); }} className="text-blue-600 hover:underline flex items-center gap-1"><History size={10} /> History</button></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selOp ? (
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-3"><div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg"><ClipboardCheck size={22} className="text-white" /></div><div><h2 className="text-xl font-bold">{selOp.opNumber}</h2><p className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[250px]">{selOp.itemNameFG}</p></div></div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <MetricCard title="OP Quantity" value={selOp.qtyOp} icon={Package} color="orange" suffix="sets" />
                    <MetricCard title="Total Cut" value={selOp.totalCut} icon={Scissors} color="blue" suffix="pcs" />
                    <MetricCard title="Pending" value={selOp.pending} icon={Target} color="emerald" suffix="pcs" />
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30 p-4 mb-4">
                    <div className="flex gap-3">
                      <div className="shrink-0"><div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-400 rounded-lg flex items-center justify-center"><AlertTriangle size={18} className="text-white" /></div></div>
                      <div><h4 className="font-semibold text-sm mb-1">Batch Information</h4><p className="text-xs">This OP has <strong>{selOp.pending} pieces</strong> pending cutting.{selOp.lastBatch ? ` Last batch #${selOp.lastBatch.batchNumber} (${selOp.lastBatch.qty} pcs) was generated on ${new Date(selOp.lastBatch.createdAt).toLocaleString()}.` : ' No previous batches.'}</p></div>
                    </div>
                  </div>
                  <button onClick={generateQR} disabled={loading || selOp.pending === 0} className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl font-bold text-base flex justify-center items-center gap-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><Printer size={20} />Generate QR for {selOp.pending} pieces<ArrowRight size={18} /></>}
                  </button>
                  {selOp.lastBatch && <div className="mt-3 text-center"><button onClick={() => viewHistory(selOp)} className="text-blue-600 hover:underline text-xs flex items-center gap-1 mx-auto"><History size={14} /> View all batches</button></div>}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8">
                <div className="text-center"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4"><Scissors size={24} className="text-slate-400" /></div><h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Select an OP</h3><p className="text-sm text-slate-500 dark:text-slate-400">Choose an OP from the list to generate QR code</p></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};