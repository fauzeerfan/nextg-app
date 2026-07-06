// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  lineCode?: string;
  allowedStations?: string[];
  allowedMenus?: string[];
  permissions?: string[];
  department?: string;
  jobTitle?: string;
}

interface MultiUserSession {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  sessionType: 'single' | 'multi' | null;
  users: MultiUserSession[];
  login: (token: string, user: User, sessionType?: 'single' | 'multi', additionalUsers?: MultiUserSession[]) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// ── Ambil expiry timestamp dari JWT payload ──────────────────────────────────
const getTokenExpiry = (token: string): number => {
  try {
    const base64url = token.split('.')[1];
    // JWT pakai base64url — konversi ke base64 standard sebelum atob()
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(base64 + padding));
    if (payload.exp) {
      console.log('[Auth] Session expires at:', new Date(payload.exp * 1000).toLocaleString());
      return payload.exp * 1000;
    }
  } catch (e) {
    console.error('[Auth] Failed to decode token:', e);
  }
  return Date.now() + 8 * 60 * 60 * 1000;
};

// ── Cek apakah token sudah expired ──────────────────────────────────────────
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// ── Clear semua session dari localStorage ───────────────────────────────────
export const clearSessionStorage = () => {
  localStorage.removeItem('sessionType');
  localStorage.removeItem('nextg_token');
  localStorage.removeItem('user');
  localStorage.removeItem('multiUsers');
  localStorage.removeItem('nextg_session_expires'); // ← tambahan
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionType, setSessionType] = useState<'single' | 'multi' | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<MultiUserSession[]>([]);
  const navigate = useNavigate();

  // ── Load session dari localStorage saat app pertama buka ─────────────────
  useEffect(() => {
    const storedSessionType = localStorage.getItem('sessionType') as 'single' | 'multi' | null;

if (storedSessionType === 'single') {
  const storedToken = localStorage.getItem('nextg_token');
  const storedUser = localStorage.getItem('user');
  if (storedToken && storedUser) {
    if (isTokenExpired(storedToken)) {
      clearSessionStorage();
      return;
    }
    // 🔥 Simpan expiry dari token yang ada
    const expiresAt = getTokenExpiry(storedToken);
    localStorage.setItem('nextg_session_expires', String(expiresAt));

    setSessionType('single');
    setToken(storedToken);
    try { setUser(JSON.parse(storedUser)); }
    catch (e) { clearSessionStorage(); }
  }
} else if (storedSessionType === 'multi') {
  const storedUsers = localStorage.getItem('multiUsers');
  if (storedUsers) {
    try {
      const parsedUsers: MultiUserSession[] = JSON.parse(storedUsers);
      const validUsers = parsedUsers.filter(u => !isTokenExpired(u.token));
      if (validUsers.length === 0) { clearSessionStorage(); return; }
      if (validUsers.length !== parsedUsers.length) {
        localStorage.setItem('multiUsers', JSON.stringify(validUsers));
      }
      // 🔥 Simpan expiry dari user pertama
      if (validUsers.length > 0) {
        const expiresAt = getTokenExpiry(validUsers[0].token);
        localStorage.setItem('nextg_session_expires', String(expiresAt));
      }
      setSessionType('multi');
      setUsers(validUsers);
      setUser(validUsers[0].user);
      setToken(validUsers[0].token);
    } catch (e) { clearSessionStorage(); }
  }
}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (
    newToken: string,
    newUser: User,
    type: 'single' | 'multi' = 'single',
    additionalUsers: MultiUserSession[] = []
  ) => {
    // Simpan expiry timestamp dari JWT untuk pengecekan di App.tsx
    const expiresAt = getTokenExpiry(newToken);
    localStorage.setItem('nextg_session_expires', String(expiresAt));

    if (type === 'single') {
      localStorage.setItem('sessionType', 'single');
      localStorage.setItem('nextg_token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.removeItem('multiUsers');
      setSessionType('single');
      setToken(newToken);
      setUser(newUser);
      setUsers([]);
      navigate('/dashboard');
    } else {
      const allUsers: MultiUserSession[] = [{ user: newUser, token: newToken }, ...additionalUsers];
      localStorage.setItem('sessionType', 'multi');
      localStorage.setItem('multiUsers', JSON.stringify(allUsers));
      localStorage.removeItem('nextg_token');
      localStorage.removeItem('user');
      setSessionType('multi');
      setUsers(allUsers);
      setUser(allUsers[0].user);
      setToken(allUsers[0].token);
      navigate('/dashboard');
    }
  };

  const logout = () => {
    clearSessionStorage();
    setSessionType(null);
    setToken(null);
    setUser(null);
    setUsers([]);
    navigate('/login');
  };

  const isAuthenticated = sessionType !== null && (
    (sessionType === 'single' && !!token) ||
    (sessionType === 'multi' && users.length > 0)
  );

  return (
    <AuthContext.Provider value={{ user, token, sessionType, users, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};