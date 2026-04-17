import { useState, useEffect, useCallback } from 'react';
import { TargetSummaryCard } from '../../components/ui/TargetSummaryCard';
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

  return (
    <div className="font-poppins text-slate-800 dark:text-slate-100 min-h-screen animate-in fade-in duration-300">
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
                    <div>{qr.qtyOp} PCS</div>
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
                          <div>{qr.qtyOp} PCS</div>
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
                <button onClick={() => fetchOps(false)} disabled={refreshing} className="group px-5 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:border-orange-500 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:text-orange-400 transition-colors shadow-sm text-sm">
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
                      disabled={loading || selOp.pending === 0} 
                      className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xl flex justify-center items-center gap-3 shadow-xl shadow-orange-600/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all hover:-translate-y-1 active:translate-y-0"
                    >
                      {loading ? <Loader2 className="animate-spin" size={24} /> : (
                        <>
                          <Printer size={24} />
                          Generate QR for {selOp.pending} pieces
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