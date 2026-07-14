import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, RefreshCw, TrendingUp, Maximize2, Minimize2,
  Scissors, CheckSquare, Shirt, ShieldCheck, AlertTriangle, Percent,
  Layers, Calendar, Award, Boxes, Gauge, PackageCheck, Factory,
  Package, Truck, Workflow, ArrowDownToLine, ArrowUpFromLine, XCircle,
} from 'lucide-react';
import type { DashboardComprehensive } from '../../types/production';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, AreaChart, Area,
  PieChart, Pie, Cell, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const API_BASE_URL = 'http://202.52.15.30:4000';

// ============ PALETTE ============
const C = {
  blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  purple: '#8b5cf6', cyan: '#06b6d4', slate: '#64748b', orange: '#f97316', pink: '#ec4899',
};
const NG_PALETTE = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#06b6d4', '#3b82f6', '#ec4899', '#14b8a6'];

// ============ TYPES (analytics endpoint) ============
interface EntanPondPoint { label: string; entan: number; pond: number; }
interface PondPoint { label: string; good: number; ng: number; }
interface NgComp { name: string; good: number; ng: number; total: number; ngRate: number; }
interface QualityPoint { label: string; good: number; ng: number; ngRate: number; qualityRate: number; }
interface SewingPoint { label: string; start: number; finish: number; }
interface Analytics {
  range: string;
  mode: 'hour' | 'day';
  cutting: {
    entan: { productivity: EntanPondPoint[]; totalEntan: number; totalPond: number; };
    pond: { productivity: PondPoint[]; good: number; ng: number; total: number; ngRate: number; qualityRate: number; ngPerComponent: NgComp[]; };
  };
  checkPanel: { good: number; ng: number; total: number; ngRate: number; qualityRate: number; trend: QualityPoint[]; ngPerComponent: NgComp[]; };
  sewing: { totalStart: number; totalFinish: number; productivity: SewingPoint[]; trend: { label: string; output: number }[]; };
  qc: { good: number; ng: number; total: number; ngRate: number; qualityRate: number; trend: QualityPoint[]; ngPerCategory: { category: string; count: number }[]; };
}

type TabKey = 'flow' | 'entan' | 'pond' | 'cp' | 'sewing' | 'qc';
type RangeKey = 'today' | '7d' | '30d' | 'custom';

// ============ SMALL UI HELPERS ============
const fmtNum = (n: number) => (typeof n === 'number' ? n.toLocaleString('id-ID') : n);

