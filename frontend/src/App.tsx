import { useState, useEffect } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider } from './context/NavigationContext';
import { useNavigation } from './context/NavigationContext';
import { LoginView } from './features/auth/LoginView';
import { AppRouter } from './routes/AppRouter';
import { Sidebar } from './components/layout/Sidebar';
import { SplashPopup } from './components/ui/SplashPopup';
import { FebyWidget } from './components/ui/FebyWidget';

const AppContent = () => {
  const location = useLocation();
  const { user, isAuthenticated, login, logout, sessionType, users } = useAuth();
  const { activeTab, setActiveTab } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const decodeJwt = (token: string): any => {
    try {
      const base64url = token.split('.')[1];
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(base64 + padding));
    } catch { return null; }
  };

  const checkSessionExpiry = () => {
    const sessionType = localStorage.getItem('sessionType');
    if (!sessionType) return;

    let expired = false;
    const now = Date.now();

    // Cara 1: cek nextg_session_expires yang disimpan saat login
    const expiresAt = localStorage.getItem('nextg_session_expires');
    if (expiresAt) {
      expired = now > parseInt(expiresAt, 10);
    }

    // Cara 2: fallback — decode JWT langsung (untuk sesi lama tanpa nextg_session_expires)
    if (!expired && !expiresAt) {
      const token = localStorage.getItem('nextg_token');
      if (token) {
        const payload = decodeJwt(token);
        if (payload?.exp) expired = now > payload.exp * 1000;
        else if (!payload) expired = true;
      }

      const multiRaw = localStorage.getItem('multiUsers');
      if (multiRaw && !localStorage.getItem('nextg_token')) {
        try {
          const multiUsers = JSON.parse(multiRaw);
          expired = multiUsers.every((u: any) => {
            const p = decodeJwt(u.token);
            return p?.exp ? now > p.exp * 1000 : true;
          });
        } catch { expired = true; }
      }
    }

    if (expired) {
      console.log('[Session] Expired — clearing and reloading');
      localStorage.removeItem('sessionType');
      localStorage.removeItem('nextg_token');
      localStorage.removeItem('user');
      localStorage.removeItem('multiUsers');
      localStorage.removeItem('nextg_session_expires');
      window.location.reload();
    }
  };

  // 🔥 Panggil segera saat komponen dimuat
  checkSessionExpiry();

  const interval = setInterval(checkSessionExpiry, 60 * 1000);
  window.addEventListener('focus', checkSessionExpiry);
  document.addEventListener('visibilitychange', checkSessionExpiry);
  return () => {
    clearInterval(interval);
    window.removeEventListener('focus', checkSessionExpiry);
    document.removeEventListener('visibilitychange', checkSessionExpiry);
  };
}, []);
  // ───────────────────────────────────────────────────────────────────────
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showSplashPopup, setShowSplashPopup] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    setIsLoading(false);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pertahankan useEffect sinkronisasi path ke tab (untuk back/forward)
  useEffect(() => {
    const pathToTab: Record<string, string> = {
      '/dashboard': 'dashboard',
      '/cutting-entan': 'cutting_entan',
      '/cutting-pond': 'cutting_pond',
      '/check-panel': 'cp',
      '/sewing': 'sewing',
      '/quality-control': 'qc',
      '/packing': 'packing',
      '/finished-goods': 'fg',
      '/reports': 'reports',
      '/traceability': 'traceability',
      '/line-master': 'line_master',
      '/user-management': 'user_management',
      '/employee-management': 'employee_management',
      '/manpower-control': 'manpower_control',
      '/manpower-monitoring': 'manpower_monitoring',
      '/target-management': 'target_management',
      '/target-monitoring': 'target_monitoring',
      '/login-monitoring': 'login_monitoring',
      '/device-management': 'device_management',
      '/ai-management': 'ai_management',
      '/demand-simulator': 'demand_simulator',
      '/capacity-dashboard': 'capacity_dashboard',
      '/gantt-simulation': 'gantt_simulation',
      '/plan-vs-actual': 'plan_vs_actual',
      '/inbound-receiving': 'inbound_receiving',
      '/inspection-storage': 'inspection_storage',
      '/inventory-control': 'inventory_control',
    };
    const tab = pathToTab[location.pathname];
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
      localStorage.setItem('nextg_active_tab', tab);
    }
  }, [location.pathname, activeTab, setActiveTab]);

  const handleLogin = (userData: any, token: string, sessionType?: 'single' | 'multi', additionalUsers?: any[]) => {
    if (sessionType === 'multi') {
      const primaryUser = { ...userData, id: Number(userData.id) };
      const additional = additionalUsers?.map(u => ({ user: { ...u.user, id: Number(u.user.id) }, token: u.token })) || [];
      login(token, primaryUser, 'multi', additional);
    } else {
      login(token, { ...userData, id: Number(userData.id) }, 'single');
    }
    setActiveTab('dashboard');
    setShowSplashPopup(true);
  };

  const handleLogout = () => {
    logout();
    setShowSplashPopup(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading NextG System...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  let currentUserForSidebar = null;
  if (sessionType === 'single' && user) {
    currentUserForSidebar = {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      lineCode: user.lineCode,
      allowedStations: user.allowedStations,
      // PENTING: sertakan allowedMenus agar Sidebar memfilter menu sesuai
      // "Menu Access Rights". Tanpa ini, menu yang dicentang tidak muncul.
      allowedMenus: user.allowedMenus,
    };
  } else if (sessionType === 'multi' && users.length > 0) {
    const firstUser = users[0].user;
    currentUserForSidebar = {
      username: firstUser.username,
      fullName: firstUser.fullName,
      role: firstUser.role,
      lineCode: firstUser.lineCode,
      allowedStations: firstUser.allowedStations,
      allowedMenus: firstUser.allowedMenus,
    };
  }

  const multiUsersForSidebar = sessionType === 'multi' ? users.map(u => ({
    username: u.user.username,
    fullName: u.user.fullName,
    role: u.user.role,
    lineCode: u.user.lineCode,
    allowedStations: u.user.allowedStations,
    allowedMenus: u.user.allowedMenus,
  })) : [];

  return (
    <>
      <SplashPopup show={showSplashPopup} onClose={() => setShowSplashPopup(false)} />
      <div className="flex min-h-screen font-sans transition-colors duration-300 bg-slate-100 dark:bg-slate-950 text-black dark:text-white">
        <div className="hidden md:block">
          <Sidebar 
            isMobile={isMobile}
            isOpen={isSidebarOpen}
            toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
            currentUser={currentUserForSidebar}
            multiUsers={multiUsersForSidebar}
            sessionType={sessionType}
            onLogout={handleLogout}
          />
        </div>
        {isMobile && isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        {isMobile && (
          <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Sidebar 
              isMobile={isMobile}
              isOpen={isSidebarOpen}
              toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
              currentUser={currentUserForSidebar}
              multiUsers={multiUsersForSidebar}
              sessionType={sessionType}
              onLogout={handleLogout}
            />
          </div>
        )}
        <div className={`flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 ${!isMobile && isSidebarOpen ? 'md:ml-64 lg:ml-72' : 'md:ml-20'}`}>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 dark:bg-slate-950">
            <div className="max-w-[1600px] mx-auto">
              <AppRouter 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                addLog={() => {}}
                onNavigate={setActiveTab}
              />
            </div>
          </main>
        </div>
      </div>
      {/* Widget Feby hanya muncul jika user memiliki menu akses 'ai_chat' atau role ADMINISTRATOR */}
      {(() => {
        // Cek dari user primary (sesi single atau multi)
        const hasFebyAccess =
          user?.role === 'ADMINISTRATOR' ||
          (user?.allowedMenus && user.allowedMenus.includes('ai_chat'));
        return hasFebyAccess ? <FebyWidget /> : null;
      })()}
    </>
  );
};

export default function NextGApp() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}