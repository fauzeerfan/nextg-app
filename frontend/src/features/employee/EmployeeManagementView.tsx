import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Save, X, Search, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface Employee {
  id: string;
  nik: string;
  fullName: string;
  gender: string;
  jobTitle: string;
  lineCode: string;
  station: string;
  section: string;
  department: string;
}

const genderOptions = ['Laki-laki', 'Perempuan'];
const stationOptions = ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'];
const departmentOptions = ['PROD', 'QC', 'SDC', 'PPI', 'SLS', 'HRD', 'PUR', 'GAF', 'FIA', 'RND', 'DIR'];

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const EmployeeManagementView = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  // Perubahan: initial gender, station, department menjadi string kosong (bukan default 'Laki-laki')
  const [form, setForm] = useState<Partial<Employee>>({
    nik: '', fullName: '', gender: '', jobTitle: '', lineCode: '', station: '', section: '', department: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employee`, { headers: getAuthHeaders() });
      if (res.ok) setEmployees(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.nik.includes(search)
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ nik: '', fullName: '', gender: '', jobTitle: '', lineCode: '', station: '', section: '', department: '' });
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ ...emp });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nik || !form.fullName) return;
    setSubmitting(true);
    try {
      const url = editing ? `${API_BASE_URL}/employee/${editing.id}` : `${API_BASE_URL}/employee`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        fetchEmployees();
        setModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employee?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/employee/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) fetchEmployees();
    } catch (error) {
      alert('Delete failed');
    }
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Employee Management</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Manage employee master data</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name or NIK..."
                  className="pl-9 pr-3 py-2 border-2 border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2">
                <Plus size={16} /> Add Employee
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="py-3 px-4 text-left">NIK</th>
                <th className="py-3 px-4 text-left">Full Name</th>
                <th className="py-3 px-4 text-left">Gender</th>
                <th className="py-3 px-4 text-left">Job Title</th>
                <th className="py-3 px-4 text-left">Line</th>
                <th className="py-3 px-4 text-left">Station</th>
                <th className="py-3 px-4 text-left">Section</th>
                <th className="py-3 px-4 text-left">Department</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                  <td className="py-2 px-4 font-mono">{emp.nik}</td>
                  <td className="py-2 px-4 font-medium">{emp.fullName}</td>
                  <td className="py-2 px-4">{emp.gender}</td>
                  <td className="py-2 px-4">{emp.jobTitle}</td>
                  <td className="py-2 px-4">{emp.lineCode}</td>
                  <td className="py-2 px-4">{emp.station}</td>
                  <td className="py-2 px-4">{emp.section}</td>
                  <td className="py-2 px-4">{emp.department}</td>
                  <td className="py-2 px-4 text-center">
                    <button onClick={() => openEdit(emp)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(emp.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded ml-1"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-slate-500">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">{editing ? 'Edit Employee' : 'Add Employee'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1"><X size={20} /></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium">NIK *</label><input type="text" className="w-full border rounded-lg p-2" value={form.nik} onChange={e => setForm({...form, nik: e.target.value})} disabled={!!editing} /></div>
              <div><label className="block text-xs font-medium">Full Name *</label><input type="text" className="w-full border rounded-lg p-2" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} /></div>
              
              {/* Gender dropdown dengan opsi kosong */}
              <div>
                <label className="block text-xs font-medium">Gender</label>
                <select className="w-full border rounded-lg p-2" value={form.gender || ''} onChange={e => setForm({...form, gender: e.target.value})}>
                  <option value="">- Pilih Gender -</option>
                  {genderOptions.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              
              <div><label className="block text-xs font-medium">Job Title</label><input type="text" className="w-full border rounded-lg p-2" value={form.jobTitle} onChange={e => setForm({...form, jobTitle: e.target.value})} /></div>
              <div><label className="block text-xs font-medium">Line Code</label><input type="text" className="w-full border rounded-lg p-2" value={form.lineCode} onChange={e => setForm({...form, lineCode: e.target.value})} /></div>
              
              {/* Station dropdown dengan opsi kosong */}
              <div>
                <label className="block text-xs font-medium">Station</label>
                <select className="w-full border rounded-lg p-2" value={form.station || ''} onChange={e => setForm({...form, station: e.target.value})}>
                  <option value="">- Pilih Station -</option>
                  {stationOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              
              <div><label className="block text-xs font-medium">Section</label><input type="text" className="w-full border rounded-lg p-2" value={form.section} onChange={e => setForm({...form, section: e.target.value})} /></div>
              
              {/* Department dropdown dengan opsi kosong */}
              <div>
                <label className="block text-xs font-medium">Department</label>
                <select className="w-full border rounded-lg p-2" value={form.department || ''} onChange={e => setForm({...form, department: e.target.value})}>
                  <option value="">- Pilih Department -</option>
                  {departmentOptions.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};