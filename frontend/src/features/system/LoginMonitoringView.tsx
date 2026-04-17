import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Users, AlertCircle, CheckCircle, XCircle, Search,
  Calendar, RefreshCw, Download, TrendingUp, Clock, Filter,
  ChevronDown, ChevronUp, Loader2, Eye, LogIn
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const API_BASE_URL = 'http://localhost:3000';

interface LoginLog {
  id: string;
  timestamp: string;
  username: string;
  fullName: string;
  role: string;
  station: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const MetricCard = ({ title, value, icon: Icon, color = 'blue', suffix }: any) => {
  const colorMap: any = {
    blue: 'border-blue-500 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    green: 'border-emerald-500 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    red: 'border-rose-500 bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
    purple: 'border-purple-500 bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
  };
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${colorMap[color].split(' ')[0]} border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color].split(' ').slice(1).join(' ')}`}>
          <Icon size={20} className={colorMap[color].split(' ')[2]} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
        {value}{suffix && <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>}
      </div>
    </div>
  );
};

export const LoginMonitoringView = () => {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [station, setStation] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [expandedStats, setExpandedStats] = useState(false);

  const roleOptions = ['ADMINISTRATOR', 'MANAGER', 'OPERATOR'];
  
  // Station options lengkap untuk semua stasiun produksi
  const stationOptions = [
    'CUTTING_ENTAN',
    'CUTTING_POND',
    'CP',
    'SEWING',
    'QC',
    'PACKING',
    'FG'
  ];
  
  // Mapping display name untuk UI yang lebih bersih
  const stationDisplayNames: Record<string, string> = {
    'CUTTING_ENTAN': 'Cutting Entan',
    'CUTTING_POND': 'Cutting Pond',
    'CP': 'Check Panel',
    'SEWING': 'Sewing',
    'QC': 'Quality Control',
    'PACKING': 'Packing',
    'FG': 'Finished Goods',
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      if (username) params.append('username', username);
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      if (station) params.append('station', station);
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());

      const res = await fetch(`${API_BASE_URL}/auth/login-logs?${params}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch login logs', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, username, role, status, station, page, limit]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      const res = await fetch(`${API_BASE_URL}/auth/login-logs/stats?${params}`, { headers: getAuthHeaders() });
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoadingStats(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const resetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    });
    setEndDate(today);
    setUsername('');
    setRole('');
    setStatus('');
    setStation('');
    setPage(1);
  };

  const exportCSV = () => {
    // Implementasi export CSV sederhana
    const headers = ['Timestamp', 'Username', 'Full Name', 'Role', 'Station', 'IP Address', 'Status', 'Error'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.username,
      log.fullName,
      log.role,
      log.station,
      log.ipAddress,
      log.status,
      log.errorMessage || '',
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `login_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 md:p-6 space-y-6 font-poppins min-h-screen bg-slate-50 dark:bg-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        .font-poppins { font-family: 'Poppins', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
      `}</style>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <LogIn size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  Login Monitoring
                  <span className="text-[11px] px-2.5 py-1 bg-blue-600 text-white rounded-md font-bold uppercase tracking-wider">
                    SECURITY AUDIT
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Track user authentication activity across the system</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { fetchLogs(); fetchStats(); }}
                className="px-5 py-2.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:border-blue-500 transition-all"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              <button
                onClick={exportCSV}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/30"
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-6">
            <MetricCard title="Today Success" value={stats.todaySuccess || 0} icon={CheckCircle} color="green" suffix="logins" />
            <MetricCard title="Today Failed" value={stats.todayFailed || 0} icon={XCircle} color="red" suffix="attempts" />
            <MetricCard title="Top User (7d)" value={stats.topUsers?.[0]?.username || '-'} icon={TrendingUp} color="blue" suffix={`${stats.topUsers?.[0]?.count || 0} login`} />
            <MetricCard title="Avg Login/Hour" value={stats.hourlyDistribution?.length ? Math.round(stats.hourlyDistribution.reduce((a: number, b: any) => a + b.count, 0) / stats.hourlyDistribution.length) : 0} icon={Clock} color="purple" suffix="logins" />
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Username</label>
            <input type="text" placeholder="Filter username" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm" />
          </div>
          <div className="w-32">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm">
              <option value="">All</option>
              {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm">
              <option value="">All</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Station</label>
            <select value={station} onChange={e => setStation(e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm">
              <option value="">All</option>
              {stationOptions.map(s => (
                <option key={s} value={s}>{stationDisplayNames[s] || s}</option>
              ))}
            </select>
          </div>
          <button onClick={resetFilters} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 rounded-xl font-bold text-sm flex items-center gap-2">
            <Filter size={16} /> Reset
          </button>
        </div>
      </div>

      {/* Charts Section (Expandable) */}
      {stats && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setExpandedStats(!expandedStats)}
            className="w-full p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors"
          >
            <span className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><Activity size={18} /> Login Statistics</span>
            {expandedStats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {expandedStats && (
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-sm mb-3">Hourly Distribution (Avg)</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-3">Top 5 Users by Login Count</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.topUsers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="username" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {stats.stationDistribution && stats.stationDistribution.length > 0 && (
                <div className="lg:col-span-2">
                  <h4 className="font-bold text-sm mb-3">Login by Station (Operator)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={stats.stationDistribution} dataKey="count" nameKey="station" cx="50%" cy="50%" outerRadius={80} label>
                        {stats.stationDistribution.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50">
              <tr className="text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-4 px-5">Timestamp</th>
                <th className="py-4 px-5">Username</th>
                <th className="py-4 px-5">Full Name</th>
                <th className="py-4 px-5">Role</th>
                <th className="py-4 px-5">Station</th>
                <th className="py-4 px-5">IP Address</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center"><Loader2 className="animate-spin mx-auto" size={32} /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-500">No login logs found</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-5 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-5 font-bold">{log.username}</td>
                    <td className="py-3 px-5">{log.fullName}</td>
                    <td className="py-3 px-5">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        log.role === 'ADMINISTRATOR' ? 'bg-purple-100 text-purple-700' : log.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>{log.role}</span>
                    </td>
                    <td className="py-3 px-5">{log.station}</td>
                    <td className="py-3 px-5 font-mono text-xs">{log.ipAddress || '-'}</td>
                    <td className="py-3 px-5">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle size={14} /> Success</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600"><XCircle size={14} /> Failed</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-rose-600 text-xs">{log.errorMessage || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span className="text-sm text-slate-500">Total {total} records</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
              <span className="px-3 py-1">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};