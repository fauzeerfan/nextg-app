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
          <div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-slate-800 rounded-xl border border-rose-200 dark:border-rose-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={20} className="text-rose-600" />
              <span className="text-sm font-medium">Total NG</span>
            </div>
            <div className="text-2xl font-bold text-rose-600">{summary.totalNg?.toLocaleString()}</div>
          </div>
        )}
        {summary.totalGood !== undefined && (
          <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} className="text-emerald-600" />
              <span className="text-sm font-medium">Total Good</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{summary.totalGood?.toLocaleString()}</div>
          </div>
        )}
        {summary.defectRate !== undefined && (
          <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-amber-600" />
              <span className="text-sm font-medium">Defect Rate</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{summary.defectRate}%</div>
          </div>
        )}
        {summary.totalOps !== undefined && (
          <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-800 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={20} className="text-blue-600" />
              <span className="text-sm font-medium">Total OPs</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{summary.totalOps?.toLocaleString()}</div>
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
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <h3 className="text-lg font-bold mb-3 text-orange-600 flex items-center gap-2">
              <Scissors size={20} /> Cutting Pond NG
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/50">
                  <tr>
                    <th className="py-2 px-3 text-left">OP Number</th>
                    <th className="py-2 px-3 text-left">Style</th>
                    <th className="py-2 px-3 text-left">Line</th>
                    <th className="py-2 px-3 text-right">Total NG</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cuttingPond.map((op: any) => (
                    <React.Fragment key={op.opNumber}>
                      <tr className="border-t cursor-pointer hover:bg-slate-50 transition" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>
                        <td className="py-2 px-3 font-mono">{op.opNumber}</td>
                        <td className="py-2 px-3">{op.styleCode}</td>
                        <td className="py-2 px-3">{op.lineCode}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                          {op.totalNg} {expandedOp === op.opNumber ? <ChevronDown size={16} className="inline ml-2" /> : <ChevronRight size={16} className="inline ml-2" />}
                        </td>
                      </tr>
                      {expandedOp === op.opNumber && (
                        <tr className="bg-slate-50 dark:bg-slate-900/30">
                          <td colSpan={4} className="py-4 px-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="space-y-4">
                              {/* Pattern NG Details */}
                              {op.patternNgDetails && op.patternNgDetails.length > 0 ? (
                                <div>
                                  <div className="font-bold text-sm text-rose-600 mb-2">Detail Qty NG per Pola:</div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {op.patternNgDetails.map((p: any, idx: number) => (
                                      <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-rose-200 dark:border-rose-800/50 flex justify-between items-center shadow-sm">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{p.patternName}</span>
                                        <span className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 font-bold px-2 py-1 rounded-md">{p.ng} pcs</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-500 text-sm italic">Belum ada detail per pola.</div>
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
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <h3 className="text-lg font-bold mb-3 text-emerald-600 flex items-center gap-2">
              <ClipboardCheck size={20} /> Check Panel NG
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/50">
                  <tr>
                    <th className="py-2 px-3 text-left">OP Number</th>
                    <th className="py-2 px-3 text-left">Style</th>
                    <th className="py-2 px-3 text-left">Line</th>
                    <th className="py-2 px-3 text-right">Total NG</th>
                  </tr>
                </thead>
                <tbody>
                  {data.checkPanel.map((op: any) => (
                    <React.Fragment key={op.opNumber}>
                      <tr className="border-t cursor-pointer hover:bg-slate-50 transition" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>
                        <td className="py-2 px-3 font-mono">{op.opNumber}</td>
                        <td className="py-2 px-3">{op.styleCode}</td>
                        <td className="py-2 px-3">{op.lineCode}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                          {op.totalNg} {expandedOp === op.opNumber ? <ChevronDown size={16} className="inline ml-2" /> : <ChevronRight size={16} className="inline ml-2" />}
                        </td>
                      </tr>
                      {expandedOp === op.opNumber && op.patternDetails && (
                        <tr className="bg-slate-50 dark:bg-slate-900/30">
                          <td colSpan={4} className="py-4 px-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="font-bold text-sm text-rose-600 mb-3">Detail NG per Pola dan Reason:</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {op.patternDetails.map((p: any, i: number) => {
                                // Grouping jumlah (qty) berdasarkan each reason
                                const reasonsList = Array.isArray(p.ngReasons) ? p.ngReasons : [];
                                const reasonCounts: Record<string, number> = {};
                                reasonsList.forEach((reason: string) => {
                                  reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                                });
                                const reasonEntries = Object.entries(reasonCounts);

                                return (
                                  <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm flex flex-col h-full">
                                    <div className="font-semibold text-sm flex justify-between items-center mb-3">
                                      <span className="text-slate-800 dark:text-slate-200 break-words">{p.patternName}</span>
                                      <span className="text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md ml-2 shrink-0">NG: {p.ng}</span>
                                    </div>
                                    <div className="flex-1 text-xs text-slate-700 dark:text-slate-300">
                                      {reasonEntries.length > 0 ? (
                                        <>
                                          <div className="font-medium text-slate-500 mb-1 border-b border-slate-100 dark:border-slate-700 pb-1">Detail Reasons:</div>
                                          <ul className="space-y-1">
                                            {reasonEntries.map(([reason, qty], idx) => (
                                              <li key={idx} className="flex justify-between">
                                                <span className="font-semibold">{reason}</span>
                                                <span className="text-rose-600 ml-2">{qty} pcs</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </>
                                      ) : (
                                        <span className="text-slate-500 italic">Tidak ada keterangan reason</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-right">
                                      {new Date(p.timestamp).toLocaleString()}
                                    </div>
                                  </div>
                                );
                              })}
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
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h3 className="text-lg font-bold text-amber-600 flex items-center gap-2">
            <Activity size={20} /> Quality Control NG Report
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50">
              <tr>
                <th className="py-3 px-4 text-left font-semibold">OP Number</th>
                <th className="py-3 px-4 text-left font-semibold">Style</th>
                <th className="py-3 px-4 text-left font-semibold">Line</th>
                <th className="py-3 px-4 text-right font-semibold">Good</th>
                <th className="py-3 px-4 text-right font-semibold">NG</th>
                <th className="py-3 px-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.byOp.map((op: any) => {
                // Aggregate all reasons for this specific OP from multiple inspections
                const opReasonCounts: Record<string, number> = {};
                op.inspections?.forEach((i: any) => {
                  const rList = Array.isArray(i.ngReasons) ? i.ngReasons : [];
                  rList.forEach((r: string) => opReasonCounts[r] = (opReasonCounts[r] || 0) + 1);
                });
                const reasonEntries = Object.entries(opReasonCounts);

                return (
                  <React.Fragment key={op.opNumber}>
                    <tr className="border-t hover:bg-slate-50 transition cursor-pointer" onClick={() => setExpandedOp(expandedOp === op.opNumber ? null : op.opNumber)}>
                      <td className="py-3 px-4 font-mono font-medium">{op.opNumber}</td>
                      <td className="py-3 px-4">{op.styleCode}</td>
                      <td className="py-3 px-4">{op.lineCode}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">{op.totalGood}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">{op.totalNg}</td>
                      <td className="py-3 px-4 text-center text-blue-600">
                        {expandedOp === op.opNumber ? <ChevronDown size={18} className="inline" /> : <ChevronRight size={18} className="inline" />}
                      </td>
                    </tr>
                    {expandedOp === op.opNumber && (
                      <tr className="bg-slate-50 dark:bg-slate-900/30">
                        <td colSpan={6} className="py-4 px-6 border-b border-slate-200 dark:border-slate-700">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm">
                            <h4 className="font-bold text-rose-600 mb-3 text-sm border-b border-rose-100 dark:border-rose-800/50 pb-2">Detail Aggregated NG Reasons (Total):</h4>
                            {reasonEntries.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {reasonEntries.map(([reason, qty], idx) => (
                                  <div key={idx} className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800/50">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{reason}</span>
                                    <span className="font-bold text-rose-600 text-sm ml-2 shrink-0">{qty} pcs</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-slate-500 text-sm italic">Tidak ada keterangan detail reason untuk OP ini.</div>
                            )}
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
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50">
              <tr>
                <th className="py-2 px-3 text-left">Line</th>
                <th className="py-2 px-3 text-left">OP Number</th>
                <th className="py-2 px-3 text-left">Station</th>
                <th className="py-2 px-3 text-right">Processed</th>
                <th className="py-2 px-3 text-left">First Event</th>
                <th className="py-2 px-3 text-left">Last Event</th>
                <th className="py-2 px-3 text-right">Avg Check Time</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((item: any, idx: number) => (
                <tr key={idx} className="border-t hover:bg-slate-50">
                  <td className="py-2 px-3">{item.lineCode}</td>
                  <td className="py-2 px-3 font-mono">{item.opNumber}</td>
                  <td className="py-2 px-3">{item.station}</td>
                  <td className="py-2 px-3 text-right">{item.totalProcessed}</td>
                  <td className="py-2 px-3 text-xs">{new Date(item.firstEvent).toLocaleString()}</td>
                  <td className="py-2 px-3 text-xs">{new Date(item.lastEvent).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    {item.avgCheckTimeHuman} ({item.avgCheckTimeSec.toFixed(1)} detik/unit)
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
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.stations.map((station: any) => (
            <div key={station.station} className="bg-white dark:bg-slate-800 rounded-xl border p-4">
              <div className="font-bold text-lg">{station.station}</div>
              <div className="mt-2 space-y-1 text-sm">
                <div>Total Qty: <span className="font-semibold">{station.totalQty.toLocaleString()}</span></div>
                <div>Good: <span className="text-emerald-600">{station.goodQty.toLocaleString()}</span></div>
                <div>NG: <span className="text-rose-600">{station.ngQty.toLocaleString()}</span></div>
                <div>Efficiency: <span className="text-blue-600">{station.efficiency}%</span></div>
                <div>Avg Cycle Time: <span>{station.avgCycleTimeSec} detik</span></div>
                <div>Transactions: {station.transactionCount}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLinePerformance = () => {
    if (!data?.lines) return null;
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50">
              <tr>
                <th className="py-2 px-3 text-left">Line</th>
                <th className="py-2 px-3 text-right">Total OPs</th>
                <th className="py-2 px-3 text-right">Completed</th>
                <th className="py-2 px-3 text-right">WIP</th>
                <th className="py-2 px-3 text-right">Completion Rate</th>
                <th className="py-2 px-3 text-right">CP Defect</th>
                <th className="py-2 px-3 text-right">QC Defect</th>
                <th className="py-2 px-3 text-right">Output</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line: any) => (
                <tr key={line.lineCode} className="border-t">
                  <td className="py-2 px-3 font-bold">{line.lineCode}</td>
                  <td className="py-2 px-3 text-right">{line.totalOps}</td>
                  <td className="py-2 px-3 text-right">{line.completedOps}</td>
                  <td className="py-2 px-3 text-right">{line.wipOps}</td>
                  <td className="py-2 px-3 text-right">{line.completionRate}%</td>
                  <td className="py-2 px-3 text-right text-rose-600">{line.cpDefectRate}%</td>
                  <td className="py-2 px-3 text-right text-rose-600">{line.qcDefectRate}%</td>
                  <td className="py-2 px-3 text-right font-bold">{line.totalOutput.toLocaleString()}</td>
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
    if (groupBy === 'line' && data.byLine) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr><th className="py-2 px-3 text-left">Line</th><th className="py-2 px-3 text-right">Total Qty</th><th className="py-2 px-3 text-right">Boxes</th><th className="py-2 px-3 text-right">Unique OPs</th></tr>
            </thead>
            <tbody>
              {data.byLine.map((l: any) => (
                <tr key={l.lineCode} className="border-t"><td className="py-2 px-3">{l.lineCode}</td><td className="py-2 px-3 text-right">{l.totalQty}</td><td className="py-2 px-3 text-right">{l.totalBoxes}</td><td className="py-2 px-3 text-right">{l.uniqueOps}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (groupBy === 'station' && data.byStation) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr><th className="py-2 px-3 text-left">Station</th><th className="py-2 px-3 text-right">Total Qty</th><th className="py-2 px-3 text-right">Transactions</th></tr>
            </thead>
            <tbody>
              {data.byStation.map((s: any) => (
                <tr key={s.station} className="border-t"><td className="py-2 px-3">{s.station}</td><td className="py-2 px-3 text-right">{s.totalQty}</td><td className="py-2 px-3 text-right">{s.transactionCount}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (data.byDate) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.byDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalQty" stroke="#3b82f6" name="Production Qty" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    return null;
  };

  const renderReportContent = () => {
    if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    if (!data) return <div className="text-center py-12 text-slate-500">No data available</div>;
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

  return (
    <div className="p-6">
      <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Enhanced production insights</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchReport} disabled={loading} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={() => setShowExport(!showExport)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl flex items-center gap-2">
                <Download size={16} /> Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Report Type</label>
            <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value as ReportType)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
              {reportTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Line (Optional)</label>
            <select value={lineCode} onChange={e => setLineCode(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
              <option value="">All Lines</option>
              {lines.map(l => <option key={l.code} value={l.code}>{l.code} - {l.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {(selectedReport === 'ng-cutting-pond-checkpanel' || selectedReport === 'ng-quality-control') && (
            <div>
              <label className="block text-xs font-medium mb-1">Select OP (Running)</label>
              <select value={selectedOpId} onChange={e => setSelectedOpId(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
                <option value="">All OPs</option>
                {runningOps.map(op => <option key={op.id} value={op.id}>{op.opNumber} - {op.styleCode} ({op.line?.code})</option>)}
              </select>
            </div>
          )}
          {selectedReport === 'line-check-time' && (
            <div>
              <label className="block text-xs font-medium mb-1">Station</label>
              <select value={station} onChange={e => setStation(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
                <option value="">All Stations</option>
                {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {selectedReport === 'station-performance' && (
            <div>
              <label className="block text-xs font-medium mb-1">Station</label>
              <select value={station} onChange={e => setStation(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
                <option value="">All Stations</option>
                {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {selectedReport === 'daily-production' && (
            <div>
              <label className="block text-xs font-medium mb-1">Group By</label>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
                <option value="">Date (default)</option>
                <option value="line">Line</option>
                <option value="station">Station</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {showExport && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border p-4 mb-6">
          <h3 className="text-sm font-bold mb-3">Export Options</h3>
          <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
        </div>
      )}

      {renderSummary()}
      {renderReportContent()}
    </div>
  );
};