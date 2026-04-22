import { useState, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider } from './context/NavigationContext'; // <-- tambah import
import { useNavigation } from './context/NavigationContext'; // <-- tambah import
import { LoginView } from './features/auth/LoginView';
import { AppRouter } from './routes/AppRouter';
import { Sidebar } from './components/layout/Sidebar';
import { SplashPopup } from './components/ui/SplashPopup';
import { AiChatWidget } from './components/ui/AiChatWidget';

type UserData = {
  id: number;
  username: string;
  email: string;
  role: string;
  lineCode?: string;
  fullName: string;
  permissions: string[];
};

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, login, logout, sessionType, users } = useAuth();
  const { activeTab, setActiveTab } = useNavigation(); // <-- gunakan context

  const [isLoading, setIsLoading] = useState(true);
  // Hapus state activeTab lokal
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showSplashPopup, setShowSplashPopup] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    setIsLoading(false);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // HAPUS useEffect pertama (navigate berdasarkan activeTab)
  
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
    };
    const tab = pathToTab[location.pathname];
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
      localStorage.setItem('nextg_active_tab', tab);
    }
  }, [location.pathname, activeTab, setActiveTab]);

  // HAPUS useEffect ketiga (penyimpanan localStorage terpisah)

  const handleLogin = (userData: any, token: string, sessionType?: 'single' | 'multi', additionalUsers?: any[]) => {
    if (sessionType === 'multi') {
      const primaryUser = { ...userData, id: Number(userData.id) };
      const additional = additionalUsers?.map(u => ({ user: { ...u.user, id: Number(u.user.id) }, token: u.token })) || [];
      login(token, primaryUser, 'multi', additional);
    } else {
      login(token, { ...userData, id: Number(userData.id) }, 'single');
    }
    setActiveTab('dashboard'); // ganti dari setActiveTab lokal ke context
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

  // Determine currentUserForSidebar untuk menu (single user atau multi user ambil user pertama)
  let currentUserForSidebar = null;
  if (sessionType === 'single' && user) {
    currentUserForSidebar = {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      lineCode: user.lineCode,
      allowedStations: user.allowedStations
    };
  } else if (sessionType === 'multi' && users.length > 0) {
    // Gunakan user pertama untuk menentukan menu (karena semua user punya allowedStations sama)
    const firstUser = users[0].user;
    currentUserForSidebar = {
      username: firstUser.username,
      fullName: firstUser.fullName,
      role: firstUser.role,
      lineCode: firstUser.lineCode,
      allowedStations: firstUser.allowedStations
    };
  }

  const multiUsersForSidebar = sessionType === 'multi' ? users.map(u => ({
    username: u.user.username,
    fullName: u.user.fullName,
    role: u.user.role,
    lineCode: u.user.lineCode,
    allowedStations: u.user.allowedStations
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
      <AiChatWidget />
    </>
  );
};

export default function NextGApp() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <NavigationProvider>   {/* <-- tambahkan */}
            <AppContent />
          </NavigationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}