import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Layers, RefreshCw,
  TrendingUp, Clock,
  Cpu,
  TrendingDown, Maximize2, Minimize2,
  Filter, Factory, AlertTriangle, 
  Scissors, CheckSquare, Truck, Package, Shirt,
  Radio, Zap, Sparkles,
  ArrowDownToLine, ArrowUpFromLine, Percent, XCircle,
  Calendar
} from 'lucide-react';
import type { DashboardComprehensive } from '../../types/production';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, AreaChart, Area,
  PieChart, Pie, Cell, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const API_BASE_URL = 'http://202.52.15.30:4000';

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

const STATION_COLORS: Record<string, string> = {
  'CUTTING_ENTAN': '#f97316', // Orange
  'CUTTING_POND': '#f59e0b',  // Amber
  'CP': '#10b981',            // Emerald
  'SEWING': '#8b5cf6',        // Violet
  'QC': '#ef4444',            // Rose
  'PACKING': '#3b82f6',       // Blue
  'FG': '#06b6d4',            // Cyan
};

// ==========================================
// COMPACT KPI CARD COMPONENT - SOLID STYLE
// ==========================================
const CompactKpiCard = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  suffix,
  trend,
  trendDirection = 'up',
  loading = false,
  delay = 0
}: any) => {
  const colorMap: Record<string, {
    border: string;
    iconBg: string;
    text: string;
  }> = {
    blue: {
      border: 'border-blue-500',
      iconBg: 'bg-blue-600 shadow-blue-600/30',
      text: 'text-blue-600 dark:text-blue-400',
    },
    amber: {
      border: 'border-amber-500',
      iconBg: 'bg-amber-500 shadow-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
    },
    rose: {
      border: 'border-rose-500',
      iconBg: 'bg-rose-600 shadow-rose-600/30',
      text: 'text-rose-600 dark:text-rose-400',
    },
  };
  const colors = colorMap[color] || colorMap.blue;

  if (loading) {
    return (
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-6 shadow-sm animate-pulse flex items-center justify-between"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div>
          <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded-full mb-4" />
          <div className="h-8 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="h-14 w-14 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      className={`group relative bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${colors.border} border-y border-r border-slate-200 dark:border-slate-700 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg shadow-sm flex items-center justify-between overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative z-10 flex flex-col gap-1">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl 2xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {suffix && <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{suffix}</span>}
        </div>
        {trend && (
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
              trendDirection === 'up' 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
            }`}>
              {trendDirection === 'up' ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
              {trend}
            </span>
          </div>
        )}
      </div>
      
      <div className={`relative z-10 w-14 h-14 2xl:w-16 2xl:h-16 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ${colors.iconBg}`}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
    </div>
  );
};

