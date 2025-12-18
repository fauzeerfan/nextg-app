import React, { useState, useRef, useEffect } from 'react';
import { QrCode, PlayCircle, StopCircle, Loader2, XCircle, CheckCircle, History, RefreshCw, Lock, LogOut, Search, ArrowLeft, Activity } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY_OP = 'nextg_sewing_active_op';
const STORAGE_KEY_LOGS = 'nextg_sewing_logs';
const STORAGE_KEY_GLOBAL_LOGS = 'nextg_sewing_recent_logs'; // Global history

// Interface Log
interface SewingLog {
  id: string;
  time: string;
  opNumber?: string;
  type: 'START' | 'FINISH';
  qty: number;
}

// --- COMPONENTS ---
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

const QuickCounter = ({ value, onChange, colorClass, bgClass, borderColor }: any) => {
    const handleAdd = (amount: number) => onChange(value + amount);
    return (
      <div className={`p-6 rounded-xl border-2 ${bgClass} ${borderColor} transition-all`}>
        <div className={`text-xs font-bold uppercase mb-3 opacity-70 ${colorClass}`}>Sparsha Simulator Input</div>
        <input 
          type="number" 
          className={`w-full text-6xl font-extrabold bg-transparent border-b-2 ${borderColor} outline-none ${colorClass} mb-6 py-2 text-center`}
          value={value || ''}
          onChange={e => onChange(Number(e.target.value))}
          placeholder="0"
        />
        <div className="grid grid-cols-4 gap-3">
          {[1, 5, 10, 50].map(num => (
            <button key={num} onClick={() => handleAdd(num)} className={`py-3 rounded-xl font-bold text-sm shadow-sm active:scale-95 bg-white dark:bg-slate-800 ${colorClass} border border-slate-200 dark:border-slate-700 hover:brightness-95 transition-all`}>+{num}</button>
          ))}
        </div>
      </div>
    );
};

