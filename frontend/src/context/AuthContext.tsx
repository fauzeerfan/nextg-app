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
  allowedMenus?: string[];   // <-- tambah
  permissions?: string[];
  department?: string;
  jobTitle?: string;
}

interface MultiUserSession {
  user: User;
  token: string;
}

interface AuthContextType {
  // Single user mode
  user: User | null;
  token: string | null;
  // Multi user mode
  sessionType: 'single' | 'multi' | null;
  users: MultiUserSession[];
  // Actions
  login: (token: string, user: User, sessionType?: 'single' | 'multi', additionalUsers?: MultiUserSession[]) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionType, setSessionType] = useState<'single' | 'multi' | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<MultiUserSession[]>([]);
  const navigate = useNavigate();

  // Load session from localStorage on mount
  useEffect(() => {
    const storedSessionType = localStorage.getItem('sessionType') as 'single' | 'multi' | null;
    if (storedSessionType === 'single') {
      const storedToken = localStorage.getItem('nextg_token'); // ← ubah dari 'token'
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        setSessionType('single');
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    } else if (storedSessionType === 'multi') {
      const storedUsers = localStorage.getItem('multiUsers');
      if (storedUsers) {
        try {
          const parsedUsers: MultiUserSession[] = JSON.parse(storedUsers);
          setSessionType('multi');
          setUsers(parsedUsers);
          // For backward compatibility, set first user as primary
          if (parsedUsers.length > 0) {
            setUser(parsedUsers[0].user);
            setToken(parsedUsers[0].token);
          }
        } catch (e) {
          console.error('Error parsing multi-user data:', e);
        }
      }
    }
  }, []);

  const login = (
    newToken: string,
    newUser: User,
    type: 'single' | 'multi' = 'single',
    additionalUsers: MultiUserSession[] = []
  ) => {
    if (type === 'single') {
      localStorage.setItem('sessionType', 'single');
      localStorage.setItem('nextg_token', newToken); // ← ubah dari 'token'
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.removeItem('multiUsers');
      setSessionType('single');
      setToken(newToken);
      setUser(newUser);
      setUsers([]);
      navigate('/dashboard');
    } else {
      // Multi user: newToken and newUser are the primary (first) user
      const allUsers: MultiUserSession[] = [{ user: newUser, token: newToken }, ...additionalUsers];
      localStorage.setItem('sessionType', 'multi');
      localStorage.setItem('multiUsers', JSON.stringify(allUsers));
      localStorage.removeItem('nextg_token'); // ← ubah dari 'token'
      localStorage.removeItem('user');
      setSessionType('multi');
      setUsers(allUsers);
      setUser(allUsers[0].user);
      setToken(allUsers[0].token);
      navigate('/dashboard');
    }
  };

  const logout = () => {
    localStorage.removeItem('sessionType');
    localStorage.removeItem('nextg_token'); // ← ubah dari 'token'
    localStorage.removeItem('user');
    localStorage.removeItem('multiUsers');
    setSessionType(null);
    setToken(null);
    setUser(null);
    setUsers([]);
    navigate('/login');
  };

  const isAuthenticated = sessionType !== null && ((sessionType === 'single' && !!token) || (sessionType === 'multi' && users.length > 0));

  return (
    <AuthContext.Provider value={{ user, token, sessionType, users, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};