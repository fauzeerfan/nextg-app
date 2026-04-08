// frontend/src/features/manpower/ManpowerMonitoringView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, RefreshCw, Loader2, Search, Activity, TrendingUp, FilterX, AlertCircle } from 'lucide-react';
import SankeyChart from '../../components/ui/SankeyChart';

const API_BASE_URL = 'http://localhost:3000';

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
  // State untuk flow diagram (Karyawan → Line per Tanggal)
  const [processedFlow, setProcessedFlow] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [flowLoading, setFlowLoading] = useState(false);
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

  // ========== HEATMAP STATE ==========
  const [heatmapStartDate, setHeatmapStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [heatmapEndDate, setHeatmapEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [heatmapData, setHeatmapData] = useState<{
    nik: string;
    fullName: string;
    department: string;
    jobTitle: string;
    daily: Record<string, { lineCode: string; station: string }>;
  }[]>([]);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  // Fetch employee list
  useEffect(() => {
    fetch(`${API_BASE_URL}/employee`, { headers: getAuthHeaders() })
      .then(res => res.ok && res.json())
      .then(data => setEmployees(data))
      .catch(console.error);
  }, []);

  // Fungsi untuk mengambil data attendance dan memproses menjadi flow Karyawan → Line per Tanggal
  const fetchFlowData = useCallback(async () => {
    setFlowLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start', new Date(startDate).toISOString());
      if (endDate) params.append('end', new Date(endDate).toISOString());
      if (filterLine) params.append('lineCode', filterLine);
      if (searchNik) params.append('nik', searchNik);
      params.append('limit', '10000'); // ambil semua data untuk flow
      params.append('offset', '0');

      const url = `${API_BASE_URL}/manpower/attendance-list?${params}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} - ${text.substring(0, 100)}`);
      }
      
      const data = await res.json();
      const records = data.data;

      if (!records || records.length === 0) {
        setProcessedFlow({ nodes: [], links: [] });
        setError('Tidak ada data check-in untuk periode ini.');
        return;
      }

      // Kelompokkan per karyawan
      const empMap = new Map<string, { nik: string; fullName: string; attendances: any[] }>();
      records.forEach((rec: any) => {
        if (!empMap.has(rec.nik)) {
          empMap.set(rec.nik, { nik: rec.nik, fullName: rec.fullName, attendances: [] });
        }
        empMap.get(rec.nik)!.attendances.push(rec);
      });

      // Persiapan node dan link
      const nodeMap = new Map<string, any>();
      const linkMap = new Map<string, number>(); // key: "sourceId->targetId"

      for (const [nik, empData] of empMap.entries()) {
        // Urutkan berdasarkan tanggal ascending
        const attendances = empData.attendances.sort((a, b) => 
          new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
        );
        
        // Tambahkan node karyawan
        const empNodeId = `emp-${nik}`;
        if (!nodeMap.has(empNodeId)) {
          nodeMap.set(empNodeId, {
            id: empNodeId,
            name: `${empData.fullName} (${nik})`,
            type: 'employee'
          });
        }

        if (attendances.length === 0) continue;

        // Node line pertama
        const first = attendances[0];
        const firstDate = new Date(first.tanggal).toISOString().split('T')[0];
        const firstNodeId = `line-${first.lineCode}-${firstDate}`;
        if (!nodeMap.has(firstNodeId)) {
          nodeMap.set(firstNodeId, {
            id: firstNodeId,
            name: `${first.lineCode} (${firstDate})`,
            type: 'line-date'
          });
        }

        // Link employee -> line pertama
        const linkKeyFirst = `${empNodeId}->${firstNodeId}`;
        linkMap.set(linkKeyFirst, (linkMap.get(linkKeyFirst) || 0) + 1);

        // Link antar line-date berikutnya
        for (let i = 0; i < attendances.length - 1; i++) {
          const current = attendances[i];
          const next = attendances[i+1];
          const currDate = new Date(current.tanggal).toISOString().split('T')[0];
          const nextDate = new Date(next.tanggal).toISOString().split('T')[0];
          const currNodeId = `line-${current.lineCode}-${currDate}`;
          const nextNodeId = `line-${next.lineCode}-${nextDate}`;
          
          if (!nodeMap.has(currNodeId)) {
            nodeMap.set(currNodeId, {
              id: currNodeId,
              name: `${current.lineCode} (${currDate})`,
              type: 'line-date'
            });
          }
          if (!nodeMap.has(nextNodeId)) {
            nodeMap.set(nextNodeId, {
              id: nextNodeId,
              name: `${next.lineCode} (${nextDate})`,
              type: 'line-date'
            });
          }

          const linkKey = `${currNodeId}->${nextNodeId}`;
          linkMap.set(linkKey, (linkMap.get(linkKey) || 0) + 1);
        }
      }

      // Konversi ke array untuk SankeyChart
      const nodes = Array.from(nodeMap.values());
      const nodeIndexMap = new Map<string, number>();
      nodes.forEach((node, idx) => nodeIndexMap.set(node.id, idx));
      
      const links = Array.from(linkMap.entries()).map(([key, value]) => {
        const [sourceId, targetId] = key.split('->');
        return {
          source: nodeIndexMap.get(sourceId)!,
          target: nodeIndexMap.get(targetId)!,
          value
        };
      });

      setProcessedFlow({ nodes, links });
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Tidak dapat terhubung ke server. Pastikan backend berjalan di http://localhost:3000');
      } else {
        setError(err.message || 'Gagal mengambil data');
      }
      setProcessedFlow({ nodes: [], links: [] });
    } finally {
      setFlowLoading(false);
    }
  }, [startDate, endDate, filterLine, searchNik]);

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

  // Untuk dropdown filter (diambil dari data flow yang sudah diproses)
  const uniqueLines = useMemo(() => {
    const lines = processedFlow.nodes
      .filter(n => n.type === 'line-date')
      .map(n => n.name.split(' ')[0]); // ambil kode line saja
    return Array.from(new Set(lines)).sort();
  }, [processedFlow]);

  const uniqueStations = useMemo(() => {
    // Tidak relevan untuk flow baru, tapi tetap disediakan agar filter tidak error
    return [];
  }, []);

  const uniqueEmployees = useMemo(() => {
    return Array.from(new Set(processedFlow.nodes.filter(n => n.type === 'employee').map(n => n.name))).sort();
  }, [processedFlow]);

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

  // ========== FETCH HEATMAP DATA ==========
  const fetchHeatmapData = useCallback(async () => {
    setLoadingHeatmap(true);
    try {
      const params = new URLSearchParams();
      params.append('start', new Date(heatmapStartDate).toISOString());
      params.append('end', new Date(heatmapEndDate).toISOString());
      params.append('limit', '1000');
      const res = await fetch(`${API_BASE_URL}/manpower/attendance-list?${params}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const records = data.data;
        
        const employeeMap = new Map<string, any>();
        records.forEach((rec: any) => {
          const nik = rec.nik;
          if (!employeeMap.has(nik)) {
            employeeMap.set(nik, {
              nik: rec.nik,
              fullName: rec.fullName,
              department: rec.department,
              jobTitle: rec.jobTitle,
              daily: {} as Record<string, { lineCode: string; station: string }>,
            });
          }
          const emp = employeeMap.get(nik);
          const dateKey = new Date(rec.tanggal).toISOString().split('T')[0];
          emp.daily[dateKey] = { lineCode: rec.lineCode, station: rec.station };
        });
        
        const heatmapArray = Array.from(employeeMap.values()).sort((a, b) => 
          a.fullName.localeCompare(b.fullName)
        );
        setHeatmapData(heatmapArray);
      }
    } catch (error) {
      console.error('Failed to fetch heatmap data', error);
    } finally {
      setLoadingHeatmap(false);
    }
  }, [heatmapStartDate, heatmapEndDate]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  // ========== Daftar tanggal unik untuk heatmap ==========
  const heatmapDates = useMemo(() => {
    const dateSet = new Set<string>();
    heatmapData.forEach(emp => {
      Object.keys(emp.daily).forEach(date => dateSet.add(date));
    });
    return Array.from(dateSet).sort();
  }, [heatmapData]);

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
            <label className="block text-xs font-medium mb-1">Filter Karyawan</label>
            <select
              className="w-full border rounded-lg p-2 dark:bg-slate-700"
              value={searchNik}
              onChange={(e) => setSearchNik(e.target.value)}
            >
              <option value="">Semua Karyawan</option>
              {uniqueEmployees.map(emp => {
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

      {/* Sankey Diagram: Flow Karyawan → Line per Tanggal */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp size={20} /> Flow Manpower
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Scroll area grafik untuk melihat detail
          </span>
        </div>
        
        {flowLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
        ) : processedFlow.nodes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Tidak ada data untuk periode dan filter yang dipilih.</div>
        ) : (
          <div 
            className="w-full overflow-auto rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30"
            style={{ maxHeight: '600px' }}
          >
            <div style={{ padding: '10px' }}>
              <SankeyChart
                nodes={processedFlow.nodes}
                links={processedFlow.links}
                width={Math.max(900, processedFlow.nodes.filter(n => n.type === 'employee').length * 150)}
                height={Math.max(500, processedFlow.nodes.length * 25)}
                nodeWidth={20}
                nodePadding={30}
              />
            </div>
          </div>
        )}
      </div>

      {/* ========== HEATMAP: Employee Daily Activity ========== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg mb-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              🔥 Heatmap: Employee Daily Activity
            </h3>
            <p className="text-xs text-slate-500">Visualisasi kehadiran per karyawan per hari (hijau = hadir)</p>
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="date"
              className="border rounded-lg p-2 dark:bg-slate-700 text-sm"
              value={heatmapStartDate}
              onChange={(e) => setHeatmapStartDate(e.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              className="border rounded-lg p-2 dark:bg-slate-700 text-sm"
              value={heatmapEndDate}
              onChange={(e) => setHeatmapEndDate(e.target.value)}
            />
            <button
              onClick={fetchHeatmapData}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {loadingHeatmap ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
        ) : heatmapData.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No data for selected period</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10 px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Employee
                      </th>
                      {heatmapDates.map(date => (
                        <th key={date} className="px-2 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[70px]">
                          {date}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {heatmapData.map(emp => (
                      <tr key={emp.nik} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                        <td className="sticky left-0 bg-white dark:bg-slate-800 z-10 px-3 py-2 text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="truncate max-w-[180px]">{emp.fullName}</div>
                          <div className="text-xs text-slate-500">{emp.nik}</div>
                        </td>
                        {heatmapDates.map(date => {
                          const activity = emp.daily[date];
                          const isPresent = !!activity;
                          const tooltipText = isPresent ? `${activity.lineCode} | ${activity.station}` : 'Tidak hadir';
                          return (
                            <td
                              key={date}
                              className="px-2 py-2 text-center border-l border-slate-100 dark:border-slate-800"
                            >
                              <div
                                className={`w-8 h-8 mx-auto rounded-md cursor-help transition-all hover:scale-110 ${
                                  isPresent
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-md'
                                    : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                                title={tooltipText}
                              >
                                {isPresent && (
                                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                    ✓
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 text-xs text-slate-500 flex justify-between items-center">
          <span>Total manpower (unique employees): <strong>{heatmapData.length}</strong> people</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><div className="w-4 h-4 bg-emerald-500 rounded"></div> Hadir</span>
            <span className="flex items-center gap-1"><div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div> Tidak hadir</span>
          </div>
        </div>
      </div>

      {/* Tabel Data Attendance (tidak diubah) */}
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