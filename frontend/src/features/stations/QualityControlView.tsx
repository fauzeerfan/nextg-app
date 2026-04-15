import React, { useState, useEffect, useCallback, useRef } from 'react';

import {
  CheckCircle, XCircle, RefreshCw, AlertTriangle,
  ClipboardCheck, ThumbsUp, Layers, Package, ArrowLeft, Eye, Award,
  Shield, Info
} from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY_OP = 'nextg_qc_active_op';

interface QcInspection {
  id: string;
  good: number;
  ng: number;
  ngReasons: string[];
  createdAt: string;
}

interface QcOp extends ProductionOrder {
  inspected: number;
  remaining: number;
  progress: number;
}

// Modern Solid Metric Card
const MetricCard = ({
  title,
  value,
  icon: Icon,
  color = 'amber',
  subtitle,
  suffix
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: 'amber' | 'emerald' | 'rose' | 'blue';
  subtitle?: string;
  suffix?: string;
}) => {
  const colors = {
    amber: {
      bg: 'bg-amber-100',
      icon: 'text-amber-600',
      border: 'border-amber-500',
      darkBg: 'dark:bg-amber-900/40',
      darkIcon: 'dark:text-amber-400'
    },
    emerald: {
      bg: 'bg-emerald-100',
      icon: 'text-emerald-600',
      border: 'border-emerald-500',
      darkBg: 'dark:bg-emerald-900/40',
      darkIcon: 'dark:text-emerald-400'
    },
    rose: {
      bg: 'bg-rose-100',
      icon: 'text-rose-600',
      border: 'border-rose-500',
      darkBg: 'dark:bg-rose-900/40',
      darkIcon: 'dark:text-rose-400'
    },
    blue: {
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      border: 'border-blue-500',
      darkBg: 'dark:bg-blue-900/40',
      darkIcon: 'dark:text-blue-400'
    }
  };
  const selected = colors[color] || colors.amber;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${selected.border} border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-9 h-9 ${selected.bg} ${selected.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={`${selected.icon} ${selected.darkIcon}`} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
        {value}
        {suffix && <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>}
      </div>
      {subtitle && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

export const QualityControlView = ({ addLog, onNavigate }: { addLog: (msg: string, type: any) => void; onNavigate: (tab: string) => void; }) => {
  const [ops, setOps] = useState<QcOp[]>([]);
  const [actOp, setActOp] = useState<QcOp | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpd, setLastUpd] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [ngReason, setNgReason] = useState('');
  const [ngOpen, setNgOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [setGoodImg, setSetGoodImg] = useState<string | null>(null);
  const [setNgImg, setSetNgImg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyOps, setHistoryOps] = useState<QcOp[]>([]);
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
        const data: ProductionOrder[] = await res.json();
        const enriched: QcOp[] = data.map(op => {
          const inspected = (op.qtyQC || 0) + (op.qcNgQty || 0);
          const total = op.qtySewingOut || 0;
          const remaining = total - inspected;
          const progress = total > 0 ? Math.round((inspected / total) * 100) : 0;
          return { ...op, inspected, remaining, progress };
        });
        setOps(enriched);
        setLastUpd(new Date().toLocaleTimeString());
        return enriched;
      }
    } catch {
      console.error('Failed to fetch QC ops');
    } finally {
      setRefreshing(false);
    }
    return [];
  }, []);

  useEffect(() => {
    fetchOps();
    const i = setInterval(fetchOps, 5000);
    return () => clearInterval(i);
  }, [fetchOps]);

  const loadSetImages = async (op: ProductionOrder) => {
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
    } catch { /* ignore */ }
  };

  const fetchQcCategories = async (lineCode: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters/${lineCode}/qc-ng-categories`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setCategories(await res.json());
      else setCategories([]);
    } catch {
      console.error;
    }
  };

  const fetchHistoryOps = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?status=closed`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data: ProductionOrder[] = await res.json();
        const enriched: QcOp[] = data.map(op => {
          const inspected = (op.qtyQC || 0) + (op.qcNgQty || 0);
          const total = op.qtySewingOut || 0;
          const remaining = total - inspected;
          const progress = total > 0 ? Math.round((inspected / total) * 100) : 0;
          return { ...op, inspected, remaining, progress };
        });
        setHistoryOps(enriched);
      } else {
        setHistoryOps([]);
      }
    } catch (error) {
      console.error('Failed to fetch history ops', error);
      setHistoryOps([]);
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
          fetchQcCategories(parsed.lineCode || 'K1YH');
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

  const selectOp = (op: QcOp) => {
    setActOp(op);
    loadSetImages(op);
    fetchQcCategories(op.lineCode || 'K1YH');
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
    if (!actOp) return showToast('Select OP first', 'error');

    const token = localStorage.getItem('nextg_token');
    if (!token) return showToast('Token not found', 'error');

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
        showToast(isGood ? 'Good +1' : 'NG Recorded', isGood ? 'success' : 'error');
        const updatedOps = await fetchOps();
        if (actOp) {
          const updated = updatedOps.find(o => o.id === actOp.id);
          if (updated) setActOp(updated);
          else back();
        }
      } else {
        const err = await res.json();
        showToast(`Failed (${res.status}): ${err.message}`, 'error');
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
  const totalInput = ops.reduce((s, o) => s + (o.qtySewingOut || 0), 0);
  const totalGood = ops.reduce((s, o) => s + (o.qtyQC || 0), 0);
  const totalNg = ops.reduce((s, o) => s + (o.qcNgQty || 0), 0);
  const completionRate = totalInput > 0 ? Math.round(((totalGood + totalNg) / totalInput) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-5 font-poppins text-slate-800 dark:text-slate-100 animate-in fade-in duration-300">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
        `}
      </style>

      {/* Solid Toast notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[200] animate-in slide-in-from-right-5 fade-in duration-300 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl font-bold text-sm ${
          toast.type === 'success'
            ? 'bg-emerald-500 text-white shadow-emerald-500/30'
            : 'bg-rose-500 text-white shadow-rose-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="ml-3 opacity-80 hover:opacity-100 transition-opacity">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Header - Solid Style */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-5">
        <div className="p-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <ClipboardCheck size={24} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md">
                  <Eye size={10} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Quality Control
                  <span className="text-[11px] px-2 py-1 bg-amber-500 text-white rounded-md font-bold uppercase tracking-wider">
                    SET INSPECTION
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Final Quality Assurance Station</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-3 px-4 py-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                <div className="flex flex-col">
                  <div className="text-[11px] font-semibold opacity-90 uppercase tracking-wide">Queue</div>
                  <div className="text-xl font-black leading-none">{totalOps}</div>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Package size={18} />
                </div>
              </div>
              
              <button
                onClick={fetchOps}
                disabled={refreshing}
                className="group px-4 py-2 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:border-amber-500 hover:text-amber-600 dark:hover:border-amber-400 dark:hover:text-amber-400 transition-colors shadow-sm"
              >
                {refreshing ? <RefreshCw size={16} className="animate-spin text-amber-500" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
                Refresh
              </button>
              
              <button
                onClick={() => {
                  fetchHistoryOps();
                  setShowHistory(true);
                }}
                className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 dark:hover:bg-slate-600 transition-all shadow-md shadow-slate-800/20"
                title="Lihat riwayat OP yang sudah selesai"
              >
                <Info size={16} />
                <span className="hidden sm:inline uppercase tracking-wider text-xs">History</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 pb-5">
          <MetricCard title="Total Input" value={totalInput} icon={Package} color="blue" suffix="sets" subtitle="From Sewing" />
          <MetricCard title="Verified Good" value={totalGood} icon={CheckCircle} color="emerald" suffix="sets" />
          <MetricCard title="NG Total" value={totalNg} icon={AlertTriangle} color="rose" suffix="sets" />
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-amber-500 border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completion Rate</div>
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                <Award size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {completionRate}%
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-2.5 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${completionRate}%` }} />
            </div>
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">
              {totalGood + totalNg} / {totalInput} Inspected
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        
        {/* Left Column - OP List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md text-white ${
                    actOp ? 'bg-purple-600 shadow-purple-600/30' : 'bg-amber-500 shadow-amber-500/30'
                  }`}>
                    {actOp ? <Layers size={18} /> : <ClipboardCheck size={18} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm">Production Orders</h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{totalOps} orders ready</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-black text-slate-700 dark:text-slate-200">
                  {totalOps}
                </div>
              </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
              {totalOps === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={28} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No Orders</h4>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Waiting for incoming orders...</p>
                </div>
              ) : (
                ops.map((op) => (
                  <div
                    key={op.id}
                    className={`group p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer mb-2 ${
                      actOp?.id === op.id
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 shadow-md ring-1 ring-amber-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:shadow-sm bg-white dark:bg-slate-800'
                    }`}
                    onClick={() => selectOp(op)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="font-mono font-black text-[13px] text-slate-900 dark:text-white">{op.opNumber}</div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Style: {op.styleCode}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Rem: {op.remaining}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white leading-none">{op.qtySewingOut || 0}</div>
                        <div className="text-[10px] font-medium text-slate-500 mt-1">sets</div>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span className="text-slate-500 uppercase tracking-wider">Progress</span>
                        <span className="text-slate-700 dark:text-slate-300">{op.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${op.progress}%` }} />
                      </div>
                    </div>

                    <div className="mt-2 flex justify-between text-[11px] font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">G: {op.qtyQC || 0}</span>
                      <span className="text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-md">NG: {op.qcNgQty || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Inspection Interface */}
        <div className="lg:col-span-4">
          {!actOp ? (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 shadow-sm">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye size={36} className="text-amber-500 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Select an Order to Inspect</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mb-6 max-w-md mx-auto leading-relaxed">
                Select a production order from the queue on the left panel to start set inspection.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-4 py-2 rounded-full uppercase tracking-wider">
                <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full animate-pulse"></div>
                Waiting for selection...
              </div>
            </div>
          ) : (
            <div className="space-y-4 h-full flex flex-col">
              
              {/* OP Info Header */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={back}
                        className="group p-2.5 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-slate-600 transition-all shadow-sm"
                        title="Back to queue"
                      >
                        <ArrowLeft size={18} className="text-slate-600 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400" />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/30">
                          <Shield size={22} className="text-white" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-0.5">Active Inspection</div>
                          <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">{actOp.opNumber}</h2>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{actOp.styleCode}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-1 md:flex-none w-full md:w-auto items-center gap-5 bg-white dark:bg-slate-700 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm justify-between md:justify-end">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inspected</div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">{actOp.inspected}</div>
                      </div>
                      <div className="w-px h-8 bg-slate-200 dark:bg-slate-600"></div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remaining</div>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400 leading-none mt-1">{actOp.remaining}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-white dark:bg-slate-700 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                    <div className="flex justify-between text-[10px] font-bold mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inspection Progress</span>
                      <span className="text-slate-900 dark:text-white">{actOp.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${actOp.progress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-600/30">
                      <Eye size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Set Inspection</h3>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Select GOOD or NOT GOOD to record result</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 items-center">
                    
                    {/* SOLID GOOD Button */}
                    <div
                      className={`group relative aspect-[4/3] rounded-3xl overflow-hidden border-4 transition-all duration-300 hover:scale-[1.03] shadow-lg ${
                        submitting || actOp.remaining === 0
                          ? 'opacity-50 pointer-events-none border-gray-300'
                          : 'border-emerald-500 hover:shadow-emerald-500/40 cursor-pointer'
                      } bg-white dark:bg-slate-800`}
                    >
                      <button
                        onClick={handleGood}
                        disabled={submitting || actOp.remaining === 0}
                        className="absolute inset-0 w-full h-full flex flex-col items-center justify-center focus:outline-none"
                      >
                        {setGoodImg ? (
                          <>
                            <img
                              src={`${API_BASE_URL}/uploads/patterns/${setGoodImg}`}
                              alt="Good Set"
                              className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105 duration-500 relative z-10"
                              onError={handleImgError}
                            />
                            <div className="hidden absolute inset-0 flex-col items-center justify-center bg-emerald-500 text-white z-20">
                              <CheckCircle size={48} className="mb-4 drop-shadow-md" />
                              <span className="font-black text-2xl tracking-widest drop-shadow-md">NO IMAGE</span>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500 text-white transition-colors group-hover:bg-emerald-600">
                            <ThumbsUp size={64} className="mb-4 drop-shadow-md" />
                            <span className="font-black text-4xl tracking-widest drop-shadow-md">GOOD</span>
                          </div>
                        )}
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-white p-4 font-black flex justify-between items-center z-30 group-hover:bg-emerald-700 transition-colors">
                        <span className="uppercase tracking-widest text-sm">Accept Set</span>
                        <CheckCircle size={20} />
                      </div>
                    </div>

                    {/* SOLID NOT GOOD Button */}
                    <div
                      className={`group relative aspect-[4/3] rounded-3xl overflow-hidden border-4 transition-all duration-300 hover:scale-[1.03] shadow-lg ${
                        submitting || actOp.remaining === 0
                          ? 'opacity-50 pointer-events-none border-gray-300'
                          : 'border-rose-500 hover:shadow-rose-500/40 cursor-pointer'
                      } bg-white dark:bg-slate-800`}
                    >
                      <button
                        onClick={handleNg}
                        disabled={submitting || actOp.remaining === 0}
                        className="absolute inset-0 w-full h-full flex flex-col items-center justify-center focus:outline-none"
                      >
                        {setNgImg ? (
                          <>
                            <img
                              src={`${API_BASE_URL}/uploads/patterns/${setNgImg}`}
                              alt="NG Set"
                              className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105 duration-500 relative z-10"
                              onError={handleImgError}
                            />
                            <div className="hidden absolute inset-0 flex-col items-center justify-center bg-rose-500 text-white z-20">
                              <XCircle size={48} className="mb-4 drop-shadow-md" />
                              <span className="font-black text-2xl tracking-widest drop-shadow-md">NO IMAGE</span>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500 text-white transition-colors group-hover:bg-rose-600">
                            <AlertTriangle size={64} className="mb-4 drop-shadow-md" />
                            <span className="font-black text-4xl tracking-widest drop-shadow-md">NOT GOOD</span>
                          </div>
                        )}
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-rose-600 text-white p-4 font-black flex justify-between items-center z-30 group-hover:bg-rose-700 transition-colors">
                        <span className="uppercase tracking-widest text-sm">Reject Set</span>
                        <XCircle size={20} />
                      </div>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SOLID NG Modal */}
      {ngOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full h-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/30">
                  <AlertTriangle size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Select Defect Reason</h3>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Choose the primary reason for rejection</p>
                </div>
              </div>
              <button onClick={() => setNgOpen(false)} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm">
                <XCircle size={24} className="text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((reason, i) => (
                  <button
                    key={i}
                    onClick={() => setNgReason(reason)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all font-bold text-sm ${
                      ngReason === reason
                        ? 'bg-rose-100 dark:bg-rose-900/40 border-rose-500 text-rose-700 dark:text-rose-400 shadow-md ring-2 ring-rose-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-400 hover:shadow-sm'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4">
              <button
                onClick={() => setNgOpen(false)}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-lg uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={confirmNg}
                disabled={!ngReason}
                className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg uppercase tracking-wider shadow-lg shadow-rose-600/30"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-lg text-white">
                  <Info size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">History</h3>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Completed Production Orders</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm">
                <XCircle size={24} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
              {historyOps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
                  <Info size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-lg">No Completed Orders Yet</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-700/50">
                        <tr className="text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          <th className="py-4 px-5">No. OP</th>
                          <th className="py-4 px-5">Style</th>
                          <th className="py-4 px-5">Line</th>
                          <th className="py-4 px-5">Total</th>
                          <th className="py-4 px-5 text-emerald-600 dark:text-emerald-400">Good</th>
                          <th className="py-4 px-5 text-rose-600 dark:text-rose-400">NG</th>
                          <th className="py-4 px-5">Completed Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {historyOps.map((op) => (
                          <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="py-4 px-5 font-mono font-black text-slate-900 dark:text-white">{op.opNumber}</td>
                            <td className="py-4 px-5 font-semibold text-slate-700 dark:text-slate-300">{op.styleCode}</td>
                            <td className="py-4 px-5 font-medium text-slate-600 dark:text-slate-400">{op.lineCode || '-'}</td>
                            <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">{op.qtySewingOut || 0}</td>
                            <td className="py-4 px-5 text-emerald-600 font-black">{op.qtyQC || 0}</td>
                            <td className="py-4 px-5 text-rose-600 font-black">{op.qcNgQty || 0}</td>
                            <td className="py-4 px-5 text-xs font-medium text-slate-500">
                              {op.updatedAt ? new Date(op.updatedAt).toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setShowHistory(false)}
                className="px-8 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};