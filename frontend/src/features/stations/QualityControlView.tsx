import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, ImageIcon, ImageOff, AlertTriangle,
  ClipboardCheck, ThumbsUp, Layers, Package, ArrowLeft, Wifi, Eye, Award,
  Shield, CheckSquare, XSquare
} from 'lucide-react';
import type { ProductionOrder } from '../../types/production';
import { NG_REASONS as FALLBACK_NG_REASONS } from '../../lib/data';

type ProductionOrderWithId = ProductionOrder & { id: string };

const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY_OP = 'nextg_qc_active_op';
const STORAGE_KEY_GLOBAL_LOGS = 'nextg_qc_recent_logs';

interface QCLog {
  id: string;
  time: string;
  opNumber?: string;
  good: number;
  ng: number;
  reason?: string;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: 'amber' | 'emerald' | 'rose' | 'blue';
  subtitle?: string;
  suffix?: string;
}

const MetricCard = ({ title, value, icon: Icon, color = 'amber', subtitle, suffix }: MetricCardProps) => {
  const colors = {
    amber: { bg: 'from-amber-100 to-amber-50', icon: 'text-amber-600', darkBg: 'from-amber-900/20 to-amber-900/10' },
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    rose: { bg: 'from-rose-100 to-rose-50', icon: 'text-rose-600', darkBg: 'from-rose-900/20 to-rose-900/10' },
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/20 to-blue-900/10' }
  }[color];

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-10 h-10 bg-gradient-to-br ${colors.bg} dark:${colors.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={18} className={colors.icon} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">
        {value}
        {suffix && <span className="text-lg text-slate-500 dark:text-slate-400 ml-2">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

export const QualityControlView = ({
  addLog,
  onNavigate: _onNavigate,
}: {
  addLog: (msg: string, type: any) => void;
  onNavigate: (tab: string) => void;
}) => {
  const [ops, setOps] = useState<ProductionOrderWithId[]>([]);
  const [actOp, setActOp] = useState<ProductionOrderWithId | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpd, setLastUpd] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [ngReason, setNgReason] = useState('');
  const [ngOpen, setNgOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [refTrigger, setRefTrigger] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [setGoodImg, setSetGoodImg] = useState<string | null>(null);
  const [setNgImg, setSetNgImg] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('nextg_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchOps = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=QC`);
      if (res.ok) {
        setOps(await res.json());
        setLastUpd(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch {
      console.error('Failed to fetch QC ops');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOps();
    const i = setInterval(fetchOps, 5000);
    return () => clearInterval(i);
  }, [fetchOps]);

  useEffect(() => {
    fetchOps();
  }, [refTrigger]);

  const loadSetImages = async (op: ProductionOrderWithId) => {
    setSetGoodImg(null);
    setSetNgImg(null);
    const lineCode = op.lineCode || 'K1YH';
    try {
      const res = await fetch(
        `${API_BASE_URL}/pattern-masters?lineCode=${lineCode}&style=${op.styleCode}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const masters = await res.json();
        const master = masters[0];
        if (master) {
          setSetGoodImg(master.imgSetGood || null);
          setSetNgImg(master.imgSetNg || null);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchCategories = async (lineCode: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters/${lineCode}/ng-categories`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setCategories(await res.json());
      else setCategories([]);
    } catch {
      console.error;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_OP);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          setActOp(parsed);
          loadSetImages(parsed);
          fetchCategories(parsed.lineCode || 'K1YH');
          addLog(`Session restored: ${parsed.opNumber}`, 'info');
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_OP);
      }
    }
  }, [addLog]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

  const selectOp = (op: ProductionOrderWithId) => {
    setActOp(op);
    loadSetImages(op);
    fetchCategories(op.lineCode || 'K1YH');
    localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(op));
    addLog(`Inspecting: ${op.opNumber}`, 'info');
    setNgReason('');
  };

  const back = () => {
    localStorage.removeItem(STORAGE_KEY_OP);
    setActOp(null);
    setSetGoodImg(null);
    setSetNgImg(null);
    fetchOps();
  };

  const submitInspection = async (isGood: boolean, reason: string = '') => {
    if (isSubmittingRef.current) return;
    if (!actOp) return showToast('Pilih OP terlebih dahulu', 'error');

    const token = localStorage.getItem('nextg_token');
    if (!token) return showToast('Token tidak ditemukan', 'error');

    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/production-orders/${actOp.id}/qc-inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          good: isGood ? 1 : 0,
          ng: isGood ? 0 : 1,
          ngReasons: reason ? [reason] : undefined,
        }),
      });

      if (res.ok) {
        // Update local state (simulate)
        const log: QCLog = {
          id: `L-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          opNumber: actOp.opNumber,
          good: isGood ? 1 : 0,
          ng: isGood ? 0 : 1,
          reason,
        };
        const recent = JSON.parse(localStorage.getItem(STORAGE_KEY_GLOBAL_LOGS) || '[]');
        localStorage.setItem(STORAGE_KEY_GLOBAL_LOGS, JSON.stringify([log, ...recent].slice(0, 50)));

        showToast(isGood ? 'Good +1' : 'NG Recorded', isGood ? 'success' : 'error');
        setRefTrigger((prev) => prev + 1);

        // Check if OP is fully inspected (good+ng >= total sets from sewing)
        // We'll rely on backend to update station, but for UI we can just refresh ops
        // Optionally, if all done, go back
        // For simplicity, we'll just refresh ops after a short delay
        setTimeout(() => {
          fetchOps();
          if (actOp && (actOp.qtySewingOut || 0) <= ((actOp.qtyQC || 0) + (actOp.qcNgQty || 0) + 1)) {
            // If likely done, go back
            back();
          }
        }, 500);
      } else {
        const err = await res.json();
        showToast(`Gagal (${res.status}): ${err.message}`, 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleGood = () => submitInspection(true);
  const handleNg = () => setNgOpen(true);
  const confirmNg = () => {
    if (ngReason) {
      submitInspection(false, ngReason);
      setNgOpen(false);
      setNgReason('');
    }
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    e.currentTarget.nextElementSibling?.classList.remove('hidden');
    e.currentTarget.nextElementSibling?.classList.add('flex');
  };

  const totalOps = ops.length;
  const totalGood = ops.reduce((s, o) => s + (o.qtyQC || 0), 0);
  const totalNg = ops.reduce((s, o) => s + (o.qcNgQty || 0), 0);
  const totalInput = ops.reduce((s, o) => s + (o.qtySewingOut || 0), 0);
  const completionRate = totalInput > 0 ? Math.round((totalGood / totalInput) * 100) : 0;

  return (
    <div className="animate-in fade-in duration-300">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[200] animate-in slide-in-from-right-5 fade-in duration-300 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white border-emerald-400'
              : 'bg-gradient-to-r from-rose-500 to-rose-400 text-white border-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="font-bold text-sm">{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="ml-4 opacity-80 hover:opacity-100">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-900/10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <ClipboardCheck size={28} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                  <Wifi size={16} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Quality Control
                  <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full font-bold">
                    SET INSPECTION
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl shadow-lg">
                <div className="flex flex-col">
                  <div className="text-xs font-medium opacity-90">Queue</div>
                  <div className="text-2xl font-bold">{totalOps}</div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Package size={20} />
                </div>
              </div>
              <button
                onClick={fetchOps}
                disabled={refreshing}
                className="group px-5 py-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                {refreshing ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 pb-8">
          <MetricCard title="Total Input" value={totalInput} icon={Package} color="blue" suffix="sets" subtitle="From Sewing" />
          <MetricCard title="Verified Good" value={totalGood} icon={CheckCircle} color="emerald" suffix="sets" subtitle="Cumulative" />
          <MetricCard title="NG Total" value={totalNg} icon={AlertTriangle} color="rose" suffix="sets" subtitle="Cumulative" />
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Completion Rate</div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-lg flex items-center justify-center">
                <Award size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{completionRate}%</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - OP List */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      actOp
                        ? 'bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10'
                        : 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10'
                    }`}
                  >
                    {actOp ? (
                      <Layers size={20} className="text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ClipboardCheck size={20} className="text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {actOp ? 'Set Inspection' : 'Production Orders'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {actOp ? `OP: ${actOp.opNumber}` : `${totalOps} orders ready`}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {actOp ? 1 : totalOps}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {!actOp ? (
                totalOps === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-slate-400" />
                    </div>
                    <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Orders</h4>
                    <p className="text-slate-500 dark:text-slate-400">Waiting for incoming orders...</p>
                  </div>
                ) : (
                  ops.map((op) => (
                    <div
                      key={op.id}
                      className={`group p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer mb-2 ${
                        actOp?.id === op.id
                          ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 shadow-lg'
                          : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-lg'
                      }`}
                      onClick={() => selectOp(op)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-mono font-bold text-lg text-slate-900 dark:text-white">
                            {op.opNumber}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Style: {op.styleCode}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Ready</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900 dark:text-white">{op.qtySewingOut || 0}</div>
                          <div className="text-xs text-slate-500">sets</div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-emerald-600">G:{op.qtyQC || 0}</span>
                        <span className="text-rose-600">NG:{op.qcNgQty || 0}</span>
                        <span className="text-slate-500">Sisa:{(op.qtySewingOut || 0) - ((op.qtyQC || 0) + (op.qcNgQty || 0))}</span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                // No patterns to select, just show a placeholder or nothing
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/10 dark:to-purple-900/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Eye size={32} className="text-purple-400" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Ready to Inspect</h4>
                  <p className="text-slate-500 dark:text-slate-400">Click the GOOD or NOT GOOD button to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Inspection Interface */}
        <div className="lg:col-span-2">
          {!actOp ? (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Eye size={40} className="text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-3">Select an Order to Inspect</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-8 max-w-md mx-auto">
                Choose a production order from the list to begin set inspection.
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span>Click on any order to start</span>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={back}
                        className="group p-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-300"
                        title="Back to queue"
                      >
                        <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300 group-hover:text-amber-600" />
                      </button>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Shield size={28} className="text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Active Inspection
                          </div>
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{actOp.opNumber}</h2>
                          <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">{actOp.styleCode}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Total Good</div>
                        <div className="text-2xl font-bold text-emerald-600">{actOp.qtyQC || 0}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Total NG</div>
                        <div className="text-2xl font-bold text-rose-600">{actOp.qcNgQty || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 rounded-xl flex items-center justify-center">
                      <Eye size={24} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inspecting Set</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Click GOOD or NOT GOOD to record inspection
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* GOOD Button */}
                    <div
                      className={`group relative aspect-square rounded-3xl overflow-hidden border-4 transition-all duration-500 hover:scale-[1.02] shadow-2xl ${
                        submitting
                          ? 'opacity-50 pointer-events-none border-gray-400'
                          : 'border-emerald-500/20 hover:border-emerald-500'
                      } bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-900`}
                    >
                      <button
                        onClick={handleGood}
                        disabled={submitting}
                        className="absolute inset-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {setGoodImg ? (
                          <>
                            <img
                              src={`${API_BASE_URL}/uploads/patterns/${setGoodImg}`}
                              alt="Good Set"
                              className="w-full h-full object-contain p-8 transition-transform group-hover:scale-105 duration-500"
                              onError={handleImgError}
                            />
                            <div className="hidden absolute inset-0 flex-col items-center justify-center text-emerald-600 font-bold text-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-800 p-8">
                              <ImageIcon size={48} className="mb-4 text-emerald-400" />
                              <span>Set Image Not Available</span>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-600 font-bold text-3xl">
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                              <ThumbsUp size={32} className="text-white" />
                            </div>
                            <span>GOOD</span>
                            <span className="text-base font-normal mt-3 opacity-70">(No Image Configured)</span>
                          </div>
                        )}
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold">Accept</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Press or click</span>
                            <CheckCircle size={20} className="text-emerald-300" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* NOT GOOD Button */}
                    <div
                      className={`group relative aspect-square rounded-3xl overflow-hidden border-4 transition-all duration-500 hover:scale-[1.02] shadow-2xl ${
                        submitting
                          ? 'opacity-50 pointer-events-none border-gray-400'
                          : 'border-rose-500/20 hover:border-rose-500'
                      } bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-slate-900`}
                    >
                      <button
                        onClick={handleNg}
                        disabled={submitting}
                        className="absolute inset-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {setNgImg ? (
                          <>
                            <img
                              src={`${API_BASE_URL}/uploads/patterns/${setNgImg}`}
                              alt="NG Set"
                              className="w-full h-full object-contain p-8 transition-transform group-hover:scale-105 duration-500"
                              onError={handleImgError}
                            />
                            <div className="hidden absolute inset-0 flex-col items-center justify-center text-rose-600 font-bold text-2xl bg-gradient-to-br from-rose-50 to-white dark:from-slate-900 dark:to-slate-800 p-8">
                              <ImageOff size={48} className="mb-4 text-rose-400" />
                              <span>Set Image Not Available</span>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-600 font-bold text-3xl">
                            <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-400 rounded-2xl flex items-center justify-center mb-6">
                              <AlertTriangle size={32} className="text-white" />
                            </div>
                            <span>NOT GOOD</span>
                            <span className="text-base font-normal mt-3 opacity-70">(No Image Configured)</span>
                          </div>
                        )}
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold">Reject</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Press or click</span>
                            <XCircle size={20} className="text-rose-300" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NG Modal */}
      {ngOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-400 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select Defect Reason</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">Choose the primary reason for rejection</p>
              </div>
            </div>
            <div className="grid gap-2 max-h-[300px] overflow-y-auto mb-6">
              {(categories.length ? categories : FALLBACK_NG_REASONS.map((r) => r.label)).map((reason, i) => (
                <button
                  key={i}
                  onClick={() => setNgReason(reason)}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    ngReason === reason
                      ? 'bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-900/20 border-rose-500 text-rose-700 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="font-medium">{reason}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setNgOpen(false)}
                className="flex-1 py-3.5 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmNg}
                disabled={!ngReason}
                className="flex-1 py-3.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                Confirm NG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};