// frontend/src/App.tsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LoginView } from './features/auth/LoginView';
import { AppRouter } from './routes/AppRouter';
import { Sidebar } from './components/layout/Sidebar';

// Types - Perbarui untuk mencocokkan dengan yang diharapkan oleh Sidebar
type UserData = {
  id: number;
  username: string;
  email: string;
  role: string;
  lineCode?: string;
  fullName: string;  // Ditambahkan
  permissions: string[];  // Ditambahkan
};

// Tipe untuk data yang diterima dari API login
type LoginResponseData = {
  id: number;
  username: string;
  email: string;
  role: string;
  lineCode?: string;
  fullName: string;
  permissions: string[];
  token: string;
};

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('nextg_active_tab') || 'dashboard';
  });
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Setup responsive dan authentication
  useEffect(() => {
    // Check Authentication
    const checkAuth = () => {
      const storedUser = localStorage.getItem('nextg_user');
      const storedToken = localStorage.getItem('nextg_token');

      if (storedUser && storedToken) {
        try {
          const parsedUser: UserData = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Invalid session data:', error);
          localStorage.clear();
        }
      }
      setIsLoading(false);
    };

    // Setup Responsive Layout
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Initialize
    checkAuth();
    handleResize();

    // Add Event Listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sync URL dengan activeTab
  useEffect(() => {
    const tabToPath: Record<string, string> = {
      'dashboard': '/dashboard',
      'cutting_entan': '/cutting-entan',
      'cutting_pond': '/cutting-pond',
      'cp': '/check-panel',
      'sewing': '/sewing',
      'qc': '/quality-control',
      'packing': '/packing',
      'fg': '/finished-goods',
      'line_master': '/line-master',
      'pattern_master': '/pattern-master',
      'user_management': '/user-management'
    };

    const path = tabToPath[activeTab] || '/dashboard';
    if (location.pathname !== path) {
      navigate(path);
    }
  }, [activeTab, navigate, location.pathname]);

  // Sync activeTab dengan URL saat load
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
      '/line-master': 'line_master',
      '/pattern-master': 'pattern_master',
      '/user-management': 'user_management'
    };

    const tab = pathToTab[location.pathname];
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.pathname]);

  // Save active tab state
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('nextg_active_tab', activeTab);
    }
  }, [activeTab, isAuthenticated]);

  // Handlers
  const handleLogin = (userData: LoginResponseData, token: string) => {
    // Ekstrak data user yang diperlukan (tanpa token)
    const { token: _, ...userWithoutToken } = userData;
    const userForState: UserData = userWithoutToken;
    
    setIsAuthenticated(true);
    setCurrentUser(userForState);
    localStorage.setItem('nextg_user', JSON.stringify(userForState));
    localStorage.setItem('nextg_token', token);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('nextg_user');
    localStorage.removeItem('nextg_token');
    localStorage.removeItem('nextg_active_tab');
    setActiveTab('dashboard');
    navigate('/');
  };

  // Loading state
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

  // Get page title
  const getPageTitle = () => {
    const titleMap: Record<string, string> = {
      'dashboard': 'Production Dashboard',
      'cutting_entan': 'Cutting Entan',
      'cutting_pond': 'Cutting Pond',
      'cp': 'Check Panel',
      'sewing': 'Sewing',
      'qc': 'Quality Control',
      'packing': 'Packing',
      'fg': 'Finished Goods',
      'line_master': 'Line Master',
      'pattern_master': 'Pattern Master',
      'user_management': 'User Management',
    };
    
    return titleMap[activeTab] || activeTab.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="flex min-h-screen font-sans transition-colors duration-300 bg-slate-100 dark:bg-slate-950 text-black dark:text-white">
      {/* Sidebar - Hanya tampil di desktop */}
      <div className="hidden md:block">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isMobile={isMobile}
            isOpen={isSidebarOpen}
            toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        </div>
      )}

      {/* Main Content Area - Tanpa header */}
      {/* PERBAIKAN: Tambahkan margin kiri yang menyesuaikan dengan lebar sidebar */}
      <div className={`flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 ${
        !isMobile && isSidebarOpen ? 'md:ml-64' : 'md:ml-20'
      }`}>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 dark:bg-slate-950">
          <div className="max-w-[1600px] mx-auto">
            {/* Content */}
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
  );
};

export default function NextGApp() { 
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  ); 
}