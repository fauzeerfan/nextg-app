import React, { useState, useEffect, useRef } from 'react';
import { NextGLogo } from '../../components/ui/Logo';
import { ArrowRight, Lock, User, Loader2, AlertCircle, ChevronDown, Trash2, Users, Plus, X } from 'lucide-react';

interface LoginViewProps {
  onLogin: (userData: any, token: string, sessionType?: 'single' | 'multi', additionalUsers?: any[]) => void;
}

interface SavedAccount {
  username: string;
  fullName: string;
  avatarSeed: string;
  password?: string;
}

interface MultiUserForm {
  username: string;
  password: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Session type
  const [sessionType, setSessionType] = useState<'single' | 'multi'>('single');
  
  // Single user fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Multi user fields
  const [multiUsers, setMultiUsers] = useState<MultiUserForm[]>([
    { username: '', password: '' }
  ]);
  
  // Saved accounts (single user)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved accounts
  useEffect(() => {
    const storedAccounts = localStorage.getItem('nextg_saved_accounts');
    if (storedAccounts) {
      try {
        setSavedAccounts(JSON.parse(storedAccounts));
      } catch (e) {
        localStorage.removeItem('nextg_saved_accounts');
      }
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectAccount = (account: SavedAccount) => {
    setUsername(account.username);
    setPassword(account.password || '');
    setShowSuggestions(false);
    setRememberMe(true);
  };

  const handleRemoveAccount = (e: React.MouseEvent, usernameToRemove: string) => {
    e.stopPropagation();
    const updatedAccounts = savedAccounts.filter(acc => acc.username !== usernameToRemove);
    setSavedAccounts(updatedAccounts);
    localStorage.setItem('nextg_saved_accounts', JSON.stringify(updatedAccounts));
  };

  // Multi user handlers
  const addMultiUser = () => {
    if (multiUsers.length >= 5) {
      setErrorMessage('Maksimal 5 user dalam satu sesi multi-user');
      return;
    }
    setMultiUsers([...multiUsers, { username: '', password: '' }]);
  };

  const removeMultiUser = (index: number) => {
    if (multiUsers.length === 1) {
      setErrorMessage('Minimal satu user harus diisi');
      return;
    }
    const newUsers = [...multiUsers];
    newUsers.splice(index, 1);
    setMultiUsers(newUsers);
  };

  const updateMultiUser = (index: number, field: 'username' | 'password', value: string) => {
    const newUsers = [...multiUsers];
    newUsers[index][field] = value;
    setMultiUsers(newUsers);
  };

  // Helper to compare arrays (allowedStations)
  const areArraysEqual = (a: string[] = [], b: string[] = []) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  };

  const handleSingleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (rememberMe) {
          const newAccount: SavedAccount = {
            username: data.user.username,
            fullName: data.user.fullName,
            avatarSeed: data.user.avatarSeed || data.user.fullName,
            password: password
          };
          const updatedAccounts = [
            newAccount,
            ...savedAccounts.filter(acc => acc.username !== newAccount.username)
          ].slice(0, 5);
          localStorage.setItem('nextg_saved_accounts', JSON.stringify(updatedAccounts));
        }
        onLogin(data.user, data.access_token, 'single');
      } else {
        setErrorMessage('Username atau Password salah.');
      }
    } catch (error) {
      setErrorMessage('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleMultiLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validasi tidak ada field kosong
    for (let i = 0; i < multiUsers.length; i++) {
      if (!multiUsers[i].username.trim() || !multiUsers[i].password.trim()) {
        setErrorMessage(`User ${i+1}: Username dan password harus diisi`);
        return;
      }
    }

    setLoading(true);
    setErrorMessage('');

    const loginResults: { user: any; token: string }[] = [];
    let hasError = false;

    try {
      for (const mu of multiUsers) {
        const response = await fetch('http://localhost:3000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: mu.username, password: mu.password }),
        });
        if (!response.ok) {
          setErrorMessage(`Login gagal untuk user ${mu.username}: Username/password salah`);
          hasError = true;
          break;
        }
        const data = await response.json();
        loginResults.push({ user: data.user, token: data.access_token });
      }

      if (hasError) return;

      // Validasi kesamaan atribut antar semua user
      const firstUser = loginResults[0].user;
      const allSame = loginResults.every(item => {
        const u = item.user;
        return (
          u.role === firstUser.role &&
          u.lineCode === firstUser.lineCode &&
          u.department === firstUser.department &&
          u.jobTitle === firstUser.jobTitle &&
          areArraysEqual(u.allowedStations, firstUser.allowedStations)
        );
      });

      if (!allSame) {
        setErrorMessage('Semua user harus memiliki Role, Line, Department, Job Title, dan Station Access yang sama!');
        return;
      }

      // Login sukses, panggil onLogin dengan mode multi
      const primary = loginResults[0];
      const additional = loginResults.slice(1).map(r => ({ user: r.user, token: r.token }));
      onLogin(primary.user, primary.token, 'multi', additional);
    } catch (error) {
      setErrorMessage('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = sessionType === 'single' ? handleSingleLogin : handleMultiLogin;

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('Cobi taroskeun ka Tim MSDC 😁');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/seikou-bg.jpg')" }} />
      <div className="absolute inset-0 z-0 bg-slate-900/65 backdrop-blur-[6px]" />

      <div className="w-full max-w-md p-6 z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40 dark:border-slate-700/50 p-8 md:p-10 transition-all duration-300">
          
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-xl">
                <NextGLogo className="h-16 w-auto text-blue-600 dark:text-blue-500" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 mb-1">NextG App</h1>
            <p className="text-blue-600 dark:text-blue-400 font-bold text-sm mb-4">Integrated Smart Production System</p>
            
            {/* Session Type Toggle */}
            <div className="flex justify-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setSessionType('single')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${sessionType === 'single' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
              >
                Single User
              </button>
              <button
                type="button"
                onClick={() => setSessionType('multi')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${sessionType === 'multi' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
              >
                Multi User
              </button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-10 bg-slate-200 dark:bg-slate-700"></div>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-[0.2em] font-bold">Sign In</p>
              <div className="h-px w-10 bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="bg-rose-50/80 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-2xl text-sm flex items-center gap-3 border border-rose-200">
                <AlertCircle size={18} />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {sessionType === 'single' ? (
              // Single User Form (existing)
              <>
                <div className="space-y-2 relative" ref={dropdownRef}>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Username</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-10 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => { if(savedAccounts.length > 0) setShowSuggestions(true); }}
                      required
                    />
                    {savedAccounts.length > 0 && (
                      <button type="button" onClick={() => setShowSuggestions(!showSuggestions)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <ChevronDown size={18} className={`transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  {showSuggestions && savedAccounts.length > 0 && (
                    <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 rounded-2xl shadow-xl z-50">
                      <div className="px-5 py-2.5 bg-slate-50/80 text-[10px] font-bold text-slate-400">Saved Accounts</div>
                      <div className="max-h-56 overflow-y-auto">
                        {savedAccounts.map((account) => (
                          <div key={account.username} onClick={() => handleSelectAccount(account)} className="flex items-center justify-between px-5 py-3 hover:bg-blue-50 cursor-pointer group">
                            <div className="flex items-center gap-3">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account.avatarSeed}`} className="h-9 w-9 rounded-full" alt="" />
                              <div>
                                <div className="text-sm font-bold">{account.fullName}</div>
                                <div className="text-[11px] text-slate-400">@{account.username}</div>
                              </div>
                            </div>
                            <button onClick={(e) => handleRemoveAccount(e, account.username)} className="p-2 text-slate-300 hover:text-rose-500 rounded-xl opacity-0 group-hover:opacity-100">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="password"
                      className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="peer w-4 h-4 rounded border-slate-300 text-blue-600" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <span className="text-sm text-slate-500">Remember me</span>
                  </label>
                  <a href="#" onClick={handleForgotPassword} className="text-sm font-bold text-blue-600 hover:underline">Forgot Password?</a>
                </div>
              </>
            ) : (
              // Multi User Form
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Users (max 5)</label>
                  <button type="button" onClick={addMultiUser} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                    <Plus size={14} /> Add User
                  </button>
                </div>
                {multiUsers.map((mu, idx) => (
                  <div key={idx} className="relative border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/30 dark:bg-slate-800/30">
                    {multiUsers.length > 1 && (
                      <button type="button" onClick={() => removeMultiUser(idx)} className="absolute top-2 right-2 p-1 text-rose-500 hover:bg-rose-100 rounded-full">
                        <X size={16} />
                      </button>
                    )}
                    <div className="text-xs font-semibold text-slate-500 mb-2">User {idx+1}</div>
                    <div className="space-y-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Username"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm"
                          value={mu.username}
                          onChange={(e) => updateMultiUser(idx, 'username', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          placeholder="Password"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm"
                          value={mu.password}
                          onChange={(e) => updateMultiUser(idx, 'password', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-[0_8px_20px_-4px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm uppercase tracking-widest"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (sessionType === 'single' ? <><ArrowRight size={20} /> Sign In</> : <><Users size={20} /> Sign In All</>)}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-200/60 text-center">
            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed font-bold">
              &copy; 2026 PT Seikou Seat Cover
              <span className="block mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">Developed by MSDC Team</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};