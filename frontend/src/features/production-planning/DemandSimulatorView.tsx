import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Search, Download, Upload, Loader2, Calendar as CalendarIcon, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface PlannedOrder {
  id: string;
  itemNumberFG: string;
  styleCode: string | null;
  quantity: number;
  dueDate: string;
  priority: number;
  assignedLineCode: string | null;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const DemandSimulatorView = () => {
  const [orders, setOrders] = useState<PlannedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlannedOrder | null>(null);
  const [form, setForm] = useState({
    itemNumberFG: '',
    styleCode: '',
    quantity: 0,
    dueDate: new Date().toISOString().split('T')[0],
    priority: 2,
    assignedLineCode: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-planning/demand`, { headers: getAuthHeaders() });
      if (res.ok) setOrders(await res.json());
      else setMessage({ type: 'error', text: 'Failed to load data' });
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      itemNumberFG: '',
      styleCode: '',
      quantity: 0,
      dueDate: new Date().toISOString().split('T')[0],
      priority: 2,
      assignedLineCode: '',
      note: '',
    });
    setModalOpen(true);
  };

  const openEdit = (order: PlannedOrder) => {
    setEditing(order);
    setForm({
      itemNumberFG: order.itemNumberFG,
      styleCode: order.styleCode || '',
      quantity: order.quantity,
      dueDate: order.dueDate.split('T')[0],
      priority: order.priority,
      assignedLineCode: order.assignedLineCode || '',
      note: order.note || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.itemNumberFG || form.quantity <= 0) {
      setMessage({ type: 'error', text: 'Item FG and quantity required' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const url = editing ? `${API_BASE_URL}/production-planning/demand/${editing.id}` : `${API_BASE_URL}/production-planning/demand`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: editing ? 'Updated' : 'Created' });
        fetchOrders();
        setModalOpen(false);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this planned order?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/production-planning/demand/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) fetchOrders();
      else alert('Delete failed');
    } catch {
      alert('Network error');
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/production-planning/demand/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
        setMessage({ type: 'success', text: `Status updated to ${newStatus}` });
      } else {
        setMessage({ type: 'error', text: 'Failed to update status' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const exportCSV = async () => {
    window.open(`${API_BASE_URL}/production-planning/export/csv`, '_blank');
  };

  const filtered = orders.filter(o =>
    o.itemNumberFG.toLowerCase().includes(search.toLowerCase()) ||
    (o.styleCode && o.styleCode.toLowerCase().includes(search.toLowerCase()))
  );

  const priorityLabel = (p: number) => {
    if (p === 1) return <span className="text-rose-600 font-black">High</span>;
    if (p === 2) return <span className="text-amber-600 font-black">Medium</span>;
    return <span className="text-emerald-600 font-black">Low</span>;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-700',
      SIMULATED: 'bg-blue-100 text-blue-700',
      EXPORTED: 'bg-emerald-100 text-emerald-700',
    };
    return <span className={`px-2 py-1 rounded-md text-[10px] font-black ${colors[status] || colors.DRAFT}`}>{status}</span>;
  };

  return (
    <div className="p-6 space-y-6 font-poppins">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap'); .font-poppins { font-family: 'Poppins', sans-serif; }`}</style>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30">
              <CalendarIcon size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Demand Simulator</h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Input external demand for capacity simulation</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCSV} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2">
              <Plus size={16} /> Add Demand
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by FG or Style..." className="w-full pl-10 pr-4 py-2 border-2 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50">
              <tr className="text-left text-xs font-bold uppercase">
                <th className="py-3 px-4">FG Number</th><th className="py-3 px-4">Style</th><th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Due Date</th><th className="py-3 px-4">Priority</th><th className="py-3 px-4">Assigned Line</th>
                <th className="py-3 px-4">Status</th><th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center"><Loader2 className="animate-spin mx-auto" size={24} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-500">No planned orders</td></tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className="border-b border-slate-100">
                    <td className="py-3 px-4 font-mono font-bold">{order.itemNumberFG}</td>
                    <td className="py-3 px-4">{order.styleCode || '-'}</td>
                    <td className="py-3 px-4 font-black">{order.quantity}</td>
                    <td className="py-3 px-4">{new Date(order.dueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{priorityLabel(order.priority)}</td>
                    <td className="py-3 px-4">{order.assignedLineCode || '-'}</td>
                    <td className="py-3 px-4">{statusBadge(order.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(order)} className="p-1 text-blue-600" title="Edit">
                          <Edit size={16} />
                        </button>
                        {order.status === 'DRAFT' && (
                          <button onClick={() => updateStatus(order.id, 'SIMULATED')} className="p-1 text-amber-600" title="Mark as Simulated">
                            <TrendingUp size={16} />
                          </button>
                        )}
                        {(order.status === 'DRAFT' || order.status === 'SIMULATED') && (
                          <button onClick={() => updateStatus(order.id, 'EXPORTED')} className="p-1 text-emerald-600" title="Mark as Exported">
                            <Download size={16} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(order.id)} className="p-1 text-rose-600" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black">{editing ? 'Edit Demand' : 'New Demand'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs font-bold uppercase">FG Number *</label><input type="text" className="w-full px-3 py-2 border-2 rounded-xl" value={form.itemNumberFG} onChange={e => setForm({...form, itemNumberFG: e.target.value})} /></div>
              <div><label className="text-xs font-bold uppercase">Style Code</label><input type="text" className="w-full px-3 py-2 border-2 rounded-xl" value={form.styleCode} onChange={e => setForm({...form, styleCode: e.target.value})} /></div>
              <div><label className="text-xs font-bold uppercase">Quantity *</label><input type="number" className="w-full px-3 py-2 border-2 rounded-xl" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} /></div>
              <div><label className="text-xs font-bold uppercase">Due Date</label><input type="date" className="w-full px-3 py-2 border-2 rounded-xl" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} /></div>
              <div><label className="text-xs font-bold uppercase">Priority (1-3)</label><select className="w-full px-3 py-2 border-2 rounded-xl" value={form.priority} onChange={e => setForm({...form, priority: parseInt(e.target.value)})}><option value={1}>High</option><option value={2}>Medium</option><option value={3}>Low</option></select></div>
              <div><label className="text-xs font-bold uppercase">Assigned Line</label><input type="text" className="w-full px-3 py-2 border-2 rounded-xl" value={form.assignedLineCode} onChange={e => setForm({...form, assignedLineCode: e.target.value})} placeholder="e.g. K1YH" /></div>
              <div className="md:col-span-2"><label className="text-xs font-bold uppercase">Note</label><textarea rows={2} className="w-full px-3 py-2 border-2 rounded-xl" value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border-2 rounded-xl">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};