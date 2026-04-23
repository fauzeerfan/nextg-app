import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, RefreshCw, Calendar, Filter,
  TrendingUp, AlertTriangle, CheckCircle, Package,
  Factory, Scissors, ClipboardCheck, Shirt, Truck,
  BarChart3, Activity, Layers, Clock, Search, X, ChevronDown, ChevronRight,
  FileSpreadsheet, FileJson
} from 'lucide-react';
import {
  exportToPDF,
  exportToExcel,
} from '../../lib/exportUtils';

const API_BASE_URL = 'http://localhost:3000';

type ReportStation = 
  | 'CUTTING_ENTAN'
  | 'CUTTING_POND'
  | 'CP'
  | 'SEWING'
  | 'QC'
  | 'PACKING';

const stationOptions: { value: ReportStation; label: string; icon: any }[] = [
  { value: 'CUTTING_ENTAN', label: 'Output Cutting Entan', icon: Scissors },
  { value: 'CUTTING_POND', label: 'Output Cutting Pond', icon: Layers },
  { value: 'CP', label: 'Output Check Panel', icon: ClipboardCheck },
  { value: 'SEWING', label: 'Output Sewing', icon: Shirt },
  { value: 'QC', label: 'Output Quality Control', icon: Activity },
  { value: 'PACKING', label: 'Output Packing', icon: Package },
];

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const ReportsView = () => {
  const [selectedStation, setSelectedStation] = useState<ReportStation>('CUTTING_ENTAN');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lineCode, setLineCode] = useState('');
  const [searchOpInput, setSearchOpInput] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  
  // State untuk menyimpan OP yang dipilih (checkbox)
  const [selectedOps, setSelectedOps] = useState<Set<string>>(new Set());

  const fetchLines = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters`, { headers: getAuthHeaders() });
      if (res.ok) setLines(await res.json());
    } catch (error) { console.error(error); }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        station: selectedStation,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      if (lineCode) params.append('lineCode', lineCode);
      if (searchOpInput.trim()) params.append('opNumber', searchOpInput.trim());

      const res = await fetch(`${API_BASE_URL}/reports/station-production?${params}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Reset pilihan checkbox setiap kali data baru di-fetch
        setSelectedOps(new Set());
      } else {
        setData(null);
        setError('Failed to load report');
      }
    } catch (error) {
      console.error(error);
      setData(null);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [selectedStation, startDate, endDate, lineCode, searchOpInput]);

  useEffect(() => {
    fetchLines();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Fungsi untuk toggle pilihan per OP
  const toggleSelectOp = (opNumber: string) => {
    const newSet = new Set(selectedOps);
    if (newSet.has(opNumber)) {
      newSet.delete(opNumber);
    } else {
      newSet.add(opNumber);
    }
    setSelectedOps(newSet);
  };

  // Fungsi untuk toggle "Select All"
  const toggleSelectAll = () => {
    if (data?.ops && selectedOps.size === data.ops.length) {
      setSelectedOps(new Set());
    } else {
      setSelectedOps(new Set(data?.ops.map((op: any) => op.opNumber) || []));
    }
  };

  const handleExportPDF = () => {
    if (!data) return;
    
    // Filter OP berdasarkan pilihan
    const opsToExport = selectedOps.size > 0
      ? data.ops.filter((op: any) => selectedOps.has(op.opNumber))
      : data.ops;
    
    if (opsToExport.length === 0) {
      alert('No OP selected for export.');
      return;
    }

    const headers = ['OP Number', 'Style', 'Line', 'Start Date', 'End Date', 'Input', 'Output', 'Good', 'NG', 'Defect Rate', 'NG Details'];
    const rows = opsToExport.map((op: any) => [
      op.opNumber,
      op.styleCode,
      op.lineCode,
      op.startDate ? new Date(op.startDate).toLocaleDateString() : '-',
      op.endDate ? new Date(op.endDate).toLocaleDateString() : 'In Progress',
      op.inputQty,
      op.outputQty,
      op.goodQty,
      op.ngQty,
      `${op.defectRate.toFixed(1)}%`,
      op.ngDetails?.map((d: any) => `${d.patternName || ''}: ${d.ngQty} (${d.reasons?.join(', ')})`).join('; ') || '-'
    ]);
    
    // Buat summary baru berdasarkan data yang dipilih
    const filteredSummary = {
      ...data.summary,
      totalInput: opsToExport.reduce((s: number, op: any) => s + op.inputQty, 0),
      totalOutput: opsToExport.reduce((s: number, op: any) => s + op.outputQty, 0),
      totalGood: opsToExport.reduce((s: number, op: any) => s + op.goodQty, 0),
      totalNg: opsToExport.reduce((s: number, op: any) => s + op.ngQty, 0),
      defectRate: opsToExport.reduce((s: number, op: any) => s + op.outputQty, 0) > 0 
        ? (opsToExport.reduce((s: number, op: any) => s + op.ngQty, 0) / opsToExport.reduce((s: number, op: any) => s + op.outputQty, 0)) * 100 
        : 0,
      totalOps: opsToExport.length,
    };

    exportToPDF(
      `${stationOptions.find(s => s.value === selectedStation)?.label} Report`,
      headers,
      rows,
      filteredSummary,
      { startDate, endDate, lineCode, station: selectedStation }
    );
  };

  const handleExportExcel = () => {
    if (!data) return;
    
    // Filter OP berdasarkan pilihan
    const opsToExport = selectedOps.size > 0
      ? data.ops.filter((op: any) => selectedOps.has(op.opNumber))
      : data.ops;
    
    if (opsToExport.length === 0) {
      alert('No OP selected for export.');
      return;
    }

    const headers = ['OP Number', 'Style', 'Line', 'Start Date', 'End Date', 'Input', 'Output', 'Good', 'NG', 'Defect Rate', 'NG Details'];
    const rows = opsToExport.map((op: any) => [
      op.opNumber,
      op.styleCode,
      op.lineCode,
      op.startDate ? new Date(op.startDate).toLocaleDateString() : '-',
      op.endDate ? new Date(op.endDate).toLocaleDateString() : 'In Progress',
      op.inputQty,
      op.outputQty,
      op.goodQty,
      op.ngQty,
      `${op.defectRate.toFixed(1)}%`,
      op.ngDetails?.map((d: any) => `${d.patternName || ''}: ${d.ngQty} (${d.reasons?.join(', ')})`).join('; ') || '-'
    ]);
    
    // Buat summary baru berdasarkan data yang dipilih
    const filteredSummary = {
      ...data.summary,
      totalInput: opsToExport.reduce((s: number, op: any) => s + op.inputQty, 0),
      totalOutput: opsToExport.reduce((s: number, op: any) => s + op.outputQty, 0),
      totalGood: opsToExport.reduce((s: number, op: any) => s + op.goodQty, 0),
      totalNg: opsToExport.reduce((s: number, op: any) => s + op.ngQty, 0),
      defectRate: opsToExport.reduce((s: number, op: any) => s + op.outputQty, 0) > 0 
        ? (opsToExport.reduce((s: number, op: any) => s + op.ngQty, 0) / opsToExport.reduce((s: number, op: any) => s + op.outputQty, 0)) * 100 
        : 0,
      totalOps: opsToExport.length,
    };

    exportToExcel(
      `${stationOptions.find(s => s.value === selectedStation)?.label} Report`,
      headers,
      rows,
      filteredSummary,
      { startDate, endDate, lineCode, station: selectedStation }
    );
  };

  const inputClassName = "w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all appearance-none shadow-sm";
  const labelClassName = "block text-xs font-black text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-widest";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto space-y-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-poppins text-slate-800 dark:text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap'); .font-poppins { font-family: 'Poppins', sans-serif; }`}</style>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 text-white">
                <BarChart3 size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Production Reports</h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">Station‑wise output & quality</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <button onClick={fetchReport} disabled={loading} className="flex-1 md:flex-none px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2.5 transition-all font-black text-sm outline-none shadow-lg shadow-blue-600/30 disabled:opacity-50 uppercase tracking-wider">
                <RefreshCw size={18} strokeWidth={3} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <div className="relative z-50">
                <button onClick={() => setExportMenuOpen(!exportMenuOpen)} className={`flex-1 md:flex-none px-7 py-3.5 rounded-xl flex items-center justify-center gap-2.5 font-black text-sm transition-all shadow-lg outline-none uppercase tracking-wider ${exportMenuOpen ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  <Download size={18} strokeWidth={3} /> Export <ChevronDown size={16} strokeWidth={3} className={`transition-transform duration-300 ${exportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] overflow-hidden">
                    <div className="p-2 space-y-1">
                      <button onClick={() => { setExportMenuOpen(false); handleExportPDF(); }} className="w-full px-4 py-3 text-left text-sm font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-3 uppercase tracking-wider">
                        <div className="p-1.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-600"><FileJson size={16} /></div> PDF
                      </button>
                      <button onClick={() => { setExportMenuOpen(false); handleExportExcel(); }} className="w-full px-4 py-3 text-left text-sm font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-3 uppercase tracking-wider">
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600"><FileSpreadsheet size={16} /></div> Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-md">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white font-black text-lg mb-8 pb-5 border-b-2 border-slate-100 dark:border-slate-700 uppercase tracking-widest">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300"><Filter size={20} strokeWidth={2.5} /></div> Filter Parameters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className={labelClassName}>Station</label>
            <select value={selectedStation} onChange={(e) => setSelectedStation(e.target.value as ReportStation)} className={inputClassName}>
              {stationOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClassName}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className={labelClassName}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className={labelClassName}>Line (Optional)</label>
            <select value={lineCode} onChange={e => setLineCode(e.target.value)} className={inputClassName}>
              <option value="">All Lines</option>
              {lines.map(l => <option key={l.code} value={l.code}>{l.code} - {l.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t-2 border-slate-100 dark:border-slate-700">
          <div>
            <label className={labelClassName}>Search OP Number</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" className={`${inputClassName} pl-11`} placeholder="e.g. K1YH260001" value={searchOpInput} onChange={e => setSearchOpInput(e.target.value)} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Leave empty for all OPs</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-100 dark:border-slate-700 border-t-blue-600"></div>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">Generating report...</div>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-rose-300">
          <AlertTriangle size={40} className="text-rose-500 mb-4" />
          <p className="text-xl font-black text-rose-600">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-blue-500 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Total Input</div>
              <div className="text-3xl font-black">{data.summary.totalInput}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-amber-500 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Total Output</div>
              <div className="text-3xl font-black">{data.summary.totalOutput}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-emerald-500 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Total Good</div>
              <div className="text-3xl font-black">{data.summary.totalGood}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-rose-500 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Total NG</div>
              <div className="text-3xl font-black">{data.summary.totalNg}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-purple-500 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Defect Rate</div>
              <div className="text-3xl font-black">{data.summary.defectRate.toFixed(1)}%</div>
            </div>
          </div>

          {/* OP Table */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs font-bold uppercase">
                  <tr>
                    <th className="py-4 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={data?.ops && selectedOps.size === data.ops.length && data.ops.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="py-4 px-4">OP Number</th>
                    <th className="py-4 px-4">Style</th>
                    <th className="py-4 px-4">Line</th>
                    <th className="py-4 px-4">Start Date</th>
                    <th className="py-4 px-4">End Date</th>
                    <th className="py-4 px-4">Input</th>
                    <th className="py-4 px-4">Output</th>
                    <th className="py-4 px-4">Good</th>
                    <th className="py-4 px-4">NG</th>
                    <th className="py-4 px-4">Defect Rate</th>
                    <th className="py-4 px-4">NG Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.ops.map((op: any) => (
                    <React.Fragment key={op.opNumber}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOps.has(op.opNumber)}
                            onChange={() => toggleSelectOp(op.opNumber)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-4 px-4 font-mono font-bold cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.opNumber}</td>
                        <td className="py-4 px-4 cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.styleCode}</td>
                        <td className="py-4 px-4 cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.lineCode}</td>
                        <td className="py-4 px-4 cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.startDate ? new Date(op.startDate).toLocaleDateString() : '-'}</td>
                        <td className="py-4 px-4 cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.endDate ? new Date(op.endDate).toLocaleDateString() : 'In Progress'}</td>
                        <td className="py-4 px-4 cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.inputQty}</td>
                        <td className="py-4 px-4 cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.outputQty}</td>
                        <td className="py-4 px-4 text-emerald-600 font-bold cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.goodQty}</td>
                        <td className="py-4 px-4 text-rose-600 font-bold cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.ngQty}</td>
                        <td className="py-4 px-4 cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>{op.defectRate.toFixed(1)}%</td>
                        <td className="py-4 px-4 text-xs cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>
                          {op.ngDetails?.length > 0 ? (
                            <span className="text-blue-600 underline">View ({op.ngDetails.length})</span>
                          ) : '-'}
                        </td>
                      </tr>
                      {expandedOp === op.opNumber && op.ngDetails?.length > 0 && (
                        <tr>
                          <td colSpan={12} className="bg-slate-50 dark:bg-slate-800/50 p-4">
                            <div className="text-xs font-bold mb-2">NG Details:</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {op.ngDetails.map((d: any, i: number) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-3 rounded border">
                                  <span className="font-bold">{d.patternName || 'Set'}:</span> {d.ngQty} pcs
                                  {d.reasons?.length > 0 && <div className="text-slate-500 mt-1">Reasons: {d.reasons.join(', ')}</div>}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {data.ops.length === 0 && (
              <div className="p-8 text-center text-slate-500">No data for selected filters.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};