import React, { createContext, useState, useEffect, useContext } from 'react';
// Pastikan menggunakan 'import type' untuk menghindari error module
import type { Theme } from '../types/production';

// 1. Definisikan bentuk Context agar autocomplete jalan
interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

// 2. Inisialisasi Context dengan default value dummy (untuk safety)
const ThemeContext = createContext<ThemeContextType>({ 
  theme: 'system', 
  setTheme: () => {} 
});

// 3. Component GlobalStyles (CSS Variables Injection)
export const GlobalStyles = () => (
  <style>{`
    :root {
      --bg: #f8fafc; --card: #ffffff; --text: #0f172a; --text-muted: #64748b; --border: #e2e8f0;
      --accent-primary: #2563eb; --accent-cp: #7c3aed; --success: #10b981; --warning: #f59e0b; --danger: #ef4444;
      --sidebar-bg: #0f172a; --sidebar-text: #f1f5f9; --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }
    .dark {
      --bg: #0b1221; --card: #151e32; --text: #f1f5f9; --text-muted: #94a3b8; --border: #334155;
      --accent-primary: #3b82f6; --accent-cp: #a78bfa; --success: #34d399; --warning: #fbbf24; --danger: #f87171;
      --sidebar-bg: #020617; --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.5);
    }
    body { background-color: var(--bg); color: var(--text); transition: background-color 0.3s, color 0.3s; }
    .theme-card { background-color: var(--card); border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
    .theme-text { color: var(--text); }
    .theme-text-muted { color: var(--text-muted); }
    .theme-border { border-color: var(--border); }
    .icon-box { display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; }
    @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
    .offline-pulse { animation: pulse-red 2s infinite; }
    .ai-response ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; }
    .ai-response strong { font-weight: 600; color: var(--accent-primary); }
    
    /* Custom Progress Bar */
    .progress-bar-bg { background-color: var(--border); border-radius: 9999px; overflow: hidden; height: 0.5rem; }
    .progress-bar-fill { height: 100%; transition: width 0.5s ease-in-out; }
  `}</style>
);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Cek localStorage saat mounting
    if (typeof window !== 'undefined') return (localStorage.getItem('nextg_theme') as Theme) || 'system';
    return 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    // Logika Dark Mode
    const applyDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', applyDark);
    localStorage.setItem('nextg_theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      <GlobalStyles />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);