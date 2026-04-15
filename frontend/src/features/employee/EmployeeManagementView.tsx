import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Save, X, Search, Loader2, UserPlus, FileEdit } from 'lucide-react';

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
    <div className="p-6 max-w-[1600px] mx-auto text-slate-800 dark:text-slate-200">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-white to-blue-50/50 dark:from-slate-900 dark:to-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-6 overflow-hidden relative">
        {/* Decorative background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="p-6 md:p-8 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Title Section */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
                <Users size={28} strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Employee Master</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage and organize your workforce efficiently</p>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
              <div className="relative w-full sm:w-72 group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search name or NIK..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all placeholder:text-slate-400"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button 
                onClick={openCreate} 
                className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Add Employee</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">NIK</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Job Title</th>
                <th className="px-6 py-4">Line</th>
                <th className="px-6 py-4">Station</th>
                <th className="px-6 py-4">Section</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                      <Loader2 size={24} className="animate-spin text-blue-500" />
                      <span>Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-medium">No employees found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-medium border border-slate-200 dark:border-slate-700">
                        {emp.nik}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">{emp.fullName}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{emp.gender || '-'}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{emp.jobTitle || '-'}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{emp.lineCode || '-'}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{emp.station || '-'}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{emp.section || '-'}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                        {emp.department || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-center items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEdit(emp)} 
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(emp.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
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

      {/* Modal Overlay & Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
                  {editing ? <FileEdit size={20} /> : <UserPlus size={20} />}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editing ? 'Edit Employee Details' : 'Register New Employee'}
                </h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Form Group NIK */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">NIK <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-all ${editing ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                    value={form.nik} 
                    onChange={e => setForm({...form, nik: e.target.value})} 
                    disabled={!!editing} 
                    placeholder="Enter NIK number"
                  />
                </div>
                
                {/* Form Group Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Full Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    value={form.fullName} 
                    onChange={e => setForm({...form, fullName: e.target.value})} 
                    placeholder="Enter full name"
                  />
                </div>
                
                {/* Form Group Gender */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gender</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none" 
                    value={form.gender || ''} 
                    onChange={e => setForm({...form, gender: e.target.value})}
                  >
                    <option value="" disabled className="text-slate-400">Select gender</option>
                    {genderOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                
                {/* Form Group Job Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Job Title</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    value={form.jobTitle} 
                    onChange={e => setForm({...form, jobTitle: e.target.value})} 
                    placeholder="e.g. Operator"
                  />
                </div>

                {/* Form Group Department */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Department</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none" 
                    value={form.department || ''} 
                    onChange={e => setForm({...form, department: e.target.value})}
                  >
                    <option value="" disabled className="text-slate-400">Select department</option>
                    {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Form Group Section */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Section</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    value={form.section} 
                    onChange={e => setForm({...form, section: e.target.value})} 
                    placeholder="Enter section"
                  />
                </div>

                {/* Form Group Station */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Station</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none" 
                    value={form.station || ''} 
                    onChange={e => setForm({...form, station: e.target.value})}
                  >
                    <option value="" disabled className="text-slate-400">Select station</option>
                    {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                {/* Form Group Line Code */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Line Code</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    value={form.lineCode} 
                    onChange={e => setForm({...form, lineCode: e.target.value})} 
                    placeholder="e.g. L-01"
                  />
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col-reverse sm:flex-row gap-3 justify-end items-center">
              <button 
                onClick={() => setModalOpen(false)} 
                className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={submitting || !form.nik || !form.fullName} 
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                <span>Save Employee</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global styles for custom scrollbar (optional, but nice for modals) */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
      `}} />
    </div>
  );
};