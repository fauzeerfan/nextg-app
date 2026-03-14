import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity, Layers, Shirt, RefreshCw,
  TrendingUp, Clock, Gauge,
  Cpu, BarChart, PieChart as PieChartIcon,
  List, AlertTriangle, CheckCircle,
  Filter, Download, Maximize2, Minimize2,
  MoreHorizontal, Target, Package, AlertOctagon,
  TrendingDown, Users, AlertCircle, X, Factory
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
  ResponsiveContainer,
  AreaChart, Area, ComposedChart, Bar, Line
} from 'recharts';
import type { DashboardComprehensive } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

// ==========================================
// COLOR PALETTE
// ==========================================
const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  gray: '#64748b',
  info: '#06b6d4',
};

const STATUS_COLORS: Record<string, string> = {
  'WIP': '#3b82f6',
  'DONE': '#10b981',
  'HOLD': '#f59e0b',
};

const STATION_COLORS: Record<string, string> = {
  'CUTTING_ENTAN': '#f97316',
  'CUTTING_POND': '#f59e0b',
  'CP': '#10b981',
  'SEWING': '#8b5cf6',
  'QC': '#ef4444',
  'PACKING': '#3b82f6',
  'FG': '#06b6d4',
};

const GRADIENTS = {
  blue: 'from-blue-500 via-blue-400 to-cyan-400',
  emerald: 'from-emerald-500 via-emerald-400 to-teal-400',
  amber: 'from-amber-500 via-amber-400 to-orange-400',
  rose: 'from-rose-500 via-rose-400 to-pink-400',
  purple: 'from-purple-500 via-purple-400 to-violet-400',
  indigo: 'from-indigo-500 via-indigo-400 to-blue-400',
};

