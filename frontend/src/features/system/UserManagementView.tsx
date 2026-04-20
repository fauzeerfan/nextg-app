import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Edit, Save, Shield, Lock, Unlock, Mail, Building,
  CheckCircle, Eye, EyeOff, Key, Trash2, XCircle, Search,
  Calendar, Loader2, UserCheck, Target, TrendingUp, Star, AlertCircle,
  ArrowRight, UserCog, Hash, Layers
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface SystemUser {
  id: string; username: string; fullName: string; email: string; role: 'OPERATOR' | 'MANAGER' | 'ADMINISTRATOR';
  department?: string; jobTitle?: string; lineCode: string; isActive: boolean; lastLogin?: string; allowedStations: string[];
}

const deptOpts = [
  { code: 'AUT', name: 'Production Automotive' }, { code: 'NAT', name: 'Production Non Automotive' },
  { code: 'SDC', name: 'Management System Development and Control' }, { code: 'PPI', name: 'Production Planning and Inventory Control' },
  { code: 'SLS', name: 'Sales' }, { code: 'HRD', name: 'Human Resources and Development' }, { code: 'PUR', name: 'Purchasing' },
  { code: 'GAF', name: 'General Affairs' }, { code: 'FIA', name: 'Finance Accounting' }, { code: 'RND', name: 'Research and Development' },
  { code: 'DIR', name: 'Board of Directors' }
];
const jobOpts = [
  { code: 'OPR', name: 'Operator' }, { code: 'LDR', name: 'Leader' }, { code: 'KASI', name: 'Kepala Seksi' },
  { code: 'KABAG', name: 'Kepala Bagian' }, { code: 'MGR', name: 'Manager' }, { code: 'STF', name: 'Staff' }, { code: 'DIR', name: 'Director' }
];
const stationOpts = [
  { value: 'CUTTING_ENTAN', label: 'Cutting Entan' }, { value: 'CUTTING_POND', label: 'Cutting Pond' },
  { value: 'CP', label: 'Check Panel' }, { value: 'SEWING', label: 'Sewing' }, { value: 'QC', label: 'Quality Control' },
  { value: 'PACKING', label: 'Packing' }, { value: 'FG', label: 'Finished Goods' }
];

// --- MENU OPTIONS ---
const menuOptions = [
  { id: 'dashboard', label: 'Dashboard', category: 'Core' },
  { id: 'cutting_entan', label: 'Cutting Entan', category: 'Production' },
  { id: 'cutting_pond', label: 'Cutting Pond', category: 'Production' },
  { id: 'cp', label: 'Check Panel', category: 'Production' },
  { id: 'sewing', label: 'Sewing', category: 'Production' },
  { id: 'qc', label: 'Quality Control', category: 'Production' },
  { id: 'packing', label: 'Packing', category: 'Production' },
  { id: 'fg', label: 'Finished Goods', category: 'Production' },
  { id: 'target_monitoring', label: 'Target Monitoring', category: 'Monitoring' },
  { id: 'manpower_monitoring', label: 'Manpower Monitoring', category: 'Monitoring' },
  { id: 'login_monitoring', label: 'Login Monitoring', category: 'Monitoring' },
  { id: 'manpower_control', label: 'Manpower Control', category: 'Manpower' },
  { id: 'reports', label: 'Reports', category: 'Reports' },
  { id: 'traceability', label: 'Traceability', category: 'Reports' },
  { id: 'line_master', label: 'Line Master', category: 'Master Data' },
  { id: 'user_management', label: 'User Management', category: 'Master Data' },
  { id: 'employee_management', label: 'Employee Management', category: 'Master Data' },
  { id: 'target_management', label: 'Target Management', category: 'Master Data' },
  { id: 'device_management', label: 'Device Management', category: 'Master Data' },
  { id: 'ai_management', label: 'AI Management', category: 'Master Data' },
];

interface MetricCardProps {
  title: string;
  value: any;
  icon: any;
  color?: 'pink' | 'purple' | 'emerald' | 'blue';
  subtitle?: string;
  suffix?: string;
  trend?: string;
}

