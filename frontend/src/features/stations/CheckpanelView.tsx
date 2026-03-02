import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, ImageIcon, ImageOff, AlertTriangle,
  ClipboardCheck, ThumbsUp, Layers, Package, ArrowLeft, Wifi, Eye, Award,
  Shield, CheckSquare, XSquare
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
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div
          className={`w-10 h-10 bg-gradient-to-br ${colors.bg} dark:${colors.darkBg} rounded-lg flex items-center justify-center`}
        >
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
  const tin = ops.reduce((s, o) => s + (o.qtyPond || 0), 0);
  const tg = ops.reduce((s, o) => s + (o.cpGoodQty || 0), 0);
  const tng = ops.reduce((s, o) => s + (o.cpNgQty || 0), 0);
  const comp = tin > 0 ? Math.round((tg / tin) * 100) : 0;

  const fetchOps = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=CP`);
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
    // 🔥 Cegah jika OP sudah selesai (allPatternsCompleted = true)
    if (op.allPatternsCompleted) {
      showToast('OP sudah selesai dan siap dikirim ke sewing', 'error');
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
    fetchOps();
  };

  const submitInspection = async (isGood: boolean, reason: string = '') => {
    if (isSubmittingRef.current) return;
    if (!actOp || !actPtrn) return showToast('Pilih OP dan pola terlebih dahulu', 'error');
    const idx = patterns.findIndex((p) => p.name === actPtrn.name);
    if (idx === -1) return showToast('Pola tidak ditemukan', 'error');

    const cur = prog[idx] || { good: 0, ng: 0, completed: false };
    if (cur.completed) {
      showToast('Pola ini sudah selesai', 'error');
      return;
    }

    const token = localStorage.getItem('nextg_token');
    if (!token) return showToast('Token tidak ditemukan', 'error');

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
        const target = actOp.qtyEntan || 0;
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
        
        // 🔄 Refresh data dari server
        await fetchOps(); // panggil fungsi refresh
        setRefTrigger((prev) => prev + 1);

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
          showToast('Pola ini sudah selesai (sinkronisasi data)', 'error');
        } else {
          showToast(`Gagal (${res.status}): ${err.message}`, 'error');
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

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    e.currentTarget.nextElementSibling?.classList.remove('hidden');
    e.currentTarget.nextElementSibling?.classList.add('flex');
  };

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
      <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <ClipboardCheck size={28} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                  <Wifi size={16} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Check Panel
                  <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-bold">
                    DHRISTI IoT
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-lg">
                <div className="flex flex-col">
                  <div className="text-xs font-medium opacity-90">Queue</div>
                  <div className="text-2xl font-bold">{tq}</div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Package size={20} />
                </div>
              </div>
              <button
                onClick={fetchOps}
                disabled={refreshing}
                className="group px-5 py-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 shadow-sm hover:shadow-md"
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
          <MetricCard title="Total Input" value={tin} icon={Package} color="blue" suffix="pcs" subtitle="From Cutting Pond" />
          <MetricCard title="Verified Good" value={tg} icon={CheckCircle} color="emerald" suffix="pcs" subtitle="Cumulative" />
          <MetricCard title="NG Total" value={tng} icon={AlertTriangle} color="rose" suffix="pcs" subtitle="Cumulative" />
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Completion Rate</div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-lg flex items-center justify-center">
                <Award size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{comp}%</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${comp}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                        : 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10'
                    }`}
                  >
                    {actOp ? (
                      <Layers size={20} className="text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ClipboardCheck size={20} className="text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {actOp ? 'Patterns to Inspect' : 'Production Orders'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {actOp ? `OP: ${actOp.opNumber}` : `${tq} orders ready`}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {actOp ? patterns.length : tq}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {!actOp ? (
                tq === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-slate-400" />
                    </div>
                    <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Orders</h4>
                    <p className="text-slate-500 dark:text-slate-400">Waiting for incoming orders...</p>
                  </div>
                ) : (
                  ops.map((op: ProductionOrder) => (
                    <div
                      key={op.id}
                      className={`group p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer mb-2 ${
                        op.allPatternsCompleted
                          ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 opacity-70 cursor-not-allowed'
                          : actOp?.id === op.id
                            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 shadow-lg'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg'
                      }`}
                      onClick={() => !op.allPatternsCompleted && selectOp(op)}
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
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Ready</span>
                        </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900 dark:text-white">{op.qtyPond || 0}</div>
                            <div className="text-xs text-slate-500">pieces</div>
                            {op.allPatternsCompleted && (
                              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {op.setsReadyForSewing || 0} sets ready
                              </div>
                            )}
                          </div>
                      </div>
                      {op.allPatternsCompleted && (
                        <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={14} />
                          Ready for Sewing
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : patterns.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Layers size={32} className="text-slate-400" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Patterns</h4>
                  <p className="text-slate-500 dark:text-slate-400">Configure patterns in Line Master</p>
                </div>
              ) : (
                patterns.map((pat, idx) => {
                  const p = prog[idx] || { good: 0, ng: 0, completed: false };
                  const target = actOp.qtyEntan || 0;
                  const done = p.good + p.ng;
                  const rem = target - done;
                  return (
                    <div
                      key={idx}
                      className={`group p-4 rounded-2xl border-2 transition-all duration-300 ${
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
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                            Part {idx + 1}
                          </div>
                          <div className="font-bold text-lg text-slate-900 dark:text-white">{pat.name}</div>
                        </div>
                        {p.completed && <CheckCircle size={16} className="text-emerald-500" />}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-emerald-600">G:{p.good}</span>
                        <span className="text-rose-600">NG:{p.ng}</span>
                        <span className="text-slate-500">Sisa:{rem}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            p.completed ? 'bg-emerald-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${(done / target) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Inspection Interface */}
        <div className="lg:col-span-2">
          {!actOp ? (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/10 dark:to-blue-900/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Eye size={40} className="text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-3">Select an Order to Inspect</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-8 max-w-md mx-auto">
                Choose a production order from the list to begin visual inspection.
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Click on any order to start</span>
              </div>
            </div>
          ) : !actPtrn ? (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/10 dark:to-purple-900/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Layers size={40} className="text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-3">Select a Pattern</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-8 max-w-md mx-auto">
                Choose a pattern from the list to begin visual inspection.
              </p>
              <button
                onClick={back}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium flex items-center gap-2 hover:border-blue-300 transition-all"
              >
                <ArrowLeft size={18} />
                Back to Queue
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={back}
                        className="group p-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300"
                        title="Back to queue"
                      >
                        <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300 group-hover:text-blue-600" />
                      </button>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
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
                        <div className="text-2xl font-bold text-emerald-600">{actOp.cpGoodQty || 0}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Total NG</div>
                        <div className="text-2xl font-bold text-rose-600">{actOp.cpNgQty || 0}</div>
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
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inspecting: {actPtrn.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Click GOOD or NOT GOOD to record inspection
                      </p>
                    </div>
                  </div>

                  {allPatternsCompleted ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">All Patterns Completed!</h3>
                      <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                        OP siap dikirim ke Sewing ({sets} set)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl">
                          <div className="text-sm text-emerald-700 dark:text-emerald-400">Total Good Pola</div>
                          <div className="text-2xl font-bold text-emerald-600">{totalGoodPola}</div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl">
                          <div className="text-sm text-rose-700 dark:text-rose-400">Total NG Pola</div>
                          <div className="text-2xl font-bold text-rose-600">{totalNgPola}</div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl">
                          <div className="text-sm text-amber-700 dark:text-amber-400">Pola Good Tidak Terpakai</div>
                          <div className="text-2xl font-bold text-amber-600">{polaSisa}</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        Dari total {totalGoodPola} pola good, hanya {sets * patterns.length} pola yang dapat membentuk{' '}
                        {sets} set utuh. Sisanya {polaSisa} pola good tidak dapat membentuk set dan akan dianggap NG.
                      </p>
                      <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-2">
                        Total NG efektif: {totalNgEfektif} pola ({setNgEfektif} set)
                      </p>
                      <button
                        onClick={back}
                        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-medium flex items-center gap-2 mx-auto hover:from-blue-700 transition-all"
                      >
                        <ArrowLeft size={18} />
                        Back to Queue
                      </button>
                    </div>
                  ) : (
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
                          disabled={submitting || (actPtrn && prog[patterns.findIndex((p) => p.name === actPtrn.name)]?.completed)}
                          className="absolute inset-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          {actPtrn.imgGood ? (
                            <>
                              <img
                                src={`${API_BASE_URL}/uploads/patterns/${actPtrn.imgGood}`}
                                alt="Good"
                                className="w-full h-full object-contain p-8 transition-transform group-hover:scale-105 duration-500"
                                onError={handleImgError}
                              />
                              <div className="hidden absolute inset-0 flex-col items-center justify-center text-emerald-600 font-bold text-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-800 p-8">
                                <ImageIcon size={48} className="mb-4 text-emerald-400" />
                                <span>Pattern Image Not Available</span>
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
                          disabled={submitting || (actPtrn && prog[patterns.findIndex((p) => p.name === actPtrn.name)]?.completed)}
                          className="absolute inset-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          {actPtrn.imgNg ? (
                            <>
                              <img
                                src={`${API_BASE_URL}/uploads/patterns/${actPtrn.imgNg}`}
                                alt="NG"
                                className="w-full h-full object-contain p-8 transition-transform group-hover:scale-105 duration-500"
                                onError={handleImgError}
                              />
                              <div className="hidden absolute inset-0 flex-col items-center justify-center text-rose-600 font-bold text-2xl bg-gradient-to-br from-rose-50 to-white dark:from-slate-900 dark:to-slate-800 p-8">
                                <ImageOff size={48} className="mb-4 text-rose-400" />
                                <span>Pattern Image Not Available</span>
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
                  )}
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