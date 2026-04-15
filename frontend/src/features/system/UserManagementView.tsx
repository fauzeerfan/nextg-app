import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Edit, Save, Shield, Lock, Unlock, Mail, Building,
  CheckCircle, Eye, EyeOff, Key, Trash2,
  Calendar, Loader2, UserCheck, Target, TrendingUp, Star, AlertCircle,
  ArrowRight, UserCog
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
    pink: { bg: 'from-pink-500 to-rose-400', lightBg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800/50' },
    purple: { bg: 'from-purple-500 to-indigo-400', lightBg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/50' },
    emerald: { bg: 'from-emerald-500 to-teal-400', lightBg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/50' },
    blue: { bg: 'from-blue-600 to-cyan-400', lightBg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/50' }
  }[color];

  return (
    <div className="group relative bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</span>
            {suffix && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{suffix}</span>}
          </div>
          {subtitle && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
              <TrendingUp size={12} />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorStyles.lightBg} border-b-2 ${colorStyles.border} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={20} className={colorStyles.text} />
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${colorStyles.bg} opacity-50 group-hover:opacity-100 transition-opacity duration-300`} />
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
    department: '', jobTitle: '', lineCode: '', isActive: true, allowedStations: [] as string[], password: ''
  });

  useEffect(() => { fetchUsers(); fetchLines(); }, []);
  const fetchLines = async () => { try { const res = await fetch(`${API_BASE_URL}/line-masters`); if (res.ok) setLineOpts((await res.json()).map((l: any) => l.code)); } catch { console.error('Failed to fetch lines'); } };
  const fetchUsers = async () => { setLoad(true); try { const res = await fetch(`${API_BASE_URL}/users`); setUs(await res.json()); } catch { alert('Gagal load user'); } finally { setLoad(false); } };

  // Fungsi untuk mendapatkan URL avatar dari DiceBear (gaya identicon)
  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f8fafc`;
  };

  // Filter berdasarkan pencarian (search) masih ada di state q, tapi inputnya sudah dihapus
  const filtered = us.filter(u => u?.username?.toLowerCase().includes(q.toLowerCase()) || u?.fullName?.toLowerCase().includes(q.toLowerCase()) || u?.email?.toLowerCase().includes(q.toLowerCase()) || u?.role?.toLowerCase().includes(q.toLowerCase()));

  // Perhitungan metrik terpisah
  const total = us.length;
  const active = us.filter(u => u?.isActive).length;
  const opCnt = us.filter(u => u?.role === 'OPERATOR').length;
  const admCnt = us.filter(u => u?.role === 'ADMINISTRATOR').length;
  const mgrCnt = us.filter(u => u?.role === 'MANAGER').length;

  const select = (u: SystemUser) => { setSel(u); setEdit(false); setCreate(false); };
  const newUser = () => {
    setF({ username: '', fullName: '', email: '', role: 'OPERATOR', department: '', jobTitle: '', lineCode: '', isActive: true, allowedStations: [], password: 'password123' });
    setChPw(false); setSel(null); setCreate(true); setEdit(true);
  };
  const editUser = () => {
    if (sel) setF({
      username: sel.username, fullName: sel.fullName, email: sel.email || '', role: sel.role,
      department: sel.department || '', jobTitle: sel.jobTitle || '', lineCode: sel.lineCode || '',
      isActive: sel.isActive ?? true, allowedStations: sel.allowedStations || [], password: ''
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
        allowedStations: f.allowedStations, isActive: f.isActive
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
  const toggleStation = (st: string) => setF(p => ({ ...p, allowedStations: p.allowedStations.includes(st) ? p.allowedStations.filter(s => s !== st) : [...p.allowedStations, st] }));

  const roleColor = (r: string) => r === 'ADMINISTRATOR' ? 'from-purple-500 to-purple-600' : r === 'MANAGER' ? 'from-blue-500 to-blue-600' : 'from-emerald-500 to-emerald-600';
  const roleBg = (r: string) => r === 'ADMINISTRATOR' ? 'bg-purple-100 dark:bg-purple-500/20' : r === 'MANAGER' ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20';
  const roleTxt = (r: string) => r === 'ADMINISTRATOR' ? 'text-purple-700 dark:text-purple-300' : r === 'MANAGER' ? 'text-blue-700 dark:text-blue-300' : 'text-emerald-700 dark:text-emerald-300';
  const deptName = (c: string) => deptOpts.find(d => d.code === c)?.name || c;
  const jobName = (c: string) => jobOpts.find(j => j.code === c)?.name || c;

  if (load && !us.length) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
        <Loader2 className="w-12 h-12 animate-spin text-pink-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Loading System Users</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Please wait while we fetch the data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-6 space-y-6 font-sans">
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:scale-105 transition-transform duration-300">
                  <Users size={26} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                  <Shield size={14} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                  User Management
                  <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 rounded-full font-bold border border-pink-200 dark:border-pink-500/30">
                    Access Control
                  </span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage system accounts, roles, and station permissions.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-4 px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-600 text-white rounded-xl shadow-lg">
                <div className="flex flex-col">
                  <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Active Users</div>
                  <div className="text-2xl font-extrabold leading-none mt-0.5">{active}<span className="text-slate-400 text-lg font-medium mx-1">/</span>{total}</div>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md">
                  <UserCheck size={20} className="text-white" />
                </div>
              </div>
              <button
                onClick={newUser}
                disabled={load}
                className="group px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 text-sm"
              >
                <UserPlus size={18} />
                Create New User
                <ArrowRight size={16} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </button>
            </div>
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-6">
          <MetricCard title="Total Users" value={total} icon={Users} color="pink" suffix="users" subtitle={`${active} currently active`} />
          <MetricCard title="Operators" value={opCnt} icon={UserCheck} color="emerald" suffix="active" subtitle="Station operators" />
          <MetricCard title="Administrators" value={admCnt} icon={Star} color="purple" suffix="users" subtitle="Full system access" />
          <MetricCard title="Managers" value={mgrCnt} icon={UserCog} color="blue" suffix="users" subtitle="Management level" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN - USER LIST */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden sticky top-6 flex flex-col max-h-[calc(100vh-200px)]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Directory</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{filtered.length} records found</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold rounded-full border border-emerald-200 dark:border-emerald-500/30">
                  {active} Active
                </span>
              </div>
            </div>
            
            <div className="p-3 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-2 pr-1">
                {filtered.map(u => {
                  const isSel = sel?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`group p-3.5 rounded-2xl cursor-pointer transition-all duration-200 ${isSel
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-md shadow-blue-100 dark:shadow-none ring-1 ring-blue-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 border-transparent border hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      onClick={() => select(u)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={getAvatarUrl(u.username)}
                            alt={u.fullName}
                            className={`w-11 h-11 rounded-xl object-cover ${isSel ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : 'bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'}`}
                          />
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full border-2 border-white dark:border-slate-800 shadow-sm`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{u.fullName}</div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mb-1.5">@{u.username}</div>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${roleBg(u.role)} ${roleTxt(u.role)} border ${roleBg(u.role).replace('bg-', 'border-').replace('/20', '/30')}`}>
                              {u.role}
                            </span>
                            <div className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {u.lineCode}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                      <Users size={28} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">No Users Found</h4>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5">
                      {q ? `No matches for "${q}"` : "Your directory is empty."}
                    </p>
                    {!q && (
                      <button
                        onClick={newUser}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 mx-auto hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                      >
                        <UserPlus size={16} />
                        Add First User
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - USER DETAIL / FORM */}
        <div className="lg:col-span-3">
          {sel && !edit ? (
            // VIEW MODE
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden">
              {/* Profile Header Area */}
              <div className="relative h-32 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px', color: 'gray' }}></div>
              </div>
              
              <div className="px-6 pb-6 md:px-8 md:pb-8 relative">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 -mt-12 mb-6">
                  <div className="flex items-end gap-5">
                    <div className="relative">
                      <div className="p-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700">
                        <img
                          src={getAvatarUrl(sel.username)}
                          alt={sel.fullName}
                          className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-700 object-cover"
                        />
                      </div>
                      <div className={`absolute bottom-2 -right-2 px-2.5 py-1 ${sel.isActive ? 'bg-emerald-500' : 'bg-rose-500'} text-white text-[10px] font-bold uppercase tracking-wider rounded-full border-2 border-white dark:border-slate-800 shadow-sm flex items-center gap-1`}>
                        {sel.isActive ? <CheckCircle size={10} /> : <Lock size={10} />}
                        {sel.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="pb-1">
                      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{sel.fullName}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">@{sel.username}</p>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                          <Mail size={14} className="text-slate-400" />
                          <span>{sel.email || 'No email set'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 pb-1 w-full md:w-auto">
                    <button
                      onClick={editUser}
                      className="flex-1 md:flex-none px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all text-sm shadow-sm"
                    >
                      <Edit size={16} />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => toggleStatus(sel.id)}
                      className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm shadow-sm ${sel.isActive
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                        }`}
                    >
                      {sel.isActive ? <><Lock size={16} /> Suspend</> : <><Unlock size={16} /> Activate</>}
                    </button>
                    <button
                      onClick={() => delUser(sel.id)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all"
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Profile Grid Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                  {/* Card 1 */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">System Role</p>
                        <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">{sel.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Building size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Department</p>
                        <p className="font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">{sel.department ? deptName(sel.department) : 'Not assigned'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
                        <Target size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Line Code</p>
                        <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">{sel.lineCode || 'None'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-purple-100 dark:bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Job Title</p>
                        <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">{sel.jobTitle ? jobName(sel.jobTitle) : 'Unspecified'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 5 */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow md:col-span-2 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-pink-100 dark:bg-pink-500/20 rounded-xl text-pink-600 dark:text-pink-400">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last System Access</p>
                        <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {sel.lastLogin ? new Date(sel.lastLogin).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : 'Never logged in yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stations Details */}
                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg text-white shadow-md">
                      <Key size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Station Access Rights</h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">User is granted access to {(sel.allowedStations?.length || 0)} production stations.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {stationOpts.map(o => {
                      const has = (sel.allowedStations || []).includes(o.value);
                      return (
                        <div
                          key={o.value}
                          className={`relative p-4 rounded-2xl border-2 transition-all overflow-hidden ${has
                              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                              : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 opacity-70'
                            }`}
                        >
                          {has && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-bl-full" />}
                          <div className="flex flex-col gap-3 relative z-10">
                            <div className="flex items-center justify-between">
                              <div className={`p-2 rounded-xl ${has ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200/50 dark:bg-slate-700 text-slate-400'}`}>
                                <Target size={16} />
                              </div>
                              {has && <CheckCircle size={18} className="text-indigo-500" />}
                            </div>
                            <div>
                              <div className={`font-bold text-sm ${has ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{o.label}</div>
                              <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{o.value}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : edit ? (
            // EDIT/CREATE MODE
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                      {create ? <UserPlus size={24} className="text-white" /> : <Edit size={24} className="text-white" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {create ? 'Create New Account' : `Update Account`}
                      </h2>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {create ? 'Fill in the details to create a new system user.' : `Editing information for @${sel?.username}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <button
                      onClick={() => { setEdit(false); setCreate(false); if (sel) setF({ username: sel.username, fullName: sel.fullName, email: sel.email || '', role: sel.role, department: sel.department || '', jobTitle: sel.jobTitle || '', lineCode: sel.lineCode || '', isActive: sel.isActive ?? true, allowedStations: sel.allowedStations || [], password: '' }); }}
                      className="flex-1 lg:flex-none px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm shadow-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveUser}
                      disabled={load}
                      className="flex-1 lg:flex-none group px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 text-sm"
                    >
                      {load ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {create ? 'Save New User' : 'Update Changes'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                {/* Form Section: Basic Profile */}
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">1</span>
                    Basic Profile
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-800">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                        Username <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        value={f.username}
                        onChange={e => setF({ ...f, username: e.target.value })}
                        placeholder="e.g. jdoe123"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        value={f.fullName}
                        onChange={e => setF({ ...f, fullName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail size={16} className="text-slate-400" />
                        </div>
                        <input
                          type="email"
                          className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                          value={f.email}
                          onChange={e => setF({ ...f, email: e.target.value })}
                          placeholder="john@company.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                        System Role <span className="text-rose-500">*</span>
                      </label>
                      <select
                        className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
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

                <hr className="border-slate-100 dark:border-slate-700/50" />

                {/* Form Section: Organizational Info */}
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">2</span>
                    Organization
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-800">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Department</label>
                      <select
                        className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Job Title</label>
                      <select
                        className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Line Assignment</label>
                      <select
                        className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Account Status</label>
                      <div className="relative">
                        <select
                          className={`w-full px-4 py-3 text-sm font-bold border-2 rounded-xl focus:outline-none focus:ring-2 transition-all appearance-none ${f.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 focus:ring-emerald-500 focus:border-emerald-500'
                              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 focus:ring-rose-500 focus:border-rose-500'
                            }`}
                          value={f.isActive ? 'active' : 'inactive'}
                          onChange={e => setF({ ...f, isActive: e.target.value === 'active' })}
                        >
                          <option value="active">🟢 Active</option>
                          <option value="inactive">🔴 Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-700/50" />

                {/* Form Section: Access Control & Security */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">3</span>
                      Security
                    </h3>
                    <div className="bg-amber-50/50 dark:bg-amber-500/10 rounded-2xl border border-amber-200/50 dark:border-amber-800/50 p-5">
                      {create ? (
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-2">
                            Initial Password <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPw ? "text" : "password"}
                              className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all pr-12"
                              placeholder="Min. 8 characters"
                              value={f.password}
                              onChange={e => setF({ ...f, password: e.target.value })}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors"
                              onClick={() => setShowPw(!showPw)}
                            >
                              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          <div className="mt-3 flex items-start gap-2 text-xs font-medium text-amber-700 dark:text-amber-500 bg-amber-100/50 dark:bg-amber-500/20 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-700/50">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                            <span>If left blank, password defaults to <strong className="font-extrabold">password123</strong></span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <input
                              type="checkbox"
                              checked={chPw}
                              onChange={e => setChPw(e.target.checked)}
                              className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
                            />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                              Reset User Password
                            </span>
                          </label>
                          
                          {chPw && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                              <label className="block text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-2">
                                New Password
                              </label>
                              <div className="relative">
                                <input
                                  type={showPw ? "text" : "password"}
                                  className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all pr-12"
                                  placeholder="Enter new password"
                                  value={f.password}
                                  onChange={e => setF({ ...f, password: e.target.value })}
                                />
                                <button
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors"
                                  onClick={() => setShowPw(!showPw)}
                                >
                                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">4</span>
                        Station Access
                      </h3>
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full border border-indigo-100 dark:border-indigo-800/50">
                        {(f.allowedStations?.length || 0)} Selected
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stationOpts.map(o => {
                        const has = (f.allowedStations || []).includes(o.value);
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => toggleStation(o.value)}
                            className={`group p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${has
                                ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/30 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800'
                              }`}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${has ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                              {has && <CheckCircle size={14} />}
                            </div>
                            <div>
                              <div className={`font-bold text-sm ${has ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{o.label}</div>
                              <div className={`text-xs font-medium mt-0.5 ${has ? 'text-indigo-600/80 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'}`}>{o.value}</div>
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
            <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden h-[calc(100vh-200px)] flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
              <div className="p-12 text-center max-w-md relative z-10">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/40 rounded-full animate-ping opacity-70"></div>
                  <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl rotate-3 hover:rotate-6 transition-transform duration-300 flex items-center justify-center shadow-xl shadow-blue-500/30">
                    <UserCog size={40} className="text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">Select a Profile</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                  Choose a user from the directory on the left to view their detailed information, modify permissions, or adjust system roles.
                </p>
                <button
                  onClick={newUser}
                  className="group px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center gap-2 mx-auto hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all text-sm shadow-sm"
                >
                  <UserPlus size={18} />
                  Or Create New User
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};