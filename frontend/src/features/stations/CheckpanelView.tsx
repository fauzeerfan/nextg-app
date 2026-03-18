// frontend/src/features/stations/CheckPanelView.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, ImageIcon, ImageOff, AlertTriangle,
  ClipboardCheck, ThumbsUp, Layers, Package, ArrowLeft, Wifi, Eye, Award,
  Shield,
} from 'lucide-react';
import type { ProductionOrder, PatternPart } from '../../types/production';
import { NG_REASONS as FALLBACK_NG_REASONS } from '../../lib/data';

const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY_OP = 'nextg_cp_active_op';
const STORAGE_KEY_GLOBAL_LOGS = 'nextg_cp_recent_logs';

interface InspectionLog {
  id: string;
  time: string;
  opNumber?: string;
  good: number;
  ng: number;
  reason?: string;
  pattern?: string;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: 'blue' | 'emerald' | 'rose' | 'amber';
  subtitle?: string;
  suffix?: string;
}

const MetricCard = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
  suffix,
}: MetricCardProps) => {
  const colors = {
    blue: {
      bg: 'from-blue-100 to-blue-50',
      icon: 'text-blue-600',
      darkBg: 'from-blue-900/20 to-blue-900/10',
    },
    emerald: {
      bg: 'from-emerald-100 to-emerald-50',
      icon: 'text-emerald-600',
      darkBg: 'from-emerald-900/20 to-emerald-900/10',
    },
    rose: {
      bg: 'from-rose-100 to-rose-50',
      icon: 'text-rose-600',
      darkBg: 'from-rose-900/20 to-rose-900/10',
    },
    amber: {
      bg: 'from-amber-100 to-amber-50',
      icon: 'text-amber-600',
      darkBg: 'from-amber-900/20 to-amber-900/10',
    },
  }[color];

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div
          className={`w-8 h-8 bg-gradient-to-br ${colors.bg} dark:${colors.darkBg} rounded-lg flex items-center justify-center`}
        >
          <Icon size={16} className={colors.icon} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
        {suffix && <span className="text-sm text-slate-500 ml-1">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
};

export const CheckPanelView = ({
  addLog,
  onNavigate: _onNavigate,
}: {
  addLog: (msg: string, type: any) => void;
  onNavigate: (tab: string) => void;
}) => {
  const [ops, setOps] = useState<ProductionOrder[]>([]);
  const [actOp, setActOp] = useState<ProductionOrder | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpd, setLastUpd] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [ngReason, setNgReason] = useState('');
  const [patterns, setPatterns] = useState<PatternPart[]>([]);
  const [actPtrn, setActPtrn] = useState<PatternPart | null>(null);
  const [ngOpen, setNgOpen] = useState(false);
  const [prog, setProg] = useState<Record<number, { good: number; ng: number; completed: boolean }>>(
    {}
  );
  const [sets, setSets] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [refTrigger, setRefTrigger] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // ✅ Helper untuk mengakses patternMultiplier dengan aman (type assertion)
  const getPatternMultiplier = (op: ProductionOrder) => (op as any).line?.patternMultiplier ?? 4;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('nextg_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // ✅ SEMUA pattern sudah selesai dicek
  const allPatternsCompleted =
    patterns.length > 0 && patterns.every((_, i) => prog[i]?.completed === true);

  const totalGoodPola = Object.values(prog).reduce((s, p) => s + p.good, 0);
  const totalNgPola = Object.values(prog).reduce((s, p) => s + p.ng, 0);
  const polaSisa = totalGoodPola - sets * patterns.length;
  const totalNgEfektif = totalNgPola + polaSisa;
  const setNgEfektif = Math.floor(totalNgEfektif / patterns.length);

  // ✅ Statistik dalam satuan pattern (bukan sets)
  const tq = ops.length;
  const tin = ops.reduce((s, o) => s + ((o.qtyCP || 0) * getPatternMultiplier(o)), 0);
  const tg = ops.reduce((s, o) => s + (o.cpGoodQty || 0), 0);
  const tng = ops.reduce((s, o) => s + (o.cpNgQty || 0), 0);
  const comp = tin > 0 ? Math.round(((tg + tng) / tin) * 100) : 0;

  const fetchOps = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=CP`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data: ProductionOrder[] = await res.json();
        setOps(data);
        setLastUpd(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch {
      console.error('Failed to fetch CP ops');
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

  const loadPatterns = async (op: ProductionOrder) => {
    setPatterns([]);
    setActPtrn(null);
    const lineCode = op.lineCode || 'K1YH';
    try {
      const res = await fetch(
        `${API_BASE_URL}/pattern-masters?lineCode=${lineCode}&style=${op.styleCode}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const masters = await res.json();
        setPatterns(masters[0]?.patterns || [{ name: 'Default Pattern', imgGood: '', imgNg: '' }]);
      } else {
        setPatterns([{ name: 'Default Pattern', imgGood: '', imgNg: '' }]);
      }
    } catch {
      setPatterns([{ name: 'Default Pattern', imgGood: '', imgNg: '' }]);
    }
  };

  const fetchProg = async (opId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders/${opId}/check-panel-inspections`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const m: Record<number, { good: number; ng: number; completed: boolean }> = {};
        data.forEach((p: any) => {
          m[p.patternIndex] = { good: p.good, ng: p.ng, completed: p.completed };
        });
        setProg(m);
      } else {
        setProg({});
      }
    } catch {
      setProg({});
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

  const refreshActiveOp = useCallback(async () => {
    if (!actOp) return;
    try {
      const [opRes, progRes] = await Promise.all([
        fetch(`${API_BASE_URL}/production-orders/${actOp.id}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/production-orders/${actOp.id}/check-panel-inspections`, { headers: getAuthHeaders() })
      ]);
      if (opRes.ok) {
        const opData = await opRes.json();
        setActOp(opData);
      }
      if (progRes.ok) {
        const progData = await progRes.json();
        const m: Record<number, { good: number; ng: number; completed: boolean }> = {};
        progData.forEach((p: any) => {
          m[p.patternIndex] = { good: p.good, ng: p.ng, completed: p.completed };
        });
        setProg(m);
      }
    } catch (error) {
      console.error('Failed to refresh active op', error);
    }
  }, [actOp, getAuthHeaders]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_OP);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          setActOp(parsed);
          loadPatterns(parsed);
          fetchProg(parsed.id);
          fetchCategories(parsed.lineCode || 'K1YH');
          addLog(`Session restored: ${parsed.opNumber}`, 'info');
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_OP);
      }
    }
  }, [addLog]);

  useEffect(() => {
    if (actOp) setSets(actOp.setsReadyForSewing || 0);
  }, [actOp]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

  // ✅ Validasi pemilihan OP
  const selectOp = (op: ProductionOrder) => {
    const cpInspected = (op.cpGoodQty || 0) + (op.cpNgQty || 0);
    const patternMultiplier = getPatternMultiplier(op);
    const cpTotalPatterns = (op.qtyCP || 0) * patternMultiplier;

    if (cpTotalPatterns > 0 && cpInspected >= cpTotalPatterns) {
      showToast('All patterns completed for this OP', 'error');
      return;
    }

    if (op.qtyCP <= 0) {
      showToast('OP not yet transferred from Cutting Pond', 'error');
      return;
    }

    setActOp(op);
    loadPatterns(op);
    fetchProg(op.id);
    fetchCategories(op.lineCode || 'K1YH');
    localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(op));
    addLog(`Inspecting: ${op.opNumber}`, 'info');
    setNgReason('');
    setActPtrn(null);
  };

  const back = () => {
    localStorage.removeItem(STORAGE_KEY_OP);
    setActOp(null);
    setActPtrn(null);
    setProg({});
    fetchOps();
  };

  // ✅ Submit inspeksi – target per pattern = qtyCP (jumlah set)
  const submitInspection = async (isGood: boolean, reason: string = '') => {
    if (isSubmittingRef.current) return;
    if (!actOp || !actPtrn) return showToast('Select OP and pattern first', 'error');
    const idx = patterns.findIndex((p) => p.name === actPtrn.name);
    if (idx === -1) return showToast('Pattern not found', 'error');
    const cur = prog[idx] || { good: 0, ng: 0, completed: false };

    if (cur.completed) {
      showToast('This pattern is already completed', 'error');
      return;
    }

    const target = actOp.qtyCP || 0;
    const done = cur.good + cur.ng;
    if (done >= target) {
      showToast(`Pattern already reached target (${target} inspections)`, 'error');
      return;
    }

    const token = localStorage.getItem('nextg_token');
    if (!token) return showToast('Token not found', 'error');

    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/check-panel/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          opId: actOp.id,
          patternIndex: idx,
          patternName: actPtrn.name,
          good: isGood ? 1 : 0,
          ng: isGood ? 0 : 1,
          ngReasons: reason ? [reason] : undefined,
        }),
      });

      if (res.ok) {
        const newGood = cur.good + (isGood ? 1 : 0);
        const newNg = cur.ng + (isGood ? 0 : 1);
        const completed = newGood + newNg >= target;

        setProg((p) => ({ ...p, [idx]: { good: newGood, ng: newNg, completed } }));

        const log: InspectionLog = {
          id: `L-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          opNumber: actOp.opNumber,
          good: isGood ? 1 : 0,
          ng: isGood ? 0 : 1,
          reason,
          pattern: actPtrn.name,
        };
        const recent = JSON.parse(localStorage.getItem(STORAGE_KEY_GLOBAL_LOGS) || '[]');
        localStorage.setItem(STORAGE_KEY_GLOBAL_LOGS, JSON.stringify([log, ...recent].slice(0, 50)));

        showToast(isGood ? 'Good +1' : 'NG Recorded', isGood ? 'success' : 'error');

        await Promise.all([
          fetchOps(),
          refreshActiveOp()
        ]);

        if (completed) {
          const nextIdx = patterns.findIndex((_, i) => i !== idx && !(prog[i]?.completed));
          if (nextIdx !== -1) {
            setActPtrn(patterns[nextIdx]);
          } else {
            back();
          }
        }
      } else {
        const err = await res.json();
        if (err.message === 'Pattern already completed') {
          await fetchProg(actOp.id);
          showToast('This pattern is already completed (data sync)', 'error');
        } else {
          showToast(`Failed (${res.status}): ${err.message}`, 'error');
        }
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

  const handleImgError = (e: React.SyntheticEvent) => {
    const imgElement = e.currentTarget as HTMLImageElement;
    imgElement.style.display = 'none';
    imgElement.nextElementSibling?.classList.remove('hidden');
    imgElement.nextElementSibling?.classList.add('flex');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-6">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[200] animate-in slide-in-from-right-5 fade-in duration-300 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white border-emerald-400'
              : 'bg-gradient-to-r from-rose-500 to-rose-400 text-white border-rose-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-4 opacity-80 hover:opacity-100">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Header dengan metrik */}
      <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ClipboardCheck size={24} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                  <Wifi size={14} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Check Panel
                  <span className="text-xs px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-bold">
                    DHRISTI IoT
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-lg">
                <div className="flex flex-col">
                  <div className="text-xs font-medium opacity-90">Queue</div>
                  <div className="text-xl font-bold">{tq}</div>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Package size={18} />
                </div>
              </div>
              <button
                onClick={fetchOps}
                disabled={refreshing}
                className="group px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 shadow-sm hover:shadow-md text-sm"
              >
                {refreshing ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-6">
          <MetricCard title="Total Input" value={tin} icon={Package} color="blue" suffix="patterns" subtitle="From Cutting Pond" />
          <MetricCard
            title="Verified Good"
            value={tg}
            icon={CheckCircle}
            color="emerald"
            suffix="patterns"
            subtitle={`${tin > 0 ? Math.round((tg / tin) * 100) : 0}% of input`}
          />
          <MetricCard
            title="NG Total"
            value={tng}
            icon={AlertTriangle}
            color="rose"
            suffix="patterns"
            subtitle={`${tin > 0 ? Math.round((tng / tin) * 100) : 0}% of input`}
          />
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Completion Rate</div>
              <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-lg flex items-center justify-center">
                <Award size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {Math.min(comp, 100)}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(comp, 100)}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {tg + tng} / {tin} patterns inspected
            </div>
          </div>
        </div>
      </div>

      {/* Grid utama: kiri daftar OP/pattern, kanan area inspeksi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Kolom kiri */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden h-full">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      actOp
                        ? 'bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10'
                        : 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10'
                    }`}
                  >
                    {actOp ? (
                      <Layers size={16} className="text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ClipboardCheck size={16} className="text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {actOp ? 'Patterns to Inspect' : 'Production Orders'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {actOp ? `OP: ${actOp.opNumber}` : `${tq} orders ready`}
                    </p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {actOp ? patterns.length : tq}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3 max-h-[500px] overflow-y-auto">
              {!actOp ? (
                tq === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <CheckCircle size={24} className="text-slate-400" />
                    </div>
                    <h4 className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">No Orders</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Waiting for incoming orders...</p>
                  </div>
                ) : (
                  ops.map((op: ProductionOrder) => {
                    const patternMultiplier = getPatternMultiplier(op);
                    const cpInspected = (op.cpGoodQty || 0) + (op.cpNgQty || 0);
                    const cpTotalPatterns = (op.qtyCP || 0) * patternMultiplier;
                    const isCpCompleted = cpTotalPatterns > 0 && cpInspected >= cpTotalPatterns;

                    return (
                      <div
                        key={op.id}
                        className={`group p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer mb-2 ${
                          isCpCompleted
                            ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 opacity-70 cursor-not-allowed'
                            : actOp?.id === op.id
                            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 shadow-lg'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg'
                        }`}
                        onClick={() => !isCpCompleted && selectOp(op)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="font-mono font-bold text-base text-slate-900 dark:text-white">
                              {op.opNumber}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">Style: {op.styleCode}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">From Pond</span>
                          </div>
                          <div className="text-right">
                            {/* Jumlah set dan total pola */}
                            <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                              {op.qtyCP || 0} sets
                            </div>
                            <div className="text-[10px] text-slate-500">
                              ({(op.qtyCP || 0) * patternMultiplier} patterns)
                            </div>

                            {/* Progress inspeksi (selalu tampil jika qtyCP > 0) */}
                            {op.qtyCP > 0 && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                Inspected: {op.cpGoodQty + op.cpNgQty}/{cpTotalPatterns} ({Math.round(((op.cpGoodQty + op.cpNgQty) / cpTotalPatterns) * 100)}%)
                              </div>
                            )}

                            {/* Status completed dengan jumlah sets siap kirim */}
                            {isCpCompleted && (
                              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                                <CheckCircle size={12} />
                                Ready: {op.setsReadyForSewing || 0} sets
                              </div>
                            )}
                          </div>
                        </div>
                        {op.qtyCP > 0 && (
                          <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                              style={{ width: `${((op.cpGoodQty + op.cpNgQty) / cpTotalPatterns) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : patterns.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Layers size={24} className="text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">No Patterns</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure patterns in Line Master</p>
                </div>
              ) : (
                patterns.map((pat, idx) => {
                  const p = prog[idx] || { good: 0, ng: 0, completed: false };
                  // ✅ Target per pattern = qtyCP (jumlah set)
                  const target = actOp.qtyCP || 0;
                  const done = p.good + p.ng;
                  const rem = Math.max(0, target - done);
                  const isCompleted = done >= target;

                  return (
                    <div
                      key={idx}
                      className={`group p-3 rounded-xl border-2 transition-all duration-300 ${
                        p.completed
                          ? 'opacity-60 cursor-not-allowed border-slate-300 dark:border-slate-600'
                          : 'cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg'
                      } ${
                        actPtrn?.name === pat.name && !p.completed
                          ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800 shadow-lg'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                      onClick={() => !p.completed && setActPtrn(pat)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                            Part {idx + 1}
                          </div>
                          <div className="font-bold text-base text-slate-900 dark:text-white">{pat.name}</div>
                        </div>
                        {p.completed && <CheckCircle size={14} className="text-emerald-500" />}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-emerald-600">G:{p.good}</span>
                        <span className="text-rose-600">NG:{p.ng}</span>
                        <span className={`text-slate-500 ${isCompleted ? 'text-emerald-600 font-bold' : ''}`}>
                          Rem:{rem}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.min((done / target) * 100, 100)}%` }}
                        ></div>
                      </div>
                      {isCompleted && (
                        <div className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={10} />
                          Pattern Complete ({done}/{target})
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Kolom kanan – area inspeksi */}
        <div className="lg:col-span-4">
          {!actOp ? (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/10 dark:to-blue-900/5 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Eye size={32} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Select an Order to Inspect</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 max-w-md mx-auto">
                Choose a production order from the list to begin visual inspection.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Click on any order to start</span>
              </div>
            </div>
          ) : !actPtrn ? (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/10 dark:to-purple-900/5 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Layers size={32} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Select a Pattern</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 max-w-md mx-auto">
                Choose a pattern from the list to begin visual inspection.
              </p>
              <button
                onClick={back}
                className="mt-2 px-5 py-2.5 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium flex items-center gap-2 hover:border-blue-300 transition-all text-sm"
              >
                <ArrowLeft size={16} />
                Back to Queue
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={back}
                        className="group p-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300"
                        title="Back to queue"
                      >
                        <ArrowLeft size={18} className="text-slate-600 dark:text-slate-300 group-hover:text-blue-600" />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
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
                        <div className="text-xs text-slate-500 dark:text-slate-400">Total Good</div>
                        <div className="text-xl font-bold text-emerald-600">{actOp.cpGoodQty || 0}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Total NG</div>
                        <div className="text-xl font-bold text-rose-600">{actOp.cpNgQty || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 rounded-lg flex items-center justify-center">
                      <Eye size={20} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Inspecting: {actPtrn.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Click GOOD or NOT GOOD to record inspection
                      </p>
                    </div>
                  </div>

                  {allPatternsCompleted ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <CheckCircle size={28} className="text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">All Patterns Completed!</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        OP ready for Sewing ({sets} sets)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto mb-3">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                          <div className="text-xs text-emerald-700 dark:text-emerald-400">Total Pattern Good</div>
                          <div className="text-xl font-bold text-emerald-600">{totalGoodPola}</div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
                          <div className="text-xs text-rose-700 dark:text-rose-400">Total Pattern NG</div>
                          <div className="text-xl font-bold text-rose-600">{totalNgPola}</div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                          <div className="text-xs text-amber-700 dark:text-amber-400">Unused Good Patterns</div>
                          <div className="text-xl font-bold text-amber-600">{polaSisa}</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        Out of {totalGoodPola} good patterns, only {sets * patterns.length} patterns can form{' '}
                        {sets} complete sets. The remaining {polaSisa} good patterns cannot form a set and will be
                        considered NG.
                      </p>
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-2">
                        Effective NG: {totalNgEfektif} patterns ({setNgEfektif} sets)
                      </p>
                      <button
                        onClick={back}
                        className="mt-4 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium flex items-center gap-2 mx-auto hover:from-blue-700 transition-all text-sm"
                      >
                        <ArrowLeft size={16} />
                        Back to Queue
                      </button>
                    </div>
                  ) : (
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
                          disabled={
                            submitting ||
                            (actPtrn && prog[patterns.findIndex((p) => p.name === actPtrn.name)]?.completed)
                          }
                          className="absolute inset-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          {actPtrn.imgGood ? (
                            <>
                              <img
                                src={`${API_BASE_URL}/uploads/patterns/${actPtrn.imgGood}`}
                                alt="Good"
                                className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105 duration-500"
                                onError={handleImgError}
                              />
                              <div className="hidden absolute inset-0 flex-col items-center justify-center text-emerald-600 font-bold text-xl bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
                                <ImageIcon size={40} className="mb-3 text-emerald-400" />
                                <span>Pattern Image Not Available</span>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-600 font-bold text-2xl">
                              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-xl flex items-center justify-center mb-4">
                                <ThumbsUp size={28} className="text-white" />
                              </div>
                              <span>GOOD</span>
                              <span className="text-xs font-normal mt-2 opacity-70">(No Image Configured)</span>
                            </div>
                          )}
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-bold">Accept</div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">Press or click</span>
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
                          disabled={
                            submitting ||
                            (actPtrn && prog[patterns.findIndex((p) => p.name === actPtrn.name)]?.completed)
                          }
                          className="absolute inset-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          {actPtrn.imgNg ? (
                            <>
                              <img
                                src={`${API_BASE_URL}/uploads/patterns/${actPtrn.imgNg}`}
                                alt="NG"
                                className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105 duration-500"
                                onError={handleImgError}
                              />
                              <div className="hidden absolute inset-0 flex-col items-center justify-center text-rose-600 font-bold text-xl bg-gradient-to-br from-rose-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
                                <ImageOff size={40} className="mb-3 text-rose-400" />
                                <span>Pattern Image Not Available</span>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-600 font-bold text-2xl">
                              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-400 rounded-xl flex items-center justify-center mb-4">
                                <AlertTriangle size={28} className="text-white" />
                              </div>
                              <span>NOT GOOD</span>
                              <span className="text-xs font-normal mt-2 opacity-70">(No Image Configured)</span>
                            </div>
                          )}
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-bold">Reject</div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">Press or click</span>
                              <XCircle size={16} className="text-rose-300" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal alasan NG */}
      {ngOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-400 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select Defect Reason</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Choose the primary reason for rejection
                </p>
              </div>
            </div>
            <div className="grid gap-1.5 max-h-[250px] overflow-y-auto mb-4">
              {(categories.length ? categories : FALLBACK_NG_REASONS.map((r) => r.label)).map((reason, i) => (
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
                className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm"
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