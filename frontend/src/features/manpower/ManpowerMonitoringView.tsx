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
    <div className="p-6 space-y-6">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
        
        <div className="p-6 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 transform transition-transform hover:scale-105">
                <Activity size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Manpower Monitoring</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Analisis perpindahan dan alokasi manpower</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400 ml-2 hidden sm:block" />
                <input 
                  type="date" 
                  className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-2" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                />
              </div>
              <span className="text-slate-300 dark:text-slate-600 font-medium">/</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-2" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                />
              </div>
              <button 
                onClick={fetchFlowData} 
                className="ml-2 p-2.5 bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-700 transition-all hover:scale-105 group"
                title="Refresh Data"
              >
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Filter Line</label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 py-2.5 pl-4 pr-10 transition-all cursor-pointer" 
                value={filterLine} 
                onChange={e => setFilterLine(e.target.value)}
              >
                <option value="">Semua Line</option>
                {uniqueLines.map(line => <option key={line} value={line}>{line}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Filter Karyawan</label>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                className="w-full appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 py-2.5 pl-10 pr-10 transition-all cursor-pointer"
                value={searchNik}
                onChange={(e) => setSearchNik(e.target.value)}
              >
                <option value="">Cari & Pilih Karyawan</option>
                {uniqueEmployees.map(emp => {
                  const nikMatch = emp.match(/\(([^)]+)\)/);
                  const nik = nikMatch ? nikMatch[1] : emp;
                  return <option key={nik} value={nik}>{emp}</option>;
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          
          <div className="flex items-end">
            <button 
              onClick={resetFilters} 
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center gap-2 hover:bg-white dark:hover:bg-slate-700 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50 transition-all shadow-sm font-medium text-sm group"
            >
              <FilterX size={16} className="group-hover:scale-110 transition-transform" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-sm font-medium text-red-800 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Sankey Diagram: Flow Karyawan → Line per Tanggal */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <TrendingUp size={20} /> 
            </div>
            Flow Manpower
          </h3>
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
            Scroll area grafik untuk melihat detail
          </span>
        </div>
        
        {flowLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-purple-600" size={32} />
            <span className="text-sm text-slate-500 font-medium">Memproses data diagram...</span>
          </div>
        ) : processedFlow.nodes.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-medium">
            Tidak ada data untuk periode dan filter yang dipilih.
          </div>
        ) : (
          <div 
            className="w-full overflow-auto rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 custom-scrollbar"
            style={{ maxHeight: '600px' }}
          >
            <div style={{ padding: '16px' }}>
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              🔥 Heatmap: Employee Daily Activity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Visualisasi kehadiran per karyawan per hari</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <input
              type="date"
              className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-2"
              value={heatmapStartDate}
              onChange={(e) => setHeatmapStartDate(e.target.value)}
            />
            <span className="text-slate-300 dark:text-slate-600 font-medium">/</span>
            <input
              type="date"
              className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-2"
              value={heatmapEndDate}
              onChange={(e) => setHeatmapEndDate(e.target.value)}
            />
            <button
              onClick={fetchHeatmapData}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 ml-1"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {loadingHeatmap ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
             <Loader2 className="animate-spin text-indigo-600" size={28} />
             <span className="text-sm text-slate-500 font-medium">Memuat data heatmap...</span>
          </div>
        ) : heatmapData.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-medium">
            Tidak ada data untuk periode terpilih
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/80">
                <tr>
                  <th className="sticky left-0 bg-slate-50 dark:bg-slate-900/80 z-20 px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider shadow-[4px_0_12px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.2)] border-r border-slate-200 dark:border-slate-700">
                    Employee
                  </th>
                  {heatmapDates.map(date => (
                    <th key={date} className="px-3 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider min-w-[80px]">
                      {new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                {heatmapData.map(emp => (
                  <tr key={emp.nik} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 px-4 py-3 shadow-[4px_0_12px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.2)] border-r border-slate-200 dark:border-slate-700 transition-colors">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{emp.fullName}</div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{emp.nik}</div>
                    </td>
                    {heatmapDates.map(date => {
                      const activity = emp.daily[date];
                      const isPresent = !!activity;
                      const tooltipText = isPresent ? `${activity.lineCode} | ${activity.station}` : 'Tidak hadir';
                      return (
                        <td
                          key={date}
                          className="px-3 py-2 text-center"
                        >
                          <div
                            className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center cursor-help transition-all duration-300 ${
                              isPresent
                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-md shadow-emerald-500/30 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/40'
                                : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                            title={tooltipText}
                          >
                            {isPresent && (
                              <span className="text-white text-sm font-bold drop-shadow-sm">✓</span>
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
        )}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span>Total manpower terpantau: <strong className="text-indigo-600 dark:text-indigo-400 text-sm ml-1">{heatmapData.length}</strong> orang</span>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            <span className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded shadow-sm shadow-emerald-500/30"></div> Hadir
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"></div> Tidak hadir
            </span>
          </div>
        </div>
      </div>

      {/* Tabel Data Attendance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <Activity size={20} />
            </div>
            Detail Attendance
          </h3>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-2 hidden sm:inline">Total: {totalRecords} records</span>
            <select
              value={tableLimit}
              onChange={(e) => { setTableLimit(Number(e.target.value)); setTablePage(1); }}
              className="text-xs font-medium border-none bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-purple-500/20 cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {loadingTable ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
        ) : attendanceList.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-medium">
            Tidak ada data untuk filter yang dipilih.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/80">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">NIK</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Karyawan</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Line</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Station</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Scan Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                  {attendanceList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-500">{(tablePage - 1) * tableLimit + idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 rounded px-2 py-1 w-max my-2">{item.nik}</td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{item.fullName}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {item.lineCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{item.station}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{new Date(item.scanTime).toLocaleTimeString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalRecords > tableLimit && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                <span className="text-sm font-medium text-slate-500">
                  Showing <span className="font-bold text-slate-700 dark:text-slate-300">{((tablePage - 1) * tableLimit) + 1}</span> to <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(tablePage * tableLimit, totalRecords)}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{totalRecords}</span> entries
                </span>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                    className="px-4 py-2 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Previous
                  </button>
                  <span className="px-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {tablePage} / {Math.ceil(totalRecords / tableLimit)}
                  </span>
                  <button
                    onClick={() => setTablePage(p => Math.min(Math.ceil(totalRecords / tableLimit), p + 1))}
                    disabled={tablePage === Math.ceil(totalRecords / tableLimit)}
                    className="px-4 py-2 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Employee Timeline Modal */}
      {showTimeline && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowTimeline(false)}></div>
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Riwayat Kehadiran</h3>
                <p className="text-sm font-medium text-slate-500 mt-0.5">{selectedEmployee.fullName} <span className="text-indigo-500">({selectedEmployee.nik})</span></p>
              </div>
              <button 
                onClick={() => setShowTimeline(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-auto custom-scrollbar">
              {employeeTimeline.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 font-medium text-sm">Tidak ada catatan kehadiran pada periode ini.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/60">
                      <tr>
                        <th className="p-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tanggal</th>
                        <th className="p-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Line</th>
                        <th className="p-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Station</th>
                        <th className="p-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Scan Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {employeeTimeline.map(att => (
                        <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="p-3 px-4 font-medium text-slate-700 dark:text-slate-300">{new Date(att.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="p-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                              {att.lineCode}
                            </span>
                          </td>
                          <td className="p-3 px-4 font-medium text-slate-600 dark:text-slate-300">{att.station}</td>
                          <td className="p-3 px-4 text-slate-500 font-mono text-xs">{new Date(att.scanTime).toLocaleTimeString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Add Custom Scrollbar Styles Globally or Scope it */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #475569;
        }
      `}} />
    </div>
  );
};