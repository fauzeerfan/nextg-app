import React, { useState } from 'react';
import {
  Search, Package, Factory, Truck, ClipboardCheck,
  Shirt, Scissors, CheckCircle, AlertCircle, Clock,
  ArrowRight, Layers, Box, FileText, History,
  ChevronRight, ChevronDown, RefreshCw
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface TraceabilityEvent {
  timestamp: Date;
  station: string;
  action: string;
  qty: number;
  details: any;
}

interface TraceabilityResult {
  opNumber: string;
  styleCode: string;
  itemNumberFG: string;
  currentStatus: string;
  currentStation: string;
  timeline: TraceabilityEvent[];
  summary: {
    totalGood: number;
    totalNg: number;
    totalPacked: number;
    totalShipped: number;
  };
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const stationIcons: Record<string, any> = {
  CUTTING_ENTAN: Scissors,
  CUTTING_POND: Layers,
  CHECK_PANEL: ClipboardCheck,
  SEWING: Shirt,
  QUALITY_CONTROL: CheckCircle,
  QC: CheckCircle,
  PACKING: Box,
  FINISHED_GOODS: Package,
  FG: Package,
  SHIPPING: Truck,
};

const stationColors: Record<string, string> = {
  CUTTING_ENTAN: 'from-orange-500 to-orange-400',
  CUTTING_POND: 'from-amber-500 to-amber-400',
  CHECK_PANEL: 'from-emerald-500 to-emerald-400',
  CP: 'from-emerald-500 to-emerald-400',
  SEWING: 'from-purple-500 to-purple-400',
  QUALITY_CONTROL: 'from-blue-500 to-blue-400',
  QC: 'from-blue-500 to-blue-400',
  PACKING: 'from-indigo-500 to-indigo-400',
  FINISHED_GOODS: 'from-cyan-500 to-cyan-400',
  FG: 'from-cyan-500 to-cyan-400',
  SHIPPING: 'from-rose-500 to-rose-400',
};

export const TraceabilityView = () => {
  const [searchType, setSearchType] = useState<'op' | 'surat-jalan' | 'fg' | 'qr'>('op');
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<TraceabilityResult | any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/traceability/search?query=${encodeURIComponent(searchQuery)}&type=${searchType}`,
        { headers: getAuthHeaders() }
      );

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const err = await res.json();
        setError(err.message || 'Search failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  const renderTimeline = (timeline: TraceabilityEvent[]) => {
    return (
      <div className="relative">
        {timeline.map((event, idx) => {
          const Icon = stationIcons[event.station] || Package;
          const color = stationColors[event.station] || 'from-slate-500 to-slate-400';
          const isExpanded = expandedEvents.has(idx);

          return (
            <div key={idx} className="relative pl-8 pb-8 last:pb-0">
              {/* Timeline Line */}
              {idx < timeline.length - 1 && (
                <div className="absolute left-3 top-8 w-0.5 h-full bg-gradient-to-b from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-800" />
              )}

              {/* Timeline Dot */}
              <div className={`absolute left-0 w-6 h-6 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Icon size={12} className="text-white" />
              </div>

              {/* Event Card */}
              <div
                className={`ml-6 bg-white dark:bg-slate-800 rounded-xl border-2 transition-all cursor-pointer ${
                  isExpanded
                    ? 'border-blue-500 shadow-lg'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
                onClick={() => toggleEvent(idx)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${color}`}>
                        <Icon size={16} className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{event.station}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{event.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{event.qty.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">pieces</div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={20} className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                    <Clock size={12} />
                    <span>{new Date(event.timestamp).toLocaleString('id-ID')}</span>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && event.details && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Details</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(event.details).map(([key, value]: any, i) => {
                          if (key === 'patterns' || key === 'inspections' || key === 'items') {
                            return (
                              <div key={i} className="col-span-full">
                                <div className="text-xs font-medium text-slate-500 mb-1">{key}</div>
                                <div className="space-y-1">
                                  {Array.isArray(value) && value.slice(0, 5).map((item: any, j) => (
                                    <div key={j} className="text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                      {JSON.stringify(item).substring(0, 100)}...
                                    </div>
                                  ))}
                                  {Array.isArray(value) && value.length > 5 && (
                                    <div className="text-xs text-slate-500">+{value.length - 5} more</div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={i}>
                              <div className="text-xs font-medium text-slate-500">{key}</div>
                              <div className="text-sm text-slate-900 dark:text-white">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <History size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Traceability</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Track production history from start to finish</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Search By</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg"
            >
              <option value="op">OP Number</option>
              <option value="surat-jalan">Surat Jalan</option>
              <option value="fg">FG Number</option>
              <option value="qr">QR Code</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {searchType === 'op' && 'OP Number'}
              {searchType === 'surat-jalan' && 'Surat Jalan Number'}
              {searchType === 'fg' && 'FG Number'}
              {searchType === 'qr' && 'QR Code'}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={`Enter ${searchType}...`}
              className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:from-purple-700 hover:to-purple-600 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Search
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600" />
            <span className="text-sm text-rose-600">{error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* OP Summary */}
          {result.opNumber && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{result.opNumber}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{result.styleCode} - {result.itemNumberFG}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-500">Current Status</div>
                  <div className="text-lg font-bold text-blue-600">{result.currentStation}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">Total Good</div>
                  <div className="text-xl font-bold text-emerald-600">{result.summary.totalGood?.toLocaleString()}</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
                  <div className="text-xs text-rose-700 dark:text-rose-400">Total NG</div>
                  <div className="text-xl font-bold text-rose-600">{result.summary.totalNg?.toLocaleString()}</div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                  <div className="text-xs text-indigo-700 dark:text-indigo-400">Total Packed</div>
                  <div className="text-xl font-bold text-indigo-600">{result.summary.totalPacked?.toLocaleString()}</div>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-lg">
                  <div className="text-xs text-cyan-700 dark:text-cyan-400">Total Shipped</div>
                  <div className="text-xl font-bold text-cyan-600">{result.summary.totalShipped?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Surat Jalan Summary */}
          {result.suratJalan && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Surat Jalan: {result.suratJalan}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(result.shipmentDate).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-500">Total Qty</div>
                  <div className="text-lg font-bold text-blue-600">{result.totalQty?.toLocaleString()}</div>
                </div>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400">
                <div className="font-semibold mb-2">OPs in this shipment ({result.ops?.length || 0}):</div>
                <div className="flex flex-wrap gap-2">
                  {result.ops?.map((op: any, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-mono">
                      {op.opNumber}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          {result.timeline && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Production Timeline</h3>
              {renderTimeline(result.timeline)}
            </div>
          )}

          {/* Multiple OPs (for Surat Jalan / FG) */}
          {result.ops && Array.isArray(result.ops) && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">OP Details</h3>
              <div className="space-y-4">
                {result.ops.map((op: TraceabilityResult, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{op.opNumber}</h4>
                        <p className="text-xs text-slate-500">{op.styleCode} - {op.itemNumberFG}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Status</div>
                        <div className="text-sm font-bold text-blue-600">{op.currentStation}</div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-emerald-600">Good: {op.summary.totalGood}</span>
                      <span className="text-rose-600">NG: {op.summary.totalNg}</span>
                      <span className="text-indigo-600">Packed: {op.summary.totalPacked}</span>
                      <span className="text-cyan-600">Shipped: {op.summary.totalShipped}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/10 dark:to-purple-900/5 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Search size={32} className="text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Search Production History</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Enter an OP number, Surat Jalan, FG number, or QR code to trace its complete production journey
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full">OP-2024-001</span>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full">SJ-2024-001</span>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full">FG-2024-001</span>
          </div>
        </div>
      )}
    </div>
  );
};