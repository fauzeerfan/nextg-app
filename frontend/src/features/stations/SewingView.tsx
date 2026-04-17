import { useState, useEffect, useCallback } from 'react';
import { Shirt, Activity, RefreshCw, Target, Package, Layers, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';
import { TargetSummaryCard } from '../../components/ui/TargetSummaryCard';

const API_BASE_URL = 'http://localhost:3000';

interface SewingStartProgress {
  startIndex: number;
  qty: number;
}

interface SewingFinishProgress {
  finishIndex: number;
  qty: number;
}

interface SewingOp extends ProductionOrder {
  sewingStartProgress: SewingStartProgress[];
  sewingFinishProgress: SewingFinishProgress[];
  line: { patternMultiplier: number; code: string };
  setsReadyForSewing: number;
}

// Props type for MetricCard
interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: 'purple' | 'emerald' | 'blue' | 'amber';
  subtitle?: string;
  suffix?: string;
}

// Modern Solid Metric Card
const MetricCard = ({ title, value, icon: Icon, color = 'purple', subtitle, suffix }: MetricCardProps) => {
  const colors = {
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-500', darkBg: 'dark:bg-purple-900/40', darkIcon: 'dark:text-purple-400' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-500', darkBg: 'dark:bg-emerald-900/40', darkIcon: 'dark:text-emerald-400' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-500', darkBg: 'dark:bg-blue-900/40', darkIcon: 'dark:text-blue-400' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-amber-500', darkBg: 'dark:bg-amber-900/40', darkIcon: 'dark:text-amber-400' }
  };
  const selected = colors[color];
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${selected.border} border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-9 h-9 ${selected.bg} ${selected.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={`${selected.icon} ${selected.darkIcon}`} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
        {value}{suffix && <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>}
      </div>
      {subtitle && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

const StartProgressBar = ({ startIndex, current, target }: { startIndex: number; current: number; target: number }) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] mb-1 font-bold">
        <span className="text-slate-600 dark:text-slate-400 uppercase tracking-widest">Start {startIndex}</span>
        <span className="text-slate-800 dark:text-slate-200">{current} / {target}</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const FinishProgressBar = ({ finishIndex, current, target }: { finishIndex: number; current: number; target: number }) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] mb-1 font-bold">
        <span className="text-slate-600 dark:text-slate-400 uppercase tracking-widest">Finish {finishIndex}</span>
        <span className="text-slate-800 dark:text-slate-200">{current} / {target}</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const SewingOpCard = ({ op, onSelect, isSelected }: { op: SewingOp; onSelect: () => void; isSelected: boolean }) => {
  const target = op.qtySewingIn || 0;
  const output = op.qtySewingOut || 0;
  const remaining = target - output;
  const isCompleted = remaining <= 0 && target > 0;

  const startMap = new Map(op.sewingStartProgress?.map(s => [s.startIndex, s.qty]) || []);

  const startIndices = [1, 2];
  const finishIndices = [1];

  return (
    <div
      className={`group relative bg-white dark:bg-slate-800 rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer ${
        isSelected ? 'border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
      }`}
      onClick={onSelect}
    >
      <div className={`absolute top-0 left-0 w-full h-1.5 ${
        isCompleted ? 'bg-emerald-500' : 'bg-purple-500'
      }`} />
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
              OP {op.opNumber}
            </div>
            <div className="font-bold text-lg text-slate-900 dark:text-white leading-none mt-1">{op.styleCode}</div>
          </div>
          <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
            isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
          }`}>
            {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 dark:bg-slate-700/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Sets</div>
            <div className="text-xl font-black text-slate-900 dark:text-white leading-none mt-1">{target}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Output Sets</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">{output}</div>
          </div>
        </div>

        {/* Progress Start */}
        <div className="mb-4 bg-slate-50 dark:bg-slate-700/20 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Layers size={14} className="text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Start Progress</span>
          </div>
          {startIndices.map(idx => (
            <StartProgressBar key={idx} startIndex={idx} current={startMap.get(idx) || 0} target={target} />
          ))}
        </div>

        {/* Progress Finish */}
        <div className="mb-4 bg-slate-50 dark:bg-slate-700/20 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5 mb-2.5">
            <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Finish Progress</span>
          </div>
          {finishIndices.map(idx => (
            <FinishProgressBar
              key={idx}
              finishIndex={idx}
              current={output}
              target={target}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-3">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400" />
            <span>Updated {new Date(op.updatedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {!isCompleted && (
            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-md">
              <span className="uppercase tracking-wider">{remaining} left</span>
              <ArrowRight size={10} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SewingView = () => {
  const [ops, setOps] = useState<SewingOp[]>([]);
  const [selectedOp, setSelectedOp] = useState<SewingOp | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchOps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=SEWING`);
      if (res.ok) {
        const data = await res.json();
        // Fetch progress details for each OP
        const opsWithProgress = await Promise.all(
          data.map(async (op: ProductionOrder) => {
            const progressRes = await fetch(`${API_BASE_URL}/production-orders/${op.id}/sewing-progress`);
            if (progressRes.ok) {
              const progress = await progressRes.json();
              return { ...op, ...progress };
            }
            return op;
          })
        );
        setOps(opsWithProgress);
        setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (error) {
      console.error('Failed to fetch sewing OPs', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper to get auth headers
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('nextg_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  useEffect(() => {
    fetchOps();
    const interval = setInterval(fetchOps, 5000);
    return () => clearInterval(interval);
  }, [fetchOps]);

  const totalOps = ops.length;
  const totalOutput = ops.reduce((sum, op) => sum + (op.qtySewingOut || 0), 0);
  const totalTarget = ops.reduce((sum, op) => sum + (op.qtySewingIn || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalOutput / totalTarget) * 100) : 0;

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
                <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/30">
                  <Shirt size={28} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                  <Activity size={14} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  Sewing Station
                  <span className="text-[11px] px-2.5 py-1 bg-purple-600 text-white rounded-md font-bold uppercase tracking-wider">
                    SPARSHA IOT
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Assembly & Stitching Progress Monitoring</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-4 px-5 py-3 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-600/20">
                <div className="flex flex-col">
                  <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Active OPs</div>
                  <div className="text-2xl font-black leading-none mt-1">{totalOps}</div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package size={24} className="text-white" />
                </div>
              </div>
              <button
                onClick={fetchOps}
                disabled={loading}
                className="group px-5 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:border-purple-600 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors shadow-sm"
              >
                {loading ? <RefreshCw size={18} className="animate-spin text-purple-600" /> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />}
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pb-6">
          <MetricCard title="Active OPs" value={totalOps} icon={Activity} color="purple" subtitle="Jobs currently in progress" />
          <MetricCard title="Total Output" value={totalOutput} icon={Target} color="emerald" suffix="sets" subtitle="Cumulative finished sets" />
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-blue-500 border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Progress</div>
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                <Activity size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{overallProgress}%</div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-2.5 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
            </div>
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">
              {totalOutput} / {totalTarget} Sets Finished
            </div>
          </div>
        </div>

        {/* Target Summary Card - Baru */}
        <div className="px-6 pb-6">
          <TargetSummaryCard lineCode="K1YH" station="SEWING" />
        </div>
      </div>

      {/* Grid OP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {ops.map(op => (
          <SewingOpCard
            key={op.id}
            op={op}
            isSelected={selectedOp?.id === op.id}
            onSelect={() => setSelectedOp(op)}
          />
        ))}
        
        {ops.length === 0 && !loading && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-white dark:bg-slate-800 shadow-sm">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
              <Shirt size={32} className="text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">No Active Sewing Orders</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center max-w-sm">
              Waiting for production orders to be transferred from Check Panel station.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};