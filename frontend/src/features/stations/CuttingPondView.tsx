import { useState, useEffect, useCallback } from 'react';
import { Activity, Wifi, RefreshCw, Scissors, Layers, Target, TrendingUp, Package, AlertCircle, CheckSquare, XSquare, CheckCircle } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

interface PatternProgress {
  index: number; name: string; target: number; good: number; ng: number; current: number; completed: boolean;
}

interface ProductionOrderWithLine extends ProductionOrder {
  line?: { patternMultiplier: number; code: string; name: string };
  qtyPondNg?: number; patterns?: PatternProgress[]; readyForCP?: boolean;
}

interface MetricCardProps {
  title: string; value: number | string; icon: any; color?: 'blue' | 'orange' | 'emerald' | 'purple' | 'rose'; subtitle?: string; suffix?: string;
}

// Modern Solid Metric Card
const MetricCard = ({ title, value, icon: Icon, color = 'blue', subtitle, suffix }: MetricCardProps) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-500', darkBg: 'dark:bg-blue-900/40', darkIcon: 'dark:text-blue-400' },
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-500', darkBg: 'dark:bg-orange-900/40', darkIcon: 'dark:text-orange-400' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-500', darkBg: 'dark:bg-emerald-900/40', darkIcon: 'dark:text-emerald-400' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-500', darkBg: 'dark:bg-purple-900/40', darkIcon: 'dark:text-purple-400' },
    rose: { bg: 'bg-rose-100', icon: 'text-rose-600', border: 'border-rose-500', darkBg: 'dark:bg-rose-900/40', darkIcon: 'dark:text-rose-400' }
  };
  const cur = colorClasses[color];
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${cur.border} border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-9 h-9 ${cur.bg} ${cur.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={`${cur.icon} ${cur.darkIcon}`} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
        {value}{suffix && <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>}
      </div>
      {subtitle && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

const PatternMiniCard = ({ pattern }: { pattern: PatternProgress }) => {
  const progress = (pattern.current / pattern.target) * 100;
  const remaining = pattern.target - pattern.current;
  return (
    <div className={`p-2.5 rounded-xl border-2 ${pattern.completed ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'} transition-colors`}>
      <div className="flex justify-between items-start mb-1.5">
        <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate max-w-[75px] uppercase tracking-wide">{pattern.name}</span>
        <div className="flex items-center gap-1.5 text-[10px] font-bold">
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-100 dark:bg-emerald-900/40 px-1 py-0.5 rounded"><CheckSquare size={10} />{pattern.good}</span>
          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5 bg-rose-100 dark:bg-rose-900/40 px-1 py-0.5 rounded"><XSquare size={10} />{pattern.ng}</span>
        </div>
      </div>
      <div className="relative w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
        <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${pattern.completed ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <span>Rem: {remaining}</span><span className={pattern.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}>{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

const JobCard = ({ op, lastUpdated }: { op: ProductionOrderWithLine; lastUpdated: string }) => {
  // ✅ Cek apakah OP sudah selesai di Pond tapi belum transfer
  const isReadyForTransfer = op.allPatternsCompleted && op.readyForCP;
  
  if (isReadyForTransfer) {
    return (
      <div className="group relative bg-white dark:bg-slate-800 rounded-2xl border-2 border-emerald-500 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
        
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="inline-block px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-widest mb-2">
                Ready For Check Panel
              </div>
              <div className="font-mono font-black text-xl text-slate-900 dark:text-white leading-none">
                {op.opNumber}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                Style: {op.styleCode}
              </div>
            </div>
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
          </div>
          
          {/* ✅ FIX 3B: Job Card - Label Sets vs Pieces */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Sets Ready</div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">
                {op.setsReadyForSewing || 0}
              </div>
              <div className="text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-500 mt-1">
                {op.qtyPond || 0} pats ({op.line?.patternMultiplier || 4}/set)
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total NG</div>
              <div className="text-3xl font-black text-rose-600 dark:text-rose-400 leading-none mt-1">
                {op.qtyPondNg || 0}
              </div>
              <div className="text-[10px] font-semibold text-rose-600/70 dark:text-rose-500 mt-1">
                pats ({Math.floor((op.qtyPondNg || 0) / (op.line?.patternMultiplier || 4))} sets)
              </div>
            </div>
          </div>

          {/* === TAMBAHAN: DAFTAR PATTERN YANG NG === */}
          {op.patterns && op.patterns.some(p => p.ng > 0) && (
            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
              <div className="text-[10px] font-black text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertCircle size={14} />
                Detail NG per Pattern:
              </div>
              <div className="space-y-1.5">
                {op.patterns.filter(p => p.ng > 0).map(p => (
                  <div key={p.index} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
                    <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-md">{p.ng} pcs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl mt-4 border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs">
              <AlertCircle size={16} />
              <span className="font-bold">Scan to transfer to Check Panel</span>
            </div>
            <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 mt-1 uppercase tracking-wider pl-6">
              All {op.setsReadyForSewing} sets must be transferred
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-3 mt-4">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
              <Wifi size={12} />
              <span className="uppercase tracking-widest">SPARSHA IoT</span>
            </div>
            <span>Last Sync: {lastUpdated}</span>
          </div>
        </div>
      </div>
    );
  }

  const mul = op.line?.patternMultiplier || 1;
  const targ = op.qtyEntan * mul;
  const cut = op.qtyPond || 0;
  const prog = targ > 0 ? (cut / targ) * 100 : 0;
  const remain = Math.max(0, targ - cut);
  const done = remain === 0;
  const highPrio = remain > 0 && prog < 50;
  const patterns = (op.patterns && op.patterns.length) ? op.patterns : Array.from({ length: mul }, (_, i) => ({
    index: i, name: `Pattern ${i+1}`, target: op.qtyEntan, good: 0, ng: 0, current: 0, completed: false
  }));

  return (
    <div className={`group relative bg-white dark:bg-slate-800 rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
      done ? 'border-emerald-500' : highPrio ? 'border-orange-500' : 'border-blue-500'
    }`}>
      <div className={`absolute top-0 left-0 w-full h-1.5 ${
        done ? 'bg-emerald-500' : highPrio ? 'bg-orange-500' : 'bg-blue-500'
      }`} />
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Production Order</div>
            <div className="font-mono font-black text-xl text-slate-900 dark:text-white leading-none">{op.opNumber}</div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Style: {op.styleCode} <span className="text-blue-500 font-black ml-1">(x{mul})</span></div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
              done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
            }`}>{done ? 'READY' : 'IN PROGRESS'}</div>
            {highPrio && <div className="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded-md text-[10px] font-black uppercase tracking-widest">HIGH PRIO</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700 text-center">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target</div>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none mt-1">{targ}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700 text-center">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Good</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">{cut}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700 text-center">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NG</div>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 leading-none mt-1">{op.qtyPondNg || 0}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wider">
            <span className="text-slate-500 dark:text-slate-400">Progress</span>
            <span className="text-slate-900 dark:text-white">{prog.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${done ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${prog}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-wider">
            <span>Rem: {remain} pcs</span>
            <span className={done ? 'text-emerald-500' : 'text-blue-500'}>{done ? 'Completed' : `${Math.round(prog)}%`}</span>
          </div>
        </div>

        <div className="mb-4 bg-slate-50 dark:bg-slate-700/20 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Layers size={14} className="text-purple-600 dark:text-purple-400" />
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Pattern Details</span>
          </div>
          <div className="grid grid-cols-2 gap-2">{patterns.map(p => <PatternMiniCard key={p.index} pattern={p} />)}</div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-3">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-500">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </div>
            <span className="uppercase tracking-widest">SPARSHA IoT</span>
          </div>
          <span>Last Sync: {lastUpdated}</span>
        </div>
      </div>
    </div>
  );
};

export const CuttingPondView = () => {
  const [ops, setOps] = useState<ProductionOrderWithLine[]>([]);
  const [lastUpd, setLastUpd] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchOps = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=CUTTING_POND`);
      if (res.ok) {
        setOps(await res.json());
        setLastUpd(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch { console.error("Failed to fetch Pond OPs"); } finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOps(); const i = setInterval(fetchOps, 3000); return () => clearInterval(i); }, [fetchOps]);

  // ✅ FIX 3A: Header Metrics - Hitung pieces dan sets
  const totalSupplyPieces = ops.reduce((sum, o) => sum + (o.qtyEntan * (o.line?.patternMultiplier || 1)), 0);
  const totalCutPieces = ops.reduce((sum, o) => sum + (o.qtyPond || 0), 0);
  const totalNgPieces = ops.reduce((sum, o) => sum + (o.qtyPondNg || 0), 0);

  const totalSupplySets = ops.reduce((sum, o) => sum + (o.qtyEntan || 0), 0);
  const totalCutSets = ops.reduce((sum, o) => sum + (o.setsReadyForSewing || 0), 0);
  const totalNgSets = ops.reduce((sum, o) => sum + (Math.floor((o.qtyPondNg || 0) / (o.line?.patternMultiplier || 1))), 0);

  const totalRemaining = totalSupplyPieces - totalCutPieces;
  const overallProgress = totalSupplyPieces > 0 ? (totalCutPieces / totalSupplyPieces) * 100 : 0;

  return (
    <div className="font-poppins text-slate-800 dark:text-slate-100 min-h-screen animate-in fade-in duration-300">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
        `}
      </style>

      {/* Header - Solid Style */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                  <Scissors size={28} className="text-white"/>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                  <Wifi size={14} className="text-white"/>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  Cutting Pond
                  <span className="text-[11px] px-2.5 py-1 bg-blue-600 text-white rounded-md font-bold uppercase tracking-wider">
                    SPARSHA IoT
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Material Consolidation & Review Station</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-4 px-5 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                <div className="flex flex-col">
                  <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Active Jobs</div>
                  <div className="text-2xl font-black leading-none mt-1">{ops.length}</div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Activity size={24} className="text-white"/>
                </div>
              </div>
              <button 
                onClick={fetchOps} 
                disabled={refreshing} 
                className="group px-5 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:border-blue-600 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
              >
                {refreshing ? <RefreshCw size={18} className="animate-spin text-blue-600"/> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500"/>}
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-6">
          {/* ✅ FIX 3A: Metric Cards dengan label sets dan subtitle pieces */}
          <MetricCard 
            title="Total Target" 
            value={totalSupplySets.toLocaleString()} 
            icon={Package} 
            color="orange" 
            suffix="sets" 
            subtitle={`${totalSupplyPieces.toLocaleString()} patterns (${totalSupplySets} sets × ${ops[0]?.line?.patternMultiplier || 4} patterns)`} 
          />
          <MetricCard 
            title="Processed" 
            value={totalCutSets.toLocaleString()} 
            icon={Scissors} 
            color="blue" 
            suffix="sets" 
            subtitle={`${totalCutPieces.toLocaleString()} patterns checked`} 
          />
          <MetricCard 
            title="Total NG" 
            value={totalNgSets.toLocaleString()} 
            icon={AlertCircle} 
            color="rose" 
            suffix="sets" 
            subtitle={`${totalNgPieces.toLocaleString()} patterns rejected`} 
          />
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-emerald-500 border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Progress</div>
              <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400"/>
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{overallProgress.toFixed(1)}%</div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-2.5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }}></div>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">
              Company Efficiency
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/30">
              <Target size={20} className="text-white"/>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">Active Production Orders</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{ops.length} job{ops.length !== 1 ? 's' : ''} in progress • <span className="text-blue-600 dark:text-blue-400">{totalRemaining.toLocaleString()}</span> pieces remaining</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">LIVE IoT STREAM</span>
          </div>
        </div>
        
        {ops.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-white dark:bg-slate-800 shadow-sm">
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <Wifi size={40} className="text-blue-500 dark:text-blue-400"/>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Awaiting Cutting Entan Output</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto text-center leading-relaxed">
              No active jobs in Cutting Pond station. New jobs will appear automatically from Cutting Entan.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
              Listening for IoT data...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {ops.map(op => <JobCard key={op.id} op={op} lastUpdated={lastUpd} />)}
          </div>
        )}
      </div>
    </div>
  );
};