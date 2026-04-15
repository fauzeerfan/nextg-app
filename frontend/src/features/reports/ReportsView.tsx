import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, RefreshCw, Calendar, Filter,
  TrendingUp, AlertTriangle, CheckCircle, Package,
  Factory, Scissors, ClipboardCheck, Shirt, Truck,
  BarChart3, Activity, Layers, Clock, Search, X, ChevronDown, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_BASE_URL = 'http://localhost:3000';

interface RunningOp {
  id: string;
  opNumber: string;
  styleCode: string;
  line: { code: string };
}

type ReportType = 
  | 'ng-cutting-pond-checkpanel'
  | 'ng-quality-control'
  | 'line-check-time'
  | 'station-performance'
  | 'line-performance'
  | 'daily-production';

const reportTypes: { value: ReportType; label: string; icon: any }[] = [
  { value: 'ng-cutting-pond-checkpanel', label: 'NG Cutting Pond & Check Panel', icon: AlertTriangle },
  { value: 'ng-quality-control', label: 'NG Quality Control', icon: ClipboardCheck },
  { value: 'line-check-time', label: 'Line Check Time', icon: Clock },
  { value: 'station-performance', label: 'Station Performance', icon: Activity },
  { value: 'line-performance', label: 'Line Performance', icon: Factory },
  { value: 'daily-production', label: 'Daily Production', icon: Package },
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
  const [selectedReport, setSelectedReport] = useState<ReportType>('ng-cutting-pond-checkpanel');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lineCode, setLineCode] = useState('');
  const [station, setStation] = useState('');
  const [selectedOpId, setSelectedOpId] = useState('');
  const [groupBy, setGroupBy] = useState<'line' | 'station' | ''>('');
  const [lines, setLines] = useState<any[]>([]);
  const [runningOps, setRunningOps] = useState<RunningOp[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);

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
    try {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      if (lineCode) params.append('lineCode', lineCode);
      if (station && selectedReport === 'line-check-time') params.append('station', station);
      if (station && selectedReport === 'station-performance') params.append('station', station);
      if (lineCode && selectedReport === 'line-performance') params.append('lineCode', lineCode);
      if (selectedOpId && (selectedReport === 'ng-cutting-pond-checkpanel' || selectedReport === 'ng-quality-control')) {
        params.append('opId', selectedOpId);
      }
      if (groupBy && selectedReport === 'daily-production') params.append('groupBy', groupBy);

      const res = await fetch(`${API_BASE_URL}/reports/${selectedReport}?${params}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) setData(await res.json());
      else setData(null);
    } catch (error) {
      console.error('Failed to fetch report', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, startDate, endDate, lineCode, station, selectedOpId, groupBy]);

  useEffect(() => {
    fetchLines();
    fetchRunningOps();
  }, [fetchLines, fetchRunningOps]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async () => {
    let exportEndpoint = '';
    if (selectedReport === 'ng-cutting-pond-checkpanel') exportEndpoint = 'ng-cutting-pond';
    else if (selectedReport === 'ng-quality-control') exportEndpoint = 'ng-quality-control';
    else return alert('Export not available for this report');
    const params = new URLSearchParams({
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    });
    if (lineCode) params.append('lineCode', lineCode);
    window.open(`${API_BASE_URL}/reports/export/${exportEndpoint}?${params}`, '_blank');
  };

  const renderSummary = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summary.totalNg !== undefined && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-rose-500 border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
              <AlertTriangle size={100} className="text-rose-600" />
            </div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total NG</div>
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white leading-none relative z-10">
              {summary.totalNg?.toLocaleString()}
            </div>
          </div>
        )}
        {summary.totalGood !== undefined && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-emerald-500 border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
              <CheckCircle size={100} className="text-emerald-600" />
            </div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Good</div>
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white leading-none relative z-10">
              {summary.totalGood?.toLocaleString()}
            </div>
          </div>
        )}
        {summary.defectRate !== undefined && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-amber-500 border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
              <TrendingUp size={100} className="text-amber-600" />
            </div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Defect Rate</div>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white leading-none relative z-10">
              {summary.defectRate}%
            </div>
          </div>
        )}
        {summary.totalOps !== undefined && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-blue-500 border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
              <Layers size={100} className="text-blue-600" />
            </div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total OPs</div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                <Layers size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white leading-none relative z-10">
              {summary.totalOps?.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNgCuttingPondCheckPanel = () => {
    if (!data) return null;
    return (
      <div className="space-y-6">
        {/* Cutting Pond Section */}
        {data.cuttingPond && data.cuttingPond.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md text-white">
                  <Scissors size={20} />
                </div>
                Cutting Pond NG Data
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-4 px-6">OP Number</th>
                    <th className="py-4 px-6">Style</th>
                    <th className="py-4 px-6">Line</th>
                    <th className="py-4 px-6 text-right">Total NG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {data.cuttingPond.map((op: any) => (
                    <React.Fragment key={op.opNumber}>
                      <tr 
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150 group" 
                        onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}
                      >
                        <td className="py-4 px-6 font-mono font-black text-slate-900 dark:text-white">{op.opNumber}</td>
                        <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">{op.styleCode}</td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider">
                            {op.lineCode}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-rose-600 dark:text-rose-400 text-base">
                          <div className="flex items-center justify-end gap-3">
                            {op.totalNg}
                            <div className={`p-1.5 rounded-lg transition-colors ${expandedOp === op.opNumber ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                              {expandedOp === op.opNumber ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {expandedOp === op.opNumber && (
                        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                          <td colSpan={4} className="p-0 border-b border-slate-200 dark:border-slate-700">
                            <div className="px-8 py-6 border-l-4 border-orange-500">
                              {op.patternNgDetails && op.patternNgDetails.length > 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-700 shadow-sm">
                                  <div className="font-black text-sm text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2 uppercase tracking-wider">
                                    <div className="w-1.5 h-5 bg-orange-500 rounded-full"></div>
                                    Detail Qty NG per Pola
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {op.patternNgDetails.map((p: any, idx: number) => (
                                      <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center hover:border-orange-300 dark:hover:border-orange-500/50 transition-colors">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate pr-2 text-sm">{p.patternName}</span>
                                        <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-black px-3 py-1.5 rounded-lg text-xs shrink-0">
                                          {p.ng} pcs
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 border-dashed">
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
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md text-white">
                  <ClipboardCheck size={20} />
                </div>
                Check Panel NG Data
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-4 px-6">OP Number</th>
                    <th className="py-4 px-6">Style</th>
                    <th className="py-4 px-6">Line</th>
                    <th className="py-4 px-6 text-right">Total NG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {data.checkPanel.map((op: any) => (
                    <React.Fragment key={op.opNumber}>
                      <tr 
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150 group" 
                        onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}
                      >
                        <td className="py-4 px-6 font-mono font-black text-slate-900 dark:text-white">{op.opNumber}</td>
                        <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">{op.styleCode}</td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider">
                            {op.lineCode}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-rose-600 dark:text-rose-400 text-base">
                          <div className="flex items-center justify-end gap-3">
                            {op.totalNg}
                            <div className={`p-1.5 rounded-lg transition-colors ${expandedOp === op.opNumber ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                              {expandedOp === op.opNumber ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {expandedOp === op.opNumber && op.patternDetails && (
                        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                          <td colSpan={4} className="p-0 border-b border-slate-200 dark:border-slate-700">
                            <div className="px-8 py-6 border-l-4 border-emerald-500">
                              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="font-black text-sm text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2 uppercase tracking-wider">
                                  <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
                                  Detail NG per Pola dan Reason
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                  {op.patternDetails.map((p: any, i: number) => {
                                    const reasonsList = Array.isArray(p.ngReasons) ? p.ngReasons : [];
                                    const reasonCounts: Record<string, number> = {};
                                    reasonsList.forEach((reason: string) => {
                                      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                                    });
                                    const reasonEntries = Object.entries(reasonCounts);

                                    return (
                                      <div key={i} className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 flex flex-col h-full hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors">
                                        <div className="flex justify-between items-start mb-4 gap-3">
                                          <span className="font-black text-slate-800 dark:text-slate-200 text-sm leading-tight uppercase">{p.patternName}</span>
                                          <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-black px-2.5 py-1 rounded-lg text-xs shrink-0">
                                            NG: {p.ng}
                                          </span>
                                        </div>
                                        <div className="flex-1">
                                          {reasonEntries.length > 0 ? (
                                            <div className="space-y-2">
                                              {reasonEntries.map(([reason, qty], idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                                                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold truncate pr-2">{reason}</span>
                                                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 shrink-0">{qty}</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-slate-500 font-medium italic">Tidak ada keterangan reason</span>
                                          )}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-4 pt-3 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-end gap-1.5 uppercase tracking-widest">
                                          <Clock size={12} />
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
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-md text-white">
              <ClipboardCheck size={20} />
            </div>
            Quality Control NG Report
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-4 px-6">OP Number</th>
                <th className="py-4 px-6">Style</th>
                <th className="py-4 px-6">Line</th>
                <th className="py-4 px-6 text-right">Good</th>
                <th className="py-4 px-6 text-right">NG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
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
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150 group" 
                      onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}
                    >
                      <td className="py-4 px-6 font-mono font-black text-slate-900 dark:text-white">{op.opNumber}</td>
                      <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">{op.styleCode}</td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider">
                          {op.lineCode}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-emerald-600 dark:text-emerald-400 text-base">{op.totalGood}</td>
                      <td className="py-4 px-6 text-right font-black text-rose-600 dark:text-rose-400 text-base">
                        <div className="flex items-center justify-end gap-3">
                          {op.totalNg}
                          <div className={`p-1.5 rounded-lg transition-colors ${expandedOp === op.opNumber ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                            {expandedOp === op.opNumber ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedOp === op.opNumber && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                        <td colSpan={5} className="p-0 border-b border-slate-200 dark:border-slate-700">
                          <div className="px-8 py-6 border-l-4 border-amber-500">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-700 shadow-sm">
                              <div className="font-black text-sm text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2 uppercase tracking-wider">
                                <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
                                Detail Aggregated NG Reasons (Total)
                              </div>
                              {reasonEntries.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                  {reasonEntries.map(([reason, qty], idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border-2 border-rose-100 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700 transition-colors">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate pr-2">{reason}</span>
                                      <span className="bg-white dark:bg-slate-800 shadow-sm text-rose-600 dark:text-rose-400 font-black px-3 py-1.5 rounded-lg text-sm shrink-0 border border-slate-200 dark:border-slate-700">
                                        {qty} pcs
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700 border-dashed">
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

  const renderLineCheckTime = () => {
    if (!data?.data) return null;
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-4 px-6">Line</th>
                <th className="py-4 px-6">OP Number</th>
                <th className="py-4 px-6">Station</th>
                <th className="py-4 px-6 text-right">Processed</th>
                <th className="py-4 px-6">First Event</th>
                <th className="py-4 px-6">Last Event</th>
                <th className="py-4 px-6 text-right">Avg Check Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {data.data.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150">
                  <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-200">{item.lineCode}</td>
                  <td className="py-4 px-6 font-mono font-black text-slate-700 dark:text-slate-300">{item.opNumber}</td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                      {item.station}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-black text-slate-900 dark:text-white text-base">{item.totalProcessed}</td>
                  <td className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(item.firstEvent).toLocaleString()}</td>
                  <td className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(item.lastEvent).toLocaleString()}</td>
                  <td className="py-4 px-6 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    <div className="flex flex-col items-end">
                      <span className="text-sm">{item.avgCheckTimeHuman}</span>
                      <span className="text-[10px] text-slate-500 font-sans mt-0.5">({item.avgCheckTimeSec.toFixed(1)} s/unit)</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderStationPerformance = () => {
    if (!data?.stations) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {data.stations.map((station: any) => (
          <div key={station.station} className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
            <div className="flex justify-between items-start mb-5 pb-5 border-b-2 border-slate-100 dark:border-slate-700/50">
              <h4 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-600/30">
                  <Activity size={20} />
                </div>
                {station.station}
              </h4>
              <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                Eff: {station.efficiency}%
              </span>
            </div>
            
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Qty</span>
                <span className="font-black text-slate-900 dark:text-white text-lg leading-none">{station.totalQty.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Good</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg leading-none">{station.goodQty.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NG</span>
                <span className="font-black text-rose-600 dark:text-rose-400 text-lg leading-none">{station.ngQty.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t-2 border-slate-100 dark:border-slate-700/50 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl text-center border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Avg Cycle</div>
                <div className="font-mono font-black text-slate-900 dark:text-white text-base">{station.avgCycleTimeSec}s</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl text-center border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Trx Count</div>
                <div className="font-mono font-black text-slate-900 dark:text-white text-base">{station.transactionCount}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLinePerformance = () => {
    if (!data?.lines) return null;
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-4 px-6">Line</th>
                <th className="py-4 px-6 text-right">Total OPs</th>
                <th className="py-4 px-6 text-right">Completed</th>
                <th className="py-4 px-6 text-right">WIP</th>
                <th className="py-4 px-6 text-center">Completion Rate</th>
                <th className="py-4 px-6 text-center">CP Defect</th>
                <th className="py-4 px-6 text-center">QC Defect</th>
                <th className="py-4 px-6 text-right text-blue-600 dark:text-blue-400">Total Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {data.lines.map((line: any) => (
                <tr key={line.lineCode} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150">
                  <td className="py-4 px-6">
                    <span className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Factory size={18} className="text-slate-400" />
                      {line.lineCode}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-slate-700 dark:text-slate-300 text-base">{line.totalOps}</td>
                  <td className="py-4 px-6 text-right text-emerald-600 dark:text-emerald-400 font-black text-base">{line.completedOps}</td>
                  <td className="py-4 px-6 text-right text-amber-600 dark:text-amber-400 font-black text-base">{line.wipOps}</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-black bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      {line.completionRate}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-black border ${line.cpDefectRate > 0 ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                      {line.cpDefectRate}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-black border ${line.qcDefectRate > 0 ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                      {line.qcDefectRate}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-black text-blue-600 dark:text-blue-400 text-lg">{line.totalOutput.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDailyProduction = () => {
    if (!data) return null;
    
    const tableHeaderClass = "py-4 px-6 text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold";
    const tdClass = "py-4 px-6 font-semibold text-slate-800 dark:text-slate-200";

    if (groupBy === 'line' && data.byLine) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className={tableHeaderClass}>Line</th>
                <th className={`${tableHeaderClass} text-right`}>Total Qty</th>
                <th className={`${tableHeaderClass} text-right`}>Boxes</th>
                <th className={`${tableHeaderClass} text-right`}>Unique OPs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {data.byLine.map((l: any) => (
                <tr key={l.lineCode} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className={tdClass}>
                    <span className="flex items-center gap-3 font-black text-base"><Factory size={18} className="text-slate-400"/> {l.lineCode}</span>
                  </td>
                  <td className={`${tdClass} text-right font-black text-blue-600 dark:text-blue-400 text-lg`}>{l.totalQty.toLocaleString()}</td>
                  <td className={`${tdClass} text-right font-bold text-slate-700 dark:text-slate-300 text-base`}>{l.totalBoxes.toLocaleString()}</td>
                  <td className={`${tdClass} text-right`}>
                    <span className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg text-xs font-black">{l.uniqueOps}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (groupBy === 'station' && data.byStation) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className={tableHeaderClass}>Station</th>
                <th className={`${tableHeaderClass} text-right`}>Total Qty</th>
                <th className={`${tableHeaderClass} text-right`}>Transactions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {data.byStation.map((s: any) => (
                <tr key={s.station} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className={tdClass}>
                    <span className="flex items-center gap-3 font-black text-base uppercase tracking-wide"><Activity size={18} className="text-slate-400"/> {s.station}</span>
                  </td>
                  <td className={`${tdClass} text-right font-black text-emerald-600 dark:text-emerald-400 text-lg`}>{s.totalQty.toLocaleString()}</td>
                  <td className={`${tdClass} text-right font-bold text-slate-500 text-base`}>{s.transactionCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (data.byDate) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3 text-slate-900 dark:text-white font-black text-xl uppercase tracking-wide">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            Production Trend
          </div>
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.byDate} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '2px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  itemStyle={{ fontWeight: '900' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '14px' }} />
                <Line 
                  type="monotone" 
                  dataKey="totalQty" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  dot={{ r: 6, strokeWidth: 3, fill: '#fff' }}
                  activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 3, fill: '#fff' }}
                  name="Production Qty" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderReportContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-32 space-y-5">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600"></div>
        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Generating comprehensive report...</div>
      </div>
    );
    if (!data) return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
        <FileText size={64} className="mb-6 text-slate-300 dark:text-slate-600" />
        <p className="text-xl font-black text-slate-700 dark:text-slate-300 mb-2">No data available</p>
        <p className="text-sm font-medium text-slate-500">Adjust your filters and click Refresh to generate data.</p>
      </div>
    );
    
    switch (selectedReport) {
      case 'ng-cutting-pond-checkpanel': return renderNgCuttingPondCheckPanel();
      case 'ng-quality-control': return renderNgQualityControl();
      case 'line-check-time': return renderLineCheckTime();
      case 'station-performance': return renderStationPerformance();
      case 'line-performance': return renderLinePerformance();
      case 'daily-production': return renderDailyProduction();
      default: return null;
    }
  };

  const inputClassName = "w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm font-bold rounded-xl focus:ring-0 focus:border-blue-500 outline-none transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:focus:border-blue-500 appearance-none";
  const labelClassName = "block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen font-poppins text-slate-800 dark:text-slate-100">
      
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
        `}
      </style>

      {/* Header Card - Solid Style */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden relative">
        <div className="p-6 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 text-white">
                <BarChart3 size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Reports & Analytics</h1>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1.5">Real-time production and quality insights</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button 
                onClick={fetchReport} 
                disabled={loading} 
                className="flex-1 md:flex-none px-6 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all font-black text-sm outline-none shadow-sm disabled:opacity-50 uppercase tracking-wider"
              >
                <RefreshCw size={18} strokeWidth={2.5} className={loading ? 'animate-spin text-blue-600' : ''} /> 
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button 
                onClick={() => setShowExport(!showExport)} 
                className={`flex-1 md:flex-none px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition-all shadow-sm outline-none border-2 uppercase tracking-wider ${
                  showExport 
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-400' 
                  : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:border-blue-600 dark:hover:bg-blue-500'
                }`}
              >
                <Download size={18} strokeWidth={2.5} /> 
                {showExport ? 'Close Export' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Panel (Solid Style) */}
      {showExport && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-emerald-500 p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-300 shadow-lg">
          <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400 font-black text-lg uppercase tracking-wide">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
              <Download size={24} />
            </div>
            Export Configuration
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-6">
            Current filters (Date and Line) will be applied to the exported document.
          </p>
          <button 
            onClick={handleExport} 
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-3 font-black text-base shadow-lg shadow-emerald-500/30 transition-all outline-none uppercase tracking-wider"
          >
            Download CSV Report
          </button>
        </div>
      )}

      {/* Filters Section - Solid Style */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm relative z-20">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white font-black text-lg mb-6 pb-4 border-b-2 border-slate-100 dark:border-slate-700 uppercase tracking-wide">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
            <Filter size={20} strokeWidth={2.5} />
          </div>
          Parameters
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className={labelClassName}>Report Type</label>
            <div className="relative">
              <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value as ReportType)} className={inputClassName}>
                {reportTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
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
            <label className={labelClassName}>Line <span className="text-slate-400 font-medium normal-case">(Optional)</span></label>
            <div className="relative">
              <select value={lineCode} onChange={e => setLineCode(e.target.value)} className={inputClassName}>
                <option value="">All Lines</option>
                {lines.map(l => <option key={l.code} value={l.code}>{l.code} - {l.name}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                <ChevronDown size={20} strokeWidth={3} />
              </div>
            </div>
          </div>
        </div>

        {/* Conditional Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 pt-6 border-t-2 border-slate-100 dark:border-slate-700 empty:hidden">
          {(selectedReport === 'ng-cutting-pond-checkpanel' || selectedReport === 'ng-quality-control') && (
            <div>
              <label className={labelClassName}>Select OP (Running)</label>
              <div className="relative">
                <select value={selectedOpId} onChange={e => setSelectedOpId(e.target.value)} className={inputClassName}>
                  <option value="">All Running OPs</option>
                  {runningOps.map(op => <option key={op.id} value={op.id}>{op.opNumber} - {op.styleCode} ({op.line?.code})</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                  <ChevronDown size={20} strokeWidth={3} />
                </div>
              </div>
            </div>
          )}
          
          {(selectedReport === 'line-check-time' || selectedReport === 'station-performance') && (
            <div>
              <label className={labelClassName}>Station</label>
              <div className="relative">
                <select value={station} onChange={e => setStation(e.target.value)} className={inputClassName}>
                  <option value="">All Stations</option>
                  {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                  <ChevronDown size={20} strokeWidth={3} />
                </div>
              </div>
            </div>
          )}
          
          {selectedReport === 'daily-production' && (
            <div>
              <label className={labelClassName}>Group By</label>
              <div className="relative">
                <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className={inputClassName}>
                  <option value="">Date (Default Trend)</option>
                  <option value="line">By Line</option>
                  <option value="station">By Station</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                  <ChevronDown size={20} strokeWidth={3} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {renderSummary()}
        {renderReportContent()}
      </div>
    </div>
  );
};