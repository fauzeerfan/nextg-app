import { useState, useEffect } from 'react';
import { Activity, Layers, Users, Shirt, RefreshCw, Loader2, TrendingUp, AlertCircle, Clock, CheckCircle, Target, Gauge, Cpu, Wifi, Factory } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

type MetricColor = 'blue' | 'emerald' | 'rose' | 'amber' | 'purple';
type StatusColor = 'blue' | 'emerald' | 'amber' | 'purple';

const MetricCard = ({ title, value, icon: Icon, color = 'blue', subtitle, suffix, trend }: {
  title: string;
  value: number | string;
  icon: any;
  color?: MetricColor;
  subtitle?: string;
  suffix?: string;
  trend?: string;
}) => {
  const colorClasses: Record<MetricColor, { bg: string; icon: string; darkBg: string }> = {
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/30 to-blue-900/10' },
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/30 to-emerald-900/10' },
    rose: { bg: 'from-rose-100 to-rose-50', icon: 'text-rose-600', darkBg: 'from-rose-900/30 to-rose-900/10' },
    amber: { bg: 'from-amber-100 to-amber-50', icon: 'text-amber-600', darkBg: 'from-amber-900/30 to-amber-900/10' },
    purple: { bg: 'from-purple-100 to-purple-50', icon: 'text-purple-600', darkBg: 'from-purple-900/30 to-purple-900/10' }
  };
  const c = colorClasses[color];
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/90 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xl font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{title}</span>
        <div className={`w-14 h-14 bg-gradient-to-br ${c.bg} dark:${c.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={28} className={c.icon} />
        </div>
      </div>
      <div className="text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="text-2xl text-slate-500 dark:text-slate-400 ml-2">{suffix}</span>}
      </div>
      {subtitle && <div className="text-base text-slate-500 dark:text-slate-400 mt-3">{subtitle}</div>}
      {trend && <div className="flex items-center gap-2 mt-4 text-base"><TrendingUp size={18} className="text-emerald-500"/><span className="text-emerald-600 dark:text-emerald-400 font-bold">{trend}</span></div>}
    </div>
  );
};

const StationCard = ({ station, count, isHighLoad }: any) => (
  <div className={`group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden ${isHighLoad ? 'border-amber-400 dark:border-amber-600' : 'border-slate-200 dark:border-slate-700'}`}>
    <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${station.colorClass}`} />
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${station.colorClass} flex items-center justify-center text-white text-2xl`}>{station.icon}</div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">{station.label}</span>
        </div>
        {isHighLoad && <div className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 dark:from-amber-900/40 dark:to-amber-900/20 dark:text-amber-300">BUSY</div>}
      </div>
      <div className="flex items-end gap-2"><span className="text-5xl font-extrabold text-slate-900 dark:text-white">{count}</span><span className="text-lg text-slate-500 dark:text-slate-400 mb-1">Orders</span></div>
    </div>
  </div>
);

const StatusCard = ({ icon: Icon, title, value, status, subtitle, color = 'blue' }: {
  icon: any;
  title: string;
  value: string | number;
  status?: React.ReactNode;
  subtitle?: string;
  color?: StatusColor;
}) => {
  const colorClasses: Record<StatusColor, string> = {
    blue: 'from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 text-blue-600 dark:text-blue-400',
    emerald: 'from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 text-emerald-600 dark:text-emerald-400',
    amber: 'from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 text-amber-600 dark:text-amber-400',
    purple: 'from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 text-purple-600 dark:text-purple-400',
  };
  const c = colorClasses[color];
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/90 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${c} rounded-xl flex items-center justify-center`}>
            <Icon size={24} className={c.split(' ')[2]} />
          </div>
          <span className="text-xl font-bold text-slate-700 dark:text-slate-300">{title}</span>
        </div>
        {status}
      </div>
      <div className="text-4xl font-extrabold text-slate-900 dark:text-white">{value}</div>
      {subtitle && <div className="text-base text-slate-500 dark:text-slate-400 mt-3">{subtitle}</div>}
    </div>
  );
};