// ==========================================
// ENHANCED STATION FLOW COMPONENT - SOLID STYLE
// ==========================================
const StationFlow = ({ data }: { data: Array<{ 
  station: string; 
  count: number; 
  wipQty: number; 
  todayInput: number; 
  todayOutput: number; 
  qtyNg: number; 
  progress: number 
}> }) => {
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

  const getStationIcon = (station: string) => {
    if (station.includes('CUTTING')) return Scissors;
    if (station === 'QC' || station === 'CP') return CheckSquare;
    if (station === 'SEWING') return Shirt;
    if (station === 'PACKING') return Package;
    if (station === 'FG') return Truck;
    return Factory;
  };

  const enrichedData = stationOrder.map(station => {
    const found = data.find(d => d.station === station);
    if (found) return found;
    return { station, count: 0, wipQty: 0, todayInput: 0, todayOutput: 0, qtyNg: 0, progress: 0 };
  });

  if (enrichedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-700">
        <div className="p-5 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-4">
          <Factory size={48} className="text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-xl font-bold text-slate-500 dark:text-slate-400">No station data available</p>
      </div>
    );
  }

  const mainStations = enrichedData.slice(0, 6);
  const fgStation = enrichedData[6];

  return (
    <div className="flex flex-col h-full gap-5 2xl:gap-6">
      {/* PIPELINE VISUALIZATION - 6 STATIONS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 flex-grow">
        {mainStations.map((station, idx) => {
          const StationIcon = getStationIcon(station.station);
          const showNg = station.station === 'CUTTING_POND' || station.station === 'CP' || station.station === 'QC';
          const stationColor = STATION_COLORS[station.station] || CHART_COLORS.gray;
          
          let wipLabel = 'WIP';
          if (station.station === 'CUTTING_ENTAN') wipLabel = 'Antrian OP';
          if (station.station === 'FG') wipLabel = 'Stock';

          return (
            <div key={station.station} className="relative group flex flex-col h-full">
              <div
                className="relative flex flex-col h-full bg-white dark:bg-slate-800 rounded-3xl p-5 border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 z-10 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-600"
              >
                {/* Station Header */}
                <div className="flex flex-col items-center text-center mb-5 relative">
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-slate-100 dark:bg-slate-700 -z-10" />
                  
                  <div className="relative mb-3 group-hover:-translate-y-1 transition-transform duration-300">
                    <div
                      className="p-3.5 rounded-[1rem] text-white relative z-10 shadow-md"
                      style={{ backgroundColor: stationColor, boxShadow: `0 4px 14px ${stationColor}50` }}
                    >
                      <StationIcon className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-lg">
                    Step 0{idx + 1}
                  </span>
                  <h4 className="font-black text-sm 2xl:text-base text-slate-900 dark:text-white leading-tight mt-1 uppercase tracking-wide">
                    {stationLabels[station.station] || station.station}
                  </h4>
                </div>

                {/* Solid Progress Bar */}
                <div className="w-full mb-6">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Progress</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{station.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${station.progress}%`, backgroundColor: stationColor }}
                    />
                  </div>
                </div>

                {/* Stats List */}
                <div className="flex flex-col gap-3 flex-grow justify-center">
                  
                  {/* Active OP */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border-2 border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                        <Activity size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] 2xl:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {station.station === 'CUTTING_ENTAN' ? 'Antrian OP' : 'Active OP'}
                      </span>
                    </div>
                    <span className="text-base 2xl:text-lg font-black text-slate-900 dark:text-white leading-none">{station.count}</span>
                  </div>

                  {/* WIP */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border-2 border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                        <Layers size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] 2xl:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{wipLabel}</span>
                    </div>
                    <span className="text-base 2xl:text-lg font-black text-amber-600 dark:text-amber-500 leading-none">
                      {station.wipQty.toLocaleString()}
                      <span className="text-[10px] font-semibold text-slate-400 ml-1">
                        {station.station === 'CUTTING_POND' || station.station === 'CP' ? 'patterns' : 'sets'}
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {/* Input */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border-2 border-slate-100 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <ArrowDownToLine size={16} className="text-indigo-500 mb-1" strokeWidth={3} />
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Input</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white leading-none">
                        {station.todayInput.toLocaleString()}
                        <span className="text-[10px] font-semibold text-slate-400 ml-1">
                          {station.station === 'CUTTING_POND' || station.station === 'CP' ? 'patterns' : 'sets'}
                        </span>
                      </span>
                    </div>
                    {/* Output */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border-2 border-slate-100 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <ArrowUpFromLine size={16} className="text-emerald-500 mb-1" strokeWidth={3} />
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Output</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white leading-none">
                        {station.todayOutput.toLocaleString()}
                        <span className="text-[10px] font-semibold text-slate-400 ml-1">
                          {station.station === 'CUTTING_POND' || station.station === 'CP' ? 'patterns' : 'sets'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Qty NG */}
                  {showNg && (
                    <div className="mt-1 flex items-center justify-between p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-100 dark:border-rose-900/50">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
                          <XCircle size={14} strokeWidth={3} />
                        </div>
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Defect / NG</span>
                      </div>
                      <span className="text-base font-black text-rose-600 dark:text-rose-400 leading-none">
                        {station.qtyNg.toLocaleString()}
                        <span className="text-[10px] font-semibold text-slate-400 ml-1">
                          {station.station === 'CUTTING_POND' || station.station === 'CP' ? 'patterns' : 'sets'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FINISHED GOODS (FULL WIDTH BOTTOM) - Premium Solid Final Stage */}
      {fgStation && (() => {
        const progress = fgStation.progress;
        const stationColor = STATION_COLORS['FG'];

        return (
          <div 
            className="relative w-full bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 2xl:p-8 shadow-sm border-2 border-cyan-500 flex flex-col xl:flex-row items-center gap-8 2xl:gap-12 transition-all duration-300 hover:shadow-lg group overflow-hidden"
          >
            <div className="relative z-10 flex items-center gap-6 w-full xl:w-1/4 xl:min-w-[340px] flex-shrink-0">
              <div className="relative">
                <div 
                  className="p-5 2xl:p-6 rounded-[1.25rem] text-white relative z-10 transition-transform duration-300 group-hover:scale-105 shadow-md"
                  style={{ backgroundColor: stationColor, boxShadow: `0 8px 20px ${stationColor}40` }}
                >
                  <Truck className="w-8 h-8 2xl:w-10 2xl:h-10" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="inline-block w-max text-[10px] 2xl:text-[11px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest bg-cyan-100 dark:bg-cyan-900/40 px-3 py-1.5 rounded-lg border border-cyan-200 dark:border-cyan-800/50">
                  Step 07 • Final Output
                </span>
                <h4 className="font-black text-2xl 2xl:text-3xl text-slate-900 dark:text-white tracking-tight mt-1 uppercase">
                  Finished Goods
                </h4>
              </div>
            </div>

            <div className="relative z-10 flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 2xl:gap-5 w-full">
              <div className="flex flex-col justify-center bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 transition-colors">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 uppercase tracking-wider mb-2">
                  <Activity size={16} className="text-blue-500" strokeWidth={3} /> Active OP
                </p>
                <p className="text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white leading-none">{fgStation.count}</p>
              </div>
              <div className="flex flex-col justify-center bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 transition-colors">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 uppercase tracking-wider mb-2">
                  <Layers size={16} className="text-amber-500" strokeWidth={3} /> Stock
                </p>
                <p className="text-2xl 2xl:text-3xl font-black text-amber-600 dark:text-amber-400 leading-none">{fgStation.wipQty.toLocaleString()}</p>
              </div>
              <div className="flex flex-col justify-center bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 transition-colors">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 uppercase tracking-wider mb-2">
                  <ArrowDownToLine size={16} className="text-indigo-500" strokeWidth={3} /> Input
                </p>
                <p className="text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white leading-none">{fgStation.todayInput.toLocaleString()}</p>
              </div>
              <div className="flex flex-col justify-center bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 transition-colors">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 uppercase tracking-wider mb-2">
                  <ArrowUpFromLine size={16} className="text-emerald-500" strokeWidth={3} /> Output
                </p>
                <p className="text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white leading-none">{fgStation.todayOutput.toLocaleString()}</p>
              </div>
              <div className="flex flex-col justify-center bg-cyan-50 dark:bg-cyan-900/20 p-5 rounded-2xl border-2 border-cyan-200 dark:border-cyan-800/50 col-span-2 md:col-span-1 relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 h-2 transition-all duration-1000 ease-out rounded-r-full" 
                  style={{ width: `${progress}%`, backgroundColor: stationColor }} 
                />
                <p className="text-[11px] text-cyan-700 dark:text-cyan-400 font-bold flex items-center gap-2 uppercase tracking-wider mb-2 relative z-10">
                  <Percent size={16} className="text-cyan-500" strokeWidth={3} /> Progress
                </p>
                <p className="text-2xl 2xl:text-3xl font-black text-cyan-600 dark:text-cyan-400 relative z-10 leading-none">{progress}%</p>
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
};

// ==========================================
// ANALYTICS: KPI + CHARTS + LISTS (recharts)
// ==========================================
const STATUS_COLORS: Record<string, string> = { WIP: '#3b82f6', DONE: '#10b981', HOLD: '#f59e0b' };
const axisColor = (d: boolean) => (d ? '#94a3b8' : '#64748b');
const gridColor = (d: boolean) => (d ? '#334155' : '#e2e8f0');
const tipStyle = (d: boolean): React.CSSProperties => ({
  backgroundColor: d ? '#1e293b' : '#ffffff',
  border: `1px solid ${d ? '#334155' : '#e2e8f0'}`,
  borderRadius: 12,
  fontSize: 12,
  color: d ? '#f1f5f9' : '#0f172a',
});

const StatCard = ({ icon: Icon, label, value, suffix, accent, sub }: any) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 2xl:p-5 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 2xl:w-14 2xl:h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${accent}`}>
      <Icon size={24} strokeWidth={2.5} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] 2xl:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {suffix && <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{suffix}</span>}
      </div>
      {sub && <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 truncate">{sub}</p>}
    </div>
  </div>
);

