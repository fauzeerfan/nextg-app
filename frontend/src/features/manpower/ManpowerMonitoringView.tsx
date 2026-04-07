// frontend/src/features/manpower/ManpowerMonitoringView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, RefreshCw, Loader2, Search, Activity, TrendingUp, FilterX, AlertCircle } from 'lucide-react';
import SankeyChart from '../../components/ui/SankeyChart';

const API_BASE_URL = 'http://localhost:3000';

interface EmployeeFlowDetail {
  nodes: { id: string; name: string; type: 'employee' | 'line' | 'station' }[];
  links: { source: number; target: number; value: number }[];
}

interface AttendanceRecord {
  id: string;
  nik: string;
  tanggal: string;
  lineCode: string;
  station: string;
  scanTime: string;
  employee: { fullName: string; jobTitle: string; department: string };
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const ManpowerMonitoringView = () => {
  const [flowData, setFlowData] = useState<EmployeeFlowDetail>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
const [startDate, setStartDate] = useState(() => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
});
const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [filterLine, setFilterLine] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [searchNik, setSearchNik] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeeTimeline, setEmployeeTimeline] = useState<AttendanceRecord[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);

  // Attendance table state
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(10);

  // Fetch employee list
  useEffect(() => {
    fetch(`${API_BASE_URL}/employee`, { headers: getAuthHeaders() })
      .then(res => res.ok && res.json())
      .then(data => setEmployees(data))
      .catch(console.error);
  }, []);

  const fetchFlowData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start', new Date(startDate).toISOString());
      if (endDate) params.append('end', new Date(endDate).toISOString());
      if (filterLine) params.append('lineCode', filterLine);
      if (filterStation) params.append('station', filterStation);
      if (searchNik) params.append('nik', searchNik);

      const url = `${API_BASE_URL}/manpower/employee-flow-detail?${params}`;
      console.log('Fetching:', url);
      
      const res = await fetch(url, { headers: getAuthHeaders() });
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`HTTP ${res.status}: ${text}`);
        throw new Error(`Server error: ${res.status} - ${text.substring(0, 100)}`);
      }
      
      const data = await res.json();
      setFlowData(data);
      if (data.nodes.length === 0) {
        setError('Tidak ada data check-in untuk periode ini.');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Tidak dapat terhubung ke server. Pastikan backend berjalan di http://localhost:3000');
      } else {
        setError(err.message || 'Gagal mengambil data');
      }
      setFlowData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterLine, filterStation, searchNik]);

  // Auto-refresh setiap 30 detik
  useEffect(() => {
    fetchFlowData();
    const interval = setInterval(fetchFlowData, 30000);
    return () => clearInterval(interval);
  }, [fetchFlowData]);

  const fetchEmployeeTimeline = async (nik: string) => {
    try {
      const params = new URLSearchParams();
      params.append('start', new Date(startDate).toISOString());
      params.append('end', new Date(endDate).toISOString());
      const res = await fetch(`${API_BASE_URL}/manpower/employee-timeline/${nik}?${params}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeeTimeline(data);
        setShowTimeline(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEmployeeSelect = (nik: string) => {
    const emp = employees.find(e => e.nik === nik);
    setSelectedEmployee(emp);
    setSearchNik(nik);
    fetchEmployeeTimeline(nik);
  };

  const resetFilters = () => {
    setFilterLine('');
    setFilterStation('');
    setSearchNik('');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const uniqueLines = useMemo(() => {
    return Array.from(new Set(flowData.nodes.filter(n => n.type === 'line').map(n => n.name))).sort();
  }, [flowData]);

  const uniqueStations = useMemo(() => {
    return Array.from(new Set(flowData.nodes.filter(n => n.type === 'station').map(n => n.name))).sort();
  }, [flowData]);

  const uniqueEmployees = useMemo(() => {
    return Array.from(new Set(flowData.nodes.filter(n => n.type === 'employee').map(n => n.name))).sort();
  }, [flowData]);

  const fetchAttendanceList = useCallback(async () => {
    setLoadingTable(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start', new Date(startDate).toISOString());
      if (endDate) params.append('end', new Date(endDate).toISOString());
      if (filterLine) params.append('lineCode', filterLine);
      if (filterStation) params.append('station', filterStation);
      if (searchNik) params.append('nik', searchNik);
      params.append('limit', tableLimit.toString());
      params.append('offset', ((tablePage - 1) * tableLimit).toString());

      const url = `${API_BASE_URL}/manpower/attendance-list?${params}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAttendanceList(data.data);
        setTotalRecords(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch attendance list', error);
    } finally {
      setLoadingTable(false);
    }
  }, [startDate, endDate, filterLine, filterStation, searchNik, tablePage, tableLimit]);

  useEffect(() => {
    fetchAttendanceList();
  }, [fetchAttendanceList]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Manpower Monitoring</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Analisis perpindahan dan alokasi manpower</p>
              </div>
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <input type="date" className="border rounded-lg p-2 dark:bg-slate-800" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span>to</span>
              <input type="date" className="border rounded-lg p-2 dark:bg-slate-800" value={endDate} onChange={e => setEndDate(e.target.value)} />
              <button onClick={fetchFlowData} className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"><RefreshCw size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Filter Line</label>
            <select className="w-full border rounded-lg p-2 dark:bg-slate-700" value={filterLine} onChange={e => setFilterLine(e.target.value)}>
              <option value="">Semua Line</option>
              {uniqueLines.map(line => <option key={line} value={line}>{line}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Filter Station</label>
            <select className="w-full border rounded-lg p-2 dark:bg-slate-700" value={filterStation} onChange={e => setFilterStation(e.target.value)}>
              <option value="">Semua Station</option>
              {uniqueStations.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Filter Karyawan</label>
            <select
              className="w-full border rounded-lg p-2 dark:bg-slate-700"
              value={searchNik}
              onChange={(e) => setSearchNik(e.target.value)}
            >
              <option value="">Semua Karyawan</option>
              {uniqueEmployees.map(emp => {
                // Extract NIK from name (format: "Nama (NIK)")
                const nikMatch = emp.match(/\(([^)]+)\)/);
                const nik = nikMatch ? nikMatch[1] : emp;
                return <option key={nik} value={nik}>{emp}</option>;
              })}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={resetFilters} className="w-full px-3 py-2 bg-slate-500 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-slate-600">
              <FilterX size={16} /> Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-800 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Sankey Diagram */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg mb-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={20} /> Flow Manpower (Karyawan → Line → Station)
        </h3>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
        ) : flowData.nodes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Tidak ada data untuk periode dan filter yang dipilih.</div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <SankeyChart
              nodes={flowData.nodes}
              links={flowData.links}
              width={Math.max(900, flowData.nodes.filter(n => n.type === 'employee').length * 150)}
              height={Math.max(500, flowData.nodes.length * 25)}
              nodeWidth={20}
              nodePadding={30}
            />
          </div>
        )}
      </div>

      {/* Tabel Data Attendance */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Activity size={20} /> Detail Attendance
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Total: {totalRecords} records</span>
            <select
              value={tableLimit}
              onChange={(e) => { setTableLimit(Number(e.target.value)); setTablePage(1); }}
              className="text-xs border rounded px-2 py-1 dark:bg-slate-700"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {loadingTable ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-600" size={24} /></div>
        ) : attendanceList.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Tidak ada data untuk filter yang dipilih.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/50">
                  <tr>
                    <th className="py-2 px-3 text-left">No</th>
                    <th className="py-2 px-3 text-left">Tanggal</th>
                    <th className="py-2 px-3 text-left">NIK</th>
                    <th className="py-2 px-3 text-left">Nama Karyawan</th>
                    <th className="py-2 px-3 text-left">Line</th>
                    <th className="py-2 px-3 text-left">Station</th>
                    <th className="py-2 px-3 text-left">Scan Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3">{(tablePage - 1) * tableLimit + idx + 1}</td>
                      <td className="py-2 px-3">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 font-mono">{item.nik}</td>
                      <td className="py-2 px-3">{item.fullName}</td>
                      <td className="py-2 px-3">{item.lineCode}</td>
                      <td className="py-2 px-3">{item.station}</td>
                      <td className="py-2 px-3">{new Date(item.scanTime).toLocaleTimeString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalRecords > tableLimit && (
              <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  disabled={tablePage === 1}
                  className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm">Page {tablePage} of {Math.ceil(totalRecords / tableLimit)}</span>
                <button
                  onClick={() => setTablePage(p => Math.min(Math.ceil(totalRecords / tableLimit), p + 1))}
                  disabled={tablePage === Math.ceil(totalRecords / tableLimit)}
                  className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Employee Timeline Modal */}
      {showTimeline && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Riwayat {selectedEmployee.fullName} ({selectedEmployee.nik})</h3>
              <button onClick={() => setShowTimeline(false)} className="p-1 hover:bg-slate-100 rounded">✕</button>
            </div>
            <div className="p-4">
              {employeeTimeline.length === 0 ? (
                <p className="text-center text-slate-500">Tidak ada catatan kehadiran</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-700">
                    <tr>
                      <th className="p-2 text-left">Tanggal</th>
                      <th className="p-2 text-left">Line</th>
                      <th className="p-2 text-left">Station</th>
                      <th className="p-2 text-left">Scan Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeTimeline.map(att => (
                      <tr key={att.id} className="border-t">
                        <td className="p-2">{new Date(att.tanggal).toLocaleDateString()}</td>
                        <td className="p-2">{att.lineCode}</td>
                        <td className="p-2">{att.station}</td>
                        <td className="p-2">{new Date(att.scanTime).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};