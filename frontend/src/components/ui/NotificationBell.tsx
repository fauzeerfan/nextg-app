import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, XCircle, Loader2, Clock } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders, apiFetch } from '../../lib/api';

// Ikon Notifikasi untuk sidebar. Untuk sementara menampilkan request edit/hapus
// Cutting Report (approval). Approver (Administrator / user berwenang) bisa
// approve/tolak; user biasa melihat status request miliknya.
export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ isApprover: boolean; pendingCount: number; requests: any[] }>({
    isApprover: false, pendingCount: 0, requests: [],
  });
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchReqs = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/requests`, { headers: getAuthHeaders() });
      if (res.ok) setData(await res.json());
    } catch { /* diamkan */ }
  }, []);

  useEffect(() => {
    fetchReqs();
    const i = setInterval(fetchReqs, 30000);
    return () => clearInterval(i);
  }, [fetchReqs]);

  const review = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setActingId(id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/cutting-report/requests/${id}/review`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action }),
      });
      if (res.ok) await fetchReqs();
      else alert('Gagal memproses request');
    } catch { alert('Network error'); }
    finally { setActingId(null); }
  };

  const pendingOwn = data.requests.filter((r) => r.status === 'PENDING').length;
  const badge = data.isApprover ? data.pendingCount : pendingOwn;

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) fetchReqs(); }}
        title="Notifikasi"
        className="p-2.5 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Bell size={18} strokeWidth={2.5} />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)} />
          <div className="fixed z-[200] bottom-20 left-4 w-[92vw] max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="px-4 py-3 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-black"><Bell size={18} /> Notifikasi</div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20"><X size={16} /></button>
            </div>
            <div className="px-4 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              {data.isApprover ? 'Request approval Cutting Report' : 'Status request Anda'}
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
              {data.requests.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-bold text-sm">Belum ada notifikasi.</div>
              ) : data.requests.map((r) => (
                <div key={r.id} className={`rounded-xl border p-3 ${r.status === 'PENDING' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : r.status === 'APPROVED' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-xs text-slate-800 dark:text-white">Request {r.requestType === 'DELETE' ? 'Hapus' : 'Edit'} · {r.kodeForm}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${r.status === 'PENDING' ? 'bg-amber-200 text-amber-800 dark:bg-amber-800/60 dark:text-amber-200' : r.status === 'APPROVED' ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800/60 dark:text-emerald-200' : 'bg-rose-200 text-rose-800 dark:bg-rose-800/60 dark:text-rose-200'}`}>{r.status}</span>
                  </div>
                  {r.targetLabel && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{r.targetLabel}</div>}
                  {r.note && <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 italic">"{r.note}"</div>}
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={10} /> {new Date(r.createdAt).toLocaleString('id-ID')} · oleh {r.requestedByName}</div>
                  {data.isApprover && r.status === 'PENDING' && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => review(r.id, 'APPROVE')} disabled={actingId === r.id} className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-50">{actingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve</button>
                      <button onClick={() => review(r.id, 'REJECT')} disabled={actingId === r.id} className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-50"><XCircle size={12} /> Tolak</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