const ChartCard = ({ title, icon: Icon, children, className = '' }: any) => (
  <div className={`bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 p-5 shadow-sm flex flex-col ${className}`}>
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon size={18} className="text-blue-500" strokeWidth={2.5} />}
      <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">{title}</h3>
    </div>
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

const EmptyChart = ({ label = 'Belum ada data' }: any) => (
  <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
    <Activity size={32} strokeWidth={1.5} />
    <p className="text-xs font-bold mt-2">{label}</p>
  </div>
);

const KpiRow = ({ kpi }: { kpi?: DashboardComprehensive['kpi'] }) => {
  if (!kpi) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 relative z-10">
      {/* Output aktual periode (dari Packing/FG yang CLOSED) */}
      <StatCard icon={Package} label="Output (Periode)" value={kpi.todayOutput} suffix="pcs"
        accent="bg-emerald-600 shadow-emerald-600/30" sub="Finished / Packing" />
      {/* WIP aktual + total OP tercatat */}
      <StatCard icon={Layers} label="Total WIP" value={kpi.totalWip} suffix="OP"
        accent="bg-amber-500 shadow-amber-500/30" sub={`${kpi.totalOps.toLocaleString()} OP total`} />
      {/* Hasil lolos inspeksi (nyata dari CP + QC) */}
      <StatCard icon={CheckSquare} label="Lolos (Good)" value={kpi.totalGood} suffix="pcs"
        accent="bg-teal-600 shadow-teal-600/30" sub="Inspeksi CP + QC" />
      {/* Defect rate nyata + jumlah NG */}
      <StatCard icon={Percent} label="Defect Rate" value={kpi.defectRate} suffix="%"
        accent="bg-rose-600 shadow-rose-600/30" sub={`${kpi.totalNg.toLocaleString()} pcs NG`} />
      {/* Pencapaian terhadap target (target = estimasi kapasitas line aktif) */}
      <StatCard icon={TrendingUp} label="Pencapaian Target" value={kpi.achievement} suffix="%"
        accent="bg-blue-600 shadow-blue-600/30" sub={`Target ${kpi.targetOutput.toLocaleString()} pcs`} />
    </div>
  );
};

