import React, { useState, useEffect } from 'react';
import { Search, Plus, Shield, Loader2, X, Save, User, Building, Briefcase, Edit3, Trash2 } from 'lucide-react';
import type { UserData, DepartmentData, JobTitleData } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

export const UserManagementView = () => {
  // UI State
  const [activeTab, setActiveTab] = useState<'USERS' | 'DEPTS' | 'JOBS'>('USERS');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Data State (Real Data Containers)
  const [users, setUsers] = useState<UserData[]>([]);
  const [rolesList, setRolesList] = useState<{id: string, name: string}[]>([]);
  const [depts, setDepts] = useState<DepartmentData[]>([]);
  const [jobs, setJobs] = useState<JobTitleData[]>([]);

  // Form State
  const [formData, setFormData] = useState<any>({});

  // --- 1. FETCH ALL MASTER DATA ---
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Parallel Request: Ambil semua data yang dibutuhkan sekaligus
      const [usersRes, rolesRes, deptsRes, jobsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users`),
        fetch(`${API_BASE_URL}/roles`),
        fetch(`${API_BASE_URL}/departments`),
        fetch(`${API_BASE_URL}/job-titles`)
      ]);

      if (rolesRes.ok) setRolesList(await rolesRes.json());
      if (deptsRes.ok) setDepts(await deptsRes.json());
      if (jobsRes.ok) setJobs(await jobsRes.json());

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const formattedUsers: UserData[] = usersData.map((u: any) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          email: u.email || '-',
          role: u.role?.name || 'NO_ROLE',
          roleId: u.roleId, // Penting untuk Edit
          department: u.department?.code || '-',
          departmentId: u.departmentId, // Penting untuk Edit
          jobTitle: u.jobTitle?.name || '-',
          jobTitleId: u.jobTitleId, // Penting untuk Edit
          status: u.isActive ? 'ACTIVE' : 'INACTIVE',
          lastLogin: 'N/A',
          avatarSeed: u.fullName
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error("Failed to fetch system data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 2. OPEN MODAL HANDLER ---
  const openModal = (item?: any) => {
    setIsEditMode(!!item);
    if (activeTab === 'USERS') {
      setFormData(item ? { ...item, password: '' } : { username: '', fullName: '', email: '', password: '', roleId: '', departmentId: '', jobTitleId: '' });
    } else if (activeTab === 'DEPTS') {
      setFormData(item || { code: '', name: '' });
    } else {
      setFormData(item || { name: '' });
    }
    setIsModalOpen(true);
  };

  // --- 3. SAVE HANDLER (Universal) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Tentukan Endpoint berdasarkan Tab Aktif
    let endpoint = '';
    if (activeTab === 'USERS') endpoint = 'users';
    else if (activeTab === 'DEPTS') endpoint = 'departments';
    else if (activeTab === 'JOBS') endpoint = 'job-titles';

    try {
      const url = isEditMode ? `${API_BASE_URL}/${endpoint}/${formData.id}` : `${API_BASE_URL}/${endpoint}`;
      const method = isEditMode ? 'PATCH' : 'POST';
      
      const payload = { ...formData };
      // Cleanup payload khusus user edit
      if (activeTab === 'USERS' && isEditMode && !payload.password) delete payload.password;
      
      // Kirim ke Backend
      const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Save failed');

      await fetchData(); // Refresh data setelah simpan
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save data. Please check input.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- 4. DELETE HANDLER ---
  const handleDelete = async (id: string) => {
      if(!window.confirm("Are you sure? This cannot be undone.")) return;
      
      let endpoint = '';
      if (activeTab === 'USERS') endpoint = 'users';
      else if (activeTab === 'DEPTS') endpoint = 'departments';
      else if (activeTab === 'JOBS') endpoint = 'job-titles';

      try {
          await fetch(`${API_BASE_URL}/${endpoint}/${id}`, { method: 'DELETE' });
          await fetchData();
      } catch (error) {
          console.error("Error deleting:", error);
      }
  };

  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#0f172a] p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
        {['USERS', 'DEPTS', 'JOBS'].map((tab) => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                {tab === 'USERS' ? <User size={16}/> : tab === 'DEPTS' ? <Building size={16}/> : <Briefcase size={16}/>}
                {tab === 'USERS' ? 'Users' : tab === 'DEPTS' ? 'Departments' : 'Job Titles'}
            </button>
        ))}
      </div>

      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder={`Search ${activeTab.toLowerCase()}...`} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={() => openModal()} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm active:scale-95">
          <Plus size={18} /> Add New
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        
        {isLoading ? (
           <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Loader2 className="animate-spin mb-2" size={32}/><p>Loading Data...</p></div>
        ) : (
           <>
             {/* USERS TABLE */}
             {activeTab === 'USERS' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                        <tr><th className="px-6 py-4 font-bold">User Profile</th><th className="px-6 py-4 font-bold">Role & Job</th><th className="px-6 py-4 font-bold">Department</th><th className="px-6 py-4 font-bold">Email</th><th className="px-6 py-4 font-bold">Status</th><th className="px-6 py-4 text-right font-bold">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}`} alt="avatar" className="h-full w-full object-cover"/></div>
                                    <div><div className="font-bold text-black dark:text-white">{user.fullName}</div><div className="text-xs text-slate-500 dark:text-slate-400">@{user.username}</div></div>
                                </div>
                            </td>
                            <td className="px-6 py-4"><div className="font-bold text-slate-700 dark:text-slate-300">{user.jobTitle}</div><div className="text-xs text-slate-500 flex items-center gap-1"><Shield size={10}/> {user.role.replace('_',' ')}</div></td>
                            <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900">{user.department}</span></td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">{user.email}</td>
                            <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${user.status==='ACTIVE'?'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800':'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${user.status==='ACTIVE'?'bg-emerald-500':'bg-slate-400'}`}></span>{user.status}</span></td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => openModal(user)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                                    <button onClick={() => handleDelete(user.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>
                                </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
             )}

             {/* DEPARTMENTS GRID */}
             {activeTab === 'DEPTS' && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {depts.map(dept => (
                        <div key={dept.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all bg-white dark:bg-[#0f172a] flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 dark:border-blue-800">{dept.code}</div>
                                <div><div className="font-bold text-black dark:text-white">{dept.name}</div></div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(dept)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit3 size={14}/></button>
                                <button onClick={() => handleDelete(dept.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
             )}

             {/* JOB TITLES GRID */}
             {activeTab === 'JOBS' && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {jobs.map(job => (
                        <div key={job.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all bg-white dark:bg-[#0f172a] flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <Briefcase size={18} className="text-slate-400"/>
                                <div className="font-bold text-black dark:text-white">{job.name}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(job)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit3 size={14}/></button>
                                <button onClick={() => handleDelete(job.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
             )}
           </>
        )}
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-black dark:text-white">{isEditMode ? 'Edit Data' : 'Add New Data'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-black dark:hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {activeTab === 'USERS' && (
                  <div className="space-y-6">
                    <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Identity</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Full Name</label><input required type="text" className="input-std" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Email Address</label><input required type="email" className="input-std" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                        </div>
                    </div>
                    <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Placement & Role</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Department</label><select className="input-std cursor-pointer" value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})}><option value="">-- Select Dept --</option>{depts.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Job Title</label><select className="input-std cursor-pointer" value={formData.jobTitleId} onChange={e => setFormData({...formData, jobTitleId: e.target.value})}><option value="">-- Select Job --</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">System Access</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">System Role</label><select required className="input-std cursor-pointer" value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})}><option value="">-- Select Role --</option>{rolesList.map(r => <option key={r.id} value={r.id}>{r.name.replace('_',' ')}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Username</label><input required type="text" className="input-std" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Password</label><input type="password" placeholder={isEditMode ? "Unchanged" : "Create password"} required={!isEditMode} className="input-std" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                        </div>
                    </div>
                  </div>
              )}
              {activeTab === 'DEPTS' && (
                  <div className="grid grid-cols-1 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">Dept Code</label><input required type="text" className="input-std font-mono uppercase" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} maxLength={3} /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">Department Name</label><input required type="text" className="input-std" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  </div>
              )}
              {activeTab === 'JOBS' && (
                  <div><label className="text-xs font-bold text-slate-500 mb-1 block">Job Title Name</label><input required type="text" className="input-std" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              )}
              <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-cancel flex-1">Cancel</button>
                <button type="submit" disabled={isSaving} className="btn-primary flex-1 flex items-center justify-center gap-2">{isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{` .input-std { @apply w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all; } .btn-primary { @apply py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm active:scale-95 disabled:opacity-70; } .btn-cancel { @apply py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors; } `}</style>
    </div>
  );
};