import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, RefreshCw, Loader2, Search, Activity, TrendingUp, FilterX, AlertCircle, Users, Clock, CheckCircle2 } from 'lucide-react';
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

  // Fungsi untuk mengambil data flow dari endpoint employee-flow-history
  const fetchFlowData = useCallback(async () => {
    setFlowLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start', new Date(startDate).toISOString());
      if (endDate) params.append('end', new Date(endDate).toISOString());
      if (filterLine) params.append('lineCode', filterLine);
      if (searchNik) params.append('nik', searchNik);
      params.append('limit', '10000');
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

      const nodeMap = new Map<string, any>();
      const linkMap = new Map<string, number>();

for (const [nik, empData] of empMap.entries()) {
  const attendances = empData.attendances.sort((a, b) => 
    new Date(a.scanTime).getTime() - new Date(b.scanTime).getTime()
  );

  const empNodeId = `emp-${nik}`;
  if (!nodeMap.has(empNodeId)) {
    nodeMap.set(empNodeId, {
      id: empNodeId,
      name: `${empData.fullName} (${nik})`,
      type: 'employee'
    });
  }

  if (attendances.length === 0) continue;

  // Kelompokkan attendances per tanggal
  const perDate = new Map<string, typeof attendances>();
  for (const att of attendances) {
    const dateKey = new Date(att.tanggal).toISOString().split('T')[0];
    if (!perDate.has(dateKey)) perDate.set(dateKey, []);
    perDate.get(dateKey)!.push(att);
  }

  // Proses setiap tanggal
  for (const [dateKey, dateAtts] of perDate.entries()) {
    // Urutkan berdasarkan scanTime untuk menentukan line terakhir
    dateAtts.sort((a, b) => new Date(a.scanTime).getTime() - new Date(b.scanTime).getTime());
    
    // Ambil semua lineCode unik dalam urutan kemunculan
    const allLines: string[] = [];
    for (const att of dateAtts) {
      if (!allLines.includes(att.lineCode)) allLines.push(att.lineCode);
    }
    const finalLine = allLines[allLines.length - 1];
    const exLines = allLines.slice(0, -1); // semua line sebelum finalLine
    
    // Buat teks exLine untuk tooltip
    const exLineText = exLines.length > 0 ? `Ex: ${exLines.join(', ')}` : null;
    
    // Node line-date hanya untuk line terakhir
    const nodeId = `line-${finalLine}-${dateKey}`;
    if (!nodeMap.has(nodeId)) {
      nodeMap.set(nodeId, {
        id: nodeId,
        name: `${finalLine} (${dateKey})`,
        type: 'line-date',
        employees: []
      });
    }
    const node = nodeMap.get(nodeId);
    if (!node.employees.some((e: any) => e.nik === nik)) {
      node.employees.push({ 
        nik, 
        name: empData.fullName, 
        exLine: exLineText,
        exLinesList: exLines  // opsional untuk debug
      });
    }
    
    // Hanya satu link dari employee ke node line-date terakhir
    const linkKey = `${empNodeId}->${nodeId}`;
    linkMap.set(linkKey, (linkMap.get(linkKey) || 0) + 1);
  }
}

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
    <div className="p-6 space-y-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Import Poppins Font Dynamically */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 8px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
          border-radius: 8px;
          border: 2px solid #f1f5f9;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #64748b;
          border: 2px solid #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #6366f1;
        }
      `}} />

      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden relative backdrop-blur-xl">
        {/* Modern Colorful Background Blobs */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-3xl mix-blend-multiply dark:mix-blend-screen opacity-70"></div>
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-72 h-72 rounded-full bg-gradient-to-tr from-blue-500/30 to-emerald-500/30 blur-3xl mix-blend-multiply dark:mix-blend-screen opacity-70"></div>
        
        <div className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 transform transition-transform hover:scale-105">
                <Activity size={28} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manpower Monitoring</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-2">
                  <Clock size={14} /> Analisis perpindahan dan alokasi karyawan secara real-time
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 px-2">
                <Calendar size={18} className="text-indigo-500 dark:text-indigo-400" />
                <input 
                  type="date" 
                  className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer outline-none" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                />
              </div>
              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
              <div className="flex items-center gap-2 px-2">
                <input 
                  type="date" 
                  className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer outline-none" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                />
              </div>
              <button 
                onClick={fetchFlowData} 
                className="ml-1 p-2.5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0 group"
                title="Refresh Data"
              >
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700 ease-in-out" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-lg relative overflow-hidden">
        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2.5">Filter Line Area</label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-sm rounded-xl focus:ring-0 focus:border-indigo-500 py-3 pl-4 pr-10 transition-colors cursor-pointer" 
                value={filterLine} 
                onChange={e => setFilterLine(e.target.value)}
              >
                <option value="" className="font-medium">Semua Line / Area</option>
                {uniqueLines.map(line => <option key={line} value={line}>{line}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2.5">Cari Karyawan</label>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              <select
                className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-sm rounded-xl focus:ring-0 focus:border-indigo-500 py-3 pl-11 pr-10 transition-colors cursor-pointer"
                value={searchNik}
                onChange={(e) => setSearchNik(e.target.value)}
              >
                <option value="">Pilih / Ketik Karyawan</option>
                {uniqueEmployees.map(emp => {
                  const nikMatch = emp.match(/\(([^)]+)\)/);
                  const nik = nikMatch ? nikMatch[1] : emp;
                  return <option key={nik} value={nik}>{emp}</option>;
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          
          <div className="flex items-end">
            <button 
              onClick={resetFilters} 
              className="w-full px-5 py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 transition-all font-bold text-sm shadow-sm group"
            >
              <FilterX size={18} className="group-hover:scale-110 transition-transform" /> Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 animate-pulse shadow-sm">
          <AlertCircle size={22} className="text-red-600 dark:text-red-400" />
          <span className="text-sm font-semibold text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {/* Sankey Diagram: Flow Karyawan → Line per Tanggal */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp size={22} strokeWidth={2.5} /> 
            </div>
            Alur Pergerakan Manpower
          </h3>
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-full border border-indigo-200 dark:border-indigo-700 flex items-center gap-2 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            Geser (Scroll) untuk melihat detail timeline
          </span>
        </div>
        
        {flowLoading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <span className="text-sm text-slate-500 font-semibold tracking-wide">Menganalisis Alur Data...</span>
          </div>
        ) : processedFlow.nodes.length === 0 ? (
          <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Users size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-semibold text-base">Data pergerakan belum tersedia</p>
            <p className="text-slate-400 text-xs mt-1">Coba sesuaikan rentang tanggal atau filter line.</p>
          </div>
        ) : (
          <div 
            className="w-full overflow-auto rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 custom-scrollbar shadow-inner"
            style={{ maxHeight: '650px' }}
          >
            <div style={{ padding: '24px' }}>
              <SankeyChart
                nodes={processedFlow.nodes}
                links={processedFlow.links}
                width={Math.max(1000, processedFlow.nodes.filter(n => n.type === 'employee').length * 160)}
                height={Math.max(500, processedFlow.nodes.length * 28)}
                nodeWidth={24}
                nodePadding={35}
              />
            </div>
          </div>
        )}
      </div>

      {/* ========== HEATMAP: Employee Daily Activity ========== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="text-2xl">🔥</span> Heatmap Kehadiran Harian
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Pemetaan stasiun kerja berdasarkan absensi harian</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center bg-slate-50 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <input
              type="date"
              className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer px-3 py-2 outline-none"
              value={heatmapStartDate}
              onChange={(e) => setHeatmapStartDate(e.target.value)}
            />
            <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>
            <input
              type="date"
              className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer px-3 py-2 outline-none"
              value={heatmapEndDate}
              onChange={(e) => setHeatmapEndDate(e.target.value)}
            />
            <button
              onClick={fetchHeatmapData}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ml-1"
            >
              <RefreshCw size={16} strokeWidth={2.5} /> Update
            </button>
          </div>
        </div>

        {loadingHeatmap ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
             <Loader2 className="animate-spin text-indigo-600" size={36} />
             <span className="text-sm text-slate-500 font-semibold">Menyusun Matriks Kehadiran...</span>
          </div>
        ) : heatmapData.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold">
            Data heatmap kosong pada periode ini
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm custom-scrollbar">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-indigo-50 dark:bg-slate-900">
                <tr>
                  <th className="sticky left-0 bg-indigo-50 dark:bg-slate-900 z-20 px-5 py-4 text-left text-xs font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-widest shadow-[4px_0_12px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.2)] border-r border-indigo-100 dark:border-slate-700">
                    Karyawan
                  </th>
                  {heatmapDates.map(date => (
                    <th key={date} className="px-4 py-4 text-center text-xs font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-widest min-w-[90px] border-b border-indigo-100 dark:border-slate-700">
                      {new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                {heatmapData.map(emp => (
                  <tr key={emp.nik} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group">
                    <td className="sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 px-5 py-3 shadow-[4px_0_12px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.2)] border-r border-slate-100 dark:border-slate-700 transition-colors">
                      <div className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{emp.fullName}</div>
                      <div className="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider">{emp.nik}</div>
                    </td>
                    {heatmapDates.map(date => {
                      const activity = emp.daily[date];
                      const isPresent = !!activity;
                      const tooltipText = isPresent ? `${activity.lineCode} | ${activity.station}` : 'Tidak hadir';
                      return (
                        <td
                          key={date}
                          className="px-4 py-2 text-center"
                        >
                          <div
                            className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center cursor-help transition-all duration-300 ${
                              isPresent
                                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/40 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/50'
                                : 'bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={tooltipText}
                          >
                            {isPresent && (
                              <CheckCircle2 size={20} className="text-white drop-shadow-sm" strokeWidth={3} />
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
        <div className="mt-5 flex flex-col sm:flex-row justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 font-semibold">
          <span className="flex items-center gap-2">Total tenaga kerja aktif: <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-3 py-1 rounded-lg text-sm font-extrabold">{heatmapData.length}</span></span>
          <div className="flex items-center gap-5 mt-3 sm:mt-0">
            <span className="flex items-center gap-2.5">
              <div className="w-4 h-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-md shadow-sm shadow-emerald-500/40"></div> Hadir (Tercatat)
            </span>
            <span className="flex items-center gap-2.5">
              <div className="w-4 h-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"></div> Tidak Terdata
            </span>
          </div>
        </div>
      </div>

      {/* Tabel Data Attendance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            Daftar Detail Absensi
          </h3>
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-3 hidden sm:inline">Total <span className="text-slate-800 dark:text-white">{totalRecords}</span> Baris</span>
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1 hidden sm:block"></div>
            <select
              value={tableLimit}
              onChange={(e) => { setTableLimit(Number(e.target.value)); setTablePage(1); }}
              className="text-xs font-bold border-none bg-white dark:bg-slate-800 rounded-lg px-4 py-2 shadow-sm focus:ring-0 cursor-pointer text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value={10}>10 Baris / Hal</option>
              <option value={25}>25 Baris / Hal</option>
              <option value={50}>50 Baris / Hal</option>
            </select>
          </div>
        </div>

        {loadingTable ? (
          <div className="flex justify-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
            <Loader2 className="animate-spin text-purple-600" size={36} />
          </div>
        ) : attendanceList.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold">
            Tidak ada riwayat absensi untuk kriteria tersebut.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-4 px-5 text-left text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">No</th>
                    <th className="py-4 px-5 text-left text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tanggal</th>
                    <th className="py-4 px-5 text-left text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">NIK</th>
                    <th className="py-4 px-5 text-left text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nama Lengkap</th>
                    <th className="py-4 px-5 text-left text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Area / Line</th>
                    <th className="py-4 px-5 text-left text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Stasiun</th>
                    <th className="py-4 px-5 text-left text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Waktu Scan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                  {attendanceList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-400">{(tablePage - 1) * tableLimit + idx + 1}</td>
                      <td className="py-4 px-5 font-semibold text-slate-700 dark:text-slate-200">{new Date(item.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'})}</td>
                      <td className="py-4 px-5">
                        <span className="inline-block bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-xs font-bold px-2.5 py-1 rounded-md tracking-wider">
                          {item.nik}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">{item.fullName}</td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                          {item.lineCode}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-medium text-slate-600 dark:text-slate-300">{item.station}</td>
                      <td className="py-4 px-5 text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {new Date(item.scanTime).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalRecords > tableLimit && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                <span className="text-sm font-semibold text-slate-500">
                  Menampilkan <span className="font-extrabold text-slate-800 dark:text-slate-200">{((tablePage - 1) * tableLimit) + 1}</span> - <span className="font-extrabold text-slate-800 dark:text-slate-200">{Math.min(tablePage * tableLimit, totalRecords)}</span> dari <span className="font-extrabold text-slate-800 dark:text-slate-200">{totalRecords}</span> entri
                </span>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <button
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                    className="px-4 py-2 text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-4 text-sm font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 py-2 rounded-lg">
                    {tablePage} / {Math.ceil(totalRecords / tableLimit)}
                  </span>
                  <button
                    onClick={() => setTablePage(p => Math.min(Math.ceil(totalRecords / tableLimit), p + 1))}
                    disabled={tablePage === Math.ceil(totalRecords / tableLimit)}
                    className="px-4 py-2 text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Employee Timeline Modal */}
      {showTimeline && selectedEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity" onClick={() => setShowTimeline(false)}></div>
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 flex flex-col transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Riwayat Perjalanan</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{selectedEmployee.fullName}</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-bold text-slate-500 dark:text-slate-400">{selectedEmployee.nik}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowTimeline(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-700 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-8 overflow-auto custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
              {employeeTimeline.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
                  <p className="text-slate-500 font-semibold text-base">Tidak ada catatan kehadiran yang ditemukan.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-4 px-6 text-left font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs">Tanggal</th>
                        <th className="py-4 px-6 text-left font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs">Area Kerja</th>
                        <th className="py-4 px-6 text-left font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs">Stasiun</th>
                        <th className="py-4 px-6 text-left font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs">Waktu Scan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {employeeTimeline.map((att, idx) => (
                        <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-200">
                            {new Date(att.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30">
                              {att.lineCode}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-medium text-slate-600 dark:text-slate-300">{att.station}</td>
                          <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
                            <Clock size={14} className="text-slate-400" />
                            {new Date(att.scanTime).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                          </td>
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
    </div>
  );
};