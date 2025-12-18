import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowRight, Clock, Loader2, FileText, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { OpReplacement, ProductionOrder } from '../../types/production'; // Added ProductionOrder type import
import { NG_REASONS } from '../../lib/data';

const API_BASE_URL = 'http://localhost:3000';

export const OpPergantianView = ({ addLog }: { addLog: (msg: string, type?: 'info'|'error'|'success') => void }) => {
  const [replacements, setReplacements] = useState<OpReplacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ opId: '', qty: 0, reason: '' });
  const [opList, setOpList] = useState<ProductionOrder[]>([]); // Typed array

  // 1. FETCH DATA
  const fetchData = async () => {
    setIsLoading(true);
    try {
        // Fetch Replacements & OPs (QC + Sewing) parallel
        const [repRes, qcRes, sewingRes] = await Promise.all([
            fetch(`${API_BASE_URL}/op-replacements`),
            fetch(`${API_BASE_URL}/production-orders?station=QC`),
            fetch(`${API_BASE_URL}/production-orders?station=SEWING`)
        ]);

        if (repRes.ok) {
            const data = await repRes.json();
            setReplacements(data.map((d:any) => ({
                id: d.reqNo,
                req_date: new Date(d.createdAt).toLocaleDateString(),
                original_op: d.originalOp,
                new_op_identity: d.newOpIdentity,
                qty: d.qty,
                reason_ng: d.reasonNG,
                status: d.status,
                qc_inspector: 'QC System'
            })));
        }

        // Combine OP Data (Robust logic from QC View)
        const qcData = await qcRes.json();
        const sewingData = await sewingRes.json();
        const rawOps = [...qcData, ...sewingData];
        
        // Filter: Hanya OP yang punya output (sewingOutQty > 0) atau sudah di QC
        const validOps = rawOps.filter((op: ProductionOrder) => 
            (op.sewingOutQty || 0) > 0 || op.currentStation === 'QC'
        );

        // Remove duplicates
        const uniqueOps = Array.from(new Map(validOps.map((item: ProductionOrder) => [item.id, item])).values());
        setOpList(uniqueOps as ProductionOrder[]);
        
        console.log("OP List for Replacement:", uniqueOps);

    } catch (err) {
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  // 2. CHECK DRAFT ON LOAD
  useEffect(() => {
      fetchData();
      const draft = localStorage.getItem('nextg_opreq_draft');
      if (draft) {
          try {
            const parsed = JSON.parse(draft);
            // Validasi agar form tidak error
            setFormData({
                opId: parsed.opId || '',
                qty: Number(parsed.qty) || 0,
                reason: parsed.reason || ''
            });
            // Clear draft after loading
            localStorage.removeItem('nextg_opreq_draft');
          } catch (e) {
            console.error("Failed to parse draft", e);
          }
      }
  }, []);

  // 3. SUBMIT TO PPIC
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.opId) return;
      
      setIsSubmitting(true);
      try {
          const res = await fetch(`${API_BASE_URL}/op-replacements`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
          });
          
          if (res.ok) {
              const data = await res.json();
              addLog(`Replacement Req Submitted: ${data.reqNo}`, 'success');
              setFormData({ opId: '', qty: 0, reason: '' });
              fetchData(); // Refresh list
          } else {
              throw new Error('Failed to submit');
          }
      } catch (e) { 
          addLog('Error submitting request to PPIC', 'error'); 
      } finally {
          setIsSubmitting(false);
      }
  };

  // 4. PPIC APPROVAL HANDLER
  const handleStatusChange = async (id: string, newStatus: string) => {
      if(!confirm(`Set status to ${newStatus}?`)) return;
      try {
          const res = await fetch(`${API_BASE_URL}/op-replacements/${id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
              addLog(`OP Replacement ${newStatus}`, 'success');
              fetchData();
          }
      } catch (e) { addLog('Failed to update status', 'error'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
      {/* LEFT: FORM INPUT */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-lg">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-full"><RefreshCw size={20}/></div>
            <div>
                <h3 className="font-bold text-sm text-orange-800 dark:text-orange-300">Replacement Request</h3>
                <p className="text-xs text-orange-600/80 dark:text-orange-400/70">For QC Rejects (NG) only</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source OP</label>
                <select 
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    value={formData.opId} 
                    onChange={e => setFormData({...formData, opId: e.target.value})}
                >
                    <option value="">-- Select OP --</option>
                    {opList.map(op => (
                        <option key={op.id} value={op.id}>
                           {op.opNumber} {op.styleCode ? `(${op.styleCode})` : ''}
                        </option>
                    ))}
                </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NG Qty</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-black dark:text-white" 
                    // FIX: Handle 0 value for easier typing
                    value={formData.qty || ''} 
                    onChange={e => setFormData({...formData, qty: Number(e.target.value)})} 
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Defect Type</label>
                  <select
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white" 
                    value={formData.reason} 
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                  >
                      <option value="">Select...</option>
                      {NG_REASONS.map(ng => <option key={ng.id} value={ng.label}>{ng.label}</option>)}
                  </select>
              </div>
            </div>

            <button 
                type="submit" 
                disabled={isSubmitting || !formData.opId} 
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-md active:scale-95 flex justify-center items-center gap-2"
            >
                {isSubmitting ? <Loader2 className="animate-spin"/> : "Submit to PPIC"}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT: PPIC QUEUE & APPROVAL */}
      <div className="lg:col-span-8">
        <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                <FileText size={16}/> PPIC Queue & Status
            </h3>
            <button onClick={fetchData} className="text-xs text-blue-600 hover:underline">Refresh</button>
          </div>
          
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
                 <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400"/></div>
            ) : (
                replacements.map(rep => (
                <div key={rep.id} className="relative flex flex-col md:flex-row items-center justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 hover:shadow-sm transition-all">
                    
                    {/* Visual Alur */}
                    <div className="flex-1 flex items-center gap-6 w-full">
                        <div className="text-center min-w-[120px]">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Original OP</div>
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 line-through decoration-rose-500 decoration-2">{rep.original_op}</div>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center relative">
                            <div className="h-0.5 w-full bg-slate-200 dark:bg-slate-700 absolute top-1/2 -translate-y-1/2 z-0"></div>
                            <div className="z-10 bg-white dark:bg-slate-800 px-3 py-1 text-[10px] text-rose-500 font-bold border border-rose-200 dark:border-rose-900 rounded-full shadow-sm mb-1">
                                {rep.qty} NG
                            </div>
                            <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 z-10"/>
                            <div className="text-[10px] text-slate-400 mt-1 italic">{rep.reason_ng}</div>
                        </div>

                        <div className="text-center min-w-[140px]">
                            <div className="text-[10px] font-bold text-emerald-500 uppercase mb-1">New Identity</div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{rep.new_op_identity}</div>
                        </div>
                    </div>

                    {/* Status & Actions Panel */}
                    <div className="mt-4 md:mt-0 md:ml-8 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 pt-4 md:pt-0 md:pl-8 flex flex-col items-center min-w-[120px]">
                        {rep.status === 'SUBMITTED' ? (
                           <div className="flex flex-col gap-2 w-full">
                              <button 
                                onClick={() => handleStatusChange(rep.id, 'RELEASED')} 
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm"
                              >
                                <ThumbsUp size={12}/> Release
                              </button>
                              <button 
                                onClick={() => handleStatusChange(rep.id, 'REJECTED')} 
                                className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm"
                              >
                                <ThumbsDown size={12}/> Reject
                              </button>
                           </div>
                        ) : (
                           <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase mb-2 border ${
                              rep.status === 'RELEASED' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-amber-50 text-amber-700 border-amber-200'
                           }`}>
                              {rep.status}
                           </span>
                        )}
                        
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-2">
                            <Clock size={10}/> {rep.req_date}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">{rep.id}</div>
                    </div>
                </div>
                ))
            )}
            
            {!isLoading && replacements.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">No active replacement orders.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};