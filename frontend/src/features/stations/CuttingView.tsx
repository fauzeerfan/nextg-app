import { useState, useEffect } from 'react';
import { Scissors, Save, History, QrCode, CheckCircle, Printer, Clock } from 'lucide-react';
import type { ProductionOrder } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

export const CuttingView = ({ addLog }: { addLog: (msg: string, type?: 'info'|'error'|'success') => void }) => {
  const [viewMode, setViewMode] = useState<'WORK' | 'HISTORY'>('WORK');
  const [activeOpId, setActiveOpId] = useState<string>('');
  
  const [activeOps, setActiveOps] = useState<ProductionOrder[]>([]);
  const [historyOps, setHistoryOps] = useState<ProductionOrder[]>([]);
  
  const [formData, setFormData] = useState({ layNo: '', qty: 0 });
  const [isSaving, setIsSaving] = useState(false);
  
  // State QR Code (Dipakai untuk Auto Close maupun Reprint)
  const [generatedQR, setGeneratedQR] = useState<{code: string, op: string, isReprint?: boolean} | null>(null);

  const fetchActiveOps = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=CUTTING`);
      const data = await res.json();
      setActiveOps(data);
    } catch (err) { console.error(err); }
  };

  const fetchHistoryOps = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=CUTTING&view=history`);
      const data = await res.json();
      setHistoryOps(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (viewMode === 'WORK') fetchActiveOps();
    else fetchHistoryOps();
  }, [viewMode]);

  const selectedOp = activeOps.find(o => o.id === activeOpId);
  const progress = selectedOp ? Math.min(Math.round((selectedOp.cutQty / selectedOp.targetQty) * 100), 100) : 0;

  const handleSaveBatch = async () => {
    if (!selectedOp || !formData.qty) return;
    setIsSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/station-logs/cutting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opId: selectedOp.id,
          qty: Number(formData.qty),
          layNo: formData.layNo
        })
      });

      if (res.ok) {
        const result = await res.json();
        addLog(`Cut Saved: ${formData.qty} pcs`, 'success');
        setFormData({ layNo: '', qty: 0 });
        
        if (result.qrCode) {
          setGeneratedQR({ code: result.qrCode, op: selectedOp.opNumber });
          addLog(`OP FULL! Moved to History.`, 'success');
          setActiveOpId(''); 
          fetchActiveOps(); 
        } else {
          fetchActiveOps();
        }
      }
    } catch (err) {
      addLog('Failed to save cutting data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // FUNGSI REPRINT QR DARI HISTORY
  const handlePrintQR = (op: ProductionOrder) => {
    if (op.qrCode) {
        setGeneratedQR({ code: op.qrCode, op: op.opNumber, isReprint: true });
    } else {
        alert("QR Code not found for this OP.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* POPUP QR GENERATED / PRINT PREVIEW */}
      {generatedQR && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              {generatedQR.isReprint ? <Printer size={32} /> : <CheckCircle size={32} />}
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white mb-1">
                {generatedQR.isReprint ? 'Print QR Code' : 'Target Reached!'}
            </h3>
            <p className="text-slate-500 text-sm mb-6">
                {generatedQR.isReprint ? 'Scan this code at Checkpanel.' : 'OP moved to History tab.'}
            </p>
            
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl mb-6 border-2 border-dashed border-slate-300 dark:border-slate-700">
              <QrCode size={64} className="mx-auto text-black dark:text-white" />
              <div className="mt-2 font-mono font-bold text-lg text-slate-700 dark:text-slate-200">{generatedQR.code}</div>
              <div className="text-xs text-slate-400">{generatedQR.op}</div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setGeneratedQR(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Close</button>
              <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2">
                <Printer size={18}/> Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
        <button 
            onClick={() => setViewMode('WORK')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'WORK' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
            <Scissors size={16}/> Cutting Process
        </button>
        <button 
            onClick={() => setViewMode('HISTORY')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'HISTORY' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
            <Clock size={16}/> History & Print QR
        </button>
      </div>

      {/* --- VIEW: WORK / INPUT --- */}
      {viewMode === 'WORK' && (
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
            <div className="flex-1 max-w-md">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Active OP</label>
                <select 
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                value={activeOpId}
                onChange={(e) => setActiveOpId(e.target.value)}
                >
                <option value="">-- Select OP to Cut --</option>
                {activeOps.map(o => (
                    <option key={o.id} value={o.id}>{o.opNumber} - {o.styleCode}</option>
                ))}
                </select>
            </div>

            {selectedOp && (
                <div className="flex-1 grid grid-cols-3 gap-4 text-center md:text-left bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div><div className="text-xs text-slate-500 font-bold">TARGET</div><div className="text-xl font-bold text-black dark:text-white">{selectedOp.targetQty}</div></div>
                <div><div className="text-xs text-slate-500 font-bold">CUT BALANCE</div><div className="text-xl font-bold text-blue-600">{selectedOp.cutQty}</div></div>
                <div><div className="text-xs text-slate-500 font-bold">REMAINING</div><div className="text-xl font-bold text-orange-500">{Math.max(0, selectedOp.targetQty - selectedOp.cutQty)}</div></div>
                </div>
            )}
            </div>

            {selectedOp && (
            <div className="mb-8">
                <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-500">Completion Progress</span><span className="text-blue-600">{progress}%</span></div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
            </div>
            )}

            {selectedOp ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/30">
                    <h3 className="font-bold text-black dark:text-white mb-4 flex items-center gap-2"><Scissors size={18} className="text-blue-500"/> Input Result</h3>
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Lay Number</label><input type="text" placeholder="e.g. L-01" className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.layNo} onChange={e => setFormData({...formData, layNo: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Total Qty Cut</label><input type="number" placeholder="0" className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-black dark:text-white font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.qty || ''} onChange={e => setFormData({...formData, qty: Number(e.target.value)})} /><p className="text-[10px] text-slate-400 mt-1">* Input Gross Output (Good only)</p></div>
                        <button onClick={handleSaveBatch} disabled={!formData.qty || isSaving} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-md active:scale-95 flex justify-center items-center gap-2">{isSaving ? 'Saving...' : <><Save size={18}/> Submit Cut</>}</button>
                    </div>
                </div>
                </div>
                <div className="lg:col-span-7 flex flex-col">
                    <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-sm text-slate-500 flex items-center gap-2"><History size={16}/> Recent Logs</h3></div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-sm italic">History logs will appear here after integration with StationLog API.</div>
                </div>
            </div>
            ) : (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400">
                <Scissors size={48} className="mx-auto mb-3 opacity-20"/>
                <p>Select an active Order Production (OP) to start cutting.</p>
            </div>
            )}
        </div>
      )}

      {/* --- VIEW: HISTORY / COMPLETED --- */}
      {viewMode === 'HISTORY' && (
        <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-sm text-black dark:text-white">Completed Cutting Orders</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="px-6 py-4 font-bold">OP Number</th>
                            <th className="px-6 py-4 font-bold">Style</th>
                            <th className="px-6 py-4 font-bold text-right">Total Cut</th>
                            <th className="px-6 py-4 font-bold">QR Code</th>
                            <th className="px-6 py-4 text-right font-bold">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {historyOps.length === 0 && (
                            <tr><td colSpan={5} className="py-8 text-center text-slate-400 italic">No completed cutting orders yet.</td></tr>
                        )}
                        {historyOps.map(op => (
                            <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="px-6 py-4 font-bold text-black dark:text-white">{op.opNumber}</td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{op.styleCode}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{op.cutQty}</td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 rounded w-fit px-2 py-1 border border-slate-200 dark:border-slate-700">{op.qrCode || 'PENDING'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handlePrintQR(op)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                    >
                                        <Printer size={14}/> Print QR
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};