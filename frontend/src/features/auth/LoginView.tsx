import React, { useState, useEffect, useRef } from 'react';
import { NextGLogo } from '../../components/ui/Logo';
import { ArrowRight, Lock, User, Loader2, AlertCircle, ChevronDown, Trash2 } from 'lucide-react';

interface LoginViewProps {
  onLogin: (userData: any, token: string) => void;
}

interface SavedAccount {
  username: string;
  fullName: string;
  avatarSeed: string;
  password?: string; // UPDATE: Menambahkan field password (Optional)
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // --- MULTI-USER REMEMBER LOGIC ---
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Load Saved Accounts on Mount
  useEffect(() => {
    const storedAccounts = localStorage.getItem('nextg_saved_accounts');
    if (storedAccounts) {
      try {
        setSavedAccounts(JSON.parse(storedAccounts));
      } catch (e) {
        localStorage.removeItem('nextg_saved_accounts');
      }
    }

    // Close dropdown when clicking outside
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
    // UPDATE: Mengisi password otomatis jika tersimpan
    setPassword(account.password || ''); 
    setShowSuggestions(false);
    setRememberMe(true); // Auto check remember me for saved account
  };

  const handleRemoveAccount = (e: React.MouseEvent, usernameToRemove: string) => {
    e.stopPropagation(); // Prevent selecting the account
    const updatedAccounts = savedAccounts.filter(acc => acc.username !== usernameToRemove);
    setSavedAccounts(updatedAccounts);
    localStorage.setItem('nextg_saved_accounts', JSON.stringify(updatedAccounts));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        
        // 2. SAVE ACCOUNT LOGIC (Updated to save Password)
        if (rememberMe) {
          const newAccount: SavedAccount = {
            username: data.user.username,
            fullName: data.user.fullName,
            avatarSeed: data.user.avatarSeed || data.user.fullName,
            password: password // UPDATE: Simpan password saat ini
          };

          // Filter out existing to avoid duplicates, then add new one at top
          const updatedAccounts = [
            newAccount,
            ...savedAccounts.filter(acc => acc.username !== newAccount.username)
          ].slice(0, 5); // Limit to 5 accounts

          localStorage.setItem('nextg_saved_accounts', JSON.stringify(updatedAccounts));
        }

        onLogin(data.user, data.access_token); 
      } else {
        setErrorMessage('Username atau Password salah.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      setErrorMessage('Gagal terhubung ke server. Cek koneksi Backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/seikou-bg.jpg')" }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-[2px]" />

      {/* Login Box */}
      <div className="w-full max-w-md p-6 z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 md:p-10">
          
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                <NextGLogo className="h-16 w-auto text-blue-600 dark:text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              NextG App
            </h1>
            <p className="text-blue-600 dark:text-blue-400 font-medium text-sm mb-6 tracking-wide">
              Integrated Smart Production System
            </p>

            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-semibold opacity-70">
              Sign In to Dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2 border border-rose-200 dark:border-rose-800">
                <AlertCircle size={16} />
                {errorMessage}
              </div>
            )}

            {/* USERNAME FIELD WITH SUGGESTIONS */}
            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  name="username"
                  autoComplete="username" 
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => { if(savedAccounts.length > 0) setShowSuggestions(true); }}
                  required
                />
                {/* Chevron Trigger */}
                {savedAccounts.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-md"
                  >
                    <ChevronDown size={18} className={`transition-transform duration-200 ${showSuggestions ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* SAVED ACCOUNTS DROPDOWN */}
              {showSuggestions && savedAccounts.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Saved Accounts
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {savedAccounts.map((account) => (
                      <div 
                        key={account.username}
                        onClick={() => handleSelectAccount(account)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                            <img 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account.avatarSeed}`} 
                              alt="Avatar" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {account.fullName}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">
                              @{account.username}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleRemoveAccount(e, account.username)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Remove account"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="password" 
                  name="password"
                  autoComplete="current-password" 
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors font-medium">Remember me</span>
              </label>
              
              <a href="#" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                Forgot Password?
              </a>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm uppercase tracking-wide"
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /> Verifying...</>
              ) : (
                <>Sign In <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-bold">
              &copy; 2025 PT Seikou Seat Cover<br/>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Developed by MSDC Team</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};