const TopCharts = ({ data, dark }: { data: DashboardComprehensive | null; dark: boolean }) => {
  const hourly = data?.hourlyProduction || [];
  const status = (data?.statusDistribution || []).filter((x) => x.count > 0);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6 relative z-10">
      <ChartCard title="Produksi per Jam" icon={Clock} className="xl:col-span-2">
        {hourly.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={hourly} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: axisColor(dark) }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor(dark) }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle(dark)} cursor={{ fill: dark ? 'rgba(51,65,85,0.3)' : '#f1f5f9' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="output" name="Output" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={34} />
              <Line type="monotone" dataKey="target" name="Target" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      <ChartCard title="Status OP" icon={Layers}>
        {status.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={status} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {status.map((sd, i) => <Cell key={i} fill={STATUS_COLORS[sd.status] || '#64748b'} />)}
              </Pie>
              <Tooltip contentStyle={tipStyle(dark)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
};

const BottomPanels = ({ data, dark }: { data: DashboardComprehensive | null; dark: boolean }) => {
  const quality = data?.qualityTrend || [];
  const lines = data?.lineSummaries || [];
  const slow = data?.slowMovingOps || [];
  const recent = data?.recentActivities || [];
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-6 relative z-10">
      <ChartCard title="Tren Kualitas (7 Hari)" icon={Percent}>
        {quality.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={quality} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="qtGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisColor(dark) }} axisLine={false} tickLine={false} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: axisColor(dark) }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle(dark)} />
              <Area type="monotone" dataKey="defectRate" name="Defect %" stroke="#ef4444" strokeWidth={2.5} fill="url(#qtGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      <ChartCard title="Performa per Line" icon={Factory}>
        {lines.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={lines} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} vertical={false} />
              <XAxis dataKey="lineCode" tick={{ fontSize: 11, fill: axisColor(dark) }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor(dark) }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle(dark)} cursor={{ fill: dark ? 'rgba(51,65,85,0.3)' : '#f1f5f9' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="output" name="Output" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="target" name="Target" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      <ChartCard title="OP Lambat / Tertahan" icon={AlertTriangle}>
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
          {slow.length === 0 ? <EmptyChart label="Tidak ada OP tertahan" /> : slow.map((op, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
              <div className="min-w-0">
                <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{op.opNumber}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase">{op.currentStation}</p>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg shrink-0 ${op.hoursInStation >= 24 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{op.hoursInStation} jam</span>
            </div>
          ))}
        </div>
      </ChartCard>
      <ChartCard title="Aktivitas Terbaru" icon={Activity}>
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
          {recent.length === 0 ? <EmptyChart label="Belum ada aktivitas" /> : recent.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  <span className="font-mono">{a.opNumber}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal"> · {a.station} · {a.action}</span>
                </p>
                <p className="text-[10px] text-slate-400">{new Date(a.time).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">+{a.qty}</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
export const DashboardView = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardComprehensive | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [selectedLine, setSelectedLine] = useState(''); // '' = Semua Line
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  // ==========================================
  // FETCH DATA
  // ==========================================
  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
      if (selectedLine) {
        params.set('lineCode', selectedLine);
      }
      const qs = params.toString();
      const url = `${API_BASE_URL}/production-orders/dashboard-comprehensive${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
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
  }, [startDate, endDate, selectedLine]); // <-- selectedLine ditambahkan agar ganti line => refetch

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
  // RENDER
  // ==========================================
  return (
    <div className={`relative w-full bg-slate-50 dark:bg-slate-900 transition-all duration-500 overflow-x-hidden flex flex-col font-poppins ${isFullscreen ? 'h-screen overflow-y-auto p-4 2xl:p-6' : 'min-h-screen p-4 md:p-6 2xl:p-8'}`}>
      
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
        `}
      </style>

      {/* ==========================================
          HEADER 
      ========================================== */}
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 p-5 2xl:p-6 shadow-sm mb-6 z-20 flex-shrink-0">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="p-4 bg-blue-600 rounded-2xl shadow-md shadow-blue-600/30 relative z-10 transition-transform duration-300 group-hover:scale-105">
                <Cpu className="w-8 h-8 2xl:w-9 2xl:h-9 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2 uppercase">
                Production Dashboard
              </h1>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 w-max px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Live Sync: <span className="text-slate-800 dark:text-slate-200 ml-1">{lastUpdate || 'Connecting...'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
            
            {/* Solid Date Range Picker */}
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-slate-200 dark:border-slate-700 px-1 overflow-hidden">
              <div className="relative flex items-center">
                <Calendar className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" strokeWidth={2.5} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 pr-3 py-2.5 text-sm font-bold bg-transparent border-none text-slate-800 dark:text-white focus:outline-none focus:ring-0 cursor-pointer w-[145px]"
                />
              </div>
              <div className="h-6 w-0.5 bg-slate-200 dark:bg-slate-700 mx-1" />
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2.5 text-sm font-bold bg-transparent border-none text-slate-800 dark:text-white focus:outline-none focus:ring-0 cursor-pointer w-[130px]"
                />
              </div>
            </div>

            {/* Solid Select Dropdown */}
            <div className="relative group flex-shrink-0">
              <select
                value={selectedLine}
                onChange={(e) => setSelectedLine(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-5 pr-11 py-2.5 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer hover:border-blue-400 transition-colors min-w-[130px]"
              >
                <option value="">Semua Line</option>
                {data?.lineSummaries?.map(line => (
                  <option key={line.lineCode} value={line.lineCode}>{line.lineCode}</option>
                ))}
              </select>
              <Filter size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" strokeWidth={2.5} />
            </div>

            {/* Solid Action Buttons */}
            <div className="flex gap-2 ml-auto lg:ml-1">
              <button
                onClick={fetchData}
                disabled={refreshing}
                className="p-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm disabled:opacity-50 group"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-600 dark:text-slate-400 group-hover:text-blue-600'}`} strokeWidth={2.5} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm group"
              >
                {isFullscreen ? 
                  <Minimize2 className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600" strokeWidth={2.5} /> : 
                  <Maximize2 className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600" strokeWidth={2.5} />
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-6 relative z-10 flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
               <div key={i} className="h-36 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 animate-pulse" />
            ))}
          </div>
          <div className="h-full min-h-[400px] bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-700 animate-pulse" />
        </div>
      ) : (
        <>
          {/* ===== KPI ROW ===== */}
          <KpiRow kpi={data?.kpi} />

          {/* ===== TOP CHARTS: hourly + status ===== */}
          <TopCharts data={data} dark={isDarkMode} />

          {/* ===== STATION FLOW (pipeline) ===== */}
          <div className="relative z-10 flex flex-col pb-2">
            <StationFlow data={data?.stationFlow || []} />
          </div>

          {/* ===== BOTTOM PANELS: quality, line, slow, recent ===== */}
          <BottomPanels data={data} dark={isDarkMode} />
        </>
      )}

    </div>
  );
};