const KpiCard = ({ title, value, icon: Icon, color, suffix }: {
  title: string; value: number | string; icon: any; color: string; suffix?: string;
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between" style={{ borderLeftColor: color }}>
    <div className="min-w-0">
      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{title}</div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1.5">
        {typeof value === 'number' ? fmtNum(value) : value}
        {suffix && <span className="text-xs font-semibold text-slate-400 ml-1">{suffix}</span>}
      </div>
    </div>
    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-3" style={{ backgroundColor: `${color}1a` }}>
      <Icon size={20} style={{ color }} />
    </div>
  </div>
);

const StatTile = ({ label, value, suffix, color, icon: Icon, caption }: {
  label: string; value: number | string; suffix?: string; color: string; icon: any; caption?: string;
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
      {typeof value === 'number' ? fmtNum(value) : value}
      {suffix && <span className="text-sm font-bold text-slate-400 ml-1">{suffix}</span>}
    </div>
    {caption && <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2">{caption}</div>}
  </div>
);

const ChartCard = ({ title, subtitle, icon: Icon, color, children }: {
  title: string; subtitle?: string; icon: any; color: string; children: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col">
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none">{title}</h3>
        {subtitle && <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

const EmptyState = ({ label = 'Belum ada data untuk rentang ini' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-10">
    <Boxes size={36} className="mb-2 opacity-60" />
    <p className="text-sm font-semibold text-center px-3">{label}</p>
  </div>
);

// ============ PRODUCTION FLOW (pipeline Cutting Entan -> Finished Goods) ============
const FLOW_STATIONS = [
  { key: 'CUTTING_ENTAN', label: 'Cutting Entan', icon: Scissors, color: C.orange, unit: 'sets' },
  { key: 'CUTTING_POND', label: 'Cutting Pond', icon: Layers, color: C.amber, unit: 'patterns' },
  { key: 'CP', label: 'Check Panel', icon: CheckSquare, color: C.green, unit: 'patterns' },
  { key: 'SEWING', label: 'Sewing', icon: Shirt, color: C.purple, unit: 'sets' },
  { key: 'QC', label: 'Quality Control', icon: ShieldCheck, color: C.red, unit: 'sets' },
  { key: 'PACKING', label: 'Packing', icon: Package, color: C.blue, unit: 'sets' },
  { key: 'FG', label: 'Finished Goods', icon: Truck, color: C.cyan, unit: 'sets' },
];

type FlowRow = { station: string; count: number; wipQty: number; todayInput: number; todayOutput: number; qtyNg: number; progress: number; };

const StationFlow = ({ data }: { data: FlowRow[] }) => {
  const byKey = new Map(data.map(d => [d.station, d]));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {FLOW_STATIONS.map((s, idx) => {
        const d = byKey.get(s.key) || { station: s.key, count: 0, wipQty: 0, todayInput: 0, todayOutput: 0, qtyNg: 0, progress: 0 };
        const showNg = s.key === 'CUTTING_POND' || s.key === 'CP' || s.key === 'QC';
        const wipLabel = s.key === 'CUTTING_ENTAN' ? 'Antrian' : s.key === 'FG' ? 'Stock' : 'WIP';
        return (
          <div key={s.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3.5 flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: s.color, boxShadow: `0 4px 12px ${s.color}50` }}>
                <s.icon size={17} strokeWidth={2.5} />
              </div>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">0{idx + 1}</span>
            </div>
            <h4 className="text-[12px] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-wide">{s.label}</h4>

            <div className="mt-2.5">
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>Progress</span><span className="text-slate-700 dark:text-slate-200">{d.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(d.progress, 100)}%`, backgroundColor: s.color }} />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><Activity size={11} />{wipLabel}</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{d.count}</span>
            </div>

            <div className="mt-1.5 flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1"><Layers size={11} />Qty</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">{fmtNum(d.wipQty)}</span>
            </div>

            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-center">
                <ArrowDownToLine size={12} className="text-indigo-500 mx-auto" strokeWidth={3} />
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">In</div>
                <div className="text-[11px] font-black text-slate-800 dark:text-white leading-none">{fmtNum(d.todayInput)}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-center">
                <ArrowUpFromLine size={12} className="text-emerald-500 mx-auto" strokeWidth={3} />
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Out</div>
                <div className="text-[11px] font-black text-slate-800 dark:text-white leading-none">{fmtNum(d.todayOutput)}</div>
              </div>
            </div>

            {showNg && (
              <div className="mt-1.5 flex items-center justify-between p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1"><XCircle size={11} />NG</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">{fmtNum(d.qtyNg)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============ MAIN ============
export const DashboardView = () => {
  const [comp, setComp] = useState<DashboardComprehensive | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [range, setRange] = useState<RangeKey>('7d');
  const [tab, setTab] = useState<TabKey>('flow');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmtD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const defStart = () => { const d = new Date(); d.setDate(d.getDate() - 6); return fmtD(d); };
  const [customStart, setCustomStart] = useState(defStart());
  const [customEnd, setCustomEnd] = useState(fmtD(new Date()));

  // Dark mode observer (mengikuti class 'dark' pada <html>)
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const rangeToDates = useCallback((r: RangeKey) => {
    if (r === 'custom') return { startDate: customStart, endDate: customEnd };
    const today = new Date();
    if (r === 'today') return { startDate: fmtD(today), endDate: fmtD(today) };
    const days = r === '30d' ? 30 : 7;
    const s = new Date(today); s.setDate(s.getDate() - (days - 1));
    return { startDate: fmtD(s), endDate: fmtD(today) };
  }, [customStart, customEnd]);

  const fetchAll = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const { startDate, endDate } = rangeToDates(range);
      const compQs = new URLSearchParams({ startDate, endDate });
      if (selectedLine) compQs.set('lineCode', selectedLine);
      const anaQs = new URLSearchParams();
      if (range === 'custom') { anaQs.set('startDate', startDate); anaQs.set('endDate', endDate); }
      else anaQs.set('range', range);
      if (selectedLine) anaQs.set('lineCode', selectedLine);

      const [compRes, anaRes] = await Promise.all([
        fetch(`${API_BASE_URL}/production-orders/dashboard-comprehensive?${compQs.toString()}`),
        fetch(`${API_BASE_URL}/production-orders/dashboard-analytics?${anaQs.toString()}`),
      ]);
      if (compRes.ok) setComp(await compRes.json());
      if (anaRes.ok) setAnalytics(await anaRes.json());
      setLastUpdate(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Failed to fetch dashboard', e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [range, selectedLine, rangeToDates]);

  useEffect(() => {
    fetchAll();
    const i = setInterval(() => fetchAll(true), 30000);
    return () => clearInterval(i);
  }, [fetchAll]);

  const kpi = comp?.kpi;
  const lines = comp?.lineSummaries || [];

  // Recharts shared styling
  const axisTick = { fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 };
  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const tooltipStyle = {
    contentStyle: {
      background: isDark ? '#1e293b' : '#ffffff',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 12, fontSize: 12, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    },
    labelStyle: { color: isDark ? '#e2e8f0' : '#0f172a', fontWeight: 700, marginBottom: 4 },
  };
  const rangeLabel = range === 'today' ? 'Hari ini (per jam)'
    : range === '30d' ? '30 hari terakhir'
    : range === 'custom' ? `${customStart} s/d ${customEnd}`
    : '7 hari terakhir';

  const TABS: { key: TabKey; label: string; icon: any; color: string }[] = [
    { key: 'flow', label: 'Production Flow', icon: Workflow, color: C.blue },
    { key: 'entan', label: 'Cutting Entan', icon: Scissors, color: C.orange },
    { key: 'pond', label: 'Cutting Pond', icon: Layers, color: C.amber },
    { key: 'cp', label: 'Check Panel', icon: CheckSquare, color: C.green },
    { key: 'sewing', label: 'Sewing', icon: Shirt, color: C.purple },
    { key: 'qc', label: 'Quality Control', icon: ShieldCheck, color: C.red },
  ];

  const donutData = (good: number, ng: number) => [{ name: 'Good', value: good }, { name: 'Not Good', value: ng }];
  const ngBar = (data: NgComp[], color: string, title: string, subtitle: string) => (
    <ChartCard title={title} subtitle={subtitle} icon={Percent} color={color}>
      {data.length === 0 ? <EmptyState label="Belum ada data pola" /> : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart layout="vertical" data={data.slice(0, 8)} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke }} unit="%" />
            <YAxis type="category" dataKey="name" tick={axisTick} tickLine={false} axisLine={false} width={92} />
            <Tooltip {...tooltipStyle} formatter={(v: any, _n: any, p: any) => [`${v}%  (NG ${p?.payload?.ng} / ${p?.payload?.total})`, 'Rate NG']} />
            <Bar dataKey="ngRate" name="Rate NG" radius={[0, 6, 6, 0]} maxBarSize={22}>
              {data.slice(0, 8).map((_, i) => <Cell key={i} fill={NG_PALETTE[i % NG_PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );

  return (
    <div className={`font-poppins text-slate-800 dark:text-slate-100 ${isFullscreen ? 'fixed inset-0 z-[200] bg-slate-50 dark:bg-slate-900 overflow-auto p-4' : ''} animate-in fade-in duration-300`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        .font-poppins { font-family: 'Poppins', sans-serif; }
      `}</style>

      {/* ===== HEADER ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-5 mb-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Factory size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Production Dashboard
                <span className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-md font-bold uppercase tracking-wider hidden sm:inline">Live</span>
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Calendar size={12} /> {rangeLabel}
                {lastUpdate && <span className="text-slate-400">• update {lastUpdate}</span>}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {/* Range selector */}
            <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1">
              {(['today', '7d', '30d', 'custom'] as RangeKey[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${range === r ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-600/50'}`}
                >
                  {r === 'today' ? 'Hari ini' : r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : 'Custom'}
                </button>
              ))}
            </div>

            {/* Custom date pickers */}
            {range === 'custom' && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1">
                <input type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none" />
                <span className="text-slate-400 text-xs font-bold">→</span>
                <input type="date" value={customEnd} min={customStart} max={fmtD(new Date())} onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none" />
              </div>
            )}

            {/* Line filter */}
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">Semua Line</option>
              {lines.map(l => <option key={l.lineCode} value={l.lineCode}>{l.lineCode}</option>)}
            </select>

            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="group px-3 py-2 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-colors text-xs"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : 'group-hover:rotate-180 transition-transform duration-500'} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setIsFullscreen(v => !v)}
              className="p-2 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:border-blue-500 transition-colors"
              title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* ===== KPI STRIP ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
        <KpiCard title="Output Periode" value={kpi?.todayOutput ?? 0} suffix="sets" icon={PackageCheck} color={C.blue} />
        <KpiCard title="Total WIP" value={kpi?.totalWip ?? 0} icon={Layers} color={C.amber} />
        <KpiCard title="Good (CP+QC)" value={kpi?.totalGood ?? 0} icon={Award} color={C.green} />
        <KpiCard title="Defect Rate" value={kpi ? `${kpi.defectRate}` : '0'} suffix="%" icon={AlertTriangle} color={C.red} />
        <KpiCard title="Achievement" value={kpi ? `${kpi.achievement}` : '0'} suffix="%" icon={TrendingUp} color={C.purple} />
      </div>

      {/* ===== TAB BAR ===== */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${active ? 'text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
              style={active ? { backgroundColor: t.color, boxShadow: `0 4px 14px ${t.color}55` } : undefined}
            >
              <t.icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ===== TAB CONTENT ===== */}
      {loading && !analytics ? (
        <div className="h-72 flex items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <RefreshCw size={32} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">

          {/* ---------- PRODUCTION FLOW ---------- */}
          {tab === 'flow' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${C.blue}1a` }}>
                  <Workflow size={18} style={{ color: C.blue }} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none">Alur Produksi — Cutting Entan → Finished Goods</h3>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">Status tiap station: antrian/WIP, input, output, dan NG</p>
                </div>
              </div>
              <StationFlow data={comp?.stationFlow || []} />
            </div>
          )}

          {/* ---------- CUTTING ENTAN ---------- */}
          {tab === 'entan' && analytics && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatTile label="Output Entan" value={analytics.cutting.entan.totalEntan} suffix="pcs" color={C.orange} icon={Scissors} caption="Total dikirim ke Pond" />
                <StatTile label="Output Pond" value={analytics.cutting.entan.totalPond} suffix="pcs" color={C.amber} icon={Layers} caption="Total pola lolos hitung" />
                <StatTile
                  label="Throughput Pond"
                  value={analytics.cutting.entan.totalEntan > 0 ? Math.round((analytics.cutting.entan.totalPond / analytics.cutting.entan.totalEntan) * 100) : 0}
                  suffix="%" color={C.green} icon={Gauge} caption="Output Pond / Output Entan"
                />
              </div>
              <ChartCard title="Grafik Produktivitas Entan & Pond" subtitle="Output Cutting Entan vs Cutting Pond per periode" icon={TrendingUp} color={C.orange}>
                {analytics.cutting.entan.productivity.every(p => p.entan + p.pond === 0) ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={analytics.cutting.entan.productivity} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke }} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                      <Bar dataKey="entan" name="Output Entan" fill={C.orange} radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Line type="monotone" dataKey="pond" name="Output Pond" stroke={C.amber} strokeWidth={3} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {/* ---------- CUTTING POND ---------- */}
          {tab === 'pond' && analytics && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile label="Rate Kualitas" value={analytics.cutting.pond.qualityRate} suffix="%" color={C.green} icon={Gauge} caption={`${fmtNum(analytics.cutting.pond.good)} good`} />
                <StatTile label="Rate NG" value={analytics.cutting.pond.ngRate} suffix="%" color={C.red} icon={AlertTriangle} caption={`${fmtNum(analytics.cutting.pond.ng)} NG (pola)`} />
                <StatTile label="Total Pola" value={analytics.cutting.pond.total} suffix="pcs" color={C.amber} icon={Layers} caption="Good + NG" />
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
                  {analytics.cutting.pond.total === 0 ? <EmptyState label="Belum ada data" /> : (
                    <ResponsiveContainer width="100%" height={96}>
                      <PieChart>
                        <Pie data={donutData(analytics.cutting.pond.good, analytics.cutting.pond.ng)} dataKey="value" nameKey="name" innerRadius={26} outerRadius={42} paddingAngle={2}>
                          <Cell fill={C.green} /><Cell fill={C.red} />
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Produktivitas Pond (Good vs NG)" subtitle="Hasil hitung pola per periode" icon={Layers} color={C.amber}>
                  {analytics.cutting.pond.productivity.every(p => p.good + p.ng === 0) ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analytics.cutting.pond.productivity} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke }} />
                        <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                        <Bar dataKey="good" name="Good" fill={C.green} radius={[4, 4, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="ng" name="Not Good" fill={C.red} radius={[4, 4, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
                {ngBar(analytics.cutting.pond.ngPerComponent, C.red, 'Rate NG per Komponen / Pola', 'Persentase NG tiap pola (Cutting Pond)')}
              </div>
            </div>
          )}

          {/* ---------- CHECK PANEL ---------- */}
          {tab === 'cp' && analytics && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile label="Rate Kualitas" value={analytics.checkPanel.qualityRate} suffix="%" color={C.green} icon={Gauge} caption={`${fmtNum(analytics.checkPanel.good)} good`} />
                <StatTile label="Rate NG" value={analytics.checkPanel.ngRate} suffix="%" color={C.red} icon={AlertTriangle} caption={`${fmtNum(analytics.checkPanel.ng)} not good`} />
                <StatTile label="Total Inspeksi" value={analytics.checkPanel.total} suffix="pola" color={C.blue} icon={CheckSquare} caption="Good + Not Good" />
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
                  {analytics.checkPanel.total === 0 ? <EmptyState label="Belum ada inspeksi" /> : (
                    <ResponsiveContainer width="100%" height={96}>
                      <PieChart>
                        <Pie data={donutData(analytics.checkPanel.good, analytics.checkPanel.ng)} dataKey="value" nameKey="name" innerRadius={26} outerRadius={42} paddingAngle={2}>
                          <Cell fill={C.green} /><Cell fill={C.red} />
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Trend Kualitas" subtitle="Rate Kualitas vs Rate NG per periode" icon={TrendingUp} color={C.green}>
                  {analytics.checkPanel.trend.every(t => t.good + t.ng === 0) ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={analytics.checkPanel.trend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cpQual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.35} /><stop offset="95%" stopColor={C.green} stopOpacity={0} /></linearGradient>
                          <linearGradient id="cpNg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red} stopOpacity={0.3} /><stop offset="95%" stopColor={C.red} stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke }} />
                        <YAxis tick={axisTick} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                        <Area type="monotone" dataKey="qualityRate" name="Rate Kualitas" stroke={C.green} strokeWidth={2.5} fill="url(#cpQual)" />
                        <Area type="monotone" dataKey="ngRate" name="Rate NG" stroke={C.red} strokeWidth={2.5} fill="url(#cpNg)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
                {ngBar(analytics.checkPanel.ngPerComponent, C.red, 'Rate NG per Komponen / Pola', 'Persentase NG tiap pola (Check Panel)')}
              </div>
            </div>
          )}

          {/* ---------- SEWING ---------- */}
          {tab === 'sewing' && analytics && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatTile label="Total Sewing Start" value={analytics.sewing.totalStart} suffix="sets" color={C.blue} icon={Activity} caption="Mulai dijahit" />
                <StatTile label="Total Sewing Finish" value={analytics.sewing.totalFinish} suffix="sets" color={C.green} icon={PackageCheck} caption="Selesai dijahit" />
                <StatTile
                  label="Efisiensi Finish"
                  value={analytics.sewing.totalStart > 0 ? Math.round((analytics.sewing.totalFinish / analytics.sewing.totalStart) * 100) : 0}
                  suffix="%" color={C.purple} icon={Gauge} caption="Finish / Start"
                />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Grafik Produktivitas" subtitle="Sewing Start vs Finish per periode" icon={Shirt} color={C.purple}>
                  {analytics.sewing.productivity.every(p => p.start + p.finish === 0) ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analytics.sewing.productivity} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke }} />
                        <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                        <Bar dataKey="start" name="Start" fill={C.blue} radius={[4, 4, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="finish" name="Finish" fill={C.purple} radius={[4, 4, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Trend Produktivitas" subtitle="Output finish sewing per periode" icon={TrendingUp} color={C.green}>
                  {analytics.sewing.trend.every(p => p.output === 0) ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={analytics.sewing.trend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                        <defs>
                          <linearGradient id="swTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.4} /><stop offset="95%" stopColor={C.green} stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke }} />
                        <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Area type="monotone" dataKey="output" name="Output" stroke={C.green} strokeWidth={3} fill="url(#swTrend)" dot={{ r: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </div>
          )}

          {/* ---------- QUALITY CONTROL ---------- */}
          {tab === 'qc' && analytics && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile label="Rate Kualitas" value={analytics.qc.qualityRate} suffix="%" color={C.green} icon={Gauge} caption={`${fmtNum(analytics.qc.good)} good`} />
                <StatTile label="Rate NG" value={analytics.qc.ngRate} suffix="%" color={C.red} icon={AlertTriangle} caption={`${fmtNum(analytics.qc.ng)} not good`} />
                <StatTile label="Total Inspeksi" value={analytics.qc.total} suffix="sets" color={C.blue} icon={ShieldCheck} caption="Good + Not Good" />
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
                  {analytics.qc.total === 0 ? <EmptyState label="Belum ada inspeksi" /> : (
                    <ResponsiveContainer width="100%" height={96}>
                      <PieChart>
                        <Pie data={donutData(analytics.qc.good, analytics.qc.ng)} dataKey="value" nameKey="name" innerRadius={26} outerRadius={42} paddingAngle={2}>
                          <Cell fill={C.green} /><Cell fill={C.red} />
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Trend Kualitas" subtitle="Rate Kualitas vs Rate NG per periode" icon={TrendingUp} color={C.green}>
                  {analytics.qc.trend.every(t => t.good + t.ng === 0) ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={analytics.qc.trend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                        <defs>
                          <linearGradient id="qcQual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.35} /><stop offset="95%" stopColor={C.green} stopOpacity={0} /></linearGradient>
                          <linearGradient id="qcNg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red} stopOpacity={0.3} /><stop offset="95%" stopColor={C.red} stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke }} />
                        <YAxis tick={axisTick} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                        <Area type="monotone" dataKey="qualityRate" name="Rate Kualitas" stroke={C.green} strokeWidth={2.5} fill="url(#qcQual)" />
                        <Area type="monotone" dataKey="ngRate" name="Rate NG" stroke={C.red} strokeWidth={2.5} fill="url(#qcNg)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Rate NG per Kategori" subtitle="Jumlah temuan NG per kategori defect (QC)" icon={AlertTriangle} color={C.red}>
                  {analytics.qc.ngPerCategory.length === 0 ? <EmptyState label="Tidak ada NG pada rentang ini" /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart layout="vertical" data={analytics.qc.ngPerCategory.slice(0, 8)} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                        <XAxis type="number" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke }} allowDecimals={false} />
                        <YAxis type="category" dataKey="category" tick={axisTick} tickLine={false} axisLine={false} width={104} />
                        <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} temuan`, 'Jumlah NG']} />
                        <Bar dataKey="count" name="Jumlah NG" radius={[0, 6, 6, 0]} maxBarSize={22}>
                          {analytics.qc.ngPerCategory.slice(0, 8).map((_, i) => <Cell key={i} fill={NG_PALETTE[i % NG_PALETTE.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};