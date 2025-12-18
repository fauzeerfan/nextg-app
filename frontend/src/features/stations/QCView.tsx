import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Loader2, ClipboardList, History, Lock, Search } from 'lucide-react';
import type { ProductionOrder, PatternMaster } from '../../types/production';
import { NG_REASONS } from '../../lib/data';

const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY_OP = 'nextg_qc_active_op';
const STORAGE_KEY_LOGS = 'nextg_qc_logs';

interface QCLog {
  id: string;
  time: string;
  good: number;
  ng: number;
  reason?: string;
}

// --- COMPONENT: TOAST ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success'|'error', onClose: () => void }) => (
  <div className={`fixed top-20 right-6 z-[100] animate-in slide-in-from-right-5 fade-in duration-300 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border ${
    type === 'success' 
      ? 'bg-emerald-50 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800' 
      : 'bg-rose-50 dark:bg-rose-900/80 text-rose-700 dark:text-rose-100 border-rose-200 dark:border-rose-800'
  }`}>
    {type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
    <span className="font-bold text-sm">{message}</span>
    <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100">×</button>
  </div>
);

export const QCStationView = ({ addLog, onNavigate }: { addLog: (msg: string, type: any) => void, onNavigate: (tab: string) => void }) => {
  // --- STATE ---
  const [activeOpId, setActiveOpId] = useState<string>('');
  const [ops, setOps] = useState<ProductionOrder[]>([]);
  const [activeOp, setActiveOp] = useState<ProductionOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  // Input State (Hanya untuk modal NG)
  const [ngReason, setNgReason] = useState('');
  const [isNgModalOpen, setIsNgModalOpen] = useState(false);
  
  // History & Logic
  const [sessionLogs, setSessionLogs] = useState<QCLog[]>([]);
  const [showReplacementPrompt, setShowReplacementPrompt] = useState(false);

  // Pattern Config for Set Images
  const [patternConfig, setPatternConfig] = useState<PatternMaster | null>(null);

  // --- FETCH OPS ---
  const fetchAvailableOps = async () => {
    try {
        const [resQC, resSewing] = await Promise.all([
            fetch(`${API_BASE_URL}/production-orders?station=QC`),
            fetch(`${API_BASE_URL}/production-orders?station=SEWING`)
        ]);

        const dataQC = await resQC.json();
        const dataSewing = await resSewing.json();
        
        const rawOps = [...dataQC, ...dataSewing];

        // Filter: Hanya OP yang sudah ada output dari Sewing dan belum selesai QC
        const filteredOps = rawOps.filter((op: ProductionOrder) => {
            if (!op || !op.id) return false;
            const sewingOut = op.sewingOutQty || 0;
            const qcProcessed = (op.qcGoodQty || 0) + (op.packedQty || 0);
            return sewingOut > 0 && qcProcessed < sewingOut;
        });

        const uniqueOps = Array.from(new Map(filteredOps.map(item => [item.id, item])).values());
        setOps(uniqueOps as ProductionOrder[]);
    } catch (err) {
        console.error("Failed to fetch OPs", err);
    }
  };

  useEffect(() => { fetchAvailableOps(); }, []);

  // --- LOAD CONFIG ---
  const loadPatternConfig = async (styleCode: string) => {
    const baseStyle = styleCode && styleCode.length >= 4 ? styleCode.substring(0, 4).toUpperCase() : styleCode;
    try {
        const res = await fetch(`${API_BASE_URL}/pattern-masters?style=${baseStyle}`);
        if (res.ok) {
           const master = await res.json();
           setPatternConfig(master);
        } else {
           setPatternConfig(null);
        }
    } catch (e) { setPatternConfig(null); }
  };

  // --- LOAD SESSION ---
  useEffect(() => {
    const savedOp = localStorage.getItem(STORAGE_KEY_OP);
    if (savedOp) {
        try {
            const parsedOp = JSON.parse(savedOp);
            if (parsedOp?.id) {
                setActiveOp(parsedOp);
                setActiveOpId(parsedOp.id);
                loadPatternConfig(parsedOp.styleCode);
                addLog(`Session restored: QC ${parsedOp.opNumber}`, 'info');
            }
        } catch (e) { localStorage.removeItem(STORAGE_KEY_OP); }
    }
  }, []);

  useEffect(() => {
      if (activeOp?.id) {
          const logsKey = `${STORAGE_KEY_LOGS}_${activeOp.id}`;
          const saved = localStorage.getItem(logsKey);
          if (saved) setSessionLogs(JSON.parse(saved));
          else setSessionLogs([]);
      }
  }, [activeOp?.id]);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- HANDLE SELECTION ---
  const handleOpSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      setActiveOpId(selectedId);
      
      if (selectedId && selectedId !== "") {
          const selected = ops.find(o => String(o.id) === String(selectedId));
          if (selected) {
            setActiveOp(selected);
            loadPatternConfig(selected.styleCode);
            localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(selected));
            addLog(`Selected: ${selected.opNumber}`, 'success');
            
            setShowReplacementPrompt(false);
            setNgReason('');
          }
      } else {
          setActiveOp(null);
          localStorage.removeItem(STORAGE_KEY_OP);
      }
  };

  // --- SUBMIT INSPECTION (VISUAL) ---
  const submitInspection = async (isGood: boolean, reason: string = '') => {
    if (!activeOp) return;
    
    // Payload 1 pcs per click
    const payload = {
        opId: activeOp.id,
        good: isGood ? 1 : 0,
        ng: !isGood ? 1 : 0,
        ngReason: reason,
    };

    try {
        const res = await fetch(`${API_BASE_URL}/station-logs/qc-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const result = await res.json();
            
            const updatedOp = { ...activeOp, qcGoodQty: result.newQcGood };
            setActiveOp(updatedOp);
            localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(updatedOp));
            
            setOps(prev => prev.map(o => o.id === updatedOp.id ? updatedOp : o));

            const newLog: QCLog = {
                id: `L-${Date.now()}`,
                time: new Date().toLocaleTimeString(),
                good: payload.good,
                ng: payload.ng,
                reason: reason
            };
            const updatedLogs = [newLog, ...sessionLogs];
            setSessionLogs(updatedLogs);
            localStorage.setItem(`${STORAGE_KEY_LOGS}_${activeOp.id}`, JSON.stringify(updatedLogs));

            if (isGood) {
                showToast('Good +1', 'success');
            } else {
                showToast('NG Recorded', 'error');
                setShowReplacementPrompt(true);
            }
        }
    } catch (error) {
        showToast('Failed to save result', 'error');
    }
  };

  // --- HANDLERS ---
  const handleGoodClick = () => submitInspection(true);
  
  const handleNgClick = () => setIsNgModalOpen(true);

  const confirmNg = () => {
      if (!ngReason) return;
      submitInspection(false, ngReason);
      setIsNgModalOpen(false);
      setNgReason('');
  };

  const handleRequestReplacement = async () => {
      if (!activeOp) return;
      // Gunakan data dari log terakhir atau akumulasi (disimplifikasi: buka menu OP REQ)
      // Di sini kita asumsikan user akan mengisi detail Qty di menu OP Req
      // Simpan draft untuk OP REQ
      const draftData = {
          opId: activeOp.id,
          opNumber: activeOp.opNumber,
          qty: 1, // Default 1 or accumulated logic
          reason: 'Inspection Defect'
      };
      localStorage.setItem('nextg_opreq_draft', JSON.stringify(draftData));
      onNavigate('OPREQ');
      setShowReplacementPrompt(false);
  };

  const handleSkipReplacement = () => {
      setShowReplacementPrompt(false);
  };

  const handleFinishSession = async () => {
      if (!activeOp) return;
      if (!confirm("Finish QC Session for this OP? Item will be moved to Packing line.")) return;

      setIsLoading(true);
      try {
          const res = await fetch(`${API_BASE_URL}/station-logs/qc-finish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ opId: activeOp.id })
          });

          if (res.ok) {
              showToast('QC Finished. OP moved to Packing.', 'success');
              addLog(`QC Finished for ${activeOp.opNumber}`, 'success');
              
              localStorage.removeItem(STORAGE_KEY_OP);
              setActiveOp(null);
              setActiveOpId('');
              setShowReplacementPrompt(false);
              setSessionLogs([]); 
              fetchAvailableOps();
          } else {
             throw new Error("Failed to finish QC");
          }
      } catch (error) {
          showToast('Error finishing session', 'error');
      } finally {
          setIsLoading(false);
      }
  };

  const handleChangeOp = () => {
    if(confirm("Switch to another OP without finishing?")) {
        localStorage.removeItem(STORAGE_KEY_OP);
        setActiveOp(null);
        setActiveOpId('');
        setShowReplacementPrompt(false);
        setSessionLogs([]); 
        fetchAvailableOps();
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 relative">
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       {/* SELECTION */}
       <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between gap-6">
             <div className="flex-1 max-w-lg">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Search size={14}/> Select Order to Inspect
                </label>
                <select 
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-mono text-sm"
                    value={activeOpId}
                    onChange={handleOpSelection}
                >
                    <option value="">-- Select Available OP --</option>
                    {ops.map(o => {
                        const wip = (o.sewingOutQty || 0) - (o.qcGoodQty || 0);
                        if (!o.id) return null;
                        return (
                            <option key={o.id} value={String(o.id)}>
                                {o.opNumber} - {o.styleCode} (Queue: {wip})
                            </option>
                        );
                    })}
                </select>
             </div>
             
             {activeOp && (
                <div className="flex items-center gap-6 text-right">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Sewing Out</div>
                        <div className="text-2xl font-bold text-blue-600">{activeOp.sewingOutQty}</div>
                    </div>
                    <div className="pl-6 border-l border-slate-200 dark:border-slate-700">
                         <div className="text-xs font-bold text-slate-400 uppercase">Ready to QC</div>
                         <div className="text-2xl font-bold text-amber-500">
                             {(activeOp.sewingOutQty || 0) - (activeOp.qcGoodQty || 0)}
                         </div>
                    </div>
                </div>
             )}
          </div>
       </div>

       {/* MAIN INTERFACE - ONLY SHOW IF OP SELECTED */}
       {activeOp ? (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: INPUT */}
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-[#0f172a] p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <h3 className="font-bold text-xl text-black dark:text-white flex items-center gap-2">
                            <ClipboardList size={24} className="text-blue-500"/> QC Visual Inspection
                        </h3>
                    </div>
                    
                    {/* VISUAL INSPECTION SET IMAGES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        {/* GOOD BUTTON */}
                        <button onClick={handleGoodClick} className="relative group aspect-square rounded-2xl overflow-hidden border-4 border-emerald-500/20 hover:border-emerald-500 transition-all active:scale-[0.98] shadow-xl bg-emerald-50 dark:bg-emerald-900/10">
                            {/* Clean Image - No Text/Icon Overlay */}
                            {patternConfig?.imgSetGood ? (
                                <img src={`/patterns/${patternConfig.imgSetGood}`} alt="Good" className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-600 font-bold text-3xl">
                                    <span>GOOD</span>
                                    <span className="text-sm font-normal mt-2 opacity-70">(No Image Configured)</span>
                                </div>
                            )}
                        </button>

                        {/* NG BUTTON */}
                        <button onClick={handleNgClick} className="relative group aspect-square rounded-2xl overflow-hidden border-4 border-rose-500/20 hover:border-rose-500 transition-all active:scale-[0.98] shadow-xl bg-rose-50 dark:bg-rose-900/10">
                            {/* Clean Image - No Text/Icon Overlay */}
                            {patternConfig?.imgSetNg ? (
                                <img src={`/patterns/${patternConfig.imgSetNg}`} alt="NG" className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-600 font-bold text-3xl">
                                    <span>NOT GOOD</span>
                                    <span className="text-sm font-normal mt-2 opacity-70">(No Image Configured)</span>
                                </div>
                            )}
                        </button>
                    </div>
                    
                    <p className="text-center text-xs text-slate-400 italic">Tap image to record result</p>
                </div>
            </div>

            {/* RIGHT: SUMMARY & ACTION */}
            <div className="lg:col-span-4 space-y-6">
                {showReplacementPrompt ? (
                     <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center animate-in zoom-in">
                        <AlertTriangle size={32} className="text-amber-500 mx-auto mb-2"/>
                        <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-4">Defect Recorded!</h4>
                        <button onClick={handleRequestReplacement} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold mb-2">Create Replacement Req</button>
                        <button onClick={handleSkipReplacement} className="text-xs text-slate-400 hover:text-slate-600 underline">Skip</button>
                     </div>
                ) : (
                    <div className="flex flex-col h-full gap-6">
                        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-6">QC Balance</div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-slate-600 dark:text-slate-300 font-bold text-lg">Approved Good</span>
                                <span className="text-4xl font-extrabold text-blue-600">{activeOp?.qcGoodQty}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 mb-6 overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(((activeOp?.qcGoodQty || 0) / (activeOp?.sewingOutQty || 1)) * 100, 100)}%` }}></div>
                            </div>
                            <button onClick={handleFinishSession} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
                                {isLoading ? <Loader2 className="animate-spin"/> : <><CheckCircle size={18}/> Finish Session</>}
                            </button>
                            <button onClick={handleChangeOp} className="w-full mt-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg font-bold text-xs transition-colors">
                                Change OP (Cancel)
                            </button>
                        </div>
                        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-4"><History size={14}/> QC Log <Lock size={12} className="ml-auto"/></div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {sessionLogs.map(log => (
                                    <div key={log.id} className="text-sm p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                        <div className="flex justify-between"><span className="font-mono text-[10px] text-slate-400">{log.time}</span><span className={`font-bold ${log.good ? 'text-blue-600':'text-rose-600'}`}>{log.good ? 'OK' : 'NG'}</span></div>
                                        {log.reason && <div className="text-xs text-rose-500 mt-1">{log.reason}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
         </div>
       ) : (
         <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-400">
             <ClipboardList size={48} className="mb-3 opacity-20"/>
             <p>Please select an Order Production above to start Quality Control.</p>
         </div>
       )}

       {/* NG MODAL */}
       {isNgModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95">
                    <h3 className="text-lg font-bold text-rose-600 mb-4 flex items-center gap-2"><AlertTriangle size={20}/> Select Reason</h3>
                    <div className="grid gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {NG_REASONS.map(r => (
                            <button key={r.id} onClick={() => {setNgReason(r.label)}} className={`p-3 rounded-lg text-left text-sm border ${ngReason===r.label?'bg-rose-50 border-rose-500 text-rose-700':'border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700'}`}>{r.label}</button>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => setIsNgModalOpen(false)} className="flex-1 py-2 border rounded-lg font-bold text-slate-500">Cancel</button>
                        <button onClick={confirmNg} disabled={!ngReason} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold disabled:opacity-50">Confirm</button>
                    </div>
                </div>
            </div>
       )}
    </div>
  );
};