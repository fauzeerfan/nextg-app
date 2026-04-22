import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Loader2, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE_URL = 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export const PlanVsActualView = () => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`${API_BASE_URL}/production-planning/plan-vs-actual?${params}`, { headers: getAuthHeaders() });
      if (res.ok) setData(await res.json());
      else setError('Failed to load');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  return (
    <div className="p-6 space-y-6 font-poppins">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Plan vs Actual Monitor</h1>
              <p className="text-xs text-slate-500">OTD rate and daily production comparison</p>
            </div>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2"><Download size={16} /> Refresh</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div><label className="text-xs font-bold uppercase">Start Date</label><input type="date" className="w-full px-3 py-2 border-2 rounded-xl" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div><label className="text-xs font-bold uppercase">End Date</label><input type="date" className="w-full px-3 py-2 border-2 rounded-xl" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>}
        {error && <div className="bg-rose-100 p-4 rounded-xl text-rose-700">{error}</div>}
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl"><div className="text-xs font-bold uppercase">OTD Rate</div><div className="text-3xl font-black text-emerald-600">{data.otdRate}%</div></div>
              <div className="p-4 bg-slate-50 rounded-xl"><div className="text-xs font-bold uppercase">Total Planned</div><div className="text-3xl font-black text-blue-600">{data.totalPlannedQty}</div></div>
              <div className="p-4 bg-slate-50 rounded-xl"><div className="text-xs font-bold uppercase">Total Actual</div><div className="text-3xl font-black text-amber-600">{data.totalActualQty}</div></div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="planned" stroke="#3b82f6" name="Planned" />
                  <Line type="monotone" dataKey="actual" stroke="#10b981" name="Actual" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};