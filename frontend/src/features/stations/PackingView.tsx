import React, { useState, useEffect } from 'react';
import { Package, Loader2, CheckCircle, History, Lock, Search, XCircle } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY_OP = 'nextg_packing_active_op';
const STORAGE_KEY_LOGS = 'nextg_packing_logs';

interface PackingLog {
  id: string;
  time: string;
  qty: number;
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
    <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100">×</button>
  </div>
);

// --- COMPONENT: QUICK COUNTER ---
const QuickCounter = ({ value, onChange }: any) => {
    const handleAdd = (amount: number) => onChange(value + amount);
    return (
      <div className="p-6 rounded-xl border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10 transition-all">
        <div className="text-xs font-bold uppercase mb-3 opacity-70 text-blue-600 dark:text-blue-400">Sparsha Simulator Input</div>
        <input type="number" className="w-full text-6xl font-extrabold bg-transparent border-b-2 border-blue-100 dark:border-blue-900/30 outline-none text-blue-600 dark:text-blue-400 mb-6 py-2 text-center" value={value || ''} onChange={e => onChange(Number(e.target.value))} placeholder="0" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 5, 10, 50].map(num => (
            <button key={num} onClick={() => handleAdd(num)} className="py-3 rounded-xl font-bold text-sm shadow-sm active:scale-95 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:brightness-95 transition-all">+{num}</button>
          ))}
        </div>
      </div>
    );
};