const ActiveOrdersTable = ({ orders }: { orders: ProductionOrder[] }) => (
  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/90 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
    <div className="p-6 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 rounded-xl flex items-center justify-center"><Activity size={28} className="text-blue-600 dark:text-blue-400"/></div>
          <div><h3 className="text-2xl font-bold text-slate-900 dark:text-white">Live Production Orders</h3></div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
          <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"/></span>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">LIVE</span>
        </div>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="bg-slate-100 dark:bg-slate-900/70 border-b-2 border-slate-200 dark:border-slate-700">
          <th className="text-left py-5 px-6 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase">OP No.</th>
          <th className="text-left py-5 px-6 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase">Style</th>
          <th className="text-left py-5 px-6 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase">Progress</th>
          <th className="text-left py-5 px-6 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase">Station</th>
          <th className="text-left py-5 px-6 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase">Packed / Target</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {orders.length === 0 ? (
            <tr><td colSpan={5} className="p-12 text-center"><div className="flex flex-col items-center gap-4 py-12"><div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center"><Activity size={40} className="text-slate-400"/></div><p className="text-2xl text-slate-500 dark:text-slate-400 font-medium">No active orders</p><p className="text-base text-slate-400 dark:text-slate-500">Start production to see live data here</p></div></td></tr>
          ) : orders.map(o => {
            const pct = Math.min(Math.round((o.qtyPacking / o.qtyOp) * 100), 100);
            return <tr key={o.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
              <td className="py-5 px-6"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-xl flex items-center justify-center group-hover:from-slate-200 dark:group-hover:from-slate-700"><Activity size={20} className="text-slate-600 dark:text-slate-400"/></div><div><div className="text-xl font-bold text-slate-900 dark:text-white">{o.opNumber}</div><div className="text-sm text-slate-500 dark:text-slate-400">OP-{o.id}</div></div></div></td>
              <td className="py-5 px-6"><div className="text-xl font-semibold text-slate-900 dark:text-white">{o.styleCode}</div><div className="text-sm text-slate-500 dark:text-slate-400">Style #{o.id}</div></td>
              <td className="py-5 px-6"><div className="w-56"><div className="flex justify-between text-base mb-2"><span className="font-bold text-slate-700 dark:text-slate-300">Completion</span><span className="font-extrabold text-slate-900 dark:text-white">{pct}%</span></div><div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden"><div className={`h-3 rounded-full transition-all duration-700 ${pct>=100?'bg-gradient-to-r from-emerald-500 to-emerald-600':'bg-gradient-to-r from-blue-500 to-cyan-500'}`} style={{width:`${pct}%`}}/></div></div></td>
              <td className="py-5 px-6"><span className={`px-4 py-2 rounded-lg text-sm font-bold border uppercase ${o.currentStation==='FG'?'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border-emerald-200 dark:from-emerald-900/30 dark:to-emerald-900/10 dark:text-emerald-300 dark:border-emerald-800':o.currentStation==='CUTTING_ENTAN'||o.currentStation==='CUTTING_POND'?'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-800 border-slate-200 dark:from-slate-900/30 dark:to-slate-900/10 dark:text-slate-300 dark:border-slate-800':'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border-blue-200 dark:from-blue-900/30 dark:to-blue-900/10 dark:text-blue-300 dark:border-blue-800'}`}>{o.currentStation}</span></td>
              <td className="py-5 px-6"><div className="flex flex-col items-end"><div className="text-2xl font-bold text-slate-900 dark:text-white"><span className="text-emerald-600 dark:text-emerald-400">{o.qtyPacking.toLocaleString()}</span><span className="text-slate-400 text-xl font-normal mx-2">/</span><span className="text-slate-600 dark:text-slate-300">{o.qtyOp.toLocaleString()}</span></div><div className="text-sm text-slate-500 dark:text-slate-400 mt-2">{o.qtyOp - o.qtyPacking} left</div></div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </div>
);

interface DashboardData { kpi: { wip: number; output: number; ngRate: string; speed: number; }; stations: { name: string; count: number }[]; activeOps: ProductionOrder[]; factoryStatus?: { activeOperators: number; activeLines: number; shiftTarget: number; currentAchievement: number; }; }

export const DashboardView = () => {
  const [load, setLoad] = useState(true);
  const [d, setD] = useState<DashboardData | null>(null);
  const [upd, setUpd] = useState('');

  const fetchData = async () => {
    try {
      const [statsRes, factoryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/production-orders/dashboard-stats`),
        fetch(`${API_BASE_URL}/factory/status`)
      ]);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        let factory = null;
        if (factoryRes.ok) factory = await factoryRes.json();
        setD({ ...stats, factoryStatus: factory });
        setUpd(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
      }
    } catch (e) { console.error('Failed to load dashboard stats:', e); } finally { setLoad(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, []);

  const kpi = d?.kpi || { wip:0, output:0, ngRate:'0.0', speed:0 };
  const stationStats = d?.stations || [];
  const activeOps = d?.activeOps || [];
  const fs = d?.factoryStatus || { activeOperators:0, activeLines:0, shiftTarget:0, currentAchievement:0 };

  const getCnt = (code: string) => stationStats.find(s => s.name === code)?.count || 0;
  const eff = fs.shiftTarget > 0 ? Math.min(100, Math.round((fs.currentAchievement / fs.shiftTarget) * 100)) : 0;

  const STATION_FLOW = [
    { id:'CUTTING_ENTAN', label:'Cutting Entan', colorClass:'from-blue-500 to-cyan-500', icon:'✂️' },
    { id:'CUTTING_POND', label:'Cutting Pond', colorClass:'from-sky-500 to-blue-500', icon:'✂️' },
    { id:'CP', label:'Check Panel', colorClass:'from-indigo-500 to-blue-500', icon:'✓' },
    { id:'SEWING', label:'Sewing', colorClass:'from-purple-500 to-pink-500', icon:'🧵' },
    { id:'QC', label:'Quality Control', colorClass:'from-rose-500 to-red-500', icon:'🔍' },
    { id:'PACKING', label:'Packing', colorClass:'from-orange-500 to-amber-500', icon:'📦' },
    { id:'FG', label:'Finished Goods', colorClass:'from-emerald-500 to-green-500', icon:'⭐' },
  ];

  if (load && !d) return <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950"><div className="text-center"><Loader2 size={64} className="animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-6"/><p className="text-2xl text-slate-600 dark:text-slate-400">Loading production dashboard...</p></div></div>;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 px-4 md:px-6 lg:px-8 py-6">
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight drop-shadow-lg">PRODUCTION DASHBOARD</h1>
        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex items-center gap-3"><span className="relative flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"/></span><span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 uppercase">LIVE</span></div>
          <div className="h-8 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-3 text-lg text-slate-600 dark:text-slate-400"><Clock size={22}/><span>Last update: {upd || '—'}</span></div>
          <button onClick={fetchData} disabled={load} className="p-3 bg-slate-200 dark:bg-slate-800 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" title="Refresh"><RefreshCw size={22} className={load?'animate-spin':''}/></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 mb-10">
        <MetricCard title="WIP" value={kpi.wip} icon={Layers} color="blue" suffix="units" subtitle="Work in progress" />
        <MetricCard title="TODAY OUTPUT" value={kpi.output} icon={Shirt} color="emerald" suffix="pcs" trend={`${kpi.speed} pcs/hr`} />
        <MetricCard title="DEFECT RATE" value={`${kpi.ngRate}%`} icon={AlertCircle} color="rose" subtitle="Global avg" />
        <MetricCard title="EFFICIENCY" value={`${eff}%`} icon={Gauge} color="amber" subtitle="vs shift target" />
        <MetricCard title="OPERATORS" value={fs.activeOperators} icon={Users} color="purple" subtitle="Active on floor" />
        <MetricCard title="ACTIVE LINES" value={`${fs.activeLines}/4`} icon={Factory} color="blue" subtitle="Production lines" />
      </div>

      <div className="mb-10">
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/90 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          <div className="p-6 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10">
            <div className="flex items-center gap-4"><div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 rounded-xl flex items-center justify-center"><Cpu size={28} className="text-purple-600 dark:text-purple-400"/></div><div><h3 className="text-2xl font-bold text-slate-900 dark:text-white">Workload Distribution</h3></div></div>
          </div>
          <div className="p-6"><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-6">{STATION_FLOW.map(s => <StationCard key={s.id} station={s} count={getCnt(s.id)} isHighLoad={getCnt(s.id)>=3} />)}</div></div>
        </div>
      </div>

      <div className="mb-10"><ActiveOrdersTable orders={activeOps} /></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard icon={Users} title="Active Operators" value={fs.activeOperators} status={<CheckCircle size={28} className="text-emerald-500"/>} subtitle="Currently working on production floor" color="blue"/>
        <StatusCard icon={Factory} title="Active Lines" value={`${fs.activeLines} / 4`} status={<span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-4 py-2 rounded-full">{fs.activeLines} running</span>} subtitle={`${fs.activeLines} lines in production`} color="emerald"/>
        <StatusCard icon={Target} title="Shift Target" value={fs.shiftTarget.toLocaleString()} status={<span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-full">{eff}%</span>} subtitle={`${fs.currentAchievement.toLocaleString()} achieved • ${Math.max(0, fs.shiftTarget - fs.currentAchievement).toLocaleString()} left`} color="amber"/>
      </div>

      <div className="mt-10 text-center text-base text-slate-500 dark:text-slate-400 border-t-2 border-slate-200 dark:border-slate-800 pt-6">
        <div className="flex items-center justify-center gap-4"><Wifi size={20} className="text-blue-500"/><span>Auto‑refresh every 10 seconds • Data shown is real‑time from production floor</span></div>
      </div>
    </div>
  );
};