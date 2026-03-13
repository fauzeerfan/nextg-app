// frontend/src/features/stations/QualityControlView.tsx

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
  inspected: number; // total inspected (qtyQC + qcNgQty)
  remaining: number; // qtySewingOut - inspected
  progress: number;  // percentage
}

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
    amber: { bg: 'from-amber-100 to-amber-50', icon: 'text-amber-600', darkBg: 'from-amber-900/20 to-amber-900/10' },
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    rose: { bg: 'from-rose-100 to-rose-50', icon: 'text-rose-600', darkBg: 'from-rose-900/20 to-rose-900/10' },
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/20 to-blue-900/10' }
  };
  
  const selected = colors[color] || colors.amber;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-8 h-8 bg-gradient-to-br ${selected.bg} dark:${selected.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className={selected.icon} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
        {suffix && <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>}
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
  const [historyOps, setHistoryOps] = useState<QcOp[]>([]); // State untuk menyimpan OP yang sudah selesai
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

  // Fungsi untuk mengambil history OP yang sudah selesai (closed)
  const fetchHistoryOps = async () => {
    try {
      // Asumsi endpoint: /production-orders?status=closed (sesuaikan dengan backend)
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
          if (updated) {
            setActOp(updated);
          } else {
            back();
          }
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
    <div className="animate-in fade-in duration-300">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${
          toast.type === 'success'
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white border-emerald-400'
            : 'bg-gradient-to-r from-rose-500 to-rose-400 text-white border-rose-400'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span className="font-bold text-sm">{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="ml-4 opacity-80 hover:opacity-100">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ClipboardCheck size={24} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                  <Eye size={14} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Quality Control
                  <span className="text-xs px-2 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full font-bold">
                    SET INSPECTION
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl shadow-lg">
                <div className="flex flex-col">
                  <div className="text-xs font-medium opacity-90">Queue</div>
                  <div className="text-xl font-bold">{totalOps}</div>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Package size={18} />
                </div>
              </div>
              <button
                onClick={fetchOps}
                disabled={refreshing}
                className="group px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-amber-300 dark:hover:border-amber-700 transition-all text-sm"
              >
                {refreshing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform" />}
                Refresh
              </button>
              {/* Tombol History sekarang selalu ada dan memuat data OP yang sudah selesai */}
              <button
                onClick={() => {
                  fetchHistoryOps();
                  setShowHistory(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:from-purple-700 hover:to-purple-600 transition-all text-sm shadow-lg"
                title="Lihat riwayat OP yang sudah selesai"
              >
                <Info size={16} />
                <span className="hidden sm:inline">History OP</span>
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-6">
          <MetricCard title="Total Input" value={totalInput} icon={Package} color="blue" suffix="sets" subtitle="From Sewing" />
          <MetricCard title="Verified Good" value={totalGood} icon={CheckCircle} color="emerald" suffix="sets" />
          <MetricCard title="NG Total" value={totalNg} icon={AlertTriangle} color="rose" suffix="sets" />
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Completion Rate</div>
              <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-lg flex items-center justify-center">
                <Award size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{completionRate}%</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid - 5 kolom */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Left Column - OP List */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden h-full">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    actOp
                      ? 'bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10'
                      : 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10'
                  }`}>
                    {actOp ? <Layers size={16} className="text-purple-600 dark:text-purple-400" /> : <ClipboardCheck size={16} className="text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Production Orders
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {totalOps} orders ready
                    </p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{totalOps}</span>
                </div>
              </div>
            </div>
            <div className="p-3 max-h-[500px] overflow-y-auto">
              {totalOps === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">No Orders</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Waiting for incoming orders...</p>
                </div>
              ) : (
                ops.map((op) => (
                  <div
                    key={op.id}
                    className={`group p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer mb-2 ${
                      actOp?.id === op.id
                        ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 shadow-lg'
                        : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-lg'
                    }`}
                    onClick={() => selectOp(op)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="font-mono font-bold text-base text-slate-900 dark:text-white">{op.opNumber}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Style: {op.styleCode}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Remaining: {op.remaining}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-slate-900 dark:text-white">{op.qtySewingOut || 0}</div>
                        <div className="text-[10px] text-slate-500">sets</div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-slate-500">Progress</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{op.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                          style={{ width: `${op.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px]">
                      <span className="text-emerald-600">G:{op.qtyQC || 0}</span>
                      <span className="text-rose-600">NG:{op.qcNgQty || 0}</span>
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
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Eye size={32} className="text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Select an Order to Inspect</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 max-w-md mx-auto">
                Select a production order from the list to start set inspection.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                <span>Click on an order to start</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* OP Info and progress */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={back}
                        className="group p-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                        title="Back to queue"
                      >
                        <ArrowLeft size={18} className="text-slate-600 dark:text-slate-300 group-hover:text-amber-600" />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Shield size={22} className="text-white" />
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                            Active Inspection
                          </div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{actOp.opNumber}</h2>
                          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{actOp.styleCode}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Inspected</div>
                        <div className="text-xl font-bold text-emerald-600">{actOp.inspected}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Remaining</div>
                        <div className="text-xl font-bold text-amber-600">{actOp.remaining}</div>
                      </div>
                    </div>
                  </div>
                  {/* Large progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Inspection Progress</span>
                      <span className="font-bold text-slate-900 dark:text-white">{actOp.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${actOp.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 rounded-lg flex items-center justify-center">
                      <Eye size={20} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Set Inspection</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Click GOOD or NOT GOOD to record inspection
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GOOD Button */}
                    <div
                      className={`group relative aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-500 hover:scale-[1.02] shadow-2xl ${
                        submitting
                          ? 'opacity-50 pointer-events-none border-gray-400'
                          : 'border-emerald-500/20 hover:border-emerald-500'
                      } bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-900`}
                    >
                      <button
                        onClick={handleGood}
                        disabled={submitting || actOp.remaining === 0}
                        className="absolute inset-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {setGoodImg ? (
                          <>
                            <img
                              src={`${API_BASE_URL}/uploads/patterns/${setGoodImg}`}
                              alt="Good Set"
                              className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105 duration-500"
                              onError={handleImgError}
                            />
                            <div className="hidden absolute inset-0 flex-col items-center justify-center text-emerald-600 font-bold text-xl bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
                              <CheckCircle size={40} className="mb-3 text-emerald-400" />
                              <span>Set Image Not Available</span>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-600 font-bold text-2xl">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-xl flex items-center justify-center mb-4">
                              <ThumbsUp size={28} className="text-white" />
                            </div>
                            <span>GOOD</span>
                            <span className="text-xs font-normal mt-2 opacity-70">(No Image)</span>
                          </div>
                        )}
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
                        <div className="flex items-center justify-between text-sm">
                          <div className="font-bold">Accept</div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Press</span>
                            <CheckCircle size={16} className="text-emerald-300" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* NOT GOOD Button */}
                    <div
                      className={`group relative aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-500 hover:scale-[1.02] shadow-2xl ${
                        submitting
                          ? 'opacity-50 pointer-events-none border-gray-400'
                          : 'border-rose-500/20 hover:border-rose-500'
                      } bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-slate-900`}
                    >
                      <button
                        onClick={handleNg}
                        disabled={submitting || actOp.remaining === 0}
                        className="absolute inset-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {setNgImg ? (
                          <>
                            <img
                              src={`${API_BASE_URL}/uploads/patterns/${setNgImg}`}
                              alt="NG Set"
                              className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105 duration-500"
                              onError={handleImgError}
                            />
                            <div className="hidden absolute inset-0 flex-col items-center justify-center text-rose-600 font-bold text-xl bg-gradient-to-br from-rose-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
                              <XCircle size={40} className="mb-3 text-rose-400" />
                              <span>Set Image Not Available</span>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-600 font-bold text-2xl">
                            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-400 rounded-xl flex items-center justify-center mb-4">
                              <AlertTriangle size={28} className="text-white" />
                            </div>
                            <span>NOT GOOD</span>
                            <span className="text-xs font-normal mt-2 opacity-70">(No Image)</span>
                          </div>
                        )}
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
                        <div className="flex items-center justify-between text-sm">
                          <div className="font-bold">Reject</div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Press</span>
                            <XCircle size={16} className="text-rose-300" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-400 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select Defect Reason</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">Choose the primary reason for rejection</p>
              </div>
            </div>
            <div className="grid gap-1.5 max-h-[250px] overflow-y-auto mb-4">
              {categories.map((reason, i) => (
                <button
                  key={i}
                  onClick={() => setNgReason(reason)}
                  className={`p-3 rounded-lg text-left border transition-all ${
                    ngReason === reason
                      ? 'bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-900/20 border-rose-500 text-rose-700 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm font-medium">{reason}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setNgOpen(false)}
                className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmNg}
                disabled={!ngReason}
                className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                Confirm NG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal - sekarang menampilkan daftar OP yang sudah selesai */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold">Riwayat OP Selesai (Closed)</h3>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {historyOps.length === 0 ? (
                <p className="text-center text-slate-500 py-6">Belum ada OP yang selesai</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="pb-2">No. OP</th>
                      <th className="pb-2">Style</th>
                      <th className="pb-2">Line</th>
                      <th className="pb-2">Total Sets</th>
                      <th className="pb-2">Good</th>
                      <th className="pb-2">NG</th>
                      <th className="pb-2">Selesai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyOps.map((op) => (
                      <tr key={op.id} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="py-2 font-mono font-medium">{op.opNumber}</td>
                        <td className="py-2">{op.styleCode}</td>
                        <td className="py-2">{op.lineCode || '-'}</td>
                        <td className="py-2">{op.qtySewingOut || 0}</td>
                        <td className="py-2 text-emerald-600 font-bold">{op.qtyQC || 0}</td>
                        <td className="py-2 text-rose-600 font-bold">{op.qcNgQty || 0}</td>
                        <td className="py-2 text-xs">
                          {op.updatedAt ? new Date(op.updatedAt).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};