export const PackingView = ({ addLog }: { addLog: (msg: string, type?: 'info'|'error'|'success') => void }) => {
  const [activeOpId, setActiveOpId] = useState<string>('');
  const [ops, setOps] = useState<ProductionOrder[]>([]);
  const [activeOp, setActiveOp] = useState<ProductionOrder | null>(null);
  const [qtyInput, setQtyInput] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<PackingLog[]>([]);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  
  const fetchOps = async () => {
    try {
      const [resPacking, resQC] = await Promise.all([
        fetch(`${API_BASE_URL}/production-orders?station=PACKING`),
        fetch(`${API_BASE_URL}/production-orders?station=QC`)
      ]);

      const dataPacking = await resPacking.json();
      const dataQC = await resQC.json();
      
      const rawOps = [...dataPacking, ...dataQC];

      const filteredOps = rawOps.filter((op: ProductionOrder) => {
          if (!op || !op.id) return false;
          const qcGood = op.qcGoodQty || 0;
          const packed = op.packedQty || 0;
          return qcGood > 0 && packed < qcGood;
      });

      const uniqueOps = Array.from(new Map(filteredOps.map(item => [item.id, item])).values());
      setOps(uniqueOps as ProductionOrder[]);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchOps(); }, []);

  useEffect(() => {
    const savedOp = localStorage.getItem(STORAGE_KEY_OP);
    if (savedOp) {
        try {
            const parsedOp = JSON.parse(savedOp);
            if (parsedOp?.id) {
                setActiveOp(parsedOp);
                setActiveOpId(parsedOp.id);
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

  const handleOpSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setActiveOpId(selectedId);
    
    if (selectedId) {
        const selected = ops.find(o => String(o.id) === String(selectedId));
        if (selected) {
            setActiveOp(selected);
            localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(selected));
            addLog(`Packing Ready: ${selected.opNumber}`, 'success');
            setQtyInput(0);
        }
    } else {
        setActiveOp(null);
        localStorage.removeItem(STORAGE_KEY_OP);
    }
  };

  const wipBalance = activeOp ? (activeOp.qcGoodQty - activeOp.packedQty) : 0;

  const handleSparshaInput = async () => {
    if (!activeOp || qtyInput <= 0) return;
    
    if (qtyInput > wipBalance) {
        alert(`Over Packing! Hanya tersedia ${wipBalance} pcs dari QC.`);
        return;
    }

    setIsLoading(true);
    try {
        const res = await fetch(`${API_BASE_URL}/station-logs/packing-input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opId: activeOp.id, qty: qtyInput })
        });

        if (res.ok) {
            const result = await res.json();
            
            const updatedOp = { ...activeOp, packedQty: result.newPackedQty };
            setActiveOp(updatedOp);
            localStorage.setItem(STORAGE_KEY_OP, JSON.stringify(updatedOp));
            
            setOps(prev => prev.map(o => o.id === updatedOp.id ? updatedOp : o));

            const newLog: PackingLog = {
                id: `P-${Date.now()}`,
                time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                qty: qtyInput
            };
            const updatedLogs = [newLog, ...sessionLogs];
            setSessionLogs(updatedLogs);
            localStorage.setItem(`${STORAGE_KEY_LOGS}_${activeOp.id}`, JSON.stringify(updatedLogs));

            showToast(`Packed: +${qtyInput} pcs`, 'success');
            setQtyInput(0);
        }
    } catch (error) {
        showToast('Failed to record packing', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  // NEW: HANDLE FINISH SESSION
  const handleFinishSession = async () => {
      if (!activeOp) return;
      if (!confirm("Finish Packing Session? Item will be moved to Finished Goods.")) return;

      setIsLoading(true);
      try {
          const res = await fetch(`${API_BASE_URL}/station-logs/packing-finish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ opId: activeOp.id })
          });

          if (res.ok) {
              showToast('Packing Finished. Moved to FG.', 'success');
              addLog(`Packing Finished: ${activeOp.opNumber}`, 'success');

              localStorage.removeItem(STORAGE_KEY_OP);
              setActiveOp(null);
              setActiveOpId('');
              setQtyInput(0);
              setSessionLogs([]);
              fetchOps(); 
          }
      } catch (error) {
          showToast('Error finishing session', 'error');
      } finally {
          setIsLoading(false);
      }
  };

  const handleChangeOp = () => {
    if(confirm("Switch OP?")) {
        localStorage.removeItem(STORAGE_KEY_OP);
        setActiveOp(null);
        setActiveOpId('');
        setQtyInput(0);
        setSessionLogs([]);
        fetchOps(); 
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* OP SELECTION */}
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
          <div className="flex-1 max-w-lg">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                <Search size={14}/> Select Order (From QC)
            </label>
            <select 
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-mono text-sm"
                value={activeOpId} 
                onChange={handleOpSelection}
            >
              <option value="">-- Select Active OP --</option>
              {ops.map(o => {
                  const ready = (o.qcGoodQty || 0) - (o.packedQty || 0);
                  return (
                    <option key={o.id} value={String(o.id)}>
                        {o.opNumber} - {o.styleCode} (Ready: {ready})
                    </option>
                  );
              })}
            </select>
          </div>
          
          {activeOp && (
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase">Target</div>
                    <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{activeOp.targetQty}</div>
                </div>
                <div className="text-right pl-6 border-l border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-bold text-slate-400 uppercase">QC Supply</div>
                    <div className="text-2xl font-bold text-amber-500">{activeOp.qcGoodQty}</div>
                </div>
                <div className="text-right pl-6 border-l border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-bold text-slate-400 uppercase">Packed Total</div>
                    <div className="text-2xl font-bold text-blue-600">{activeOp.packedQty}</div>
                </div>
            </div>
          )}
        </div>

        {activeOp ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                    <QuickCounter value={qtyInput} onChange={setQtyInput} />
                    <button onClick={handleSparshaInput} disabled={qtyInput <= 0 || isLoading} className="w-full mt-6 py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? <Loader2 className="animate-spin"/> : <><Package size={20}/> Submit Packing Result</>}
                    </button>
                </div>
                
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* PROGRESS CARD */}
                    <div className="flex flex-col justify-center items-center text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6">
                        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full mb-4"><CheckCircle size={32}/></div>
                        <h3 className="text-lg font-bold text-black dark:text-white mb-2">Ready for Delivery?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Move to Finished Goods when done.</p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((activeOp.packedQty / activeOp.targetQty) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 mt-2">{Math.round((activeOp.packedQty / activeOp.targetQty) * 100)}% Complete</span>
                        
                        {/* NEW: FINISH BUTTON */}
                        <button onClick={handleFinishSession} disabled={isLoading} className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
                            {isLoading ? <Loader2 className="animate-spin"/> : <><CheckCircle size={18}/> Finish Session</>}
                        </button>

                        <button onClick={handleChangeOp} className="mt-3 w-full py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                            Change Order
                        </button>
                    </div>

                    {/* LOGS */}
                    <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col max-h-[300px]">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-3"><History size={14}/> Recent Activity <Lock size={12} className="ml-auto"/></div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {sessionLogs.length === 0 && <div className="text-center text-slate-400 text-xs italic py-4">No activity yet.</div>}
                            {sessionLogs.map(log => (
                                <div key={log.id} className="text-sm p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10 flex justify-between items-center">
                                    <div className="text-[10px] text-slate-400 font-mono">{log.time}</div>
                                    <div className="font-bold text-blue-600 dark:text-blue-400">+{log.qty} Pcs</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400">
                <Package size={48} className="mx-auto mb-3 opacity-20"/>
                <p>Select an OP from QC Output to start packing.</p>
            </div>
        )}
      </div>
    </div>
  );
};