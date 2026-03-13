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
    pink: { bg: 'from-pink-500 to-pink-400', lightBg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
    purple: { bg: 'from-purple-500 to-purple-400', lightBg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    emerald: { bg: 'from-emerald-500 to-emerald-400', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    blue: { bg: 'from-blue-500 to-blue-400', lightBg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' }
  }[color];

  return (
    <div className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
            {suffix && <span className="text-xs text-slate-500 dark:text-slate-400">{suffix}</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={12} />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorStyles.lightBg} border ${colorStyles.border}`}>
          <Icon size={16} className={colorStyles.text} />
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-0.5 rounded-b-xl bg-gradient-to-r ${colorStyles.bg} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
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
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
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
  const roleBg = (r: string) => r === 'ADMINISTRATOR' ? 'bg-purple-100 dark:bg-purple-900/20' : r === 'MANAGER' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-emerald-100 dark:bg-emerald-900/20';
  const roleTxt = (r: string) => r === 'ADMINISTRATOR' ? 'text-purple-600 dark:text-purple-400' : r === 'MANAGER' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400';
  const deptName = (c: string) => deptOpts.find(d => d.code === c)?.name || c;
  const jobName = (c: string) => jobOpts.find(j => j.code === c)?.name || c;

  if (load && !us.length) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-pink-600 mx-auto mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading user data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 space-y-4">
      {/* HEADER - compact */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
        <div className="p-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                  <Users size={22} className="text-white" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-400 rounded-full flex items-center justify-center border-3 border-white dark:border-slate-900 shadow-md">
                  <Shield size={12} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  User Management
                  <span className="text-[10px] px-2 py-1 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-full font-bold">
                    ACCESS CONTROL
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-lg shadow-md">
                <div className="flex flex-col">
                  <div className="text-[10px] font-medium opacity-90">Active Users</div>
                  <div className="text-xl font-bold">{active}/{total}</div>
                </div>
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <UserCheck size={16} className="text-white" />
                </div>
              </div>
              <button
                onClick={newUser}
                disabled={load}
                className="group px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-bold flex items-center gap-2 hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-sm"
              >
                <UserPlus size={16} />
                New User
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>

        {/* METRIC CARDS - 4 kolom dengan pemisahan Admin & Manager */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 pb-5">
          <MetricCard title="Total Users" value={total} icon={Users} color="pink" suffix="users" subtitle={`${active} currently active`} />
          <MetricCard title="Operators" value={opCnt} icon={UserCheck} color="emerald" suffix="active" subtitle="Station operators" />
          <MetricCard title="Administrators" value={admCnt} icon={Star} color="purple" suffix="users" subtitle="Full access" />
          <MetricCard title="Managers" value={mgrCnt} icon={UserCog} color="blue" suffix="users" subtitle="Management level" />
        </div>
      </div>

      {/* QUICK ACTIONS (SEARCH) - DIHAPUS SESUAI PERMINTAAN */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* LEFT COLUMN - USER LIST (compact) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden sticky top-4">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">System Users</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} of {total} users</p>
                </div>
                <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 text-[10px] font-bold rounded-full">
                  {active} Active
                </span>
              </div>
            </div>
            <div className="p-3">
              <div className="space-y-2 max-h-[calc(100vh-450px)] overflow-y-auto pr-1 custom-scrollbar">
                {filtered.map(u => {
                  const isSel = sel?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`group p-3 rounded-xl cursor-pointer transition-all ${isSel
                          ? 'bg-gradient-to-r from-pink-50 to-white dark:from-pink-900/20 dark:to-slate-800 border-l-4 border-pink-500 shadow-sm'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/30 border border-slate-200 dark:border-slate-700'
                        }`}
                      onClick={() => select(u)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="relative flex-shrink-0">
                          <img
                            src={getAvatarUrl(u.username)}
                            alt={u.fullName}
                            className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 object-cover"
                          />
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full border-2 border-white dark:border-slate-900`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{u.fullName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">@{u.username}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${roleBg(u.role)} ${roleTxt(u.role)}`}>
                              {u.role}
                            </span>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <span>{u.lineCode}</span>
                            </div>
                          </div>
                          {(u.department || u.jobTitle) && (
                            <div className="text-[10px] text-slate-500 mt-1 truncate">
                              {u.department && deptName(u.department)} • {u.jobTitle && jobName(u.jobTitle)}
                            </div>
                          )}
                          {u.allowedStations?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {u.allowedStations.slice(0, 2).map(st => (
                                <span key={st} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] text-slate-600 dark:text-slate-300">
                                  {st}
                                </span>
                              ))}
                              {u.allowedStations.length > 2 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] text-slate-600 dark:text-slate-300">
                                  +{u.allowedStations.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="p-5 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users size={20} className="text-slate-400" />
                    </div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No Users Found</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {q ? 'No results for "' + q + '"' : 'Create your first user'}
                    </p>
                    {!q && (
                      <button
                        onClick={newUser}
                        className="mt-3 px-4 py-2 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 mx-auto hover:from-pink-700 hover:to-pink-600 transition-all"
                      >
                        <UserPlus size={14} />
                        Create User
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - USER DETAIL / FORM (compact) */}
        <div className="lg:col-span-3 space-y-5">
          {sel && !edit ? (
            // VIEW MODE (compact)
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={getAvatarUrl(sel.username)}
                        alt={sel.fullName}
                        className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 object-cover"
                      />
                      <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center border-3 border-white dark:border-slate-900 shadow-md">
                        <Shield size={12} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{sel.fullName}</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">@{sel.username}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Mail size={10} />
                          <span>{sel.email || 'No email set'}</span>
                        </div>
                        <div className="h-1 w-1 bg-slate-400 rounded-full"></div>
                        <div className="flex items-center gap-1">
                          <Building size={10} />
                          <span>{sel.department ? deptName(sel.department) : 'No department'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={editUser}
                      className="group px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-bold flex items-center gap-2 hover:from-blue-700 hover:to-blue-600 transition-all text-sm"
                    >
                      <Edit size={14} />
                      Edit User
                    </button>
                    <button
                      onClick={() => toggleStatus(sel.id)}
                      className={`group px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all text-sm ${sel.isActive
                          ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white'
                          : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white'
                        }`}
                    >
                      {sel.isActive ? (
                        <>
                          <Lock size={14} />
                          Disable
                        </>
                      ) : (
                        <>
                          <Unlock size={14} />
                          Enable
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => delUser(sel.id)}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-bold flex items-center gap-2 hover:from-red-700 hover:to-red-600 transition-all text-sm"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {/* Stats Cards compact */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Role</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{sel.role}</p>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Shield size={18} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">Access level</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Department</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                          {sel.department ? deptName(sel.department) : 'Not set'}
                        </p>
                      </div>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <Building size={18} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">{sel.department || 'No code'}</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Line Assignment</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                          {sel.lineCode || 'Not assigned'}
                        </p>
                      </div>
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Target size={18} className="text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">Production line</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Last Login</p>
                        <p className="text-xl font-bold text-pink-600 dark:text-pink-400 mt-1">
                          {sel.lastLogin ? new Date(sel.lastLogin).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                      <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                        <Calendar size={18} className="text-pink-600 dark:text-pink-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">Last system access</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Job Title</p>
                        <p className="text-xl font-bold text-slate-600 dark:text-slate-400 mt-1">
                          {sel.jobTitle ? jobName(sel.jobTitle) : 'Not set'}
                        </p>
                      </div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <UserCheck size={18} className="text-slate-600 dark:text-slate-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">{sel.jobTitle || 'No code'}</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                          {sel.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">Account status</p>
                  </div>
                </div>

                {/* Allowed Stations compact */}
                <div className="bg-gradient-to-r from-pink-50 to-white dark:from-pink-900/10 dark:to-slate-800/30 rounded-xl border border-pink-100 dark:border-pink-800/30 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-pink-100 dark:bg-pink-900/40 rounded-lg">
                      <Key size={16} className="text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Allowed Stations</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(sel.allowedStations?.length || 0)} stations accessible
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {stationOpts.map(o => {
                      const has = (sel.allowedStations || []).includes(o.value);
                      return (
                        <div
                          key={o.value}
                          className={`p-3 rounded-lg border-2 transition-all ${has
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'border-slate-200 dark:border-slate-700'
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1.5 rounded-lg ${has ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                              <Shield size={12} className={has ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                            </div>
                            <div className="font-medium text-xs text-slate-900 dark:text-white">{o.label}</div>
                          </div>
                          {has && (
                            <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle size={10} />
                              Granted
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : edit ? (
            // EDIT/CREATE MODE (compact)
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                      {create ? <UserPlus size={22} className="text-white" /> : <Edit size={22} className="text-white" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {create ? 'Create New User' : `Edit User: ${sel?.username}`}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {create ? 'Add new system user account' : 'Update user information and permissions'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setEdit(false); setCreate(false); if (sel) setF({ username: sel.username, fullName: sel.fullName, email: sel.email || '', role: sel.role, department: sel.department || '', jobTitle: sel.jobTitle || '', lineCode: sel.lineCode || '', isActive: sel.isActive ?? true, allowedStations: sel.allowedStations || [], password: '' }); }}
                      className="px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:border-blue-300 dark:hover:border-blue-700 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveUser}
                      disabled={load}
                      className="group px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-50 text-sm"
                    >
                      {load ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {create ? 'Create User' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Basic Information */}
                <div className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-800/30 rounded-xl border border-blue-100 dark:border-blue-800/30 p-4">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <UserCheck className="text-blue-600" size={16} />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Username <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all"
                        value={f.username}
                        onChange={e => setF({ ...f, username: e.target.value })}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all"
                        value={f.fullName}
                        onChange={e => setF({ ...f, fullName: e.target.value })}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all"
                        value={f.email}
                        onChange={e => setF({ ...f, email: e.target.value })}
                        placeholder="user@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Role <span className="text-rose-500">*</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all"
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

                {/* Job Details */}
                <div className="bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-800/30 rounded-xl border border-emerald-100 dark:border-emerald-800/30 p-4">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Building className="text-emerald-600" size={16} />
                    Job Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                      <select
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all"
                        value={f.department || ''}
                        onChange={e => setF({ ...f, department: e.target.value })}
                      >
                        <option value="">Select Department</option>
                        {deptOpts.map(d => (
                          <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
                      <select
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all"
                        value={f.jobTitle || ''}
                        onChange={e => setF({ ...f, jobTitle: e.target.value })}
                      >
                        <option value="">Select Job Title</option>
                        {jobOpts.map(j => (
                          <option key={j.code} value={j.code}>{j.code} - {j.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Line Assignment</label>
                      <select
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all"
                        value={f.lineCode || ''}
                        onChange={e => setF({ ...f, lineCode: e.target.value })}
                      >
                        <option value="">Select Line</option>
                        {lineOpts.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                      <select
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all"
                        value={f.isActive ? 'active' : 'inactive'}
                        onChange={e => setF({ ...f, isActive: e.target.value === 'active' })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Account Security */}
                <div className="bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-800/30 rounded-xl border border-amber-100 dark:border-amber-800/30 p-4">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Key className="text-amber-600" size={16} />
                    Account Security
                  </h4>
                  {create ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all pr-10"
                          placeholder="Enter password (min. 8 characters)"
                          value={f.password}
                          onChange={e => setF({ ...f, password: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
                          onClick={() => setShowPw(!showPw)}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <AlertCircle size={12} />
                          <span>Default password will be 'password123' if left empty</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={chPw}
                            onChange={e => setChPw(e.target.checked)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Change password
                          </span>
                        </label>
                      </div>
                      {chPw && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPw ? "text" : "password"}
                              className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all pr-10"
                              placeholder="Enter new password"
                              value={f.password}
                              onChange={e => setF({ ...f, password: e.target.value })}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
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

                {/* Allowed Stations */}
                <div className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-slate-800/30 rounded-xl border border-purple-100 dark:border-purple-800/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                        <Shield size={16} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Allowed Stations</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Select stations this user can access
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {(f.allowedStations?.length || 0)} selected
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {stationOpts.map(o => {
                      const has = (f.allowedStations || []).includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => toggleStation(o.value)}
                          className={`group p-3 rounded-lg border-2 transition-all text-left ${has
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1.5 rounded-lg ${has ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                              <Shield size={12} className={has ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'} />
                            </div>
                            <div className="font-medium text-xs text-slate-900 dark:text-white">{o.label}</div>
                            <div className={`w-4 h-4 rounded-full ml-auto flex items-center justify-center ${has ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                              {has && <CheckCircle size={10} />}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500">{o.value}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // NO USER SELECTED (compact)
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md">
                  <Users size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No User Selected</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 max-w-sm mx-auto">
                  Select a user from the list to view details, edit permissions, or manage account settings.
                </p>
                <button
                  onClick={newUser}
                  className="group px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-bold flex items-center gap-2 mx-auto hover:from-blue-700 hover:to-blue-600 transition-all text-sm"
                >
                  <UserPlus size={16} />
                  Create New User
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};