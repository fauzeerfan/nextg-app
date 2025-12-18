import React, { useState } from 'react';
import { Plus, Trash2, AlertTriangle, FilePlus, Database, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

export const PpcOrderView = ({ addLog }: { addLog: (msg: string, type?: 'info'|'error'|'success') => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    opNumber: '',
    styleCode: '',
    buyer: '',
    targetQty: 0
  });

  // 1. HANDLE CREATE OP
  const handleCreateOP = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.opNumber || !formData.targetQty) return;

    setIsLoading(true);
    try {
        const res = await fetch(`${API_BASE_URL}/production-orders/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if(res.ok) {
            addLog(`OP Created: ${formData.opNumber}`, 'success');
            alert(`Success! OP ${formData.opNumber} is now ready at Cutting Station.`);
            setFormData({ opNumber: '', styleCode: '', buyer: '', targetQty: 0 });
        } else {
            alert("Failed to create OP. Duplicate Number?");
        }
    } catch(e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  // 2. HANDLE RESET SYSTEM
  const handleResetSystem = async () => {
      const confirm1 = confirm("⚠️ DANGER ZONE: Are you sure you want to DELETE ALL PRODUCTION DATA?");
      if(!confirm1) return;
      
      const confirm2 = confirm("Double Check: This will wipe all OPs, Logs, MRs, and History. Users & Roles will remain. Proceed?");
      if(!confirm2) return;

      setIsLoading(true);
      try {
          const res = await fetch(`${API_BASE_URL}/production-orders/reset-all-data`, {
              method: 'DELETE'
          });
          
          if(res.ok) {
              addLog('SYSTEM RESET COMPLETED', 'success');
              alert("System has been reset to ZERO. You can start a new demo now.");
              // Clear local storage history
              localStorage.clear(); 
              window.location.reload();
          }
      } catch(e) {
          alert("Reset Failed.");
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       
       {/* HEADER */}
       <div className="p-6 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
               <Database className="text-blue-600"/> PPC Control Center
           </h2>
           <p className="text-slate-500 text-sm mt-1">Manage Order Injection and System Maintenance.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           
           {/* CARD 1: INJECT ORDER */}
           <div className="p-6 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
               <h3 className="font-bold text-black dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                   <FilePlus size={20} className="text-emerald-500"/> Inject New Order (Sim. CS Software)
               </h3>
               
               <form onSubmit={handleCreateOP} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">OP Number</label>
                           <input required type="text" className="input-std" placeholder="OP-2025-XXX" value={formData.opNumber} onChange={e => setFormData({...formData, opNumber: e.target.value})}/>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Style Code</label>
                           <input required type="text" className="input-std" placeholder="TYT-..." value={formData.styleCode} onChange={e => setFormData({...formData, styleCode: e.target.value})}/>
                       </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buyer</label>
                           <input type="text" className="input-std" placeholder="Toyota/Honda" value={formData.buyer} onChange={e => setFormData({...formData, buyer: e.target.value})}/>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Qty</label>
                           <input required type="number" className="input-std" placeholder="1000" value={formData.targetQty || ''} onChange={e => setFormData({...formData, targetQty: Number(e.target.value)})}/>
                       </div>
                   </div>
                   
                   <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                       {isLoading ? <Loader2 className="animate-spin"/> : <Plus size={18}/>} Inject to Cutting
                   </button>
               </form>
           </div>

           {/* CARD 2: DANGER ZONE */}
           <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm flex flex-col">
               <h3 className="font-bold text-rose-700 dark:text-rose-400 mb-4 flex items-center gap-2 border-b border-rose-200 dark:border-rose-800 pb-2">
                   <AlertTriangle size={20}/> Factory Reset
               </h3>
               
               {/* FIX: Mengubah <p> menjadi <div> agar valid HTML saat memuat <ul> */}
               <div className="text-sm text-rose-600/80 dark:text-rose-400/80 mb-6 flex-1">
                   This action will <b>DELETE ALL</b> transactional data including:
                   <ul className="list-disc pl-5 mt-2 space-y-1">
                       <li>Production Orders (OP)</li>
                       <li>All Station Logs (History)</li>
                       <li>Material Requests & OP Replacements</li>
                       <li>Finished Goods Stock</li>
                   </ul>
                   <br/>
                   <i>Note: Users, Roles, and Master Data (Dept/Job) will NOT be deleted.</i>
               </div>

               <button onClick={handleResetSystem} disabled={isLoading} className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md">
                    {isLoading ? <Loader2 className="animate-spin"/> : <Trash2 size={18}/>} RESET ALL DATA
               </button>
           </div>

       </div>

       <style>{`
        .input-std { @apply w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all; }
       `}</style>
    </div>
  );
};