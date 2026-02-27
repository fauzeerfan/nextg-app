import { useState, useEffect, useCallback } from 'react';
import { Scissors, Printer, CheckCircle, Loader2, RefreshCw, Package, ClipboardCheck, ArrowRight, Database, Target, AlertTriangle, History, X } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface ReadyOp {
  id: string; opNumber: string; styleCode: string; itemNumberFG: string; itemNameFG: string;
  qtyOp: number; totalCut: number; sentToPond: number; pending: number;
  lastBatch: { id: string; batchNumber: number; qty: number; qrCode: string; createdAt: string; } | null;
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
  icon: any; // Bisa diganti dengan tipe LucideIcon jika perlu
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
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-10 h-10 bg-gradient-to-br ${currentColor.bg} dark:${currentColor.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={18} className={currentColor.icon} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">
        {value}{suffix && <span className="text-lg text-slate-500 dark:text-slate-400 ml-2">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

export const CuttingEntanView = ({ addLog }: { addLog: (msg: string, type?: 'info' | 'error' | 'success') => void }) => {
  const [ops, setOps] = useState<ReadyOp[]>([]);
  const [selOp, setSelOp] = useState<ReadyOp | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [qr, setQr] = useState<{ code: string; op: string; info: string } | null>(null);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [all, setAll] = useState<any[]>([]);
  const [totalSent, setTotalSent] = useState(0);

  const fetchOps = useCallback(async (skipSync = false) => {
    setRefreshing(true);
    try {
      if (!skipSync) await fetch(`${API_BASE_URL}/production-orders/sync`, { method: 'POST' });
      const res = await fetch(`${API_BASE_URL}/cutting-entan/ops`);
      if (res.ok) setOps(await res.json());
      else addLog('Failed to fetch cutting entan queue', 'error');
    } catch { addLog('Network error fetching OPs', 'error'); } finally { setRefreshing(false); }
  }, [addLog]);

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

  const viewAll = async () => { await fetchAll(); setShowAll(true); };

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
        setQr({ code: r.qr, op: r.opNumber, info: `Success! Batch ${r.batchNumber} of ${r.qty} pieces.<br/>Total sent to Pond: ${selOp.sentToPond + r.qty}` });
        await fetchOps(true); await fetchTotal(); setSelOp(null);
      } else { const err = await res.json(); alert(`Error: ${err.message || 'Failed to generate QR'}`); }
    } catch { alert('Network error'); } finally { setLoading(false); }
  };
  const handlePrint = () => window.print();
  const viewHistory = async (opNum: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/cutting-entan/history/${opNum}`);
      if (res.ok) { setHist(await res.json()); setShowHist(true); }
    } catch { alert('Failed to fetch history'); }
  };
  const reprint = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/cutting-entan/reprint/${id}`);
      if (res.ok) { const r = await res.json(); setQr({ code: r.qr, op: r.opNumber, info: `Reprint batch ${r.batchNumber} (${r.qty} pieces)` }); }
    } catch { alert('Failed to reprint'); }
  };

  const totalPending = ops.reduce((sum, op) => sum + op.pending, 0);

  const BatchModal = ({ show, onClose, title, data, cols }: any) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={20} /></button>
          </div>
          <div className="p-6 overflow-y-auto">
            <table className="w-full">
              <thead><tr className="text-left text-sm font-semibold text-slate-600 dark:text-slate-300">{cols.map((c: any) => <th key={c.key} className="pb-3">{c.label}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? <tr><td colSpan={cols.length} className="py-8 text-center text-slate-500">No batches found.</td></tr> :
                  data.map((item: any) => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700">{cols.map((c: any) => <td key={c.key} className="py-3">{c.render ? c.render(item) : item[c.key]}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300">
      {qr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="absolute top-6 right-6"><div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-xl flex items-center justify-center"><CheckCircle size={24} className="text-white" /></div></div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">QR Generated!</h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                {qr.info.split('<br/>').map((line, i) => <div key={i} dangerouslySetInnerHTML={{ __html: line }} />)}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 mb-8">
              <div className="flex justify-center mb-4"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qr.code}`} alt="QR Code" className="w-48 h-48 border-4 border-white dark:border-slate-800 rounded-xl" /></div>
              <div className="text-center font-mono text-sm text-slate-600 dark:text-slate-300 break-all">{qr.code}</div>
            </div>
            <div className="flex gap-3 print:hidden">
              <button onClick={() => setQr(null)} className="flex-1 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Close</button>
              <button onClick={handlePrint} className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-semibold flex justify-center items-center gap-3"><Printer size={18} /> Print</button>
            </div>
          </div>
        </div>
      )}

      <BatchModal show={showHist} onClose={() => setShowHist(false)} title="Batch History" data={hist} cols={[
        { key: 'batchNumber', label: 'Batch', render: (i:any) => `#${i.batchNumber}` },
        { key: 'qty', label: 'Qty' },
        { key: 'createdAt', label: 'Date', render: (i:any) => new Date(i.createdAt).toLocaleString() },
        { key: 'action', label: 'Action', render: (i:any) => <button onClick={() => reprint(i.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Reprint</button> }
      ]} />
      <BatchModal show={showAll} onClose={() => setShowAll(false)} title="All Batch History" data={all} cols={[
        { key: 'opNumber', label: 'OP Number' },
        { key: 'batchNumber', label: 'Batch', render: (i:any) => `#${i.batchNumber}` },
        { key: 'qty', label: 'Qty' },
        { key: 'createdAt', label: 'Date', render: (i:any) => new Date(i.createdAt).toLocaleString() },
        { key: 'action', label: 'Action', render: (i:any) => <button onClick={() => { setShowAll(false); reprint(i.id); }} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Reprint</button> }
      ]} />

      <div className="bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-900 dark:to-orange-900/10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg"><Scissors size={28} className="text-white" /></div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg"><Database size={16} className="text-white" /></div>
              </div>
              <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">Cutting Entan<span className="text-xs px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-full font-bold">BATCH SYSTEM</span></h1></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg">
                <div className="flex flex-col"><div className="text-xs font-medium opacity-90">Pending Cut</div><div className="text-2xl font-bold">{totalPending}</div></div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"><Package size={20} className="text-white" /></div>
              </div>
              <button onClick={viewAll} className="px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-purple-600 transition-all shadow-sm hover:shadow-md"><History size={18} />Batch History</button>
              <button onClick={() => fetchOps(false)} disabled={refreshing} className="group px-5 py-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-orange-300 dark:hover:border-orange-700">
                {refreshing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform" />}Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 pb-8">
          <MetricCard title="Total OPs Loaded" value={ops.length} icon={Package} color="orange" subtitle="From external API" />
          <MetricCard title="Pending Cut" value={totalPending} icon={Scissors} color="blue" subtitle="Ready to generate" />
          <MetricCard title="Sent to Pond" value={totalSent} icon={Database} color="emerald" subtitle="Total all batches" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50"><h3 className="font-bold text-slate-900 dark:text-white">Production Orders</h3><p className="text-sm text-slate-500 dark:text-slate-400">Select an OP to generate QR</p></div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
              {ops.length === 0 ? (
                <div className="text-center py-8"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package size={24} className="text-slate-400" /></div><p className="text-slate-500 dark:text-slate-400">No pending OPs</p></div>
              ) : ops.map(op => (
                <div key={op.id} className={`p-4 mb-2 rounded-xl border-2 cursor-pointer transition-all ${selOp?.id === op.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'}`} onClick={() => selectOp(op)}>
                  <div className="flex justify-between items-start">
                    <div><div className="font-mono font-bold text-lg">{op.opNumber}</div><div className="text-sm text-slate-600 dark:text-slate-400">{op.itemNameFG}</div></div>
                    <StatusBadge status={`${op.pending} pcs`} variant="warning" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div><div className="text-slate-500">Total Cut</div><div className="font-bold">{op.totalCut}</div></div>
                    <div><div className="text-slate-500">Sent</div><div className="font-bold">{op.sentToPond}</div></div>
                    <div><div className="text-slate-500">Pending</div><div className="font-bold text-orange-600">{op.pending}</div></div>
                  </div>
                  {op.lastBatch && <div className="mt-2 flex justify-between items-center text-xs"><span className="text-slate-400">Last batch: #{op.lastBatch.batchNumber}</span><button onClick={(e) => { e.stopPropagation(); viewHistory(op.opNumber); }} className="text-blue-600 hover:underline flex items-center gap-1"><History size={12} /> History</button></div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selOp ? (
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-4"><div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg"><ClipboardCheck size={28} className="text-white" /></div><div><h2 className="text-2xl font-bold">{selOp.opNumber}</h2><p className="text-lg text-slate-600 dark:text-slate-300">{selOp.itemNameFG}</p></div></div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <MetricCard title="OP Quantity" value={selOp.qtyOp} icon={Package} color="orange" suffix="sets" />
                  <MetricCard title="Total Cut" value={selOp.totalCut} icon={Scissors} color="blue" suffix="pcs" />
                  <MetricCard title="Pending" value={selOp.pending} icon={Target} color="emerald" suffix="pcs" />
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-200 dark:border-blue-800/30 p-6 mb-6">
                  <div className="flex gap-4">
                    <div className="shrink-0"><div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-400 rounded-xl flex items-center justify-center"><AlertTriangle size={24} className="text-white" /></div></div>
                    <div><h4 className="font-semibold mb-2">Batch Information</h4><p className="text-sm">This OP has <strong>{selOp.pending} pieces</strong> pending cutting.{selOp.lastBatch ? ` Last batch #${selOp.lastBatch.batchNumber} (${selOp.lastBatch.qty} pcs) was generated on ${new Date(selOp.lastBatch.createdAt).toLocaleString()}.` : ' No previous batches.'}</p></div>
                  </div>
                </div>
                <button onClick={generateQR} disabled={loading || selOp.pending === 0} className="w-full py-5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-2xl font-bold text-lg flex justify-center items-center gap-3 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <Loader2 className="animate-spin" size={24} /> : <><Printer size={24} />Generate QR for {selOp.pending} pieces<ArrowRight size={20} /></>}
                </button>
                {selOp.lastBatch && <div className="mt-4 text-center"><button onClick={() => viewHistory(selOp.opNumber)} className="text-blue-600 hover:underline text-sm flex items-center gap-1 mx-auto"><History size={16} /> View all batches</button></div>}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-12">
              <div className="text-center"><div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6"><Scissors size={32} className="text-slate-400" /></div><h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Select an OP</h3><p className="text-slate-500 dark:text-slate-400">Choose an OP from the list to generate QR code</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};