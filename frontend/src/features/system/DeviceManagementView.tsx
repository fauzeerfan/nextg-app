import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu, Plus, Edit, Trash2, Save, X, Search, Loader2,
  RefreshCw, CheckCircle, XCircle, Activity, Wifi, Eye,
  AlertCircle, Hash, Tag, Server, Settings
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface IotDevice {
  id: string;
  deviceId: string;
  name: string;
  mode: string;
  station: string;
  lineCode: string;
  config: any;
  isActive: boolean;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
}

const stationOptions = [
  'CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'
];
const modeOptions = ['COUNTER', 'SCANNER'];

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const DeviceManagementView = () => {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IotDevice | null>(null);
  const [form, setForm] = useState<Partial<IotDevice>>({
    deviceId: '',
    name: '',
    mode: 'COUNTER',
    station: 'CUTTING_POND',
    lineCode: 'K1YH',
    config: {},
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/iot/devices`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      } else {
        console.error('Failed to fetch devices');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const filtered = devices.filter(d =>
    d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
    (d.name && d.name.toLowerCase().includes(search.toLowerCase())) ||
    d.station.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      deviceId: '',
      name: '',
      mode: 'COUNTER',
      station: 'CUTTING_POND',
      lineCode: 'K1YH',
      config: {},
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (device: IotDevice) => {
    setEditing(device);
    setForm({
      deviceId: device.deviceId,
      name: device.name,
      mode: device.mode,
      station: device.station,
      lineCode: device.lineCode,
      config: device.config || {},
      isActive: device.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.deviceId || !form.mode || !form.station || !form.lineCode) {
      setMessage({ type: 'error', text: 'Device ID, Mode, Station, Line Code are required' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const url = editing
        ? `${API_BASE_URL}/iot/device/${editing.id}`
        : `${API_BASE_URL}/iot/device`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Device ${editing ? 'updated' : 'created'} successfully` });
        fetchDevices();
        setModalOpen(false);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this device? It may affect IoT connectivity.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/iot/device/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchDevices();
        setMessage({ type: 'success', text: 'Device deleted' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Delete failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getStationBadgeColor = (station: string) => {
    const colors: Record<string, string> = {
      CUTTING_ENTAN: 'bg-orange-100 text-orange-700',
      CUTTING_POND: 'bg-amber-100 text-amber-700',
      CP: 'bg-emerald-100 text-emerald-700',
      SEWING: 'bg-purple-100 text-purple-700',
      QC: 'bg-blue-100 text-blue-700',
      PACKING: 'bg-indigo-100 text-indigo-700',
      FG: 'bg-cyan-100 text-cyan-700',
    };
    return colors[station] || 'bg-slate-100 text-slate-700';
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
              <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-600/30">
                <Cpu size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">IoT Device Management</h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Register and configure IoT devices (Sparsha / Dhristi)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchDevices}
                className="px-4 py-2 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold flex items-center gap-2 hover:border-cyan-500 transition-all"
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button
                onClick={openCreate}
                className="px-4 py-2 bg-cyan-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-cyan-700 transition-all shadow-md shadow-cyan-600/30"
              >
                <Plus size={16} /> Add Device
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by Device ID, Name, Station..."
              className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {message && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4">Line</th>
                <th className="py-3 px-4">Config</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading && devices.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center"><Loader2 className="animate-spin mx-auto" size={28} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-500">No devices found</td></tr>
              ) : (
                filtered.map(device => (
                  <tr key={device.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-white">{device.deviceId}</td>
                    <td className="py-3 px-4">{device.name || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-black ${device.mode === 'COUNTER' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {device.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-black ${getStationBadgeColor(device.station)}`}>
                        {device.station}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{device.lineCode}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-xs text-slate-500" title={JSON.stringify(device.config)}>
                      {device.config ? JSON.stringify(device.config).substring(0, 50) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {device.isActive ? (
                          <><CheckCircle size={14} className="text-emerald-500" /> <span className="text-emerald-600">Active</span></>
                        ) : (
                          <><XCircle size={14} className="text-rose-500" /> <span className="text-rose-600">Inactive</span></>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">{formatDate(device.lastSeen)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(device)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(device.id)} className="p-1 text-rose-600 hover:bg-rose-100 rounded" title="Delete">
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

      {/* Modal Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                  {editing ? <Edit size={20} className="text-white" /> : <Plus size={20} className="text-white" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{editing ? 'Edit IoT Device' : 'Register New IoT Device'}</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Configure device parameters</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Device ID *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border-2 rounded-xl bg-slate-50 dark:bg-slate-900"
                    value={form.deviceId}
                    onChange={e => setForm({ ...form, deviceId: e.target.value })}
                    placeholder="e.g. sparsha_pond_k1yh_001"
                    disabled={!!editing}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Name (optional)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border-2 rounded-xl bg-slate-50 dark:bg-slate-900"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Friendly name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mode *</label>
                  <select
                    className="w-full px-4 py-2.5 border-2 rounded-xl bg-slate-50 dark:bg-slate-900"
                    value={form.mode}
                    onChange={e => setForm({ ...form, mode: e.target.value })}
                  >
                    {modeOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Station *</label>
                  <select
                    className="w-full px-4 py-2.5 border-2 rounded-xl bg-slate-50 dark:bg-slate-900"
                    value={form.station}
                    onChange={e => setForm({ ...form, station: e.target.value })}
                  >
                    {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Line Code *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border-2 rounded-xl bg-slate-50 dark:bg-slate-900"
                    value={form.lineCode}
                    onChange={e => setForm({ ...form, lineCode: e.target.value.toUpperCase() })}
                    placeholder="K1YH"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Config (JSON)</label>
                  <textarea
                    className="w-full px-4 py-2.5 border-2 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono text-xs"
                    rows={3}
                    value={JSON.stringify(form.config || {}, null, 2)}
                    onChange={e => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setForm({ ...form, config: parsed });
                      } catch (err) {
                        // invalid JSON, keep as is but won't save
                      }
                    }}
                    placeholder='{"sewingIndex": 1}'
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm({ ...form, isActive: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-bold">Active</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 border-2 rounded-xl font-bold">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-md">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};