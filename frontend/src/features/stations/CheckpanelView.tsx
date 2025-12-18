import React, { useState, useRef, useEffect } from 'react';
import { QrCode, CheckCircle, AlertTriangle, ArrowRight, Loader2, XCircle, RefreshCw, History, Lock, Activity, Search, LogOut, ArrowLeft, Layers } from 'lucide-react';
import type { ProductionOrder, PatternPart } from '../../types/production';
import { NG_REASONS } from '../../lib/data';

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

// --- COMPONENT: TOAST ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success'|'error', onClose: () => void }) => (
  <div className={`fixed top-20 right-6 z-[100] animate-in slide-in-from-right-5 fade-in duration-300 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border ${
    type === 'success' 
      ? 'bg-emerald-50 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800' 
      : 'bg-rose-50 dark:bg-rose-900/80 text-rose-700 dark:text-rose-100 border-rose-200 dark:border-rose-800'
  }`}>
    {type === 'success' ? <CheckCircle size={20}/> : <XCircle size={20}/>}
    <span className="font-bold text-sm">{message}</span>
    <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><XCircle size={14}/></button>
  </div>
);

export const CheckpanelView = ({ addLog, onNavigate }: { addLog: (msg: string, type: any) => void, onNavigate: (tab: string) => void }) => {
  // --- STATE ---
  const [receivedOps, setReceivedOps] = useState<ProductionOrder[]>([]); 
  const [activeOpId, setActiveOpId] = useState<string>(''); 
  const [activeOp, setActiveOp] = useState<ProductionOrder | null>(null); 

    const [scanInput, setScanInput] = useState('');
    const [isLoading] = useState(false);

    const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
    const [scanError, setScanError] = useState(''); 

    // Inspection Form
    const [, setGoodQty] = useState(0);
    const [, setNgQty] = useState(0);
    const [ngReason, setNgReason] = useState('');


  // Visual Pattern State
  const [patterns, setPatterns] = useState<PatternPart[]>([]); 
  const [activePattern, setActivePattern] = useState<PatternPart | null>(null); 
  const [isNgModalOpen, setIsNgModalOpen] = useState(false); 

  // History Logs
  const [historyLogs, setHistoryLogs] = useState<InspectionLog[]>([]); 
  const [recentLogs, setRecentLogs] = useState<InspectionLog[]>([]);   
  
  const [showMrPrompt, setShowMrPrompt] = useState(false);
  const [lastNgQty, setLastNgQty] = useState(0); 

  const scanInputRef = useRef<HTMLInputElement>(null);

  // --- FETCH AVAILABLE OPS ---
  const fetchReceivedOps = async () => {
      try {
          const res = await fetch(`${API_BASE_URL}/production-orders?station=CP`);
          if (res.ok) {
              const data = await res.json();
              setReceivedOps(data);
          }
      } catch (e) { console.error("Failed to fetch CP ops"); }
  };

  useEffect(() => { fetchReceivedOps(); }, []);

  // --- LOAD PATTERNS HELPER (REVISED) ---
  const loadPatterns = async (rawStyleCode: string) => {
    // Reset dulu
    setPatterns([]);
    setActivePattern(null);

    // FIX: Ambil 4 karakter pertama sebagai Base Style Code
    // K1YH250001 -> K1YH
    const styleCode = rawStyleCode && rawStyleCode.length >= 4 
        ? rawStyleCode.substring(0, 4).toUpperCase() 
        : rawStyleCode;

    try {
        const res = await fetch(`${API_BASE_URL}/pattern-masters?style=${styleCode}`);
        if (res.ok) {
           const master = await res.json();
           if (master && master.patterns && Array.isArray(master.patterns) && master.patterns.length > 0) {
               setPatterns(master.patterns);
           } else {
               // Fallback
               setPatterns([{ name: 'Default Pattern', imgGood: '', imgNg: '' }]);
           }
        } else {
           setPatterns([{ name: 'Default Pattern', imgGood: '', imgNg: '' }]);
        }
    } catch (e) {
        setPatterns([{ name: 'Default Pattern', imgGood: '', imgNg: '' }]);
    }
  };

  // --- LOAD SESSION ---
  useEffect(() => {
    const savedOp = localStorage.getItem(STORAGE_KEY_OP);
    if (savedOp) {
        try {
            const parsedOp = JSON.parse(savedOp);
            if(parsedOp?.id) {
                setActiveOp(parsedOp);
                setActiveOpId(parsedOp.id);
                loadPatterns(parsedOp.styleCode);
                addLog(`Session restored: ${parsedOp.opNumber}`, 'info');
            }
        } catch (e) { localStorage.removeItem(STORAGE_KEY_OP); }
    }

    const savedGlobalLogs = localStorage.getItem(STORAGE_KEY_GLOBAL_LOGS);
    if (savedGlobalLogs) {
        try { setRecentLogs(JSON.parse(savedGlobalLogs)); } catch (e) {}
    }
  }, []);

  // Load logs per OP
  useEffect(() => {
      if (activeOp?.id) {
          const opLogsKey = `nextg_logs_${activeOp.id}`;
          const savedLogs = localStorage.getItem(opLogsKey);
          if (savedLogs) {
              try { setHistoryLogs(JSON.parse(savedLogs)); } catch (e) {}
          } else {
              setHistoryLogs([]); 
          }
      }
  }, [activeOp?.id]);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 2000);
  };

  // --- HANDLERS ---

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput) return;
    setScanError('');

    try {
        const cleanQr = scanInput.trim();
        const res = await fetch(`${API_BASE_URL}/station-logs/cp-scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCode: cleanQr })
        });

        if (!res.ok) throw new Error('QR Invalid');
        
        const opData = await res.json();
        
        showToast(`Received: ${opData.opNumber}`, 'success');
        addLog(`Inbound Scan: ${opData.opNumber} received at Checkpanel`, 'success');
        
        setScanInput('');
        
        setReceivedOps(prev => {
            const exists = prev.find(p => p.id === opData.id);
            if (exists) return prev.map(p => p.id === opData.id ? opData : p);
            return [...prev, opData];
        });
        fetchReceivedOps(); 

    } catch (error: any) {
        setScanError(error.message);
        addLog(error.message, 'error');
        setScanInput('');
    }
  };

  const handleOpSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      setActiveOpId(selectedId);

      if (selectedId) {
          const selected = receivedOps.find(o => String(o.id) === String(selectedId));
          if (selected) {
              setActiveOp(selected);
              loadPatterns(selected.styleCode);
              localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(selected));
              addLog(`Inspecting: ${selected.opNumber}`, 'info');
              
              setGoodQty(0); setNgQty(0); setNgReason(''); setShowMrPrompt(false);
              setActivePattern(null);
          }
      } else {
          setActiveOp(null);
          localStorage.removeItem(STORAGE_KEY_OP);
      }
  };

  const submitInspection = async (isGood: boolean, reason: string = '') => {
    if (!activeOp || !activePattern) return;
    
    const payload = {
        opId: activeOp.id,
        good: isGood ? 1 : 0,
        ng: isGood ? 0 : 1,
        ngReason: reason,
        patternName: activePattern.name
    };

    try {
        const res = await fetch(`${API_BASE_URL}/station-logs/cp-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const result = await res.json();
            
            const updatedOp = { ...activeOp, cpGoodQty: result.newCpGood };
            setActiveOp(updatedOp);
            localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(updatedOp));

            const newLog: InspectionLog = {
                id: `L-${Date.now()}`,
                time: new Date().toLocaleTimeString(),
                opNumber: activeOp.opNumber,
                good: payload.good,
                ng: payload.ng,
                reason: reason,
                pattern: activePattern.name
            };

            setHistoryLogs(prev => [newLog, ...prev]);

            setRecentLogs(prev => {
                const updated = [newLog, ...prev].slice(0, 50);
                localStorage.setItem(STORAGE_KEY_GLOBAL_LOGS, JSON.stringify(updated));
                return updated;
            });

            if (isGood) {
                showToast('Good +1', 'success');
            } else {
                showToast('NG Recorded', 'error');
                setLastNgQty(prev => prev + 1);
                setShowMrPrompt(true); 
            }
        }
    } catch (error) {
        showToast('Failed to save result', 'error');
    }
  };

  const handleGoodClick = () => submitInspection(true);
  const handleNgClick = () => setIsNgModalOpen(true);

  const confirmNg = () => {
      if (!ngReason) return;
      submitInspection(false, ngReason);
      setIsNgModalOpen(false);
      setNgReason('');
  };

  const handleCreateMR = () => {
      const draftData = {
          opId: activeOp?.id,
          opNumber: activeOp?.opNumber,
          qty: lastNgQty,
          reason: 'Inspection Defect',
          partName: activePattern?.name || 'Fabric Panel' 
      };
      localStorage.setItem('nextg_mr_draft', JSON.stringify(draftData));
      onNavigate('MR');
      setLastNgQty(0); setShowMrPrompt(false);
  };

  const handleSkipMR = () => {
      setLastNgQty(0); setShowMrPrompt(false);
  };

  const handleBack = () => {
      localStorage.removeItem(STORAGE_KEY_OP);
      setActiveOp(null);
      setActiveOpId('');
      setActivePattern(null);
      setHistoryLogs([]); 
      fetchReceivedOps(); 
  };

  const handleFinish = () => {
    if(confirm("Finish checking this OP?")) {
        if (activeOp) {
            const finishLog: InspectionLog = {
                id: `F-${Date.now()}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                opNumber: activeOp.opNumber,
                good: 0,
                ng: 0,
                reason: 'SESSION COMPLETED'
            };
            setRecentLogs(prev => {
                const updated = [finishLog, ...prev].slice(0, 50);
                localStorage.setItem(STORAGE_KEY_GLOBAL_LOGS, JSON.stringify(updated));
                return updated;
            });
        }
        handleBack();
    }
  };

  useEffect(() => {
      if (!activeOp && scanInputRef.current) {
          scanInputRef.current.focus();
      }
  }, [activeOp]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 relative">
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       {!activeOp ? (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
            {/* LEFT: SCANNER */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-6">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-sm animate-pulse">
                    <QrCode size={48} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Dhristi Receiver</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-base text-center max-w-md">
                    Scan QR Code from Cutting to Receive Bundle into Checkpanel Queue.
                </p>
                
                <form onSubmit={handleScan} className="w-full max-w-lg relative">
                    <input ref={scanInputRef} type="text" className={`w-full p-5 pl-14 rounded-2xl border-2 ${scanError ? 'border-rose-500 focus:ring-rose-500/20' : 'border-blue-500 focus:ring-blue-500/20'} bg-white dark:bg-black text-2xl font-mono text-center text-black dark:text-white outline-none shadow-xl focus:ring-4 transition-all`} placeholder="Scan QR here..." value={scanInput} onChange={e => { setScanInput(e.target.value); if(scanError) setScanError(''); }} disabled={isLoading} autoFocus />
                    <div className={`absolute left-5 top-1/2 -translate-y-1/2 ${scanError ? 'text-rose-500' : 'text-blue-500'}`}>{isLoading ? <Loader2 size={28} className="animate-spin"/> : <QrCode size={28}/>}</div>
                </form>

                {scanError && (
                    <div className="mt-6 px-4 py-3 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2 flex items-center gap-2"><XCircle size={18} /> {scanError}</div>
                )}
            </div>

            {/* RIGHT: QUEUE */}
            <div className="lg:col-span-5 flex flex-col gap-6 h-full">
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Search size={14}/> Select Order to Inspect</label>
                        <button onClick={fetchReceivedOps} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"><RefreshCw size={10}/> Refresh List</button>
                    </div>
                    <select className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-mono text-sm" value={activeOpId} onChange={handleOpSelection}>
                        <option value="">-- {receivedOps.length} Orders Ready --</option>
                        {receivedOps.map(o => (<option key={o.id} value={String(o.id)}>{o.opNumber} - {o.styleCode} (Recv: {o.cutQty})</option>))}
                    </select>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm flex-1">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center"><h3 className="font-bold text-black dark:text-white flex items-center gap-2"><Activity size={18} className="text-blue-500"/> Recent Activity</h3></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {recentLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic"><History size={32} className="mb-2 opacity-20"/>No recent inspections found.</div>
                        ) : (
                            recentLogs.map((log) => (
                                <div key={log.id} className={`p-3 rounded-xl border transition-colors group ${log.reason === 'SESSION COMPLETED' ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800'}`}>
                                    <div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">{log.opNumber}</span><span className="text-[10px] text-slate-400">{log.time}</span></div>
                                    {log.reason === 'SESSION COMPLETED' ? (<div className="flex items-center gap-2 text-xs font-bold text-slate-400 mt-1"><LogOut size={12}/> Session Finished</div>) : (
                                        <>
                                            <div className="flex items-center justify-between"><div className="flex gap-3 text-sm font-bold">{log.good > 0 && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={12}/> {log.good}</span>}{log.ng > 0 && <span className="text-rose-600 flex items-center gap-1"><XCircle size={12}/> {log.ng}</span>}</div></div>
                                            {log.reason && <div className="mt-2 text-[10px] bg-rose-50 dark:bg-rose-900/20 text-rose-500 px-2 py-1 rounded w-fit">Reason: {log.reason}</div>}
                                            {log.pattern && <div className="mt-1 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded inline-block font-medium">{log.pattern}</div>}
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
         </div>
       ) : (
         // --- INSPECTION INTERFACE ---
         <>
            <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={handleBack} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:text-blue-600 transition-colors" title="Back"><ArrowLeft size={20}/></button>
                    <div><div className="text-xs font-bold text-slate-400 uppercase">Inspecting</div><h2 className="text-2xl font-bold text-black dark:text-white">{activeOp.opNumber}</h2></div>
                </div>
                <div className="text-right"><div className="text-xs font-bold text-slate-400 uppercase">Total Verified</div><div className="text-3xl font-bold text-emerald-600">{activeOp.cpGoodQty}</div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {!activePattern ? (
                        <div className="bg-white dark:bg-[#0f172a] p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Layers size={20}/> Select Pattern to Inspect</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {patterns.map((pat, idx) => (
                                    <button key={idx} onClick={() => setActivePattern(pat)} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left group">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Part {idx+1}</span>
                                        <div className="mt-3 font-bold text-lg text-black dark:text-white group-hover:text-blue-600">{pat.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
                            <button onClick={handleGoodClick} className="relative group rounded-2xl overflow-hidden border-4 border-emerald-500/20 hover:border-emerald-500 transition-all active:scale-[0.98] shadow-xl bg-emerald-50 dark:bg-emerald-900/10">
                                {activePattern.imgGood ? (
                                    <img src={`/patterns/${activePattern.imgGood}`} alt="Good" className="w-full h-full object-cover transition-opacity" onError={(e) => e.currentTarget.style.display = 'none'} />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-emerald-600 font-bold text-3xl bg-emerald-50 dark:bg-emerald-900/10">
                                        <span>GOOD</span>
                                        <span className="text-sm font-normal mt-2 opacity-70">(No Image)</span>
                                    </div>
                                )}
                            </button>

                            <button onClick={handleNgClick} className="relative group rounded-2xl overflow-hidden border-4 border-rose-500/20 hover:border-rose-500 transition-all active:scale-[0.98] shadow-xl bg-rose-50 dark:bg-rose-900/10">
                                {activePattern.imgNg ? (
                                    <img src={`/patterns/${activePattern.imgNg}`} alt="NG" className="w-full h-full object-cover transition-opacity" onError={(e) => e.currentTarget.style.display = 'none'} />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-rose-600 font-bold text-3xl bg-rose-50 dark:bg-rose-900/10">
                                        <span>NOT GOOD</span>
                                        <span className="text-sm font-normal mt-2 opacity-70">(No Image)</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    )}
                    {activePattern && (
                        <div className="flex justify-between items-center bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <button onClick={() => setActivePattern(null)} className="text-sm font-bold text-slate-500 hover:text-black dark:hover:text-white flex items-center gap-2"><ArrowLeft size={16}/> Change Pattern</button>
                            <span className="text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">Active: {activePattern.name}</span>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {showMrPrompt ? (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-6 animate-in zoom-in shadow-md text-center">
                            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-2"/>
                            <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-4">Defect Recorded!</h4>
                            <button onClick={handleCreateMR} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold mb-2">Create Material Request</button>
                            <button onClick={handleSkipMR} className="text-xs text-slate-400 underline">Skip</button>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-6">
                            <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-6">Current Balance</div>
                                <div className="flex justify-between items-end mb-2"><span className="text-slate-600 dark:text-slate-300 font-bold text-lg">Verified Good</span><span className="text-4xl font-extrabold text-emerald-600">{activeOp?.cpGoodQty}</span></div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 mb-6 overflow-hidden"><div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(((activeOp?.cpGoodQty || 0) / (activeOp?.cutQty || 1)) * 100, 100)}%` }}></div></div>
                                <button onClick={handleFinish} className="w-full py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800">Finish & Scan Next OP <ArrowRight size={18}/></button>
                            </div>
                            <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-4"><History size={14}/> Inspection Log <Lock size={12} className="ml-auto"/></div>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {historyLogs.map(log => (
                                        <div key={log.id} className="text-sm p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                            <div className="flex justify-between"><span className="font-mono text-[10px] text-slate-400">{log.time}</span><span className={`font-bold ${log.good ? 'text-emerald-600':'text-rose-600'}`}>{log.good ? 'OK' : 'NG'}</span></div>
                                            {log.pattern && <div className="text-xs text-blue-500 mt-1">{log.pattern}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
         </>
       )}

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