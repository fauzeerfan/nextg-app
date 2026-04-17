import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, TrendingUp, TrendingDown, Users, Target, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const API_BASE_URL = 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const TargetMonitoringView = () => {
  const [lineCode, setLineCode] = useState('K1YH');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/target-monitoring?lineCode=${lineCode}&date=${date}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setData(await res.json());
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to load data');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [lineCode, date]);

  const getAchievementColor = (ach: number) => {
    if (ach >= 100) return 'text-emerald-600 bg-emerald-100';
    if (ach >= 85) return 'text-amber-600 bg-amber-100';
    return 'text-rose-600 bg-rose-100';
  };

  return (
    <div className="p-6 space-y-6 font-poppins">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <BarChart3 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Target Monitoring</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Real-time production target vs actual for Sewing station</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Line Code</label>
            <select value={lineCode} onChange={e => setLineCode(e.target.value)} className="px-4 py-2 border-2 rounded-xl">
              <option value="K1YH">K1YH</option>
              {/* Tambahkan line lain jika ada */}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-4 py-2 border-2 rounded-xl" />
          </div>
          <button onClick={fetchData} className="self-end px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">Refresh</button>
        </div>

        {loading && <div className="text-center py-10">Loading...</div>}
        {error && <div className="bg-rose-100 p-4 rounded-xl text-rose-700">{error}</div>}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-800 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between"><span className="text-xs font-bold uppercase">Manpower (MP)</span><Users size={18} /></div>
                <div className="text-2xl font-black">{data.manpower}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-blue-500 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between"><span className="text-xs font-bold uppercase">Daily Target</span><Target size={18} /></div>
                <div className="text-2xl font-black">{data.dailyTarget.toLocaleString()}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-emerald-500 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between"><span className="text-xs font-bold uppercase">Actual Output</span><CheckCircle size={18} /></div>
                <div className="text-2xl font-black">{data.dailyActual.toLocaleString()}</div>
              </div>
              <div className={`bg-white dark:bg-slate-800 border-l-4 ${data.dailyAchievement >= 100 ? 'border-emerald-500' : 'border-amber-500'} p-4 rounded-xl shadow-sm`}>
                <div className="flex justify-between"><span className="text-xs font-bold uppercase">Achievement</span><TrendingUp size={18} /></div>
                <div className={`text-2xl font-black ${data.dailyAchievement >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{data.dailyAchievement}%</div>
              </div>
            </div>

            {/* Hourly Table & Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border p-6">
              <h3 className="font-black text-lg mb-4">Hourly Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr><th>Hour</th><th>Target</th><th>Actual</th><th>Achievement</th><th>Cumulative Target</th><th>Cumulative Actual</th><th>Cumulative %</th></tr>
                  </thead>
                  <tbody>
                    {data.hourlyData.map((h: any) => (
                      <tr key={h.hour} className="border-b">
                        <td className="py-2 px-2 font-bold">Hour {h.hour}</td>
                        <td>{h.target}</td>
                        <td>{h.actual}</td>
                        <td className={getAchievementColor(h.achievement)}>{h.achievement}%</td>
                        <td>{h.cumulativeTarget}</td>
                        <td>{h.cumulativeActual}</td>
                        <td className={getAchievementColor(h.cumulativeAchievement)}>{h.cumulativeAchievement}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="h-80 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="target" fill="#3b82f6" name="Target" />
                    <Bar dataKey="actual" fill="#10b981" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Catatan jika tidak tercapai */}
            {data.dailyAchievement < 100 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-amber-700"><AlertCircle size={20} /> Target not achieved</div>
                <p className="text-sm mt-2">Shortfall: {(data.dailyTarget - data.dailyActual).toLocaleString()} sets. Possible reasons: manpower shortage, machine breakdown, material issue.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};