const MetricCard = ({ title, value, icon: Icon, color = 'pink', subtitle, suffix, trend }: MetricCardProps) => {
  const colorStyles = {
    pink: { border: 'border-pink-500', bg: 'bg-pink-100', icon: 'text-pink-600', darkBg: 'dark:bg-pink-900/40', darkIcon: 'dark:text-pink-400' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-100', icon: 'text-purple-600', darkBg: 'dark:bg-purple-900/40', darkIcon: 'dark:text-purple-400' },
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-100', icon: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/40', darkIcon: 'dark:text-emerald-400' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-100', icon: 'text-blue-600', darkBg: 'dark:bg-blue-900/40', darkIcon: 'dark:text-blue-400' }
  }[color];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${colorStyles.border} border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-9 h-9 ${colorStyles.bg} ${colorStyles.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={`${colorStyles.icon} ${colorStyles.darkIcon}`} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none flex items-baseline gap-1.5">
        {value}
        {suffix && <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{suffix}</span>}
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 flex flex-col gap-1.5">
          {subtitle && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">{subtitle}</div>}
          {trend && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 w-fit px-2 py-0.5 rounded-md">
              <TrendingUp size={10} />
              <span>{trend}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const UserManagementView = () => {
  const [us, setUs] = useState<SystemUser[]>([]);
  const [sel, setSel] = useState<SystemUser | null>(null);
  const [edit, setEdit] = useState(false);
  const [create, setCreate] = useState(false);
  const [q, setQ] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [chPw, setChPw] = useState(false);
  const [load, setLoad] = useState(false);
  const [lineOpts, setLineOpts] = useState<string[]>([]);
  const [f, setF] = useState({
    username: '', fullName: '', email: '', role: 'OPERATOR' as SystemUser['role'],
    department: '', jobTitle: '', lineCode: '', isActive: true,
    allowedStations: [] as string[],
    allowedMenus: [] as string[],
    password: ''
  });

  useEffect(() => { fetchUsers(); fetchLines(); }, []);
  const fetchLines = async () => { try { const res = await fetch(`${API_BASE_URL}/line-masters`); if (res.ok) setLineOpts((await res.json()).map((l: any) => l.code)); } catch { console.error('Failed to fetch lines'); } };
  const fetchUsers = async () => { setLoad(true); try { const res = await fetch(`${API_BASE_URL}/users`); setUs(await res.json()); } catch { alert('Gagal load user'); } finally { setLoad(false); } };

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f8fafc`;
  };

  const filtered = us.filter(u => u?.username?.toLowerCase().includes(q.toLowerCase()) || u?.fullName?.toLowerCase().includes(q.toLowerCase()) || u?.email?.toLowerCase().includes(q.toLowerCase()) || u?.role?.toLowerCase().includes(q.toLowerCase()));

  const total = us.length;
  const active = us.filter(u => u?.isActive).length;
  const opCnt = us.filter(u => u?.role === 'OPERATOR').length;
  const admCnt = us.filter(u => u?.role === 'ADMINISTRATOR').length;
  const mgrCnt = us.filter(u => u?.role === 'MANAGER').length;

  const select = (u: SystemUser) => { setSel(u); setEdit(false); setCreate(false); };
  const newUser = () => {
    setF({ username: '', fullName: '', email: '', role: 'OPERATOR', department: '', jobTitle: '', lineCode: '', isActive: true, allowedStations: [], allowedMenus: [], password: 'password123' });
    setChPw(false); setSel(null); setCreate(true); setEdit(true);
  };
  const editUser = () => {
    if (sel) setF({
      username: sel.username, fullName: sel.fullName, email: sel.email || '', role: sel.role,
      department: sel.department || '', jobTitle: sel.jobTitle || '', lineCode: sel.lineCode || '',
      isActive: sel.isActive ?? true,
      allowedStations: sel.allowedStations || [],
      allowedMenus: (sel as any).allowedMenus || [],
      password: ''
    });
    setChPw(false); setEdit(true); setCreate(false);
  };
  const saveUser = async () => {
    if (!f.username || !f.fullName) return alert('Username & Full Name wajib');
    setLoad(true);
    try {
      const payload: any = {
        username: f.username, fullName: f.fullName, email: f.email, role: f.role,
        department: f.department, jobTitle: f.jobTitle, lineCode: f.lineCode,
        allowedStations: f.allowedStations, allowedMenus: f.allowedMenus, isActive: f.isActive
      };
      if (create) payload.password = f.password || '123456';
      else if (chPw && f.password) payload.password = f.password;
      const url = create ? `${API_BASE_URL}/users` : `${API_BASE_URL}/users/${sel?.id}`;
      await fetch(url, { method: create ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await fetchUsers(); setEdit(false); setCreate(false); setSel(null);
    } catch { alert('Gagal save user'); } finally { setLoad(false); }
  };
  const delUser = async (id: string) => { if (!confirm('Hapus user?')) return; try { await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' }); await fetchUsers(); setSel(null); } catch { alert('Gagal hapus'); } };
  const toggleStatus = async (id: string) => setUs(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));

  const roleBg = (r: string) => r === 'ADMINISTRATOR' ? 'bg-purple-100 dark:bg-purple-900/40' : r === 'MANAGER' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40';
  const roleTxt = (r: string) => r === 'ADMINISTRATOR' ? 'text-purple-700 dark:text-purple-400' : r === 'MANAGER' ? 'text-blue-700 dark:text-blue-400' : 'text-emerald-700 dark:text-emerald-400';
  const roleBorder = (r: string) => r === 'ADMINISTRATOR' ? 'border-purple-200 dark:border-purple-800' : r === 'MANAGER' ? 'border-blue-200 dark:border-blue-800' : 'border-emerald-200 dark:border-emerald-800';
  
  const deptName = (c: string) => deptOpts.find(d => d.code === c)?.name || c;
  const jobName = (c: string) => jobOpts.find(j => j.code === c)?.name || c;

  if (load && !us.length) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 font-poppins">
      <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Loading System Users</h3>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Please wait while we fetch the data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 lg:p-5 space-y-5 font-poppins text-slate-800 dark:text-slate-100">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
        `}
      </style>

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-600/30">
                  <Users size={24} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md">
                  <Shield size={10} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  User Management
                  <span className="text-[11px] px-2 py-1 bg-pink-600 text-white rounded-md font-bold uppercase tracking-wider">
                    Access Control
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Manage system accounts, roles, and station permissions.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-none">
                <div className="flex flex-col">
                  <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Active Users</div>
                  <div className="text-xl font-black leading-none">{active}<span className="text-slate-400 text-sm mx-1">/</span>{total}</div>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <UserCheck size={18} className="text-emerald-400" />
                </div>
              </div>
              <button
                onClick={newUser}
                disabled={load}
                className="group px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 text-sm"
              >
                <UserPlus size={16} />
                Create New User
              </button>
            </div>
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 py-5 bg-slate-50/50 dark:bg-slate-800/50">
          <MetricCard title="Total Users" value={total} icon={Users} color="pink" suffix="users" subtitle={`${active} currently active`} />
          <MetricCard title="Operators" value={opCnt} icon={UserCheck} color="emerald" suffix="active" subtitle="Station operators" />
          <MetricCard title="Administrators" value={admCnt} icon={Star} color="purple" suffix="users" subtitle="Full system access" />
          <MetricCard title="Managers" value={mgrCnt} icon={UserCog} color="blue" suffix="users" subtitle="Management level" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* LEFT COLUMN - USER TABLE */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden sticky top-6 flex flex-col h-[calc(100vh-140px)]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center shadow-md shadow-pink-600/30">
                    <Users size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">Directory</h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{filtered.length} records found</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-lg">
                  {active} Active
                </span>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-9 pr-4 py-2 text-sm font-semibold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:border-pink-500 focus:ring-0 transition-all outline-none"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Table View */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Line</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filtered.map(u => {
                      const isSel = sel?.id === u.id;
                      return (
                        <tr
                          key={u.id}
                          className={`cursor-pointer transition-colors ${
                            isSel
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-600'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                          onClick={() => select(u)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <img
                                  src={getAvatarUrl(u.username)}
                                  alt={u.fullName}
                                  className={`w-8 h-8 rounded-lg object-cover ${
                                    isSel ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : 'bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                                  }`}
                                />
                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full border-2 border-white dark:border-slate-800`} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-slate-900 dark:text-white truncate leading-tight">{u.fullName}</div>
                                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${roleBg(u.role)} ${roleTxt(u.role)} ${roleBorder(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`flex items-center gap-1.5 ${u.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {u.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                              <span className="text-[11px] font-bold">{u.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-md">
                              {u.lineCode || 'None'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {u.lastLogin 
                                ? new Date(u.lastLogin).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                : 'Never'
                              }
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {filtered.length === 0 && (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 m-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100 dark:border-slate-700">
                    <Search size={20} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No Users Found</h4>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-5">
                    {q ? `No matches for "${q}"` : "Your directory is empty."}
                  </p>
                  {!q && (
                    <button
                      onClick={newUser}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 mx-auto hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
                    >
                      <UserPlus size={14} /> Add User
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - USER DETAIL / FORM */}
        <div className="lg:col-span-3">
          {sel && !edit ? (
            // VIEW MODE
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">
              <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="p-1 bg-white dark:bg-slate-700 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600">
                        <img
                          src={getAvatarUrl(sel.username)}
                          alt={sel.fullName}
                          className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 object-cover"
                        />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 ${sel.isActive ? 'bg-emerald-500' : 'bg-rose-500'} text-white text-[9px] font-black uppercase tracking-wider rounded-md border-2 border-white dark:border-slate-800 shadow-sm flex items-center gap-1`}>
                        {sel.isActive ? <CheckCircle size={10} /> : <Lock size={10} />}
                        {sel.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{sel.fullName}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">@{sel.username}</span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                          <Mail size={12} className="text-slate-400" />
                          {sel.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                      onClick={editUser}
                      className="flex-1 md:flex-none px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-600 transition-all text-sm shadow-md active:scale-95"
                    >
                      <Edit size={14} /> Edit Profile
                    </button>
                    <button
                      onClick={() => toggleStatus(sel.id)}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm border-2 active:scale-95 ${sel.isActive
                          ? 'bg-white dark:bg-slate-800 text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                          : 'bg-white dark:bg-slate-800 text-emerald-600 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                        }`}
                    >
                      {sel.isActive ? <><Lock size={14} /> Suspend</> : <><Unlock size={14} /> Activate</>}
                    </button>
                    <button
                      onClick={() => delUser(sel.id)}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl hover:text-rose-600 hover:border-rose-200 dark:hover:text-rose-400 dark:hover:border-rose-900/50 transition-all active:scale-95"
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6">
                {/* Profile Grid Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 font-bold">
                        <Shield size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">System Role</p>
                    </div>
                    <p className="font-black text-sm text-slate-900 dark:text-white mt-1 truncate pl-11">{sel.role}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold">
                        <Building size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Department</p>
                    </div>
                    <p className="font-black text-sm text-slate-900 dark:text-white mt-1 truncate pl-11" title={sel.department ? deptName(sel.department) : 'Not assigned'}>
                      {sel.department ? deptName(sel.department) : 'Not assigned'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-600 dark:text-purple-400 font-bold">
                        <UserCheck size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Job Title</p>
                    </div>
                    <p className="font-black text-sm text-slate-900 dark:text-white mt-1 truncate pl-11">
                      {sel.jobTitle ? jobName(sel.jobTitle) : 'Unspecified'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400 font-bold">
                        <Target size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Line Code</p>
                    </div>
                    <p className="font-black text-sm text-slate-900 dark:text-white mt-1 pl-11">
                      {sel.lineCode || 'None'}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 shadow-sm mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-100 dark:bg-pink-900/40 rounded-xl text-pink-600 dark:text-pink-400 font-bold">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Last System Access</p>
                        <p className="font-black text-sm text-slate-900 dark:text-white mt-0.5">
                          {sel.lastLogin ? new Date(sel.lastLogin).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : 'Never logged in yet'}
                        </p>
                      </div>
                  </div>
                </div>

                {/* Stations Details */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Station Access Rights</h3>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">User is granted access to {(sel.allowedStations?.length || 0)} production stations.</p>
                    </div>
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-600/30">
                      <Key size={16} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {stationOpts.map(o => {
                      const has = (sel.allowedStations || []).includes(o.value);
                      return (
                        <div
                          key={o.value}
                          className={`p-3 rounded-xl border-2 transition-all ${has
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={`p-1.5 rounded-lg ${has ? 'bg-blue-200 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                              <Target size={14} />
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${has ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                {has ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            </div>
                          </div>
                          <div className={`font-black text-[11px] leading-tight ${has ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{o.label}</div>
                          <div className={`text-[9px] font-bold mt-1 uppercase ${has ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>{o.value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Menu Access Rights */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Menu Access Rights</h3>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">User has access to {((sel as any).allowedMenus?.length || 0)} menus.</p>
                    </div>
                    <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-600/30">
                      <Layers size={16} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                    {menuOptions.map(menu => {
                      const has = ((sel as any).allowedMenus || []).includes(menu.id);
                      return (
                        <div
                          key={menu.id}
                          className={`p-3 rounded-xl border-2 transition-all ${has
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={`p-1.5 rounded-lg ${has ? 'bg-emerald-200 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                              <Layers size={14} />
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${has ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                {has ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            </div>
                          </div>
                          <div className={`font-black text-[11px] leading-tight ${has ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{menu.label}</div>
                          <div className={`text-[9px] font-bold mt-1 uppercase ${has ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{menu.category}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : edit ? (
            // EDIT/CREATE MODE
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">
              <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                      {create ? <UserPlus size={20} className="text-white" /> : <Edit size={20} className="text-white" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {create ? 'Create New Account' : `Update Account`}
                      </h2>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                        {create ? 'Fill in the details to create a new system user.' : `Editing information for @${sel?.username}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <button
                      onClick={() => { setEdit(false); setCreate(false); if (sel) setF({ username: sel.username, fullName: sel.fullName, email: sel.email || '', role: sel.role, department: sel.department || '', jobTitle: sel.jobTitle || '', lineCode: sel.lineCode || '', isActive: sel.isActive ?? true, allowedStations: sel.allowedStations || [], allowedMenus: (sel as any).allowedMenus || [], password: '' }); }}
                      className="flex-1 lg:flex-none px-5 py-2.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:border-slate-400 transition-all text-sm shadow-sm active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveUser}
                      disabled={load}
                      className="flex-1 lg:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm shadow-lg shadow-blue-600/30 active:scale-95 uppercase tracking-wider"
                    >
                      {load ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {create ? 'Save User' : 'Update User'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-8">
                {/* Form Section: Basic Profile */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">1</div>
                    Basic Profile
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-10">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Username <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-0 rounded-xl text-slate-900 dark:text-white transition-all outline-none"
                        value={f.username}
                        onChange={e => setF({ ...f, username: e.target.value })}
                        placeholder="e.g. jdoe123"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-0 rounded-xl text-slate-900 dark:text-white transition-all outline-none"
                        value={f.fullName}
                        onChange={e => setF({ ...f, fullName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail size={16} className="text-slate-400 font-bold" />
                        </div>
                        <input
                          type="email"
                          className="w-full pl-11 pr-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-0 rounded-xl text-slate-900 dark:text-white transition-all outline-none"
                          value={f.email}
                          onChange={e => setF({ ...f, email: e.target.value })}
                          placeholder="john@company.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        System Role <span className="text-rose-500">*</span>
                      </label>
                      <select
                        className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-0 rounded-xl text-slate-900 dark:text-white transition-all outline-none appearance-none"
                        value={f.role}
                        onChange={e => setF({ ...f, role: e.target.value as SystemUser['role'] })}
                      >
                        <option value="OPERATOR">Operator</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMINISTRATOR">Administrator</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Form Section: Organizational Info */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">2</div>
                    Organization
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-10">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Department</label>
                      <select
                        className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-purple-500 focus:ring-0 rounded-xl text-slate-900 dark:text-white transition-all outline-none appearance-none"
                        value={f.department || ''}
                        onChange={e => setF({ ...f, department: e.target.value })}
                      >
                        <option value="">-- Select Department --</option>
                        {deptOpts.map(d => (
                          <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Job Title</label>
                      <select
                        className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-purple-500 focus:ring-0 rounded-xl text-slate-900 dark:text-white transition-all outline-none appearance-none"
                        value={f.jobTitle || ''}
                        onChange={e => setF({ ...f, jobTitle: e.target.value })}
                      >
                        <option value="">-- Select Job Title --</option>
                        {jobOpts.map(j => (
                          <option key={j.code} value={j.code}>{j.code} - {j.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Line Assignment</label>
                      <select
                        className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-purple-500 focus:ring-0 rounded-xl text-slate-900 dark:text-white transition-all outline-none appearance-none"
                        value={f.lineCode || ''}
                        onChange={e => setF({ ...f, lineCode: e.target.value })}
                      >
                        <option value="">-- No Line Assigned --</option>
                        {lineOpts.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Account Status</label>
                      <select
                        className={`w-full px-4 py-3 text-sm font-black border-2 rounded-xl focus:outline-none focus:ring-0 transition-all appearance-none ${f.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 focus:border-emerald-500'
                            : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 focus:border-rose-500'
                          }`}
                        value={f.isActive ? 'active' : 'inactive'}
                        onChange={e => setF({ ...f, isActive: e.target.value === 'active' })}
                      >
                        <option value="active">🟢 Active User</option>
                        <option value="inactive">🔴 Suspended / Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Form Section: Access Control & Security */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">3</div>
                      Security
                    </h3>
                    <div className="pl-10">
                      {create ? (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                            Initial Password <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPw ? "text" : "password"}
                              className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:ring-0 transition-all pr-12 outline-none"
                              placeholder="Min. 8 characters"
                              value={f.password}
                              onChange={e => setF({ ...f, password: e.target.value })}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                              onClick={() => setShowPw(!showPw)}
                            >
                              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <div className="mt-3 flex items-start gap-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                            <span>If left blank, password defaults to <strong className="font-black underline">password123</strong></span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm transition-colors hover:border-amber-400">
                            <input
                              type="checkbox"
                              checked={chPw}
                              onChange={e => setChPw(e.target.checked)}
                              className="w-5 h-5 rounded-md border-2 border-slate-300 text-amber-500 focus:ring-amber-500 transition-all"
                            />
                            <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                              Force Password Reset
                            </span>
                          </label>
                          
                          {chPw && (
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800 animate-in fade-in duration-300">
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                New Password
                              </label>
                              <div className="relative">
                                <input
                                  type={showPw ? "text" : "password"}
                                  className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:ring-0 transition-all pr-12 outline-none"
                                  placeholder="Enter new password"
                                  value={f.password}
                                  onChange={e => setF({ ...f, password: e.target.value })}
                                />
                                <button
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                                  onClick={() => setShowPw(!showPw)}
                                >
                                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* --- MENU ACCESS (EDIT MODE) --- */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">4</div>
                        Menu Access
                      </h3>
                      <span className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-lg">
                        {(f.allowedMenus?.length || 0)} Selected
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 pl-10 h-64 overflow-y-auto custom-scrollbar pr-2">
                      {menuOptions.map(menu => {
                        const has = (f.allowedMenus || []).includes(menu.id);
                        return (
                          <button
                            key={menu.id}
                            type="button"
                            onClick={() => {
                              const current = f.allowedMenus || [];
                              const newMenus = has ? current.filter(m => m !== menu.id) : [...current, menu.id];
                              setF({ ...f, allowedMenus: newMenus });
                            }}
                            className={`group p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${has
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400'
                              }`}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${has ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'}`}>
                              {has && <CheckCircle size={14} />}
                            </div>
                            <div>
                              <div className={`font-black text-sm ${has ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{menu.label}</div>
                              <div className={`text-[10px] font-bold mt-0.5 uppercase ${has ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>{menu.category}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            // NO USER SELECTED (EMPTY STATE)
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[calc(100vh-140px)] flex items-center justify-center">
              <div className="p-12 text-center max-w-md">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <UserCog size={36} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Select a Profile</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                  Choose a user from the directory on the left to view their detailed information, modify permissions, or adjust system roles.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};