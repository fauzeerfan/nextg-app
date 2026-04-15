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
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto text-slate-800 dark:text-slate-100 font-poppins min-h-screen bg-slate-50 dark:bg-slate-900">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; }
        `}
      </style>

      {/* Header Card - Solid Theme */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            
            {/* Title Section */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30 text-white shrink-0">
                <Users size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Employee Master</h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Manage and organize your workforce efficiently</p>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search name or NIK..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-0 transition-all placeholder:text-slate-400 text-slate-900 dark:text-white"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button 
                onClick={openCreate} 
                className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
              >
                <Plus size={18} />
                <span>Add Employee</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-black tracking-wider">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading && employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                      <Loader2 size={28} className="animate-spin text-blue-600" />
                      <span className="font-bold text-sm">Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-700">
                        <Users size={28} className="text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="font-black text-slate-700 dark:text-slate-300">No employees found</p>
                      <p className="text-xs font-semibold text-slate-400">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black border border-slate-200 dark:border-slate-600 font-mono">
                        {emp.nik}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white whitespace-nowrap">{emp.fullName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{emp.gender || '-'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{emp.jobTitle || '-'}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{emp.lineCode || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {emp.station || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{emp.section || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                        {emp.department || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center gap-2">
                        <button 
                          onClick={() => openEdit(emp)} 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all active:scale-95"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(emp.id)} 
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-xl transition-all active:scale-95"
                          title="Delete"
                        >
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

      {/* Modal Overlay & Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-600/30">
                  {editing ? <FileEdit size={20} /> : <UserPlus size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {editing ? 'Edit Employee Details' : 'Register New Employee'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                    Fill in the data accurately to maintain the master list
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-400 rounded-xl transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                {/* Form Group NIK */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    NIK <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-bold outline-none transition-all ${editing ? 'bg-slate-100 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-0'}`}
                    value={form.nik} 
                    onChange={e => setForm({...form, nik: e.target.value})} 
                    disabled={!!editing} 
                    placeholder="Enter NIK number"
                  />
                </div>
                
                {/* Form Group Full Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-0 transition-all placeholder:text-slate-400"
                    value={form.fullName} 
                    onChange={e => setForm({...form, fullName: e.target.value})} 
                    placeholder="Enter full name"
                  />
                </div>
                
                {/* Form Group Gender */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Gender</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-0 transition-all appearance-none" 
                    value={form.gender || ''} 
                    onChange={e => setForm({...form, gender: e.target.value})}
                  >
                    <option value="" disabled className="text-slate-400">Select gender</option>
                    {genderOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                
                {/* Form Group Job Title */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Job Title</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-0 transition-all placeholder:text-slate-400"
                    value={form.jobTitle} 
                    onChange={e => setForm({...form, jobTitle: e.target.value})} 
                    placeholder="e.g. Operator"
                  />
                </div>

                {/* Form Group Department */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Department</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-0 transition-all appearance-none" 
                    value={form.department || ''} 
                    onChange={e => setForm({...form, department: e.target.value})}
                  >
                    <option value="" disabled className="text-slate-400">Select department</option>
                    {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Form Group Section */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Section</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-0 transition-all placeholder:text-slate-400"
                    value={form.section} 
                    onChange={e => setForm({...form, section: e.target.value})} 
                    placeholder="Enter section"
                  />
                </div>

                {/* Form Group Station */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Station</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-0 transition-all appearance-none" 
                    value={form.station || ''} 
                    onChange={e => setForm({...form, station: e.target.value})}
                  >
                    <option value="" disabled className="text-slate-400">Select station</option>
                    {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                {/* Form Group Line Code */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Line Code</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-0 transition-all placeholder:text-slate-400"
                    value={form.lineCode} 
                    onChange={e => setForm({...form, lineCode: e.target.value})} 
                    placeholder="e.g. L-01"
                  />
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col-reverse sm:flex-row gap-3 justify-end items-center">
              <button 
                onClick={() => setModalOpen(false)} 
                className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:border-slate-400 transition-all shadow-sm active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={submitting || !form.nik || !form.fullName} 
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 uppercase tracking-wider"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                <span>Save Employee</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};