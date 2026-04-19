import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, RefreshCw, Calendar, Filter,
  TrendingUp, AlertTriangle, CheckCircle, Package,
  Factory, Scissors, ClipboardCheck, Shirt, Truck,
  BarChart3, Activity, Layers, Clock, Search, X, ChevronDown, ChevronRight,
  FileSpreadsheet, FileJson
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  exportToPDF,
  exportToExcel,
  convertNgAllToRows,
  convertLineCheckTimeToRows,
  convertStationPerformanceToRows,
  convertLinePerformanceToRows,
  convertDailyProductionByDateToRows
} from '../../lib/exportUtils';

const API_BASE_URL = 'http://localhost:3000';

interface RunningOp {
  id: string;
  opNumber: string;
  styleCode: string;
  line: { code: string };
}

type ReportType = 
  | 'ng-pond-cp'
  | 'ng-quality-control';

const reportTypes: { value: ReportType; label: string; icon: any }[] = [
  { value: 'ng-pond-cp', label: 'NG Pond & CP', icon: AlertTriangle },
  { value: 'ng-quality-control', label: 'NG Quality Control', icon: AlertTriangle },
];

const stationOptions = ['CUTTING_POND', 'CP', 'SEWING', 'QC'];

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const ReportsView = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('ng-pond-cp');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lineCode, setLineCode] = useState('');
  const [searchOpInput, setSearchOpInput] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const [runningOps, setRunningOps] = useState<RunningOp[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [exportFilters, setExportFilters] = useState<{ startDate?: string; endDate?: string; lineCode?: string; station?: string }>({});

  const fetchLines = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters`, { headers: getAuthHeaders() });
      if (res.ok) setLines(await res.json());
    } catch (error) { console.error(error); }
  }, []);

  const fetchRunningOps = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/running-ops`, { headers: getAuthHeaders() });
      if (res.ok) setRunningOps(await res.json());
    } catch (error) { console.error(error); }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      if (lineCode) params.append('lineCode', lineCode);

      // Handle search OP untuk kedua report
      let opIdToSend = '';
      if (searchOpInput.trim()) {
        const matchedOp = runningOps.find(op => 
          op.opNumber.toLowerCase() === searchOpInput.trim().toLowerCase()
        );
        if (matchedOp) {
          opIdToSend = matchedOp.id;
        } else {
          setError(`OP "${searchOpInput}" tidak ditemukan`);
          setLoading(false);
          return;
        }
      }

      if (selectedReport === 'ng-pond-cp') {
        if (opIdToSend) params.append('opId', opIdToSend);
        const res = await fetch(`${API_BASE_URL}/reports/ng-cutting-pond-checkpanel?${params}`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          setData(data);
          setExportFilters({
            startDate: startDate,
            endDate: endDate,
            lineCode: lineCode || undefined,
          });
        } else {
          setData(null);
        }
      } else if (selectedReport === 'ng-quality-control') {
        if (opIdToSend) params.append('opId', opIdToSend);
        const res = await fetch(`${API_BASE_URL}/reports/ng-quality-control?${params}`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          setData(data);
          setExportFilters({
            startDate: startDate,
            endDate: endDate,
            lineCode: lineCode || undefined,
          });
        } else {
          setData(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch report', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, startDate, endDate, lineCode, searchOpInput, runningOps]);

  useEffect(() => {
    fetchLines();
    fetchRunningOps();
  }, [fetchLines, fetchRunningOps]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportPDF = () => {
    if (!data) {
      alert('No data to export');
      return;
    }

    try {
      const reportTitle = reportTypes.find(r => r.value === selectedReport)?.label || 'Report';
      const { summary } = data;

      let headers: string[] = [];
      let rows: any[][] = [];

      if (selectedReport === 'ng-pond-cp') {
        headers = ['OP Number', 'Style', 'Line', 'Station', 'NG Qty', 'Good Qty', 'Remarks'];
        rows = [];
        (data.cuttingPond || []).forEach((op: any) => {
          rows.push([op.opNumber, op.styleCode, op.lineCode, 'CUTTING_POND', op.totalNg, '-', '-']);
        });
        (data.checkPanel || []).forEach((op: any) => {
          rows.push([op.opNumber, op.styleCode, op.lineCode, 'CHECK_PANEL', op.totalNg, '-', '-']);
        });
      } else if (selectedReport === 'ng-quality-control') {
        headers = ['OP Number', 'Style', 'Line', 'Good', 'NG', 'NG Reasons'];
        rows = (data.byOp || []).map((op: any) => {
          const reasons = op.inspections?.flatMap((i: any) => i.ngReasons || []).join('; ') || '-';
          return [op.opNumber, op.styleCode, op.lineCode, op.totalGood, op.totalNg, reasons];
        });
      } else {
        alert('Export not supported for this report');
        return;
      }

      exportToPDF(reportTitle, headers, rows, summary, exportFilters);
    } catch (error: any) {
      console.error('Export PDF error:', error);
      alert('Gagal export PDF: ' + (error.message || 'Unknown error'));
    }
  };

  const handleExportExcel = () => {
    if (!data) {
      alert('No data to export');
      return;
    }

    try {
      const reportTitle = reportTypes.find(r => r.value === selectedReport)?.label || 'Report';
      const { summary } = data;

      let headers: string[] = [];
      let rows: any[][] = [];

      if (selectedReport === 'ng-pond-cp') {
        headers = ['OP Number', 'Style', 'Line', 'Station', 'NG Qty', 'Good Qty', 'Remarks'];
        rows = [];
        (data.cuttingPond || []).forEach((op: any) => {
          rows.push([op.opNumber, op.styleCode, op.lineCode, 'CUTTING_POND', op.totalNg, '-', '-']);
        });
        (data.checkPanel || []).forEach((op: any) => {
          rows.push([op.opNumber, op.styleCode, op.lineCode, 'CHECK_PANEL', op.totalNg, '-', '-']);
        });
      } else if (selectedReport === 'ng-quality-control') {
        headers = ['OP Number', 'Style', 'Line', 'Good', 'NG', 'NG Reasons'];
        rows = (data.byOp || []).map((op: any) => {
          const reasons = op.inspections?.flatMap((i: any) => i.ngReasons || []).join('; ') || '-';
          return [op.opNumber, op.styleCode, op.lineCode, op.totalGood, op.totalNg, reasons];
        });
      } else {
        alert('Export not supported for this report');
        return;
      }

      exportToExcel(reportTitle, headers, rows, summary, exportFilters);
    } catch (error: any) {
      console.error('Export Excel error:', error);
      alert('Gagal export Excel: ' + (error.message || 'Unknown error'));
    }
  };

  const renderSummary = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {summary.totalNg !== undefined && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30 text-white transform group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle size={28} strokeWidth={2.5} />
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total NG</div>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white leading-none">
              {summary.totalNg?.toLocaleString()}
            </div>
          </div>
        )}
        {summary.totalGood !== undefined && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white transform group-hover:scale-110 transition-transform duration-300">
                <CheckCircle size={28} strokeWidth={2.5} />
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Good</div>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white leading-none">
              {summary.totalGood?.toLocaleString()}
            </div>
          </div>
        )}
        {summary.defectRate !== undefined && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 text-white transform group-hover:scale-110 transition-transform duration-300">
                <TrendingUp size={28} strokeWidth={2.5} />
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Defect Rate</div>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white leading-none">
              {summary.defectRate}%
            </div>
          </div>
        )}
        {summary.totalOps !== undefined && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white transform group-hover:scale-110 transition-transform duration-300">
                <Layers size={28} strokeWidth={2.5} />
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total OPs</div>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white leading-none">
              {summary.totalOps?.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNgPondCp = () => {
    if (!data) return null;
    return (
      <div className="space-y-8">
        {/* Cutting Pond Section */}
        {data.cuttingPond && data.cuttingPond.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 text-white">
                  <Scissors size={24} />
                </div>
                Cutting Pond NG Data
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-900/50 text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-black border-b-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-5 px-6">OP Number</th>
                    <th className="py-5 px-6">Style</th>
                    <th className="py-5 px-6">Line</th>
                    <th className="py-5 px-6 text-right">Total NG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.cuttingPond.map((op: any) => (
                    <React.Fragment key={op.opNumber}>
                      <tr 
                        className="cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors duration-200 group" 
                        onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}
                      >
                        <td className="py-5 px-6 font-mono font-black text-slate-900 dark:text-white text-base">{op.opNumber}</td>
                        <td className="py-5 px-6 font-bold text-slate-700 dark:text-slate-300">{op.styleCode}</td>
                        <td className="py-5 px-6">
                          <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm">
                            {op.lineCode}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-right font-black text-orange-600 dark:text-orange-400 text-lg">
                          <div className="flex items-center justify-end gap-4">
                            {op.totalNg}
                            <div className={`p-2 rounded-xl transition-all duration-300 shadow-sm ${expandedOp === op.opNumber ? 'bg-orange-500 text-white shadow-orange-500/30' : 'bg-white border border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-600'}`}>
                              {expandedOp === op.opNumber ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {expandedOp === op.opNumber && (
                        <tr className="bg-slate-50 dark:bg-slate-900/30">
                          <td colSpan={4} className="p-0 border-b-2 border-slate-200 dark:border-slate-700">
                            <div className="px-8 py-8 border-l-4 border-orange-500">
                              {op.patternNgDetails && op.patternNgDetails.length > 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <div className="font-black text-xs text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-widest">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    Detail Qty NG per Pola
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {op.patternNgDetails.map((p: any, idx: number) => (
                                      <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center hover:border-orange-400 transition-colors shadow-sm">
                                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-3">{p.patternName}</span>
                                        <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 font-black px-3 py-1.5 rounded-lg text-sm shrink-0">
                                          {p.ng} pcs
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-10 text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 border-dashed">
                                  Belum ada detail per pola untuk OP ini.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Check Panel Section */}
        {data.checkPanel && data.checkPanel.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white">
                  <ClipboardCheck size={24} />
                </div>
                Check Panel NG Data
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-900/50 text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-black border-b-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-5 px-6">OP Number</th>
                    <th className="py-5 px-6">Style</th>
                    <th className="py-5 px-6">Line</th>
                    <th className="py-5 px-6 text-right">Total NG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.checkPanel.map((op: any) => (
                    <React.Fragment key={op.opNumber}>
                      <tr 
                        className="cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors duration-200 group" 
                        onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}
                      >
                        <td className="py-5 px-6 font-mono font-black text-slate-900 dark:text-white text-base">{op.opNumber}</td>
                        <td className="py-5 px-6 font-bold text-slate-700 dark:text-slate-300">{op.styleCode}</td>
                        <td className="py-5 px-6">
                          <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm">
                            {op.lineCode}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-right font-black text-emerald-600 dark:text-emerald-400 text-lg">
                          <div className="flex items-center justify-end gap-4">
                            {op.totalNg}
                            <div className={`p-2 rounded-xl transition-all duration-300 shadow-sm ${expandedOp === op.opNumber ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-white border border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-600'}`}>
                              {expandedOp === op.opNumber ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {expandedOp === op.opNumber && op.patternDetails && (
                        <tr className="bg-slate-50 dark:bg-slate-900/30">
                          <td colSpan={4} className="p-0 border-b-2 border-slate-200 dark:border-slate-700">
                            <div className="px-8 py-8 border-l-4 border-emerald-500">
                              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="font-black text-xs text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-widest">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  Detail NG per Pola dan Reason
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                  {op.patternDetails.map((p: any, i: number) => {
                                    const reasonsList = Array.isArray(p.ngReasons) ? p.ngReasons : [];
                                    const reasonCounts: Record<string, number> = {};
                                    reasonsList.forEach((reason: string) => {
                                      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                                    });
                                    const reasonEntries = Object.entries(reasonCounts);
                                    return (
                                      <div key={i} className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-sm hover:border-emerald-400 transition-colors">
                                        <div className="flex justify-between items-start mb-5 gap-3">
                                          <span className="font-black text-slate-800 dark:text-slate-200 text-sm leading-tight uppercase">{p.patternName}</span>
                                          <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-black px-3 py-1.5 rounded-lg text-xs shrink-0">
                                            NG: {p.ng}
                                          </span>
                                        </div>
                                        <div className="flex-1">
                                          {reasonEntries.length > 0 ? (
                                            <div className="space-y-3">
                                              {reasonEntries.map(([reason, qty], idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold truncate pr-3">{reason}</span>
                                                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 shrink-0">{qty}</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-slate-500 font-medium italic">Tidak ada keterangan reason</span>
                                          )}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-5 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 uppercase tracking-widest">
                                          <Clock size={12} strokeWidth={3} />
                                          {new Date(p.timestamp).toLocaleString()}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNgQualityControl = () => {
    if (!data?.byOp) return null;
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md">
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 text-white">
              <ClipboardCheck size={24} />
            </div>
            Quality Control NG Report
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-900/50 text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-black border-b-2 border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-5 px-6">OP Number</th>
                <th className="py-5 px-6">Style</th>
                <th className="py-5 px-6">Line</th>
                <th className="py-5 px-6 text-right">Good</th>
                <th className="py-5 px-6 text-right">NG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.byOp.map((op: any) => {
                const opReasonCounts: Record<string, number> = {};
                op.inspections?.forEach((i: any) => {
                  const rList = Array.isArray(i.ngReasons) ? i.ngReasons : [];
                  rList.forEach((r: string) => opReasonCounts[r] = (opReasonCounts[r] || 0) + 1);
                });
                const reasonEntries = Object.entries(opReasonCounts);
                return (
                  <React.Fragment key={op.opNumber}>
                    <tr 
                      className="cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors duration-200 group" 
                      onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}
                    >
                      <td className="py-5 px-6 font-mono font-black text-slate-900 dark:text-white text-base">{op.opNumber}</td>
                      <td className="py-5 px-6 font-bold text-slate-700 dark:text-slate-300">{op.styleCode}</td>
                      <td className="py-5 px-6">
                        <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm">
                          {op.lineCode}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right font-black text-emerald-600 dark:text-emerald-400 text-lg">{op.totalGood}</td>
                      <td className="py-5 px-6 text-right font-black text-amber-600 dark:text-amber-400 text-lg">
                        <div className="flex items-center justify-end gap-4">
                          {op.totalNg}
                          <div className={`p-2 rounded-xl transition-all duration-300 shadow-sm ${expandedOp === op.opNumber ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-white border border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-600'}`}>
                            {expandedOp === op.opNumber ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedOp === op.opNumber && (
                      <tr className="bg-slate-50 dark:bg-slate-900/30">
                        <td colSpan={5} className="p-0 border-b-2 border-slate-200 dark:border-slate-700">
                          <div className="px-8 py-8 border-l-4 border-amber-500">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                              <div className="font-black text-xs text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-widest">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                Detail Aggregated NG Reasons (Total)
                              </div>
                              {reasonEntries.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                  {reasonEntries.map(([reason, qty], idx) => (
                                    <div key={idx} className="flex justify-between items-center p-5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/50 hover:border-amber-400 transition-colors shadow-sm">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate pr-3">{reason}</span>
                                      <span className="bg-white dark:bg-slate-800 shadow-sm text-amber-600 dark:text-amber-400 font-black px-3 py-1.5 rounded-lg text-sm shrink-0 border border-slate-200 dark:border-slate-700">
                                        {qty} pcs
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-10 text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700 border-dashed">
                                  Tidak ada keterangan detail reason untuk OP ini.
                                </div>
                              )}
                            </div>
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
      </div>
    );
  };

  const renderReportContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-100 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 shadow-sm"></div>
        <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">Generating comprehensive report...</div>
      </div>
    );
    if (error) return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-rose-300 dark:border-rose-700 shadow-sm">
        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/40 rounded-3xl flex items-center justify-center mb-6">
          <AlertTriangle size={40} className="text-rose-500" strokeWidth={2.5} />
        </div>
        <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mb-2">Error Processing Data</p>
        <p className="text-base font-semibold text-slate-500">{error}</p>
      </div>
    );
    if (!data) return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
          <FileText size={40} className="text-slate-400" strokeWidth={2.5} />
        </div>
        <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-2">No data available</p>
        <p className="text-base font-semibold text-slate-500">Adjust your filters and click Refresh to generate data.</p>
      </div>
    );
    
    switch (selectedReport) {
      case 'ng-pond-cp':
        return renderNgPondCp();
      case 'ng-quality-control':
        return renderNgQualityControl();
      default:
        return null;
    }
  };

  const inputClassName = "w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all appearance-none shadow-sm";
  const labelClassName = "block text-xs font-black text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-widest";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto space-y-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-poppins text-slate-800 dark:text-slate-100">
      
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
        `}
      </style>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md relative z-20">
        <div className="p-6 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 text-white">
                <BarChart3 size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Reports & Analytics</h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">Real-time production and quality insights</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <button 
                onClick={fetchReport} 
                disabled={loading} 
                className="flex-1 md:flex-none px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2.5 transition-all font-black text-sm outline-none shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none uppercase tracking-wider"
              >
                <RefreshCw size={18} strokeWidth={3} className={loading ? 'animate-spin' : ''} /> 
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              
              {/* Export Dropdown */}
              <div className="relative z-50">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className={`flex-1 md:flex-none px-7 py-3.5 rounded-xl flex items-center justify-center gap-2.5 font-black text-sm transition-all shadow-lg outline-none uppercase tracking-wider ${
                    exportMenuOpen
                      ? 'bg-slate-800 text-white shadow-slate-800/30 dark:bg-indigo-600 dark:shadow-indigo-600/30'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/30 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:shadow-indigo-600/30'
                  }`}
                >
                  <Download size={18} strokeWidth={3} />
                  Export
                  <ChevronDown size={16} strokeWidth={3} className={`transition-transform duration-300 ${exportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {exportMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] overflow-hidden">
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { setExportMenuOpen(false); handleExportPDF(); }}
                        className="w-full px-4 py-3 text-left text-sm font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-3 transition-colors uppercase tracking-wider"
                      >
                        <div className="p-1.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-600"><FileJson size={16} strokeWidth={2.5} /></div> PDF
                      </button>
                      <button
                        onClick={() => { setExportMenuOpen(false); handleExportExcel(); }}
                        className="w-full px-4 py-3 text-left text-sm font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-3 transition-colors uppercase tracking-wider"
                      >
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600"><FileSpreadsheet size={16} strokeWidth={2.5} /></div> Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-md relative z-10">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white font-black text-lg mb-8 pb-5 border-b-2 border-slate-100 dark:border-slate-700 uppercase tracking-widest">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
            <Filter size={20} strokeWidth={2.5} />
          </div>
          Filter Parameters
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className={labelClassName}>Report Type</label>
            <div className="relative">
              <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value as ReportType)} className={inputClassName}>
                {reportTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                <ChevronDown size={20} strokeWidth={3} />
              </div>
            </div>
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
            <label className={labelClassName}>Line <span className="text-slate-400 font-bold normal-case">(Optional)</span></label>
            <div className="relative">
              <select value={lineCode} onChange={e => setLineCode(e.target.value)} className={inputClassName}>
                <option value="">All Lines</option>
                {lines.map(l => <option key={l.code} value={l.code}>{l.code} - {l.name}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                <ChevronDown size={20} strokeWidth={3} />
              </div>
            </div>
          </div>
        </div>

        {/* Conditional Filters Row - Only Search OP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 pt-6 border-t-2 border-slate-100 dark:border-slate-700">
          <div>
            <label className={labelClassName}>Search OP Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                <Search size={18} strokeWidth={2.5} />
              </div>
              <input
                type="text"
                className={`${inputClassName} pl-11`}
                placeholder="e.g. K1YH260001"
                value={searchOpInput}
                onChange={e => setSearchOpInput(e.target.value)}
              />
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
              Leave empty for all OP
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-8 relative z-0">
        {renderSummary()}
        {renderReportContent()}
      </div>
    </div>
  );
};