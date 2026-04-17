import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, ImageIcon, ImageOff, AlertTriangle,
  ClipboardCheck, ThumbsUp, Layers, Package, ArrowLeft, Wifi, Eye, Award,
  Shield,
} from 'lucide-react';
import type { ProductionOrder, PatternPart } from '../../types/production';
import { NG_REASONS as FALLBACK_NG_REASONS } from '../../lib/data';
import { TargetSummaryCard } from '../../components/ui/TargetSummaryCard';

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

// Modern Solid Metric Card
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
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      border: 'border-blue-500',
      darkBg: 'dark:bg-blue-900/40',
      darkIcon: 'dark:text-blue-400'
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
    amber: {
      bg: 'bg-amber-100',
      icon: 'text-amber-600',
      border: 'border-amber-500',
      darkBg: 'dark:bg-amber-900/40',
      darkIcon: 'dark:text-amber-400'
    },
  }[color];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${colors.border} border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-9 h-9 ${colors.bg} ${colors.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={`${colors.icon} ${colors.darkIcon}`} />
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

  const getPatternMultiplier = (op: ProductionOrder) => (op as any).line?.patternMultiplier ?? 4;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('nextg_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const allPatternsCompleted =
    patterns.length > 0 && patterns.every((_, i) => prog[i]?.completed === true);

  const totalGoodPola = Object.values(prog).reduce((s, p) => s + p.good, 0);
  const totalNgPola = Object.values(prog).reduce((s, p) => s + p.ng, 0);
  const polaSisa = totalGoodPola - sets * patterns.length;
  const totalNgEfektif = totalNgPola + polaSisa;
  const setNgEfektif = Math.floor(totalNgEfektif / patterns.length);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-5 font-poppins text-slate-800 dark:text-slate-100">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
        `}
      </style>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[200] animate-in slide-in-from-right-5 fade-in duration-300 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl font-bold text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white shadow-emerald-500/30'
              : 'bg-rose-500 text-white shadow-rose-500/30'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-3 opacity-80 hover:opacity-100 transition-opacity">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Header with metrics - Solid Style */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-5">
        <div className="p-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                  <ClipboardCheck size={24} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md">
                  <Wifi size={10} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Check Panel
                  <span className="text-[11px] px-2 py-1 bg-blue-600 text-white rounded-md font-bold uppercase tracking-wider">
                    DHRISTI IoT
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Quality Inspection Station</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                <div className="flex flex-col">
                  <div className="text-[11px] font-semibold opacity-90 uppercase tracking-wide">Queue</div>
                  <div className="text-xl font-black leading-none">{tq}</div>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Package size={18} />
                </div>
              </div>
              <button
                onClick={fetchOps}
                disabled={refreshing}
                className="group px-4 py-2 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:border-blue-600 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
              >
                {refreshing ? (
                  <RefreshCw size={16} className="animate-spin text-blue-600" />
                ) : (
                  <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 pb-5">
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-amber-500 border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completion Rate</div>
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                <Award size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {Math.min(comp, 100)}%
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-2.5 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(comp, 100)}%` }}
              ></div>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">
              {tg + tng} / {tin} inspected
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <TargetSummaryCard lineCode="K1YH" station="CP" />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Left column - Solid Listing */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      actOp
                        ? 'bg-purple-600 shadow-purple-600/30'
                        : 'bg-blue-600 shadow-blue-600/30'
                    } shadow-md text-white`}
                  >
                    {actOp ? <Layers size={18} /> : <ClipboardCheck size={18} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm">
                      {actOp ? 'Patterns List' : 'Prod. Orders'}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {actOp ? `OP: ${actOp.opNumber}` : `${tq} orders ready`}
                    </p>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-black text-slate-700 dark:text-slate-200">
                  {actOp ? patterns.length : tq}
                </div>
              </div>
            </div>
            <div className="p-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
              {!actOp ? (
                tq === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle size={28} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No Orders</h4>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Waiting for incoming...</p>
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
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 opacity-70 cursor-not-allowed'
                            : actOp?.id === op.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-sm bg-white dark:bg-slate-800'
                        }`}
                        onClick={() => !isCpCompleted && selectOp(op)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="font-mono font-black text-[13px] text-slate-900 dark:text-white">
                              {op.opNumber}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              Style: {op.styleCode}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">From Pond</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-blue-600 dark:text-blue-400 leading-none">
                              {op.qtyCP || 0} sets
                            </div>
                            <div className="text-[10px] font-medium text-slate-500 mt-1">
                              ({(op.qtyCP || 0) * patternMultiplier} parts)
                            </div>
                            {op.qtyCP > 0 && (
                              <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                                Inspected: {op.cpGoodQty + op.cpNgQty}/{cpTotalPatterns} 
                                <span className="ml-1 text-slate-400">({Math.round(((op.cpGoodQty + op.cpNgQty) / cpTotalPatterns) * 100)}%)</span>
                              </div>
                            )}
                            {isCpCompleted && (
                              <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 mt-1">
                                <CheckCircle size={10} />
                                Ready: {op.setsReadyForSewing || 0} sets
                              </div>
                            )}
                          </div>
                        </div>
                        {op.qtyCP > 0 && (
                          <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${((op.cpGoodQty + op.cpNgQty) / cpTotalPatterns) * 100}%` }}
                            />
                          </div>
                        )}

                        {/* Detail NG per Pattern */}
                        {op.checkPanelInspections && op.checkPanelInspections.some(insp => insp.ng > 0) && (
                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-[10px] font-black text-rose-600 dark:text-rose-400 mb-1.5 uppercase tracking-wide">NG Details:</div>
                            <div className="space-y-1">
                              {op.checkPanelInspections
                                .filter(insp => insp.ng > 0)
                                .map(insp => (
                                  <div key={insp.patternIndex} className="flex justify-between items-center text-[10px]">
                                    <span className="font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{insp.patternName}</span>
                                    <span className="font-black px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded">
                                      {insp.ng} pcs
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : patterns.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Layers size={28} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No Patterns</h4>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Configure in Line Master</p>
                </div>
              ) : (
                patterns.map((pat, idx) => {
                  const p = prog[idx] || { good: 0, ng: 0, completed: false };
                  const target = actOp.qtyCP || 0;
                  const done = p.good + p.ng;
                  const rem = Math.max(0, target - done);
                  const isCompleted = done >= target;

                  return (
                    <div
                      key={idx}
                      className={`group p-3 rounded-xl border-2 transition-all duration-300 mb-2 ${
                        p.completed
                          ? 'opacity-60 cursor-not-allowed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
                          : 'cursor-pointer hover:border-purple-500 hover:shadow-sm bg-white dark:bg-slate-800'
                      } ${
                        actPtrn?.name === pat.name && !p.completed
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 shadow-md ring-1 ring-purple-600'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                      onClick={() => !p.completed && setActPtrn(pat)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                            Part {idx + 1}
                          </div>
                          <div className="font-bold text-[13px] text-slate-900 dark:text-white mt-0.5">{pat.name}</div>
                        </div>
                        {p.completed && <CheckCircle size={16} className="text-emerald-500" />}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">G: {p.good}</span>
                        <span className="text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-md">NG: {p.ng}</span>
                        <span className={`px-2 py-0.5 rounded-md ${isCompleted ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700'}`}>
                          Rem: {rem}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.min((done / target) * 100, 100)}%` }}
                        ></div>
                      </div>
                      {isCompleted && (
                        <div className="mt-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase tracking-wide">
                          <CheckCircle size={10} />
                          Complete ({done}/{target})
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column - Main Inspection Area */}
        <div className="lg:col-span-4">
          {!actOp ? (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 shadow-sm">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye size={36} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Select an Order to Inspect</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mb-6 max-w-md mx-auto leading-relaxed">
                Choose a production order from the queue on the left panel to begin your visual inspection process.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full uppercase tracking-wider">
                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                Waiting for selection...
              </div>
            </div>
          ) : !actPtrn ? (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 shadow-sm">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers size={36} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Select a Pattern</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mb-6 max-w-md mx-auto leading-relaxed">
                Choose a specific pattern part from the list to begin recording inspection results.
              </p>
              <button
                onClick={back}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <ArrowLeft size={16} />
                Return to Queue
              </button>
            </div>
          ) : (
            <div className="space-y-4 h-full flex flex-col">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1 flex flex-col">
                {/* Inspection Header Container */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={back}
                        className="group p-2.5 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 transition-all shadow-sm"
                        title="Back to queue"
                      >
                        <ArrowLeft size={18} className="text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/30">
                          <Shield size={22} className="text-white" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Active Inspection</div>
                          <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">{actOp.opNumber}</h2>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{actOp.styleCode}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 bg-white dark:bg-slate-700 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Good</div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">{actOp.cpGoodQty || 0}</div>
                      </div>
                      <div className="w-px h-8 bg-slate-200 dark:bg-slate-600"></div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total NG</div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400 leading-none mt-1">{actOp.cpNgQty || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-600/30">
                      <Eye size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Inspecting: {actPtrn.name}</h3>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Select GOOD or NOT GOOD to record result</p>
                    </div>
                  </div>

                  {allPatternsCompleted ? (
                    <div className="text-center py-8 flex-1 flex flex-col justify-center">
                      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
                        <CheckCircle size={36} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">All Patterns Completed!</h3>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-wider">
                        OP ready for Sewing ({sets} sets)
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-6 w-full">
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl">
                          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Total Pattern Good</div>
                          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{totalGoodPola}</div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl">
                          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">Total Pattern NG</div>
                          <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{totalNgPola}</div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl">
                          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Unused Good Patterns</div>
                          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{polaSisa}</div>
                        </div>
                      </div>

                      {/* Detail NG per Pattern - SELALU DITAMPILKAN */}
                      <div className="mt-2 max-w-md mx-auto w-full">
                        <h4 className="text-sm font-black text-rose-600 dark:text-rose-400 mb-3 uppercase tracking-wider text-left">NG Details</h4>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-800 overflow-hidden shadow-sm">
                          <table className="w-full text-sm">
                            <thead className="bg-rose-600 text-white">
                              <tr>
                                <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">Pattern</th>
                                <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">NG Count</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-100 dark:divide-rose-800/50">
                              {patterns.map((pat, idx) => {
                                const ngCount = prog[idx]?.ng || 0;
                                return (
                                  <tr key={idx} className="hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                                    <td className="py-3 px-4 text-left font-semibold text-slate-800 dark:text-slate-200">{pat.name}</td>
                                    <td className="py-3 px-4 text-right font-black text-rose-600 dark:text-rose-400">
                                      {ngCount > 0 ? `${ngCount} pcs` : <span className="text-slate-400 font-medium">-</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                              {patterns.every((_, idx) => (prog[idx]?.ng || 0) === 0) && (
                                <tr>
                                  <td colSpan={2} className="py-4 px-4 text-center text-sm font-medium text-slate-500">
                                    Tidak ada catatan NG untuk OP ini
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mt-6 max-w-2xl mx-auto border border-slate-200 dark:border-slate-700 text-left">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                          Out of <span className="font-bold text-slate-900 dark:text-white">{totalGoodPola}</span> good patterns, only <span className="font-bold text-slate-900 dark:text-white">{sets * patterns.length}</span> patterns can form <span className="font-bold text-slate-900 dark:text-white">{sets}</span> complete sets. The remaining <span className="font-bold text-rose-600">{polaSisa}</span> good patterns cannot form a set and will be considered NG.
                        </p>
                        <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                          Effective NG: {totalNgEfektif} patterns ({setNgEfektif} sets)
                        </p>
                      </div>
                      
                      <button
                        onClick={back}
                        className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 mx-auto transition-colors shadow-lg shadow-blue-600/30"
                      >
                        <ArrowLeft size={18} />
                        Back to Queue
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 items-center">
                      {/* SOLID GOOD Button */}
                      <div
                        className={`group relative aspect-[4/3] rounded-3xl overflow-hidden border-4 transition-all duration-300 hover:scale-[1.03] shadow-lg ${
                          submitting
                            ? 'opacity-50 pointer-events-none border-gray-300'
                            : 'border-emerald-500 hover:shadow-emerald-500/40 cursor-pointer'
                        } bg-white dark:bg-slate-800`}
                      >
                        <button
                          onClick={handleGood}
                          disabled={submitting || (actPtrn && prog[patterns.findIndex((p) => p.name === actPtrn.name)]?.completed)}
                          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center focus:outline-none"
                        >
                          {actPtrn.imgGood ? (
                            <>
                              <img
                                src={`${API_BASE_URL}/uploads/patterns/${actPtrn.imgGood}`}
                                alt="Good"
                                className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105 duration-500 relative z-10"
                                onError={handleImgError}
                              />
                              <div className="hidden absolute inset-0 flex-col items-center justify-center bg-emerald-500 text-white z-20">
                                <ImageIcon size={48} className="mb-4 drop-shadow-md" />
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
                        {/* Solid Label Banner */}
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-white p-4 font-black flex justify-between items-center z-30 group-hover:bg-emerald-700 transition-colors">
                          <span className="uppercase tracking-widest text-sm">Accept Pattern</span>
                          <CheckCircle size={20} />
                        </div>
                      </div>

                      {/* SOLID NOT GOOD Button */}
                      <div
                        className={`group relative aspect-[4/3] rounded-3xl overflow-hidden border-4 transition-all duration-300 hover:scale-[1.03] shadow-lg ${
                          submitting
                            ? 'opacity-50 pointer-events-none border-gray-300'
                            : 'border-rose-500 hover:shadow-rose-500/40 cursor-pointer'
                        } bg-white dark:bg-slate-800`}
                      >
                        <button
                          onClick={handleNg}
                          disabled={submitting || (actPtrn && prog[patterns.findIndex((p) => p.name === actPtrn.name)]?.completed)}
                          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center focus:outline-none"
                        >
                          {actPtrn.imgNg ? (
                            <>
                              <img
                                src={`${API_BASE_URL}/uploads/patterns/${actPtrn.imgNg}`}
                                alt="NG"
                                className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105 duration-500 relative z-10"
                                onError={handleImgError}
                              />
                              <div className="hidden absolute inset-0 flex-col items-center justify-center bg-rose-500 text-white z-20">
                                <ImageOff size={48} className="mb-4 drop-shadow-md" />
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
                        {/* Solid Label Banner */}
                        <div className="absolute bottom-0 left-0 right-0 bg-rose-600 text-white p-4 font-black flex justify-between items-center z-30 group-hover:bg-rose-700 transition-colors">
                          <span className="uppercase tracking-widest text-sm">Reject Pattern</span>
                          <XCircle size={20} />
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
                {(categories.length ? categories : FALLBACK_NG_REASONS.map((r) => r.label)).map((reason, i) => (
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
    </div>
  );
};