import React, { useState, useEffect } from 'react';
import { Target, Save, Plus, Trash2, Edit, Calendar, Hash, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface TargetSetting {
  id: string;
  lineCode: string;
  station: string;
  indexValue: number;
  effectiveDate: string;
  note: string;
  isActive: boolean;   // <-- tambahkan
}

const stationOptions = [
  'CUTTING_ENTAN',
  'CUTTING_POND',
  'CP',
  'SEWING',
  'QC',
  'PACKING'
];

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const TargetManagementView = () => {
  const [targets, setTargets] = useState<TargetSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<TargetSetting | null>(null);
  const [form, setForm] = useState({ 
    lineCode: 'K1YH', 
    station: 'SEWING',
    indexValue: 125, 
    effectiveDate: new Date().toISOString().split('T')[0], 
    note: '',
    isActive: true   // <-- tambahkan
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/target-management`, { headers: getAuthHeaders() });
      if (res.ok) setTargets(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTargets(); }, []);

  const handleSubmit = async () => {
    if (!form.lineCode || !form.station || !form.indexValue || !form.effectiveDate) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const url = editing ? `${API_BASE_URL}/target-management/${editing.id}` : `${API_BASE_URL}/target-management`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Target ${editing ? 'updated' : 'created'} successfully` });
        fetchTargets();
        setEditing(null);
        setForm({ lineCode: 'K1YH', station: 'SEWING', indexValue: 125, effectiveDate: new Date().toISOString().split('T')[0], note: '', isActive: true });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Failed to save' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (t: TargetSetting) => {
    setEditing(t);
    setForm({
      lineCode: t.lineCode,
      station: t.station,
      indexValue: t.indexValue,
      effectiveDate: t.effectiveDate.split('T')[0],
      note: t.note || '',
      isActive: t.isActive,   // <-- tambahkan
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this target setting?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/target-management/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) {
        fetchTargets();
        setMessage({ type: 'success', text: 'Deleted' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Delete failed' });
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ lineCode: 'K1YH', station: 'SEWING', indexValue: 125, effectiveDate: new Date().toISOString().split('T')[0], note: '', isActive: true });
  };

  return (
    <div className="p-6 space-y-6 font-poppins">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Target size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Target Management</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Set production index (pcs/MP/day) per line & station</p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-8">
          <h3 className="font-black text-slate-800 dark:text-slate-200 mb-4">{editing ? 'Edit Target' : 'New Target Setting'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Line Code</label>
              <input type="text" className="w-full px-3 py-2 border-2 rounded-xl" value={form.lineCode} onChange={e => setForm({ ...form, lineCode: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Station</label>
              <select 
                className="w-full px-3 py-2 border-2 rounded-xl"
                value={form.station}
                onChange={e => setForm({ ...form, station: e.target.value })}
              >
                {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Index (pcs/MP/day)</label>
              <input type="number" step="0.1" className="w-full px-3 py-2 border-2 rounded-xl" value={form.indexValue} onChange={e => setForm({ ...form, indexValue: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Effective Date</label>
              <input type="date" className="w-full px-3 py-2 border-2 rounded-xl" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Note (optional)</label>
              <input type="text" className="w-full px-3 py-2 border-2 rounded-xl" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>

          {/* Toggle switch untuk isActive */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mt-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Target Status</label>
              <span className="text-sm font-semibold">{form.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2">
              {submitting ? 'Saving...' : <><Save size={16} /> {editing ? 'Update' : 'Create'}</>}
            </button>
            {editing && <button onClick={cancelEdit} className="px-5 py-2 bg-slate-200 rounded-xl font-bold">Cancel</button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50">
              <tr className="text-left text-xs font-bold uppercase">
                <th className="py-3 px-4">Line</th>
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4">Index</th>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Note</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {targets.map(t => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 font-mono font-bold">{t.lineCode}</td>
                  <td className="py-3 px-4">{t.station}</td>
                  <td className="py-3 px-4">{t.indexValue}</td>
                  <td className="py-3 px-4">{new Date(t.effectiveDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{t.note || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-black ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {t.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button onClick={() => handleEdit(t)} className="p-1 text-blue-600"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1 text-rose-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};