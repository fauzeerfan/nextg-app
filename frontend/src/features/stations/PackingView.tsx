import { useState, useEffect, useCallback } from 'react';
import { Package, Box, PackageOpen, RefreshCw, Search, TrendingUp, Users, Clock, Truck, CheckSquare } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

interface PackingBox {
  id: string; boxNumber: string; itemNumberFG: string; styleCode: string; qty: number;
  opsIncluded: Array<{ opNumber: string, qty: number }>; packedAt: string; packedBy: string; qrCode: string;
}

// Local extension to ProductionOrder to include packedQty (from API)
interface ProductionOrderWithPacked extends ProductionOrder {
  packedQty?: number;
}

interface MetricCardProps { title: string; value: number | string; icon: any; color?: 'indigo' | 'emerald' | 'amber' | 'blue'; subtitle?: string; suffix?: string; }

const MetricCard = ({ title, value, icon: Icon, color = 'indigo', subtitle, suffix }: MetricCardProps) => {
  const c = {
    indigo: { bg: 'from-indigo-100 to-indigo-50', icon: 'text-indigo-600', darkBg: 'from-indigo-900/20 to-indigo-900/10' },
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    amber: { bg: 'from-amber-100 to-amber-50', icon: 'text-amber-600', darkBg: 'from-amber-900/20 to-amber-900/10' },
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

export const PackingView = () => {
  const [ops, setOps] = useState<ProductionOrderWithPacked[]>([]);
  const [sel, setSel] = useState<ProductionOrderWithPacked[]>([]);
  const [boxes, setBoxes] = useState<PackingBox[]>([]);
  const [qty, setQty] = useState(0);
  const [creating, setCreating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [search, setSearch] = useState('');
  const [ref, setRef] = useState(false);
  const [upd, setUpd] = useState('');

  const boxToday = 0; const pcsToday = 0; const eff = 0; const avgTime = 0; const operators = 0;

  const fetchOps = useCallback(async () => {
    setRef(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=PACKING`);
      if (res.ok) {
        setOps(await res.json());
        setUpd(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch { console.error('Failed to fetch packing OPs:'); } finally { setRef(false); }
  }, []);

  const fetchBoxes = useCallback(async () => setBoxes([]), []);

  useEffect(() => { fetchOps(); fetchBoxes(); const i = setInterval(fetchOps, 10000); return () => clearInterval(i); }, [fetchOps, fetchBoxes]);

  const toggleOp = (op: ProductionOrderWithPacked) => setSel(p => p.some(o => o.id === op.id) ? p.filter(o => o.id !== op.id) : [...p, op]);

  const addQty = (n: number) => { const v = qty + n; if (v <= 100) setQty(v); else alert('Cannot exceed 100 pieces per box'); };
  const removeQty = (n: number) => setQty(Math.max(0, qty - n));

  const createBox = () => {
    if (sel.length === 0) return alert('Please select at least one OP');
    if (qty !== 100) return alert('Box must contain exactly 100 pieces');
    setCreating(true);
    setTimeout(() => {
      const newBox: PackingBox = {
        id: Date.now().toString(),
        boxNumber: `BOX-${String(boxes.length + 1).padStart(3, '0')}`,
        itemNumberFG: 'N/A',
        styleCode: sel[0].styleCode,
        qty,
        opsIncluded: sel.map(op => ({ opNumber: op.opNumber, qty: Math.floor(qty / sel.length) })),
        packedAt: new Date().toISOString(),
        packedBy: 'Current User',
        qrCode: `BOX-${String(boxes.length + 1).padStart(3, '0')}-QR`
      };
      setBoxes([newBox, ...boxes]);
      setSel([]); setQty(0); setCreating(false);
      alert(`Box ${newBox.boxNumber} created successfully!`);
    }, 1000);
  };

  const printLabel = (box: PackingBox) => {
    setPrinting(true);
    setTimeout(() => { setPrinting(false); alert(`Printing label for ${box.boxNumber}`); }, 1500);
  };

  const filtered = ops.filter(op => op.opNumber.toLowerCase().includes(search.toLowerCase()) || op.styleCode.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-900/10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Package size={28} className="text-white"/></div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg"><Truck size={16} className="text-white"/></div>
              </div>
              <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">Packing<span className="text-xs px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full font-bold">FINAL PACKING</span></h1></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl shadow-lg">
                <div className="flex flex-col"><div className="text-xs font-medium opacity-90">Boxes Today</div><div className="text-2xl font-bold">{boxToday}</div></div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"><Box size={20} className="text-white"/></div>
              </div>
              <button onClick={fetchOps} disabled={ref} className="group px-5 py-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md">
                {ref ? <RefreshCw size={18} className="animate-spin"/> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500"/>}Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 pb-8">
          <MetricCard title="Boxes Created" value={boxToday} icon={Box} color="blue" suffix="boxes" subtitle={`${pcsToday} pieces total`} />
          <MetricCard title="Packing Efficiency" value={`${eff}%`} icon={TrendingUp} color="emerald" subtitle="Target: 95%" />
          <MetricCard title="Avg Time/Box" value={avgTime} icon={Clock} color="amber" suffix="min" subtitle="Target: 10 min" />
          <MetricCard title="Active Operators" value={operators} icon={Users} color="indigo" subtitle="Currently packing" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN - AVAILABLE OPS */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-900/10 rounded-xl flex items-center justify-center"><PackageOpen size={20} className="text-indigo-600 dark:text-indigo-400"/></div><div><h3 className="font-bold text-slate-900 dark:text-white">Available for Packing</h3><p className="text-sm text-slate-500 dark:text-slate-400">Select OPs to include in the current box</p></div></div>
                <div className="flex items-center gap-3">
                  <div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2"><Search size={18} className="text-slate-400"/></div><input type="text" placeholder="Search OP number or style..." className="pl-10 pr-4 py-2.5 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all" value={search} onChange={e => setSearch(e.target.value)}/></div>
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{ops.length} Available</span></div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {filtered.length === 0 ? (
                <div className="text-center py-12"><div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4"><PackageOpen size={32} className="text-slate-400"/></div><h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No OPs Available</h4><p className="text-slate-500 dark:text-slate-400">All production orders have been packed</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filtered.map(op => {
                    const isSel = sel.some(o => o.id === op.id);
                    // Use cpGoodQty (from Check Panel) as available quantity for packing
                    const avail = op.cpGoodQty || 0;
                    // Use packedQty (from API) if available, else default to 0
                    const packed = op.packedQty || 0;
                    const bal = avail - packed;
                    return (
                      <div key={op.id} className={`group p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer hover:-translate-y-1 ${isSel ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 shadow-lg' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg'}`} onClick={() => toggleOp(op)}>
                        <div className="flex items-start justify-between mb-4">
                          <div><div className="font-mono font-bold text-xl text-slate-900 dark:text-white">{op.opNumber}</div><div className="text-sm text-slate-600 dark:text-slate-300">Style: {op.styleCode}</div></div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSel ? 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700'}`}>{isSel ? <CheckSquare size={16} className="text-white"/> : ''}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center"><div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Available</div><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avail}</div></div>
                          <div className="text-center"><div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Packed</div><div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{packed}</div></div>
                          <div className="text-center"><div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Balance</div><div className={`text-2xl font-bold ${bal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{bal}</div></div>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-1000" style={{ width: `${(packed / avail) * 100 || 0}%` }}></div></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};