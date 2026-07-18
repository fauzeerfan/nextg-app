import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, RefreshCw, Filter,
  AlertTriangle, Package,
  Scissors, ClipboardCheck, Shirt, Truck,
  BarChart3, Activity, Layers, Search, ChevronDown,
  FileSpreadsheet, FileJson
} from 'lucide-react';
import {
  exportToPDF,
  exportToExcel,
} from '../../lib/exportUtils';

const API_BASE_URL = 'http://202.52.15.30:4000';

type ReportStation =
  | 'CUTTING_ENTAN'
  | 'CUTTING_POND'
  | 'CP'
  | 'SEWING'
  | 'QC'
  | 'PACKING'
  | 'FG';

const stationOptions: { value: ReportStation; label: string; icon: any }[] = [
  { value: 'CUTTING_ENTAN', label: 'Cutting Report', icon: Scissors },
  { value: 'CUTTING_POND', label: 'Cutting Pond', icon: Layers },
  { value: 'CP', label: 'Check Panel', icon: ClipboardCheck },
  { value: 'SEWING', label: 'Sewing', icon: Shirt },
  { value: 'QC', label: 'Quality Control', icon: Activity },
  { value: 'PACKING', label: 'Packing', icon: Package },
  { value: 'FG', label: 'Finished Goods', icon: Truck },
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
          {/* Summary Cards — adaptif sesuai karakter station */}
          {(() => {
            const s: any = data.summary;
            const border: Record<string, string> = {
              blue: 'border-blue-500', emerald: 'border-emerald-500', amber: 'border-amber-500',
              rose: 'border-rose-500', purple: 'border-purple-500', cyan: 'border-cyan-500',
            };
            const cards =
              selectedStation === 'CUTTING_ENTAN'
                ? [
                    { label: 'Output (pcs)', value: s.totalOutput, color: 'emerald' },
                    { label: 'Material Dipakai', value: (s.totalMaterialUsed ?? 0).toLocaleString('id-ID'), color: 'blue' },
                    { label: 'Sisa / NG (mtr)', value: (s.totalSisaMaterial ?? 0).toLocaleString('id-ID'), color: 'rose' },
                    { label: 'Total OP', value: s.totalOps, color: 'purple' },
                  ]
                : selectedStation === 'FG'
                ? [
                    { label: 'Masuk FG', value: s.totalInput, color: 'blue' },
                    { label: 'Terkirim (Shipping)', value: s.totalOutput, color: 'emerald' },
                    { label: 'Stok FG', value: s.totalStock ?? 0, color: 'amber' },
                    { label: 'Total OP', value: s.totalOps, color: 'purple' },
                  ]
                : ['SEWING', 'PACKING'].includes(selectedStation)
                ? [
                    { label: 'Total Input', value: s.totalInput, color: 'blue' },
                    { label: 'Total Output', value: s.totalOutput, color: 'emerald' },
                    { label: 'Total Good', value: s.totalGood, color: 'cyan' },
                    { label: 'Total OP', value: s.totalOps, color: 'purple' },
                  ]
                : [
                    { label: 'Total Input', value: s.totalInput, color: 'blue' },
                    { label: 'Total Output', value: s.totalOutput, color: 'amber' },
                    { label: 'Total Good', value: s.totalGood, color: 'emerald' },
                    { label: 'Total NG', value: s.totalNg, color: 'rose' },
                    { label: 'Defect Rate', value: `${(s.defectRate || 0).toFixed(1)}%`, color: 'purple' },
                  ];
            return (
              <div className={`grid grid-cols-2 gap-5 ${cards.length >= 5 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                {cards.map((c, i) => (
                  <div key={i} className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${border[c.color]} p-5 shadow-sm`}>
                    <div className="text-xs font-bold uppercase text-slate-500">{c.label}</div>
                    <div className="text-3xl font-black">{c.value}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* OP Table — kolom menyesuaikan karakter station */}
          {(() => {
            const n = (v: any) => (v ?? 0);
            const hasNg = ['CUTTING_POND', 'CP', 'QC'].includes(selectedStation);
            // Definisi kolom metrik per-station
            const metricCols: { header: string; render: (o: any) => any; cls?: string }[] =
              selectedStation === 'CUTTING_ENTAN'
                ? [
                    { header: 'Target', render: (o) => n(o.inputQty) },
                    { header: 'Output (pcs)', render: (o) => n(o.outputQty), cls: 'text-emerald-600 font-bold' },
                    { header: 'Material Dipakai', render: (o) => n(o.materialUsed).toFixed(2) },
                    { header: 'Sisa / NG (mtr)', render: (o) => n(o.sisaMaterial).toFixed(2), cls: 'text-rose-600 font-bold' },
                  ]
                : selectedStation === 'SEWING'
                ? [
                    { header: 'Start (in)', render: (o) => n(o.inputQty) },
                    { header: 'Finish (out)', render: (o) => n(o.outputQty), cls: 'text-emerald-600 font-bold' },
                  ]
                : selectedStation === 'PACKING'
                ? [
                    { header: 'Input (QC)', render: (o) => n(o.inputQty) },
                    { header: 'Packed', render: (o) => n(o.outputQty), cls: 'text-emerald-600 font-bold' },
                  ]
                : selectedStation === 'FG'
                ? [
                    { header: 'Masuk FG', render: (o) => n(o.inputQty) },
                    { header: 'Terkirim', render: (o) => n(o.outputQty), cls: 'text-emerald-600 font-bold' },
                    { header: 'Stok', render: (o) => n(o.stockQty), cls: 'text-amber-600 font-bold' },
                  ]
                : [
                    { header: 'Input', render: (o) => n(o.inputQty) },
                    { header: 'Output', render: (o) => n(o.outputQty) },
                    { header: 'Good', render: (o) => n(o.goodQty), cls: 'text-emerald-600 font-bold' },
                    { header: 'NG', render: (o) => n(o.ngQty), cls: 'text-rose-600 font-bold' },
                    { header: 'Defect Rate', render: (o) => `${n(o.defectRate).toFixed(1)}%` },
                  ];
            const totalCols = 6 + metricCols.length + (hasNg ? 1 : 0);
            return (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs font-bold uppercase">
                      <tr>
                        <th className="py-4 px-4 w-10">
                          <input type="checkbox" checked={data?.ops && selectedOps.size === data.ops.length && data.ops.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        </th>
                        <th className="py-4 px-4">OP Number</th>
                        <th className="py-4 px-4">Style</th>
                        <th className="py-4 px-4">Line</th>
                        <th className="py-4 px-4">Start Date</th>
                        <th className="py-4 px-4">End Date</th>
                        {metricCols.map((c, i) => <th key={i} className="py-4 px-4">{c.header}</th>)}
                        {hasNg && <th className="py-4 px-4">NG Details</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {data.ops.map((op: any) => {
                        const toggle = () => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber);
                        return (
                          <React.Fragment key={op.opNumber}>
                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selectedOps.has(op.opNumber)} onChange={() => toggleSelectOp(op.opNumber)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                              </td>
                              <td className="py-4 px-4 font-mono font-bold cursor-pointer" onClick={toggle}>{op.opNumber}</td>
                              <td className="py-4 px-4 cursor-pointer" onClick={toggle}>{op.styleCode}</td>
                              <td className="py-4 px-4 cursor-pointer" onClick={toggle}>{op.lineCode}</td>
                              <td className="py-4 px-4 cursor-pointer" onClick={toggle}>{op.startDate ? new Date(op.startDate).toLocaleDateString() : '-'}</td>
                              <td className="py-4 px-4 cursor-pointer" onClick={toggle}>{op.endDate ? new Date(op.endDate).toLocaleDateString() : 'In Progress'}</td>
                              {metricCols.map((c, i) => <td key={i} className={`py-4 px-4 cursor-pointer ${c.cls || ''}`} onClick={toggle}>{c.render(op)}</td>)}
                              {hasNg && (
                                <td className="py-4 px-4 text-xs cursor-pointer" onClick={toggle}>
                                  {op.ngDetails?.length > 0 ? <span className="text-blue-600 underline">View ({op.ngDetails.length})</span> : '-'}
                                </td>
                              )}
                            </tr>
                            {hasNg && expandedOp === op.opNumber && op.ngDetails?.length > 0 && (
                              <tr>
                                <td colSpan={totalCols} className="bg-slate-50 dark:bg-slate-800/50 p-4">
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {data.ops.length === 0 && (
                  <div className="p-8 text-center text-slate-500">No data for selected filters.</div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};