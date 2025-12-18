import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, Warehouse, Loader2, PackageCheck, Search, History } from 'lucide-react';
import type { ProductionOrder, FgStock } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

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

export const FinishedGoodsView = ({ addLog }: { addLog: (msg: string, type?: 'info'|'error'|'success') => void }) => {
  const [activeOpId, setActiveOpId] = useState<string>('');
  const [ops, setOps] = useState<ProductionOrder[]>([]);
  const [activeOp, setActiveOp] = useState<ProductionOrder | null>(null);
  
  const [customerQr, setCustomerQr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  
  // Real Stock Data State
  const [fgStocks, setFgStocks] = useState<FgStock[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchOps = async () => {
    try {
        // Ambil OP dari Packing & FG
        const [resPacking, resFG] = await Promise.all([
            fetch(`${API_BASE_URL}/production-orders?station=PACKING`),
            fetch(`${API_BASE_URL}/production-orders?station=FG`)
        ]);

        const dataPacking = await resPacking.json();
        const dataFG = await resFG.json();
        const rawOps = [...dataPacking, ...dataFG];

        // FIX FILTER: Tampilkan jika station sudah 'FG' ATAU jika di packing sudah ada hasil
        const filteredOps = rawOps.filter((op: ProductionOrder) => {
            if (!op || !op.id) return false;
            // Logic: Station == FG (dari manual finish) OR (Packed >= Target)
            const isReady = op.currentStation === 'FG' || (op.packedQty || 0) >= (op.targetQty || 1);
            const isNotClosed = op.status !== 'CLOSED_FG';
            return isReady && isNotClosed;
        });

        const uniqueOps = Array.from(new Map(filteredOps.map(item => [item.id, item])).values());
        setOps(uniqueOps as ProductionOrder[]);
    } catch (err) { console.error(err); }
  };

  // NEW: Fetch Real Stocks
  const fetchStocks = async () => {
      try {
          const res = await fetch(`${API_BASE_URL}/station-logs/fg-stocks`);
          if (res.ok) {
              setFgStocks(await res.json());
          }
      } catch (e) { console.error("Failed to load stocks"); }
  };

  useEffect(() => { 
      fetchOps();
      fetchStocks();
  }, []);

  useEffect(() => {
    if (activeOp && inputRef.current) {
        inputRef.current.focus();
    }
  }, [activeOp]);

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
            addLog(`FG Inbound Selected: ${selected.opNumber}`, 'success');
            setCustomerQr('');
          }
      } else {
          setActiveOp(null);
      }
  };

  const handleSubmitFG = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!customerQr || !activeOp) return;
      setIsLoading(true);

      try {
          const res = await fetch(`${API_BASE_URL}/station-logs/fg-submit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ opId: activeOp.id, customerQr })
          });

          if (res.ok) {
              showToast(`Success! ${activeOp.opNumber} moved to Stock.`, 'success');
              addLog(`FG Stocked: ${activeOp.opNumber}`, 'success');
              
              setActiveOp(null);
              setActiveOpId('');
              setCustomerQr('');
              
              fetchOps();
              fetchStocks(); // Refresh table stock
          } else {
              throw new Error('Failed to submit FG');
          }
      } catch (error) {
          showToast('Failed to stock FG. Check connection.', 'error');
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
             <div className="flex-1 max-w-lg">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Search size={14}/> Select Completed Packing
                </label>
                <select 
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-mono text-sm"
                    value={activeOpId}
                    onChange={handleOpSelection}
                >
                    <option value="">-- Select Ready for FG --</option>
                    {ops.map(o => (
                        <option key={o.id} value={String(o.id)}>
                            {o.opNumber} - {o.styleCode} (Qty: {o.packedQty})
                        </option>
                    ))}
                </select>
             </div>
             
             {activeOp && (
                <div className="flex items-center gap-6 text-right">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Style Code</div>
                        <div className="text-xl font-bold text-slate-700 dark:text-slate-200">{activeOp.styleCode}</div>
                    </div>
                    <div className="pl-6 border-l border-slate-200 dark:border-slate-700">
                        <div className="text-xs font-bold text-slate-400 uppercase">Total Qty</div>
                        <div className="text-2xl font-bold text-emerald-500">{activeOp.packedQty}</div>
                    </div>
                </div>
             )}
          </div>

          {activeOp ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 dark:border-slate-800 pt-8">
                <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <PackageCheck size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-black dark:text-white mb-2">Verification Required</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Please scan the <b>Customer Label / Box QR</b> to verify and close this order.
                    </p>
                </div>

                <div className="flex flex-col justify-center">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Customer QR / Box ID</label>
                    <form onSubmit={handleSubmitFG} className="relative">
                        <input 
                            ref={inputRef} 
                            type="text" 
                            className="w-full p-4 pl-12 rounded-xl border-2 border-purple-500 bg-white dark:bg-black text-xl font-mono text-center text-black dark:text-white outline-none shadow-lg focus:ring-4 focus:ring-purple-500/20 transition-all" 
                            placeholder="Scan Customer QR..." 
                            value={customerQr} 
                            onChange={e => setCustomerQr(e.target.value)} 
                            disabled={isLoading} 
                            autoFocus 
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500">
                            {isLoading ? <Loader2 className="animate-spin"/> : <Warehouse/>}
                        </div>
                    </form>
                    <div className="mt-4 flex justify-end">
                         <button onClick={() => {setActiveOp(null); setActiveOpId('');}} className="text-sm text-slate-400 hover:text-slate-600 underline">Cancel Selection</button>
                    </div>
                </div>
             </div>
          ) : (
             <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/30">
                 <Warehouse size={48} className="mb-3 opacity-20"/>
                 <p>Select a completed packing order to verify & stock in.</p>
             </div>
          )}
      </div>

      {/* REAL STOCK OVERVIEW */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
            <History size={16} className="text-slate-500"/>
            <h3 className="font-bold text-sm text-black dark:text-white">Current Inventory Overview (Real-time)</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                        <th className="px-6 py-3">Style Code</th>
                        <th className="px-6 py-3">Cust. Part No</th>
                        <th className="px-6 py-3 text-right">Total Stock</th>
                        <th className="px-6 py-3 text-right">Total Boxes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fgStocks.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-6 text-slate-400 italic">No inventory data yet.</td></tr>
                    )}
                    {fgStocks.map((stock, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-black dark:text-white">{stock.styleCode}</td>
                            <td className="px-6 py-4 text-slate-500 font-mono">{stock.customerPartNo}</td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600">{stock.totalStock}</td>
                            <td className="px-6 py-4 text-right text-blue-600">{stock.totalBoxes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};