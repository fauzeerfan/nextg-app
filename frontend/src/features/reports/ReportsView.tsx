import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, RefreshCw, Calendar, Filter,
  TrendingUp, AlertTriangle, CheckCircle, Package,
  Factory, Scissors, ClipboardCheck, Shirt, Truck,
  BarChart3, PieChart, Activity, Layers
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_BASE_URL = 'http://localhost:3000';

interface ReportSummary {
  totalNgQty?: number;
  totalGood?: number;
  totalNg?: number;
  defectRate?: string;
  totalOps?: number;
  period?: {
    start?: Date;
    end?: Date;
  };
}

interface ReportData {
  summary: ReportSummary;
  byOp?: any[];
  byDate?: any[];
  stations?: any[];
  lines?: any[];
  raw?: any[];
}

type ReportType = 
  | 'ng-cutting-pond'
  | 'ng-check-panel'
  | 'ng-quality-control'
  | 'station-performance'
  | 'line-performance'
  | 'daily-production';

const reportTypes: { value: ReportType; label: string; icon: any }[] = [
  { value: 'ng-cutting-pond', label: 'NG Cutting Pond', icon: Scissors },
  { value: 'ng-check-panel', label: 'NG Check Panel', icon: ClipboardCheck },
  { value: 'ng-quality-control', label: 'NG Quality Control', icon: Shirt },
  { value: 'station-performance', label: 'Station Performance', icon: Activity },
  { value: 'line-performance', label: 'Line Performance', icon: Factory },
  { value: 'daily-production', label: 'Daily Production', icon: Package },
];

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const ReportsView = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('ng-cutting-pond');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [lineCode, setLineCode] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const fetchLines = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLines(data);
      }
    } catch (error) {
      console.error('Failed to fetch lines', error);
    }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      if (lineCode) params.append('lineCode', lineCode);

      const res = await fetch(
        `${API_BASE_URL}/reports/${selectedReport}?${params}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const reportData = await res.json();
        setData(reportData);
      }
    } catch (error) {
      console.error('Failed to fetch report', error);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, startDate, endDate, lineCode]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      if (lineCode) params.append('lineCode', lineCode);

      window.open(
        `${API_BASE_URL}/reports/export/${selectedReport}?${params}`,
        '_blank'
      );
    } catch (error) {
      console.error('Export failed', error);
    }
  };

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const renderSummary = () => {
    if (!data?.summary) return null;

    const summary = data.summary;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summary.totalNgQty !== undefined && (
          <div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-slate-800 rounded-xl border border-rose-200 dark:border-rose-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={20} className="text-rose-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total NG</span>
            </div>
            <div className="text-2xl font-bold text-rose-600">{summary.totalNgQty?.toLocaleString()}</div>
            <div className="text-xs text-slate-500">pieces</div>
          </div>
        )}
        {summary.totalGood !== undefined && (
          <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} className="text-emerald-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Good</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{summary.totalGood?.toLocaleString()}</div>
            <div className="text-xs text-slate-500">pieces</div>
          </div>
        )}
        {summary.defectRate !== undefined && (
          <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-amber-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Defect Rate</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{summary.defectRate}%</div>
            <div className="text-xs text-slate-500">of total</div>
          </div>
        )}
        {summary.totalOps !== undefined && (
          <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-800 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={20} className="text-blue-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total OPs</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{summary.totalOps?.toLocaleString()}</div>
            <div className="text-xs text-slate-500">production orders</div>
          </div>
        )}
      </div>
    );
  };

  const renderChart = () => {
    if (!data) return null;

    if (selectedReport === 'station-performance' && data.stations) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Station Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.stations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="station" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalQty" fill="#3b82f6" name="Total Qty" />
              <Bar dataKey="goodQty" fill="#10b981" name="Good Qty" />
              <Bar dataKey="ngQty" fill="#ef4444" name="NG Qty" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (selectedReport === 'line-performance' && data.lines) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Line Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.lines}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="lineCode" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalOutput" fill="#8b5cf6" name="Total Output" />
              <Bar dataKey="completedOps" fill="#10b981" name="Completed OPs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (selectedReport === 'daily-production' && data.byDate) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Daily Production</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.byDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalQty" stroke="#3b82f6" strokeWidth={2} name="Total Qty" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (data.byOp && data.byOp.length > 0) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Top 10 OPs by NG</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byOp.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="opNumber" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="ngQty" fill="#ef4444" name="NG Qty" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  const renderTable = () => {
    if (!data?.byOp) return null;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">OP Number</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Style</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Item</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Line</th>
                {selectedReport.includes('ng') && (
                  <>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Good</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">NG</th>
                  </>
                )}
                {selectedReport === 'ng-cutting-pond' && (
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">NG Qty</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.byOp.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                  <td className="py-3 px-4 font-mono text-sm">{item.opNumber}</td>
                  <td className="py-3 px-4 text-sm">{item.styleCode}</td>
                  <td className="py-3 px-4 text-sm">{item.itemNumberFG}</td>
                  <td className="py-3 px-4 text-sm">{item.lineCode || '-'}</td>
                  {selectedReport.includes('ng') && (
                    <>
                      <td className="py-3 px-4 text-sm text-emerald-600">{item.totalGood || 0}</td>
                      <td className="py-3 px-4 text-sm text-rose-600">{item.totalNg || item.ngQty || 0}</td>
                    </>
                  )}
                  {selectedReport === 'ng-cutting-pond' && (
                    <td className="py-3 px-4 text-sm text-rose-600">{item.ngQty || 0}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Production performance insights</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-sm flex items-center gap-2"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={() => setShowExport(!showExport)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Report Type</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Line (Optional)</label>
            <select
              value={lineCode}
              onChange={(e) => setLineCode(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg"
            >
              <option value="">All Lines</option>
              {lines.map((line) => (
                <option key={line.code} value={line.code}>{line.code} - {line.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Export Options */}
      {showExport && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Export Options</h3>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg font-semibold text-sm flex items-center gap-2"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {renderSummary()}

      {/* Chart */}
      {renderChart()}

      {/* Table */}
      <div className="mt-6">
        {renderTable()}
      </div>
    </div>
  );
};