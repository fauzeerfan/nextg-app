import React, { useState, useEffect } from 'react';
import { FileText, PlusCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { MaterialRequest } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

export const MaterialRequestView = ({ addLog }: { addLog: (msg: string, type?: 'info'|'error'|'success') => void }) => {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  // Form State
  const [formData, setFormData] = useState({ opId: '', partName: '', qty: 0, reason: '' });
  const [opList, setOpList] = useState<any[]>([]); // State untuk list OP
  
const [isSubmitting, setIsSubmitting] = useState(false);

// FETCH DATA (List MR & List OP)
const fetchRequests = async () => {
  try {
    const [reqRes, opRes] = await Promise.all([
      fetch(`${API_BASE_URL}/material-requests`),
      fetch(`${API_BASE_URL}/production-orders?station=CUTTING`)
    ]);

    if (reqRes.ok) {
      const data = await reqRes.json();
      setRequests(data.map((d: any) => ({
        id: d.reqNo,
        req_date: new Date(d.createdAt).toLocaleDateString(),
        op_number: d.opNumber,
        part_name: d.partName,
        qty_needed: d.qtyNeeded,
        reason: d.reason,
        status: d.status,
        requester: 'System'
      })));
    }

    if (opRes.ok) {
      const ops = await opRes.json();
      setOpList(ops);
    }
  } catch (err) {
    // handle error if needed
  }
};


  // 2. CHECK DRAFT ON LOAD
  useEffect(() => {
      fetchRequests();
      const draft = localStorage.getItem('nextg_mr_draft');
      if (draft) {
          const parsed = JSON.parse(draft);
          setFormData({
              opId: parsed.opId || '',
              partName: parsed.partName || '',
              qty: parsed.qty || 0,
              reason: parsed.reason || ''
          });
          localStorage.removeItem('nextg_mr_draft');
      }
  }, []);

  // 3. SUBMIT REQUEST
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const res = await fetch(`${API_BASE_URL}/material-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            addLog('Material Request Submitted', 'success');
            setFormData({ opId: '', partName: '', qty: 0, reason: '' });
            fetchRequests();
        }
    } catch (e) { addLog('Failed to submit', 'error'); }
    finally { setIsSubmitting(false); }
  };

  // 4. APPROVAL HANDLER
  const handleStatusChange = async (id: string, newStatus: string) => {
      if(!confirm(`Are you sure you want to ${newStatus} this request?`)) return;
      try {
          const res = await fetch(`${API_BASE_URL}/material-requests/${id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
              addLog(`MR ${newStatus}`, 'success');
              fetchRequests();
          }
      } catch (e) { addLog('Failed to update status', 'error'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
      {/* FORM */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-black dark:text-white">
            <PlusCircle className="text-purple-600" size={20}/> Form Pengajuan MR
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">OP Number (Auto/Select)</label>
              <select 
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white" 
                value={formData.opId} 
                onChange={e => setFormData({...formData, opId: e.target.value})}
              >
                <option value="">-- Select OP --</option>
                {/* List OP dari API */}
                {opList.map(op => <option key={op.id} value={op.id}>{op.opNumber}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Part Name</label><input type="text" className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white" value={formData.partName} onChange={e => setFormData({...formData, partName: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qty</label><input type="number" className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white" value={formData.qty} onChange={e => setFormData({...formData, qty: Number(e.target.value)})} /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label><input type="text" className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} /></div>
            </div>
            <button type="submit" disabled={isSubmitting || !formData.opId} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold">Submit to Warehouse</button>
          </form>
        </div>
      </div>

      {/* LIST & APPROVAL */}
      <div className="lg:col-span-8">
        <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                <FileText size={16}/> MR Queue & Approval
            </h3>
            <button onClick={fetchRequests} className="text-xs text-blue-600 hover:underline">Refresh</button>
          </div>
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/30">
                <div className="flex gap-4 items-center">
                   <div className={`p-2 rounded-full ${req.status==='APPROVED'?'bg-emerald-100 text-emerald-600':req.status==='REJECTED'?'bg-rose-100 text-rose-600':'bg-amber-100 text-amber-600'}`}>
                      <FileText size={18}/>
                   </div>
                   <div>
                      <div className="font-bold text-sm text-black dark:text-white">{req.id} | {req.op_number}</div>
                      <div className="text-xs text-slate-500">{req.part_name} • <b className="text-purple-600">{req.qty_needed} Pcs</b> ({req.reason})</div>
                   </div>
                </div>
                
                <div className="flex items-center gap-3">
                   {req.status === 'PENDING' ? (
                       <>
                         <button onClick={() => handleStatusChange(req.id, 'APPROVED')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"><ThumbsUp size={12}/> Approve</button>
                         <button onClick={() => handleStatusChange(req.id, 'REJECTED')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"><ThumbsDown size={12}/> Reject</button>
                       </>
                   ) : (
                       <span className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border ${req.status==='APPROVED'?'text-emerald-600 border-emerald-200':req.status==='REJECTED'?'text-rose-600 border-rose-200':'text-slate-500'}`}>
                           {req.status}
                       </span>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};