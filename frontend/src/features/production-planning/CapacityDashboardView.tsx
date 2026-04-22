import React, { useState } from 'react';
import { BarChart3, AlertTriangle, TrendingUp, Calendar, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export const CapacityDashboardView = () => {
  const [lineCode, setLineCode] = useState('K1YH');
  const [station, setStation] = useState('SEWING');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ lineCode, station, startDate, endDate });
      const res = await fetch(`${API_BASE_URL}/production-planning/capacity-load?${params}`, { headers: getAuthHeaders() });
      if (res.ok) setData(await res.json());
      else setError('Failed to load');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchData(); }, [lineCode, station, startDate, endDate]);

  const stationOptions = ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING'];

  return (
    <div className="p-6 space-y-6 font-poppins">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <BarChart3 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Capacity & Load Analysis</h1>
            <p className="text-xs text-slate-500">Real-time capacity vs actual+planned load</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div><label className="text-xs font-bold uppercase">Line Code</label><input type="text" className="w-full px-3 py-2 border-2 rounded-xl" value={lineCode} onChange={e => setLineCode(e.target.value)} /></div>
          <div><label className="text-xs font-bold uppercase">Station</label><select className="w-full px-3 py-2 border-2 rounded-xl" value={station} onChange={e => setStation(e.target.value)}>{stationOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="text-xs font-bold uppercase">Start Date</label><input type="date" className="w-full px-3 py-2 border-2 rounded-xl" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div><label className="text-xs font-bold uppercase">End Date</label><input type="date" className="w-full px-3 py-2 border-2 rounded-xl" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        </div>

        {loading && <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={32} /></div>}
        {error && <div className="bg-rose-100 p-4 rounded-xl text-rose-700">{error}</div>}
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl"><div className="text-xs font-bold uppercase">Capacity/Day</div><div className="text-2xl font-black">{data.capacityPerDay}</div></div>
              <div className="p-4 bg-slate-50 rounded-xl"><div className="text-xs font-bold uppercase">Available Days</div><div className="text-2xl font-black">{data.availableCapacityDays}</div></div>
              <div className="p-4 bg-slate-50 rounded-xl"><div className="text-xs font-bold uppercase">Existing Load (days)</div><div className="text-2xl font-black">{data.existingLoadDays}</div></div>
              <div className="p-4 bg-slate-50 rounded-xl"><div className="text-xs font-bold uppercase">Planned Load (days)</div><div className="text-2xl font-black">{data.plannedLoadDays}</div></div>
              <div className={`p-4 rounded-xl ${data.isOverload ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <div className="text-xs font-bold uppercase">Total Load vs Capacity</div>
                <div className="text-2xl font-black">{data.totalLoadDays} / {data.availableCapacityDays}</div>
                {data.isOverload && <div className="flex items-center gap-1 mt-2"><AlertTriangle size={14} /> Overload</div>}
              </div>
            </div>
            {data.recommendation && <div className="bg-amber-50 p-4 rounded-xl border-l-4 border-amber-500"><p className="text-sm font-bold">{data.recommendation}</p></div>}
            
            {/* Bagian baru: Progress bar dan ringkasan detail menggantikan chart */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold">Capacity Utilization</span>
                <span className={`text-sm font-black ${data.isOverload ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {data.availableCapacityDays > 0 
                    ? ((data.totalLoadDays / data.availableCapacityDays) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${data.isOverload ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ 
                    width: `${data.availableCapacityDays > 0 
                      ? Math.min((data.totalLoadDays / data.availableCapacityDays) * 100, 100) 
                      : 0}%` 
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                <div>
                  <span className="text-slate-500">Existing Load:</span>
                  <span className="font-bold ml-2">{data.existingLoadDays} days</span>
                </div>
                <div>
                  <span className="text-slate-500">Planned Load:</span>
                  <span className="font-bold ml-2">{data.plannedLoadDays} days</span>
                </div>
                <div>
                  <span className="text-slate-500">Available Capacity:</span>
                  <span className="font-bold ml-2">{data.availableCapacityDays} days</span>
                </div>
                <div>
                  <span className="text-slate-500">Capacity/Day:</span>
                  <span className="font-bold ml-2">{data.capacityPerDay} sets</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};