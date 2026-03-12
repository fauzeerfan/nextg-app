import { useState, useEffect, useCallback } from 'react';
import { Activity, Wifi, RefreshCw, Scissors, Layers, Target, TrendingUp, Package, AlertCircle, CheckSquare, XSquare } from 'lucide-react';
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

const MetricCard = ({ title, value, icon: Icon, color = 'blue', subtitle, suffix }: MetricCardProps) => {
  const colorClasses = {
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/20 to-blue-900/10' },
    orange: { bg: 'from-orange-100 to-orange-50', icon: 'text-orange-600', darkBg: 'from-orange-900/20 to-orange-900/10' },
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    purple: { bg: 'from-purple-100 to-purple-50', icon: 'text-purple-600', darkBg: 'from-purple-900/20 to-purple-900/10' },
    rose: { bg: 'from-rose-100 to-rose-50', icon: 'text-rose-600', darkBg: 'from-rose-900/20 to-rose-900/10' }
  };
  const cur = colorClasses[color];
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-8 h-8 bg-gradient-to-br ${cur.bg} dark:${cur.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className={cur.icon} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}{suffix && <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
};

const PatternMiniCard = ({ pattern }: { pattern: PatternProgress }) => {
  const progress = (pattern.current / pattern.target) * 100;
  const remaining = pattern.target - pattern.current;
  return (
    <div className={`p-2 rounded-xl border ${pattern.completed ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800/50`}>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[70px]">{pattern.name}</span>
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><CheckSquare size={10} />{pattern.good}</span>
          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5"><XSquare size={10} />{pattern.ng}</span>
        </div>
      </div>
      <div className="relative w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-0.5">
        <div className={`absolute inset-y-0 left-0 rounded-full ${pattern.completed ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between text-[8px] text-slate-500 dark:text-slate-400">
        <span>sisa {remaining}</span><span>{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

const JobCard = ({ op, lastUpdated }: { op: ProductionOrderWithLine; lastUpdated: string }) => {
  if (op.readyForCP) {
    return (
      <div className="bg-gradient-to-br from-white to-emerald-50 dark:from-slate-800 dark:to-emerald-900/20 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 shadow-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">READY FOR CHECK PANEL</div>
            <div className="font-mono font-bold text-base text-slate-900 dark:text-white">{op.opNumber}</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">{op.styleCode}</div>
          </div>
          <div className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold">READY</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-center">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Good</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{op.qtyPond}</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-center">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Sets Ready</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{op.qtyCP}</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2">
          <span>Menunggu scan Dhristi</span><span>Last: {lastUpdated}</span>
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
    index: i, name: `Pola ${i+1}`, target: op.qtyEntan, good: 0, ng: 0, current: 0, completed: false
  }));

  return (
    <div className={`group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border-2 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden ${
      done ? 'border-emerald-200 dark:border-emerald-800/30' : highPrio ? 'border-orange-200 dark:border-orange-800/30' : 'border-slate-200 dark:border-slate-700'
    }`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${
        done ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : highPrio ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'
      }`} />
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Production Order</div>
            <div className="font-mono font-bold text-base text-slate-900 dark:text-white">{op.opNumber}</div>
            <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">{op.styleCode} (x{mul})</div>
          </div>
          <div className="flex flex-col items-end">
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>{done ? 'READY' : 'IN PROGRESS'}</div>
            {highPrio && <div className="mt-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-[10px] font-bold">HIGH PRIORITY</div>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 mb-3 text-center">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5"><div className="text-[10px] text-slate-500 dark:text-slate-400">Target</div><div className="text-sm font-bold text-blue-600 dark:text-blue-400">{targ}</div></div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5"><div className="text-[10px] text-slate-500 dark:text-slate-400">Good</div><div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{cut}</div></div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5"><div className="text-[10px] text-slate-500 dark:text-slate-400">NG</div><div className="text-sm font-bold text-rose-600 dark:text-rose-400">{op.qtyPondNg || 0}</div></div>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-0.5"><span className="text-slate-600 dark:text-slate-400">Progress</span><span className="font-bold text-slate-700 dark:text-slate-300">{prog.toFixed(1)}%</span></div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${done ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${prog}%` }} />
          </div>
          <div className="flex justify-between text-[10px] mt-0.5">
            <span className="text-slate-500 dark:text-slate-400">Sisa {remain} pcs</span>
            <span className="text-slate-500 dark:text-slate-400">{done ? 'Selesai' : `${Math.round(prog)}%`}</span>
          </div>
        </div>
        <div className="mb-2">
          <div className="flex items-center gap-1 mb-1.5"><Layers size={12} className="text-indigo-500" /><span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Detail Pola</span></div>
          <div className="grid grid-cols-2 gap-1.5">{patterns.map(p => <PatternMiniCard key={p.index} pattern={p} />)}</div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2 mt-1">
          <div className="flex items-center gap-1">
            <div className="relative"><div className="w-2 h-2 bg-blue-500 rounded-full animate-ping opacity-75"></div><div className="absolute top-0.5 left-0.5 w-1 h-1 bg-blue-500 rounded-full"></div></div>
            <span className="font-bold text-blue-600 dark:text-blue-400">SPARSHA</span>
          </div>
          <span>Last: {lastUpdated}</span>
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

  const totalSupply = ops.reduce((sum, o) => sum + (o.qtyEntan * (o.line?.patternMultiplier || 1)), 0);
  const totalCut = ops.reduce((sum, o) => sum + (o.qtyPond || 0), 0);
  const totalNg = ops.reduce((sum, o) => sum + (o.qtyPondNg || 0), 0);
  const totalRemaining = totalSupply - totalCut;
  const overallProgress = totalSupply > 0 ? (totalCut / totalSupply) * 100 : 0;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Scissors size={24} className="text-white"/></div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg"><Wifi size={14} className="text-white"/></div>
              </div>
              <div><h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">Cutting Pond<span className="text-xs px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-bold">SPARSHA IoT</span></h1></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-lg">
                <div className="flex flex-col"><div className="text-xs font-medium opacity-90">Active Queues</div><div className="text-xl font-bold">{ops.length}</div></div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"><Activity size={18} className="text-white"/></div>
              </div>
              <button onClick={fetchOps} disabled={refreshing} className="group px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 shadow-sm hover:shadow-md text-sm">
                {refreshing ? <RefreshCw size={16} className="animate-spin"/> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500"/>}Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-6">
          <MetricCard title="Total Target" value={totalSupply.toLocaleString()} icon={Package} color="orange" suffix="pcs" subtitle="Total pola dari Entan" />
          <MetricCard title="Processed" value={totalCut.toLocaleString()} icon={Scissors} color="blue" suffix="pcs" subtitle="Fine cut completed" />
          <MetricCard title="Total NG" value={totalNg.toLocaleString()} icon={AlertCircle} color="rose" suffix="pcs" subtitle="Not good pieces" />
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Overall Progress</div>
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-lg flex items-center justify-center"><TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400"/></div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{overallProgress.toFixed(1)}%</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }}></div></div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 rounded-lg flex items-center justify-center"><Target size={16} className="text-blue-600 dark:text-blue-400"/></div>
            <div><h2 className="text-base font-bold text-slate-900 dark:text-white">Active Production Queues</h2><p className="text-xs text-slate-500 dark:text-slate-400">{ops.length} job{ops.length !== 1 ? 's' : ''} in progress • {totalRemaining.toLocaleString()} pieces remaining</p></div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">LIVE IoT STREAM</span></div>
        </div>
        {ops.length === 0 ? (
          <div className="relative h-80 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-400 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent animate-pulse"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/10 dark:to-blue-900/5 rounded-xl flex items-center justify-center mx-auto mb-4"><Wifi size={32} className="text-blue-300 dark:text-blue-700"/></div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Awaiting Entan Output</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">No active jobs in Cutting Pond station. New jobs will appear automatically from Cutting Entan.</p>
              <div className="flex items-center justify-center gap-1.5 text-xs"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div><span className="text-blue-600 dark:text-blue-400 font-medium">Listening for IoT data...</span></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ops.map(op => <JobCard key={op.id} op={op} lastUpdated={lastUpd} />)}
          </div>
        )}
      </div>
    </div>
  );
};