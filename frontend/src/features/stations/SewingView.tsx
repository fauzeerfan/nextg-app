import { useState, useEffect, useCallback } from 'react';
import { Shirt, Activity, RefreshCw, Target, Package, Layers, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

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

// Props type untuk MetricCard
interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: 'purple' | 'emerald' | 'blue' | 'amber';
  subtitle?: string;
  suffix?: string;
}

const MetricCard = ({ title, value, icon: Icon, color = 'purple', subtitle, suffix }: MetricCardProps) => {
  const colors = {
    purple: { bg: 'from-purple-100 to-purple-50', icon: 'text-purple-600', darkBg: 'from-purple-900/20 to-purple-900/10' },
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/20 to-blue-900/10' },
    amber: { bg: 'from-amber-100 to-amber-50', icon: 'text-amber-600', darkBg: 'from-amber-900/20 to-amber-900/10' }
  };
  const selected = colors[color];
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-10 h-10 bg-gradient-to-br ${selected.bg} dark:${selected.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={18} className={selected.icon} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">
        {value}{suffix && <span className="text-lg text-slate-500 ml-2">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 mt-2">{subtitle}</div>}
    </div>
  );
};

const StartProgressBar = ({ startIndex, current, target }: { startIndex: number; current: number; target: number }) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-slate-700 dark:text-slate-300">Start {startIndex}</span>
        <span className="text-slate-600 dark:text-slate-400">{current} / {target}</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const FinishProgressBar = ({ finishIndex, current, target }: { finishIndex: number; current: number; target: number }) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-slate-700 dark:text-slate-300">Finish {finishIndex}</span>
        <span className="text-slate-600 dark:text-slate-400">{current} / {target}</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const SewingOpCard = ({ op, onSelect, isSelected }: { op: SewingOp; onSelect: () => void; isSelected: boolean }) => {
  const target = op.setsReadyForSewing || 0;
  const output = op.qtySewingOut || 0;   // total output
  const remaining = target - output;
  const isCompleted = remaining <= 0;

  const startMap = new Map(op.sewingStartProgress?.map(s => [s.startIndex, s.qty]) || []);

  const startIndices = [1, 2];
  const finishIndices = [1, 2];

  return (
    <div
      className={`group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden cursor-pointer ${
        isSelected ? 'border-purple-500 dark:border-purple-600' : 'border-slate-200 dark:border-slate-700'
      }`}
      onClick={onSelect}
    >
      <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${
        isCompleted ? 'from-emerald-500 to-emerald-400' : 'from-purple-500 to-purple-400'
      }`} />
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              OP {op.opNumber}
            </div>
            <div className="font-bold text-lg text-slate-900 dark:text-white">{op.styleCode}</div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
          }`}>
            {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">Target Sets</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{target}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">Output Sets</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{output}</div>
          </div>
        </div>

        {/* Progress Start */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Start Progress</span>
          </div>
          {startIndices.map(idx => (
            <StartProgressBar key={idx} startIndex={idx} current={startMap.get(idx) || 0} target={target} />
          ))}
        </div>

        {/* Progress Finish */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Finish Progress</span>
          </div>
          {finishIndices.map(idx => (
            <FinishProgressBar
              key={idx}
              finishIndex={idx}
              current={output}   // gunakan total output untuk kedua finish
              target={target}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Updated {new Date(op.updatedAt || '').toLocaleTimeString()}</span>
          </div>
          {!isCompleted && (
            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
              <span>{remaining} sets left</span>
              <ArrowRight size={12} />
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
        // Ambil detail progress untuk setiap OP
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
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Failed to fetch sewing OPs', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOps();
    const interval = setInterval(fetchOps, 5000);
    return () => clearInterval(interval);
  }, [fetchOps]);

  const totalOps = ops.length;
  const totalOutput = ops.reduce((sum, op) => sum + (op.qtySewingOut || 0), 0);
  const totalTarget = ops.reduce((sum, op) => sum + (op.setsReadyForSewing || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalOutput / totalTarget) * 100) : 0;

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-900/10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shirt size={28} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                  <Activity size={16} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Sewing Station
                  <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full font-bold">
                    SPARSHA IOT
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl shadow-lg">
                <div className="flex flex-col">
                  <div className="text-xs font-medium opacity-90">Active OPs</div>
                  <div className="text-2xl font-bold">{totalOps}</div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Package size={20} className="text-white" />
                </div>
              </div>
              <button
                onClick={fetchOps}
                disabled={loading}
                className="group px-5 py-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                {loading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />}
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 pb-8">
          <MetricCard title="Active OPs" value={totalOps} icon={Activity} color="purple" subtitle="In progress" />
          <MetricCard title="Total Output" value={totalOutput} icon={Target} color="emerald" suffix="sets" subtitle="Cumulative" />
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Overall Progress</div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg flex items-center justify-center">
                <Activity size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{overallProgress}%</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid OP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ops.map(op => (
          <SewingOpCard
            key={op.id}
            op={op}
            isSelected={selectedOp?.id === op.id}
            onSelect={() => setSelectedOp(op)}
          />
        ))}
        {ops.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mb-4">
              <Shirt size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Active Sewing Orders</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Waiting for orders from Check Panel</p>
          </div>
        )}
      </div>
    </div>
  );
};