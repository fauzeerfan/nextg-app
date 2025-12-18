import { useState, useEffect } from 'react';
import { Activity, Layers, Users, Shirt, RefreshCw, Loader2 } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

// --- SUB-COMPONENTS ---

export const ActiveOrdersTable = ({ orders }: { orders: ProductionOrder[] }) => (
  <div className="bg-white dark:bg-[#0f172a] rounded-xl overflow-hidden h-full border border-slate-200 dark:border-slate-800 shadow-sm">
    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
      <h3 className="font-bold text-black dark:text-white text-sm">Live Production Orders</h3>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-bold text-emerald-600 uppercase">Live Updates</span>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800">
          <tr><th className="px-6 py-3 font-bold">OP No.</th><th className="px-6 py-3 font-bold">Style</th><th className="px-6 py-3 font-bold">Completion</th><th className="px-6 py-3 font-bold">Current Station</th><th className="px-6 py-3 font-bold text-right">Packed / Target</th></tr>
        </thead>
        <tbody className="text-black dark:text-white">
          {orders.length === 0 && (
             <tr><td colSpan={5} className="p-6 text-center text-slate-400 italic">No active orders running.</td></tr>
          )}
          {orders.map((order) => {
            const pct = Math.min(Math.round((order.packedQty / order.targetQty) * 100), 100);
            return (
                <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-xs">{order.opNumber}</td>
                <td className="px-6 py-4 font-medium">{order.styleCode}</td>
                <td className="px-6 py-4 w-48">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                            <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }}></div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        order.currentStation === 'FG' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                        order.currentStation === 'CUTTING' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                    }`}>
                        {order.currentStation}
                    </span>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold">
                    <span className="text-emerald-600">{order.packedQty}</span>
                    <span className="text-slate-400 text-xs"> / {order.targetQty}</span>
                </td>
                </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// --- MAIN DASHBOARD CONTENT ---

export const DashboardContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    kpi: { wip: number, output: number, ngRate: string, speed: number },
    stations: { name: string, count: number }[],
    activeOps: ProductionOrder[]
  } | null>(null);

  const fetchDashboardData = async () => {
      try {
          const res = await fetch(`${API_BASE_URL}/production-orders/dashboard-stats`);
          if (res.ok) {
              const result = await res.json();
              setData(result);
          }
      } catch (e) {
          console.error("Failed to load dashboard stats");
      } finally {
          setIsLoading(false);
      }
  };

  // Initial Load
  useEffect(() => { 
      fetchDashboardData(); 
      
      // AUTO REFRESH: Polling setiap 5 detik
      const interval = setInterval(() => {
          fetchDashboardData();
      }, 5000);

      return () => clearInterval(interval);
  }, []);

  const kpi = data?.kpi || { wip: 0, output: 0, ngRate: '0.0', speed: 0 };
  const stationStats = data?.stations || [];
  const activeOps = data?.activeOps || [];

  const getStationCount = (code: string) => stationStats.find(s => s.name === code)?.count || 0;

  const STATION_FLOW = [
      { id: 'CUTTING', label: 'Cutting', color: 'blue' },
      { id: 'CP', label: 'Check Panel', color: 'indigo' },
      { id: 'SEWING', label: 'Sewing', color: 'purple' },
      { id: 'QC', label: 'QC', color: 'rose' },
      { id: 'PACKING', label: 'Packing', color: 'orange' },
      { id: 'FG', label: 'Finished', color: 'emerald' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Global KPIs */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity size={16}/> Global Factory Pulse
            </h2>
            <p className="text-xs text-slate-400 mt-1">Real-time data from production floor.</p>
          </div>
          <button onClick={() => fetchDashboardData()} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-500">
            {isLoading ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
          </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#0f172a] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 p-3 opacity-10"><Layers size={64}/></div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide">Total WIP (Pcs)</div>
            <div className="text-3xl font-extrabold text-blue-600">{kpi.wip}</div>
            <div className="text-xs text-slate-400 mt-1">Items in process</div>
          </div>
          <div className="bg-white dark:bg-[#0f172a] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 p-3 opacity-10"><Shirt size={64}/></div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide">Output Today</div>
            <div className="text-3xl font-extrabold text-emerald-600">{kpi.output}</div>
            <div className="text-xs text-emerald-600/80 mt-1 font-bold">~{kpi.speed} pcs/hr</div>
          </div>
          <div className="bg-white dark:bg-[#0f172a] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 p-3 opacity-10"><Activity size={64}/></div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide">Defect Rate</div>
            <div className={`text-3xl font-extrabold ${Number(kpi.ngRate) > 5 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>{kpi.ngRate}%</div>
            <div className="text-xs text-slate-400 mt-1">Global Average</div>
          </div>
          <div className="bg-white dark:bg-[#0f172a] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 p-3 opacity-10"><Users size={64}/></div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide">Active OPs</div>
            <div className="text-3xl font-extrabold text-black dark:text-white">{activeOps.length}</div>
            <div className="text-xs text-slate-400 mt-1">Running Orders</div>
          </div>
      </div>
      </div>

      {/* 2. STATION FLOW */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers size={16}/> Workload Distribution
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STATION_FLOW.map((st) => {
            const count = getStationCount(st.id);
            const isHighLoad = count >= 3; 
            return (
              <div key={st.id} className={`relative bg-white dark:bg-[#0f172a] rounded-xl border transition-all ${isHighLoad ? 'border-amber-400 dark:border-amber-600 shadow-md' : 'border-slate-200 dark:border-slate-800 shadow-sm'}`}>
                <div className={`h-1.5 w-full rounded-t-xl bg-${st.color}-500`}></div>
                <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-sm text-black dark:text-white">{st.label}</h3>
                        {isHighLoad && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">BUSY</span>}
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-extrabold text-slate-700 dark:text-slate-200">{count}</span>
                        <span className="text-xs text-slate-400 mb-1">Orders</span>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. ACTIVE ORDERS TABLE */}
      <div className="w-full">
         <ActiveOrdersTable orders={activeOps} />
      </div>

    </div>
  );
};