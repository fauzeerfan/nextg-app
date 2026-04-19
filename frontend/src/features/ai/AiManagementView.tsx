import React, { useState, useEffect } from 'react';
import { Bot, Plus, Edit, Trash2, Save, X, Search, Loader2, Hash, FileText, Navigation } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface Intent {
  id: string;
  triggerKeywords: string[];
  responseType: 'text' | 'dynamic' | 'report' | 'navigate';
  responseData: any;
  isActive: boolean;
  createdAt: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const AiManagementView = () => {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Intent | null>(null);
  const [form, setForm] = useState<any>({
    triggerKeywords: [],
    responseType: 'text',
    responseData: { text: '' },
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchIntents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/intents`, { headers: getAuthHeaders() });
      if (res.ok) setIntents(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIntents(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ triggerKeywords: [], responseType: 'text', responseData: { text: '' }, isActive: true });
    setModalOpen(true);
  };

  const openEdit = (intent: Intent) => {
    setEditing(intent);
    setForm({
      triggerKeywords: intent.triggerKeywords,
      responseType: intent.responseType,
      responseData: intent.responseData,
      isActive: intent.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.triggerKeywords.length) return;
    setSubmitting(true);
    try {
      const url = editing ? `${API_BASE_URL}/ai/intents/${editing.id}` : `${API_BASE_URL}/ai/intents`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        fetchIntents();
        setModalOpen(false);
      } else {
        alert('Failed to save');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this intent?')) return;
    try {
      await fetch(`${API_BASE_URL}/ai/intents/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      fetchIntents();
    } catch (error) {
      alert('Delete failed');
    }
  };

  const handleKeywordsChange = (val: string) => {
    setForm({ ...form, triggerKeywords: val.split(',').map(k => k.trim()).filter(k => k) });
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto font-poppins min-h-screen bg-slate-50 dark:bg-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        .font-poppins { font-family: 'Poppins', sans-serif; }
      `}</style>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/30">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">AI Management</h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Configure Feby AI Assistant intents and responses</p>
              </div>
            </div>
            <button onClick={openCreate} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700">
              <Plus size={16} /> Add Intent
            </button>
          </div>
        </div>
      </div>

      {/* Intents Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Keywords</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Response Data</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {intents.map(intent => (
                <tr key={intent.id} className="border-b border-slate-100 dark:border-slate-700">
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {intent.triggerKeywords.map(kw => (
                        <span key={kw} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{kw}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold">{intent.responseType}</td>
                  <td className="py-3 px-4 text-xs font-mono truncate max-w-xs">{JSON.stringify(intent.responseData)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-black ${intent.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {intent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button onClick={() => openEdit(intent)} className="p-1 text-blue-600"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(intent.id)} className="p-1 text-rose-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-black">{editing ? 'Edit Intent' : 'New Intent'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Trigger Keywords (comma separated)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border-2 rounded-xl"
                  value={form.triggerKeywords.join(', ')}
                  onChange={e => handleKeywordsChange(e.target.value)}
                  placeholder="ng hari ini, total ng, defect"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Response Type</label>
                <select
                  className="w-full px-4 py-2 border-2 rounded-xl"
                  value={form.responseType}
                  onChange={e => setForm({ ...form, responseType: e.target.value, responseData: {} })}
                >
                  <option value="text">Text</option>
                  <option value="dynamic">Dynamic Query</option>
                  <option value="report">Generate Report</option>
                  <option value="navigate">Navigate</option>
                </select>
              </div>
              {form.responseType === 'text' && (
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Response Text</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 border-2 rounded-xl"
                    value={form.responseData.text || ''}
                    onChange={e => setForm({ ...form, responseData: { text: e.target.value } })}
                  />
                </div>
              )}
              {form.responseType === 'dynamic' && (
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Query Name</label>
                  <select
                    className="w-full px-4 py-2 border-2 rounded-xl"
                    value={form.responseData.query || ''}
                    onChange={e => setForm({ ...form, responseData: { query: e.target.value } })}
                  >
                    <option value="">Select</option>
                    <option value="total_ng_today">Total NG Today</option>
                    <option value="total_output_today">Total Output Today</option>
                    <option value="defect_rate_today">Defect Rate Today</option>
                    <option value="wip_ops_count">WIP Ops Count</option>
                  </select>
                </div>
              )}
              {form.responseType === 'report' && (
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Report Type</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 rounded-xl"
                    value={form.responseData.reportType || ''}
                    onChange={e => setForm({ ...form, responseData: { reportType: e.target.value, text: `Saya akan membawa Anda ke laporan ${e.target.value}` } })}
                    placeholder="ng-pond-cp"
                  />
                </div>
              )}
              {form.responseType === 'navigate' && (
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Path</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 rounded-xl"
                    value={form.responseData.path || ''}
                    onChange={e => setForm({ ...form, responseData: { path: e.target.value, text: `Mengarahkan ke ${e.target.value}` } })}
                    placeholder="/reports"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-5 h-5" />
                  Active
                </label>
              </div>
            </div>
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2 border-2 rounded-xl font-bold">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};