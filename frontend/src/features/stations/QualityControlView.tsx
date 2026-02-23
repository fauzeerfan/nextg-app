import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw, ImageIcon, Search, Camera, Award, Shield, AlertTriangle, ClipboardCheck, ZoomIn, ThumbsUp, ThumbsDown, ChevronRight, AlertCircle, Layers, CheckSquare, Package, ShieldCheck, ArrowLeft } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

interface QCInspection {
  id: string; opNumber: string; styleCode: string; qcType: 'SET' | 'SAMPLING'; inspector: string;
  goodQty: number; ngQty: number; defectReasons: string[]; timestamp: string; images?: string[];
}

const defectOptions = [
  'Stitching Issue', 'Fabric Defect', 'Color Mismatch', 'Size Variation',
  'Pattern Misalignment', 'Accessory Missing', 'Packaging Issue',
  'Label Error', 'Odor Issue', 'Other'
];

interface MetricCardProps { title: string; value: number | string; icon: any; color?: 'amber' | 'emerald' | 'rose' | 'blue'; subtitle?: string; suffix?: string; }

const MetricCard = ({ title, value, icon: Icon, color = 'amber', subtitle, suffix }: MetricCardProps) => {
  const c = {
    amber: { bg: 'from-amber-100 to-amber-50', icon: 'text-amber-600', darkBg: 'from-amber-900/20 to-amber-900/10' },
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    rose: { bg: 'from-rose-100 to-rose-50', icon: 'text-rose-600', darkBg: 'from-rose-900/20 to-rose-900/10' },
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/20 to-blue-900/10' }
  }[color];
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-10 h-10 bg-gradient-to-br ${c.bg} dark:${c.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">
        {value}{suffix && <span className="text-lg text-slate-500 dark:text-slate-400 ml-2">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

export const QualityControlView = () => {
  const [ops, setOps] = useState<ProductionOrder[]>([]);
  const [sel, setSel] = useState<ProductionOrder | null>(null);
  const [ins, setIns] = useState<QCInspection[]>([]);
  const [type, setType] = useState<'SET' | 'SAMPLING'>('SET');
  const [dr, setDr] = useState<string[]>([]);
  const [ref, setRef] = useState(false);
  const [upd, setUpd] = useState('');
  const [stats] = useState({ todayInspected: 0, todayGood: 0, todayNG: 0, avgQualityRate: 0, pendingInspections: 0 });

  const fetchOps = useCallback(async () => {
    setRef(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=QC`);
      if (res.ok) {
        setOps(await res.json());
        setUpd(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch { console.error('Failed to fetch QC pending OPs:'); } finally { setRef(false); }
  }, []);

  const fetchIns = useCallback(async () => { setIns([]); }, []);

  useEffect(() => { fetchOps(); fetchIns(); const i = setInterval(fetchOps, 10000); return () => clearInterval(i); }, [fetchOps, fetchIns]);

  const selectOp = (op: ProductionOrder) => setSel(op);
  const toggleDefect = (r: string) => setDr(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);
  const approve = () => { alert(`Batch approved: ${sel?.cpGoodQty || 0} units`); setSel(null); setDr([]); };
  const reject = () => { alert(`Batch rejected with ${dr.length} issues`); setSel(null); setDr([]); };
  const back = () => { setSel(null); setDr([]); };

  return (
    <div className="animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-900/10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg"><ShieldCheck size={28} className="text-white"/></div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg"><CheckCircle size={16} className="text-white"/></div>
              </div>
              <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">Quality Control<span className="text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 text-white rounded-full font-bold">FINAL INSPECTION</span></h1></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl shadow-lg">
                <div className="flex flex-col"><div className="text-xs font-medium opacity-90">Pending</div><div className="text-2xl font-bold">{ops.length}</div></div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"><ClipboardCheck size={20} className="text-white"/></div>
              </div>
              <button onClick={fetchOps} disabled={ref} className="group px-5 py-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-300 shadow-sm hover:shadow-md">
                {ref ? <RefreshCw size={18} className="animate-spin"/> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500"/>}Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 pb-8">
          <MetricCard title="Today Inspected" value={stats.todayInspected} icon={Eye} color="blue" suffix="units" subtitle="Total inspected today" />
          <MetricCard title="Good Units" value={stats.todayGood} icon={ThumbsUp} color="emerald" suffix="units" subtitle="Approved today" />
          <MetricCard title="NG Units" value={stats.todayNG} icon={ThumbsDown} color="rose" suffix="units" subtitle="Rejected today" />
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3"><div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Quality Rate</div><div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-lg flex items-center justify-center"><Award size={18} className="text-amber-600 dark:text-amber-400"/></div></div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.avgQualityRate}%</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000" style={{ width: `${stats.avgQualityRate}%` }}></div></div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN - PENDING INSPECTIONS */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 rounded-xl flex items-center justify-center"><ClipboardCheck size={20} className="text-amber-600 dark:text-amber-400"/></div><div><h3 className="font-bold text-slate-900 dark:text-white">Pending Inspection</h3><p className="text-sm text-slate-500 dark:text-slate-400">Orders awaiting QC</p></div></div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{ops.length} Pending</span></div>
              </div>
            </div>
            <div className="p-4">
              {ops.length === 0 ? (
                <div className="text-center py-12"><div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-slate-400"/></div><h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">All Clear!</h4><p className="text-slate-500 dark:text-slate-400">No pending quality inspections</p></div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {ops.map(op => {
                    const isSel = sel?.id === op.id;
                    return (
                      <div key={op.id} className={`group p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${isSel ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 shadow-lg' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-lg'}`} onClick={() => selectOp(op)}>
                        <div className="flex items-start justify-between mb-2">
                          <div><div className="font-mono font-bold text-lg text-slate-900 dark:text-white">{op.opNumber}</div><div className="text-sm text-slate-600 dark:text-slate-400">Style: {op.styleCode}</div></div>
                          {isSel && <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full flex items-center justify-center"><ChevronRight size={12} className="text-white"/></div>}
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div><span className="text-xs font-medium text-amber-600 dark:text-amber-400">Ready for QC</span></div>
                          <div className="text-right"><div className="text-lg font-bold text-slate-900 dark:text-white">{op.cpGoodQty || 0}</div><div className="text-xs text-slate-500">units</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - INSPECTION INTERFACE */}
        <div className="lg:col-span-2">
          {sel ? (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <button onClick={back} className="group p-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-300" title="Back to queue"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-300 group-hover:text-amber-600"/></button>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg"><Shield size={28} className="text-white"/></div>
                        <div><div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Active Inspection</div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{sel.opNumber}</h2><p className="text-lg text-slate-600 dark:text-slate-300 font-medium">{sel.styleCode}</p></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6"><MetricCard title="Input Received" value={sel.cpGoodQty || 0} icon={Package} color="blue"/><MetricCard title="Defect Rate" value="0%" icon={AlertTriangle} color="rose"/></div>
                  </div>
                </div>

                {/* INSPECTION TYPE SELECTION */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 rounded-xl flex items-center justify-center"><Layers size={24} className="text-purple-600 dark:text-purple-400"/></div><div><h3 className="text-xl font-bold text-slate-900 dark:text-white">Select Inspection Method</h3><p className="text-sm text-slate-500 dark:text-slate-400">Choose inspection type based on requirements</p></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <button onClick={() => setType('SET')} className={`group p-6 rounded-2xl border-2 transition-all duration-300 ${type === 'SET' ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 shadow-lg' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'}`}>
                        <div className="flex items-center gap-4"><div className={`w-14 h-14 rounded-xl flex items-center justify-center ${type === 'SET' ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-slate-100 dark:bg-slate-800'}`}><Layers size={24} className={type === 'SET' ? 'text-white' : 'text-slate-400'}/></div><div className="text-left"><div className="font-bold text-lg text-slate-900 dark:text-white">Set Inspection</div><div className="text-sm text-slate-500 mt-2">Full unit inspection (100%) - Recommended for high-value orders</div></div></div>
                      </button>
                      <button onClick={() => setType('SAMPLING')} className={`group p-6 rounded-2xl border-2 transition-all duration-300 ${type === 'SAMPLING' ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 shadow-lg' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'}`}>
                        <div className="flex items-center gap-4"><div className={`w-14 h-14 rounded-xl flex items-center justify-center ${type === 'SAMPLING' ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-slate-100 dark:bg-slate-800'}`}><Search size={24} className={type === 'SAMPLING' ? 'text-white' : 'text-slate-400'}/></div><div className="text-left"><div className="font-bold text-lg text-slate-900 dark:text-white">Sampling Check</div><div className="text-sm text-slate-500 mt-2">Random sample check (AQL 2.5) - Standard procedure</div></div></div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* VISUAL REFERENCE */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3"><div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 rounded-xl flex items-center justify-center"><ImageIcon size={24} className="text-blue-600 dark:text-blue-400"/></div><div><h3 className="text-xl font-bold text-slate-900 dark:text-white">Visual Reference</h3><p className="text-sm text-slate-500 dark:text-slate-400">Compare against quality standards</p></div></div>
                    <button className="group flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl"><Camera size={18}/><span>Add Inspection Photos</span></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500/20 hover:border-emerald-500 transition-all duration-500 shadow-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-900">
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8"><div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-2xl flex items-center justify-center mb-6"><ThumbsUp size={32} className="text-white"/></div><div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">GOOD SAMPLE</div><div className="text-sm text-slate-500 mt-3">No reference image available</div><div className="absolute bottom-6 right-6"><ZoomIn size={20} className="text-slate-400"/></div></div>
                    </div>
                    <div className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-rose-500/20 hover:border-rose-500 transition-all duration-500 shadow-xl bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-slate-900">
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8"><div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-400 rounded-2xl flex items-center justify-center mb-6"><AlertTriangle size={32} className="text-white"/></div><div className="text-2xl font-bold text-rose-700 dark:text-rose-400">NG SAMPLE</div><div className="text-sm text-slate-500 mt-3">No reference image available</div><div className="absolute bottom-6 right-6"><ZoomIn size={20} className="text-slate-400"/></div></div>
                    </div>
                  </div>
                </div>

                {/* DEFECT REASONS */}
                <div className="p-8">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-900/10 rounded-xl flex items-center justify-center"><AlertCircle size={24} className="text-rose-600 dark:text-rose-400"/></div><div><h3 className="text-xl font-bold text-slate-900 dark:text-white">Defect Reasons</h3><p className="text-sm text-slate-500 dark:text-slate-400">Select defect reasons if NG found</p></div></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {defectOptions.map(r => {
                        const isSel = dr.includes(r);
                        return (
                          <button key={r} onClick={() => toggleDefect(r)} className={`group p-4 rounded-xl border-2 transition-all duration-300 text-left ${isSel ? 'border-rose-500 bg-gradient-to-r from-rose-50 to-white dark:from-rose-900/20 dark:to-slate-800 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800'}`}>
                            <div className="flex items-center justify-between"><span className={`text-sm font-medium ${isSel ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>{r}</span><div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSel ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'border-2 border-slate-300 dark:border-slate-600'}`}>{isSel && <CheckSquare size={14} className="text-white"/>}</div></div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-6 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <button onClick={approve} className="group flex-1 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-4 transition-all duration-300 shadow-lg hover:shadow-xl"><CheckCircle size={24}/><div className="text-center"><div className="text-xl">Approve Batch</div><div className="text-sm opacity-90">{sel.cpGoodQty || 0} units</div></div></button>
                    <button onClick={reject} className="group flex-1 py-5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white rounded-2xl font-bold flex items-center justify-center gap-4 transition-all duration-300 shadow-lg hover:shadow-xl"><XCircle size={24}/><div className="text-center"><div className="text-xl">Reject Batch</div>{dr.length > 0 && <div className="text-sm opacity-90">{dr.length} issues found</div>}</div></button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-2xl flex items-center justify-center mx-auto mb-6"><Eye size={40} className="text-amber-400"/></div>
              <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-3">Select an Order to Inspect</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-8 max-w-md mx-auto">Choose a production order from the pending list to begin quality inspection process</p>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div><span>Click on any order to start inspection</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};