export const SewingView = ({ addLog }: { addLog: (msg: string, type?: 'info'|'error'|'success') => void }) => {
  // State
  const [receivedOps, setReceivedOps] = useState<ProductionOrder[]>([]); // List for Dropdown
  const [activeOpId, setActiveOpId] = useState<string>('');
  const [activeOp, setActiveOp] = useState<ProductionOrder | null>(null);
  
  const [scanInput, setScanInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  
  // Process State
  const [activeTab, setActiveTab] = useState<'START' | 'FINISH'>('START');
  const [qtyInput, setQtyInput] = useState(0);
  
  // Logs
  const [sessionLogs, setSessionLogs] = useState<SewingLog[]>([]); // Per OP
  const [recentLogs, setRecentLogs] = useState<SewingLog[]>([]);   // Global

  const scanInputRef = useRef<HTMLInputElement>(null);

  // --- FETCH AVAILABLE OPS ---
  const fetchReceivedOps = async () => {
      try {
          const res = await fetch(`${API_BASE_URL}/production-orders?station=SEWING`);
          if (res.ok) {
              const data = await res.json();
              setReceivedOps(data);
          }
      } catch (e) { console.error("Failed to fetch Sewing ops"); }
  };

  useEffect(() => { fetchReceivedOps(); }, []);

  // --- LOAD SESSION & LOGS ---
  useEffect(() => {
    // 1. Active Session
    const savedOp = localStorage.getItem(STORAGE_KEY_OP);
    if (savedOp) {
        try {
            const parsedOp = JSON.parse(savedOp);
            if (parsedOp?.id) {
                setActiveOp(parsedOp);
                setActiveOpId(parsedOp.id);
                addLog(`Session restored: Sewing ${parsedOp.opNumber}`, 'info');
            }
        } catch (e) { localStorage.removeItem(STORAGE_KEY_OP); }
    }

    // 2. Global Recent Logs
    const savedGlobalLogs = localStorage.getItem(STORAGE_KEY_GLOBAL_LOGS);
    if (savedGlobalLogs) {
        try { setRecentLogs(JSON.parse(savedGlobalLogs)); } catch (e) {}
    }
  }, []);

  // Load logs per OP
  useEffect(() => {
      if (activeOp?.id) {
          const logsKey = `${STORAGE_KEY_LOGS}_${activeOp.id}`;
          const saved = localStorage.getItem(logsKey);
          if (saved) setSessionLogs(JSON.parse(saved));
          else setSessionLogs([]);
      }
  }, [activeOp?.id]);

  // Auto focus scanner
  useEffect(() => {
    if (!activeOp && scanInputRef.current) scanInputRef.current.focus();
  }, [activeOp]);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- 1. SCAN LOGIC (RECEIVING ONLY) ---
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput) return;
    setIsLoading(true); setScanError('');

    try {
        const cleanQr = scanInput.trim();
        const res = await fetch(`${API_BASE_URL}/station-logs/sewing-scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCode: cleanQr })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'QR Invalid / Salah Station');
        }

        const opData = await res.json();
        
        showToast(`Received: ${opData.opNumber}`, 'success');
        addLog(`Inbound Scan: ${opData.opNumber} received at Sewing`, 'success');
        
        setScanInput('');
        
        // Optimistic Update Dropdown
        setReceivedOps(prev => {
            const exists = prev.find(p => p.id === opData.id);
            if (exists) return prev.map(p => p.id === opData.id ? opData : p);
            return [...prev, opData];
        });
        fetchReceivedOps(); // Sync background

    } catch (err: any) {
        setScanError(err.message);
        addLog(err.message, 'error');
        setScanInput('');
    } finally {
        setIsLoading(false);
    }
  };

  // --- 2. HANDLE OP SELECTION ---
  const handleOpSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      setActiveOpId(selectedId);

      if (selectedId) {
          const selected = receivedOps.find(o => String(o.id) === String(selectedId));
          if (selected) {
              setActiveOp(selected);
              localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(selected));
              addLog(`Sewing Active: ${selected.opNumber}`, 'info');
              
              // Reset Process UI
              setQtyInput(0);
              setActiveTab('START');
          }
      } else {
          setActiveOp(null);
          localStorage.removeItem(STORAGE_KEY_OP);
      }
  };

  // --- 3. SPARSHA PROCESS (INPUT) ---
  const handleSparshaInput = async () => {
    if (!activeOp || qtyInput <= 0) return;

    // Validasi Saldo Frontend
    if (activeTab === 'START' && (activeOp.sewingInQty + qtyInput > activeOp.cpGoodQty)) {
        alert(`Over Supply! Tidak bisa start melebihi supply CP.\nMax tambah: ${activeOp.cpGoodQty - activeOp.sewingInQty}`);
        return;
    }
    if (activeTab === 'FINISH' && (activeOp.sewingOutQty + qtyInput > activeOp.sewingInQty)) {
        alert(`Over Output! Tidak bisa finish melebihi barang yang sudah start.\nMax tambah: ${activeOp.sewingInQty - activeOp.sewingOutQty}`);
        return;
    }

    setIsLoading(true);
    const endpoint = activeTab === 'START' ? 'sewing-start' : 'sewing-finish';

    try {
        const res = await fetch(`${API_BASE_URL}/station-logs/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opId: activeOp.id, qty: qtyInput })
        });

        if (!res.ok) throw new Error('Failed to record data');

        const result = await res.json();
        
        // Update State & Storage
        const updatedOp = { 
            ...activeOp, 
            sewingInQty: activeTab === 'START' ? result.newStartQty : activeOp.sewingInQty,
            sewingOutQty: activeTab === 'FINISH' ? result.newFinishQty : activeOp.sewingOutQty
        };
        
        setActiveOp(updatedOp);
        localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(updatedOp));
        
        // Update List Dropdown (agar saldo terlihat)
        setReceivedOps(prev => prev.map(o => o.id === updatedOp.id ? updatedOp : o));

        // Log per OP
        const newLog: SewingLog = {
            id: `S-${Date.now()}`,
            time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            type: activeTab,
            qty: qtyInput,
            opNumber: activeOp.opNumber
        };
        
        setSessionLogs(prev => {
            const updated = [newLog, ...prev];
            localStorage.setItem(`${STORAGE_KEY_LOGS}_${activeOp.id}`, JSON.stringify(updated));
            return updated;
        });

        // Log Global Recent
        setRecentLogs(prev => {
            const updated = [newLog, ...prev].slice(0, 50);
            localStorage.setItem(STORAGE_KEY_GLOBAL_LOGS, JSON.stringify(updated));
            return updated;
        });

        showToast(`${activeTab} Recorded: +${qtyInput} pcs`, 'success');
        setQtyInput(0);

    } catch (err) {
        showToast('Error recording data', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleBack = () => {
      // Hanya clear UI Active, jangan hapus log
      localStorage.removeItem(STORAGE_KEY_OP);
      setActiveOp(null);
      setActiveOpId('');
      setQtyInput(0);
      setSessionLogs([]);
      fetchReceivedOps();
  };

  const handleFinishOP = () => {
    if (!activeOp) return;
    if (activeOp.sewingInQty !== activeOp.sewingOutQty) {
        if(!confirm(`Warning: WIP Balance is not zero (${activeOp.sewingInQty - activeOp.sewingOutQty} pcs remaining). Finish anyway?`)) return;
    }
    
    if (confirm("Close Sewing Session for this OP?")) {
        // Log Session End
        const finishLog: SewingLog = {
            id: `F-${Date.now()}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'FINISH', // Mark as generic finish
            qty: 0,
            opNumber: activeOp.opNumber
        };
        setRecentLogs(prev => {
            const updated = [finishLog, ...prev].slice(0, 50);
            localStorage.setItem(STORAGE_KEY_GLOBAL_LOGS, JSON.stringify(updated));
            return updated;
        });

        handleBack(); 
    }
  };

  // --- RENDER VIEW ---
  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 relative">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* VIEW JIKA BELUM ADA OP (SCANNER + LIST) */}
      {!activeOp ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
            {/* LEFT: SCANNER */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-6">
                <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-6 shadow-sm animate-pulse">
                    <QrCode size={48} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Sewing Checkpoint</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-base text-center max-w-md">
                    Scan Bundle/OP QR from Checkpanel to Receive.
                </p>
                
                <form onSubmit={handleScan} className="w-full max-w-lg relative">
                    <input 
                        ref={scanInputRef}
                        type="text" 
                        className={`w-full p-5 pl-14 rounded-2xl border-2 ${scanError ? 'border-rose-500 focus:ring-rose-500/20' : 'border-purple-500 focus:ring-purple-500/20'} bg-white dark:bg-black text-2xl font-mono text-center text-black dark:text-white outline-none shadow-xl focus:ring-4 transition-all`}
                        placeholder="Scan QR..."
                        value={scanInput}
                        onChange={e => { setScanInput(e.target.value); if(scanError) setScanError(''); }}
                        disabled={isLoading}
                        autoFocus
                    />
                    <div className={`absolute left-5 top-1/2 -translate-y-1/2 ${scanError ? 'text-rose-500' : 'text-purple-500'}`}>
                        {isLoading ? <Loader2 size={28} className="animate-spin"/> : <QrCode size={28}/>}
                    </div>
                </form>
                {scanError && (
                    <div className="mt-6 px-4 py-3 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
                        <XCircle size={18} /> {scanError}
                    </div>
                )}
            </div>

            {/* RIGHT: QUEUE & HISTORY */}
            <div className="lg:col-span-5 flex flex-col gap-6 h-full">
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Search size={14}/> Select Order to Work
                        </label>
                        <button onClick={fetchReceivedOps} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                            <RefreshCw size={10}/> Refresh List
                        </button>
                    </div>
                    <select 
                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-mono text-sm"
                        value={activeOpId}
                        onChange={handleOpSelection}
                    >
                        <option value="">-- {receivedOps.length} Orders Ready --</option>
                        {receivedOps.map(o => (
                            <option key={o.id} value={String(o.id)}>
                                {o.opNumber} - {o.styleCode} (Supplied: {o.cpGoodQty})
                            </option>
                        ))}
                    </select>
                </div>

                {/* GLOBAL HISTORY */}
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm flex-1">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h3 className="font-bold text-black dark:text-white flex items-center gap-2">
                            <Activity size={18} className="text-purple-500"/> Recent Activity
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {recentLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                                <History size={32} className="mb-2 opacity-20"/>
                                No recent activity.
                            </div>
                        ) : (
                            recentLogs.map((log) => (
                                <div key={log.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">{log.opNumber}</span>
                                        <span className="text-[10px] text-slate-400">{log.time}</span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm font-bold ${log.type === 'START' ? 'text-blue-600' : 'text-emerald-600'}`}>
                                        {log.type === 'START' ? <PlayCircle size={14}/> : <StopCircle size={14}/>}
                                        {log.type} {log.qty > 0 && `+${log.qty}`}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
         </div>
      ) : (
         // --- VIEW: PROCESS (START/FINISH) ---
         <>
            <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <button onClick={handleBack} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-600 transition-colors mr-2" title="Back to Selection">
                            <ArrowLeft size={16}/>
                        </button>
                        <span className="text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded uppercase tracking-wider">Sewing Active</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-black dark:text-white">{activeOp?.opNumber}</h2>
                </div>
                <div className="flex gap-6 text-right">
                    <div>
                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Target</div>
                        <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{activeOp?.targetQty}</div>
                    </div>
                    <div className="pl-6 border-l border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Supply (CP)</div>
                        <div className="text-2xl font-bold text-blue-600">{activeOp?.cpGoodQty}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT: MAIN CONTROLS */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl flex gap-1 border border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => { setActiveTab('START'); setQtyInput(0); }}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'START' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <PlayCircle size={20}/> SEWING START
                        </button>
                        <button 
                            onClick={() => { setActiveTab('FINISH'); setQtyInput(0); }}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'FINISH' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <StopCircle size={20}/> SEWING FINISH
                        </button>
                    </div>

                    <QuickCounter 
                        value={qtyInput} 
                        onChange={setQtyInput} 
                        colorClass={activeTab === 'START' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}
                        bgClass={activeTab === 'START' ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-emerald-50 dark:bg-emerald-900/10'}
                        borderColor={activeTab === 'START' ? 'border-blue-100 dark:border-blue-900/30' : 'border-emerald-100 dark:border-emerald-900/30'}
                    />

                    <button 
                        onClick={handleSparshaInput}
                        disabled={qtyInput <= 0 || isLoading}
                        className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'START' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        {isLoading ? <Loader2 className="animate-spin"/> : (activeTab === 'START' ? 'SUBMIT START' : 'SUBMIT FINISH')}
                    </button>
                </div>

                {/* RIGHT: WIP & HISTORY */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-4">WIP (In Line)</div>
                        
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-4xl font-extrabold text-amber-500">
                                {(activeOp?.sewingInQty || 0) - (activeOp?.sewingOutQty || 0)}
                            </span>
                            <div className="text-right text-xs text-slate-500 font-medium">
                                <div>In: {activeOp?.sewingInQty}</div>
                                <div>Out: {activeOp?.sewingOutQty}</div>
                            </div>
                        </div>

                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
                            <div className="bg-amber-400 h-2 rounded-full transition-all" style={{ width: '50%' }}></div> 
                        </div>

                        <button onClick={handleFinishOP} className="w-full py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:border-rose-200 dark:hover:border-rose-900 transition-colors flex items-center justify-center gap-2">
                            <LogOut size={18}/> Finish Session
                        </button>
                    </div>

                    <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-4"><History size={14}/> Session Activity <Lock size={12} className="ml-auto"/></div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {sessionLogs.length === 0 && <div className="text-center text-slate-400 text-xs italic py-4">No activity yet.</div>}
                            {sessionLogs.map(log => (
                                <div key={log.id} className={`text-sm p-3 rounded-lg border flex justify-between items-center ${log.type === 'START' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'}`}>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-mono">{log.time}</div>
                                        <div className={`font-bold ${log.type === 'START' ? 'text-blue-600' : 'text-emerald-600'}`}>{log.type}</div>
                                    </div>
                                    <div className="text-lg font-bold dark:text-white">+{log.qty}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
         </>
       )}
    </div>
  );
};