// ==========================================
// KPI CARD COMPONENT
// ==========================================
const KpiCard = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
  suffix,
  trend,
  trendDirection = 'up',
  sparklineData,
  loading = false,
  delay = 0
}: any) => {
  const colorMap: Record<string, {
    gradient: string;
    iconBg: string;
    text: string;
    lightBg: string;
    border: string;
    glow: string;
  }> = {
    blue: {
      gradient: GRADIENTS.blue,
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      lightBg: 'bg-gradient-to-br from-blue-50/80 to-transparent dark:from-blue-950/30',
      border: 'border-blue-200/50 dark:border-blue-800/30',
      glow: 'shadow-blue-500/10',
    },
    emerald: {
      gradient: GRADIENTS.emerald,
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      lightBg: 'bg-gradient-to-br from-emerald-50/80 to-transparent dark:from-emerald-950/30',
      border: 'border-emerald-200/50 dark:border-emerald-800/30',
      glow: 'shadow-emerald-500/10',
    },
    amber: {
      gradient: GRADIENTS.amber,
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400',
      lightBg: 'bg-gradient-to-br from-amber-50/80 to-transparent dark:from-amber-950/30',
      border: 'border-amber-200/50 dark:border-amber-800/30',
      glow: 'shadow-amber-500/10',
    },
    rose: {
      gradient: GRADIENTS.rose,
      iconBg: 'bg-rose-50 dark:bg-rose-900/20',
      text: 'text-rose-600 dark:text-rose-400',
      lightBg: 'bg-gradient-to-br from-rose-50/80 to-transparent dark:from-rose-950/30',
      border: 'border-rose-200/50 dark:border-rose-800/30',
      glow: 'shadow-rose-500/10',
    },
    purple: {
      gradient: GRADIENTS.purple,
      iconBg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      lightBg: 'bg-gradient-to-br from-purple-50/80 to-transparent dark:from-purple-950/30',
      border: 'border-purple-200/50 dark:border-purple-800/30',
      glow: 'shadow-purple-500/10',
    },
    indigo: {
      gradient: GRADIENTS.indigo,
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      lightBg: 'bg-gradient-to-br from-indigo-50/80 to-transparent dark:from-indigo-950/30',
      border: 'border-indigo-200/50 dark:border-indigo-800/30',
      glow: 'shadow-indigo-500/10',
    },
  };
  const colors = colorMap[color] || colorMap.blue;

  if (loading) {
    return (
      <div
        className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-lg animate-pulse"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  return (
    <div
      className={`group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border ${colors.border} p-6 shadow-lg ${colors.glow} hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 ${colors.lightBg} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-10 rounded-bl-full transition-opacity duration-500`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              {suffix && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{suffix}</span>}
            </div>
          </div>
          <div className={`p-3.5 rounded-2xl ${colors.iconBg} ${colors.text} shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
            <Icon size={22} strokeWidth={2} />
          </div>
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {subtitle && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                {subtitle}
              </span>
            )}
            {trend && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                trendDirection === 'up' 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
              }`}>
                {trendDirection === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{trend}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// STATION FLOW COMPONENT
// ==========================================
const StationFlow = ({ data }: { data: Array<{ station: string; count: number; wipQty: number; progress: number }> }) => {
  const stationOrder = ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'];
  const stationLabels: Record<string, string> = {
    'CUTTING_ENTAN': 'Cutting Entan',
    'CUTTING_POND': 'Cutting Pond',
    'CP': 'Check Panel',
    'SEWING': 'Sewing',
    'QC': 'Quality Control',
    'PACKING': 'Packing',
    'FG': 'Finished Goods',
  };

  const sortedData = [...data].sort((a, b) => {
    const aIndex = stationOrder.indexOf(a.station);
    const bIndex = stationOrder.indexOf(b.station);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  return (
    <div className="space-y-3">
      {sortedData.map((station, idx) => (
        <div key={station.station} className="relative">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: STATION_COLORS[station.station] || CHART_COLORS.gray }}
              />
              {stationLabels[station.station] || station.station}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {station.count} OPs • {station.wipQty.toLocaleString()} pcs
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ 
                width: `${Math.min((station.count / Math.max(...data.map(d => d.count))) * 100, 100)}%`,
                backgroundColor: STATION_COLORS[station.station] || CHART_COLORS.gray
              }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Factory size={32} className="mx-auto mb-2 opacity-50" />
          <p>No station data available</p>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SKELETON LOADING
// ==========================================
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-6 animate-pulse" />
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-44 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-6" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-96 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-6">
          <div className="h-7 w-52 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl mb-6" />
          <div className="h-72 bg-slate-100/80 dark:bg-slate-800/50 rounded-2xl" />
        </div>
      ))}
    </div>
  </div>
);

// ==========================================
// TABLE COMPONENTS
// ==========================================
const TableRow = ({ children, hover = true }: { children: React.ReactNode; hover?: boolean }) => (
  <tr className={`border-b border-slate-100/60 dark:border-slate-800/60 ${hover ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors' : ''}`}>
    {children}
  </tr>
);

const Badge = ({ children, variant = 'default', size = 'md' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; size?: 'sm' | 'md' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${variants[variant]} ${sizes[size]} shadow-sm`}>
      {children}
    </span>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle, action, color = 'blue' }: any) => {
  const colorClasses = {
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
    purple: 'text-purple-500',
  };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
};

// ==========================================
// CUSTOM TOOLTIP FOR CHARTS
// ==========================================
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-xl border border-slate-700 shadow-2xl">
        <p className="text-sm font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
export const DashboardView = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardComprehensive | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [selectedLine, setSelectedLine] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ==========================================
  // FETCH DATA
  // ==========================================
  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders/dashboard-comprehensive`);
      if (res.ok) {
        const json: DashboardComprehensive = await res.json();
        setData(json);
        setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (e) {
      console.error('Failed to load dashboard stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  // ==========================================
  // MEMOIZED DATA
  // ==========================================
  const filteredLineSummaries = useMemo(() => {
    if (!data?.lineSummaries) return [];
    if (selectedLine === 'all') return data.lineSummaries;
    return data.lineSummaries.filter(line => line.lineCode === selectedLine);
  }, [data, selectedLine]);

  const sparklineData = useMemo(() => {
    if (!data?.hourlyProduction) return [];
    return data.hourlyProduction.map(h => ({ value: h.output }));
  }, [data]);

  // ==========================================
  // FULLSCREEN TOGGLE
  // ==========================================
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  const kpi = data?.kpi || {
    totalOps: 0,
    todayOutput: 0,
    totalWip: 0,
    overallEfficiency: 0,
    defectRate: 0,
    onTimeDelivery: 0,
    targetOutput: 0,
    achievement: 0,
  };

  const statusDistribution = data?.statusDistribution || [];
  const stationFlow = data?.stationFlow || [];

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className={`w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-all duration-500 ${isFullscreen ? 'pt-0' : 'px-4 py-8'}`}>
      
      {/* ==========================================
          HEADER
      ========================================== */}
      <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-xl mb-6 ${isFullscreen ? 'rounded-none border-x-0 border-t-0' : ''}`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Cpu size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Production Dashboard</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Real-time Manufacturing Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-200/50 dark:border-emerald-800/30">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/50" />
              </span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Live Monitoring</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-full border border-slate-200/50 dark:border-slate-700/50">
              <Clock size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Last sync: <span className="font-bold text-slate-900 dark:text-white">{lastUpdate || '—'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative group">
              <select
                value={selectedLine}
                onChange={(e) => setSelectedLine(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer shadow-sm"
              >
                <option value="all">📊 All Production Lines</option>
                {data?.lineSummaries?.map(line => (
                  <option key={line.lineCode} value={line.lineCode}>🏭 {line.lineCode}</option>
                ))}
              </select>
              <Filter size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
            </div>

            <button
              onClick={fetchData}
              disabled={refreshing}
              className="group p-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              title="Refresh data"
            >
              <RefreshCw size={20} className={`${refreshing ? 'animate-spin text-blue-500' : 'text-slate-600 dark:text-slate-400 group-hover:text-blue-500'} transition-colors`} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="group p-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-blue-500 transition-colors" />
              ) : (
                <Maximize2 size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-blue-500 transition-colors" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          ROW 1: KPI CARDS (6 cards)
      ========================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KpiCard
          title="Total POs"
          value={kpi.totalOps || 0}
          icon={Layers}
          color="blue"
          subtitle="All statuses"
          loading={loading}
          delay={0}
        />
        <KpiCard
          title="Today Output"
          value={kpi.todayOutput || 0}
          icon={Shirt}
          color="emerald"
          suffix="pcs"
          trend={`${kpi.achievement || 0}%`}
          trendDirection={kpi.achievement >= 100 ? 'up' : 'down'}
          sparklineData={sparklineData}
          loading={loading}
          delay={100}
        />
        <KpiCard
          title="Target"
          value={kpi.targetOutput || 0}
          icon={Target}
          color="indigo"
          suffix="pcs"
          subtitle="Daily goal"
          loading={loading}
          delay={150}
        />
        <KpiCard
          title="WIP"
          value={kpi.totalWip || 0}
          icon={Activity}
          color="amber"
          subtitle="In progress"
          sparklineData={sparklineData.slice(2, 8)}
          loading={loading}
          delay={200}
        />
        <KpiCard
          title="Defect Rate"
          value={`${kpi.defectRate || 0}%`}
          icon={AlertOctagon}
          color="rose"
          trend={`${(kpi.defectRate || 0) > 5 ? '+2%' : '-1%'}`}
          trendDirection={(kpi.defectRate || 0) > 5 ? 'up' : 'down'}
          loading={loading}
          delay={300}
        />
        <KpiCard
          title="Efficiency"
          value={`${kpi.overallEfficiency || 0}%`}
          icon={Gauge}
          color="purple"
          subtitle="Achievement"
          loading={loading}
          delay={400}
        />
      </div>

      {/* ==========================================
          ROW 2: STATION FLOW & STATUS DISTRIBUTION
      ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Station Flow */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-xl">
          <SectionHeader 
            icon={Factory} 
            title="Station Flow Status" 
            subtitle="WIP distribution across stations"
            color="blue" 
          />
          <div className="mt-4">
            <StationFlow data={stationFlow} />
          </div>
        </div>
        
        {/* Status Distribution */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-xl">
          <SectionHeader 
            icon={PieChartIcon} 
            title="PO Status Distribution" 
            subtitle="Production order status"
            color="purple" 
          />
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={3}
                dataKey="count"
                nameKey="status"
                strokeWidth={0}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status] || CHART_COLORS.gray}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={40}
                iconType="circle"
                iconSize={10}
                formatter={(value) => (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ==========================================
          ROW 3: CHARTS
      ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Hourly Production vs Target */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
          <SectionHeader 
            icon={BarChart} 
            title="Hourly Production vs Target" 
            subtitle="Real-time gap analysis"
            color="blue"
            action={
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all hover:scale-110">
                <MoreHorizontal size={20} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
              </button>
            }
          />
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data?.hourlyProduction || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} opacity={0.5} />
              <XAxis 
                dataKey="hour" 
                tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} 
                axisLine={{ stroke: isDarkMode ? '#475569' : '#cbd5e1' }}
                tickLine={{ stroke: isDarkMode ? '#475569' : '#cbd5e1' }}
              />
              <YAxis 
                tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} 
                axisLine={{ stroke: isDarkMode ? '#475569' : '#cbd5e1' }}
                tickLine={{ stroke: isDarkMode ? '#475569' : '#cbd5e1' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="output" name="Actual" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              <Line type="step" dataKey="target" name="Target" stroke={CHART_COLORS.danger} strokeWidth={3} strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Line Performance */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
          <SectionHeader 
            icon={Users} 
            title="Line Performance" 
            subtitle={`Performance of ${filteredLineSummaries.length} production lines`}
            color="indigo"
            action={
              <Badge variant="info" size="sm">
                {filteredLineSummaries.length} lines
              </Badge>
            }
          />
          <div className="space-y-4 mt-4">
            {filteredLineSummaries.length > 0 ? (
              filteredLineSummaries.map((line, idx) => (
                <div key={line.lineCode} className="relative">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Line {line.lineCode}</span>
                    <span className="text-slate-500 dark:text-slate-400">{line.output} / {line.target} pcs</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${line.efficiency >= 90 ? 'bg-emerald-500' : line.efficiency >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min((line.output / (line.target || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-500">Efficiency: {line.efficiency}%</span>
                    <span className={line.defectRate < 2 ? 'text-emerald-600' : line.defectRate < 5 ? 'text-amber-600' : 'text-rose-600'}>
                      Defect: {line.defectRate}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p>No line data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          ROW 4: TABLES
      ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Slow Moving OPs */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200/60 dark:border-slate-800/60">
            <SectionHeader 
              icon={AlertTriangle} 
              title="Slow Moving POs" 
              subtitle="Orders stalled > 24 hours"
              color="amber"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PO Number</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Station</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {(data?.slowMovingOps || []).length > 0 ? (
                  data?.slowMovingOps.map((op, idx) => (
                    <TableRow key={idx}>
                      <td className="py-4 px-6">
                        <code className="text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          {op.opNumber}
                        </code>
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-600 dark:text-slate-400">{op.currentStation}</td>
                      <td className="py-4 px-6">
                        <Badge variant="warning" size="sm">
                          ⏱️ {op.hoursInStation}h
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="warning" size="sm">Attention</Badge>
                      </td>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                          <CheckCircle size={32} className="text-emerald-500" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No slow moving orders</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200/60 dark:border-slate-800/60">
            <SectionHeader 
              icon={List} 
              title="Recent Activities" 
              subtitle="Latest production activity logs"
              color="emerald"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PO</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Station</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {(data?.recentActivities || []).length > 0 ? (
                  data?.recentActivities.slice(0, 5).map((act, idx) => (
                    <TableRow key={idx}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            {new Date(act.time).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <code className="text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          {act.opNumber}
                        </code>
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-600 dark:text-slate-400">{act.station}</td>
                      <td className="py-4 px-6">
                        <Badge 
                          variant={
                            act.action.toLowerCase().includes('start') ? 'info' :
                            act.action.toLowerCase().includes('complete') ? 'success' : 'default'
                          }
                          size="sm"
                        >
                          {act.action.toLowerCase().includes('start') ? '▶' :
                           act.action.toLowerCase().includes('complete') ? '✓' : '•'} {act.action}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {act.qty?.toLocaleString() || 0}
                        </span>
                      </td>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                          <Activity size={32} className="text-slate-400" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No recent activities</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==========================================
          FOOTER
      ========================================== */}
      <div className="text-center pb-8">
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
          Auto-refresh every 30 seconds • Real-time data from production server
        </p>
      </div>
    </div>
  );
};