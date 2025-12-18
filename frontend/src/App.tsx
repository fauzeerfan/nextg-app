  import { useState, useEffect } from 'react';
  import { BarChart3 } from 'lucide-react';
  import { ThemeProvider } from './context/ThemeContext';
  import { NetworkStatus } from './components/ui/SharedComponents';
  import { Sidebar, Header } from './components/layout/MainLayout';
  import { DashboardContent } from './features/dashboard/DashboardView';
  import { StationInterface } from './features/stations/StationInterface';
  import { LoginView } from './features/auth/LoginView'; 
  import type { StationCode } from './types/production';

  const AppContent = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    
    // Load last active tab or default to dashboard
    const [activeTab, setActiveTab] = useState(() => {
      return localStorage.getItem('nextg_active_tab') || 'dashboard';
    });

    const [isSidebarOpen, setSidebarOpen] = useState(true); 
    const [isMobile, setIsMobile] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
      // 1. Check Local Storage for Session
      const storedUser = localStorage.getItem('nextg_user');
      const storedToken = localStorage.getItem('nextg_token');

      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Invalid session data", error);
          localStorage.clear(); 
        }
      }

      // 2. Handle Responsive Layout
      const handleResize = () => {
          const mobile = window.innerWidth < 768;
          setIsMobile(mobile);
          if (mobile) setSidebarOpen(false); 
          else setSidebarOpen(true); 
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Save active tab state
    useEffect(() => {
      if (isAuthenticated) {
          localStorage.setItem('nextg_active_tab', activeTab);
      }
    }, [activeTab, isAuthenticated]);

    // --- HANDLERS ---

    const handleLogin = (userData: any, token: string) => {
      setIsAuthenticated(true);
      setCurrentUser(userData);
      localStorage.setItem('nextg_user', JSON.stringify(userData));
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
    };

    const handleNavigate = (tabId: string) => {
        setActiveTab(tabId);
    };

    // --- RENDER LOGIC ---

    if (!isAuthenticated) {
      return <LoginView onLogin={handleLogin} />;
    }
    
    let content;
    if (activeTab === 'dashboard') {
      content = <DashboardContent />; 
    } else {
      let stCode: StationCode = 'CUTTING';
      let devices: string[] = [];
      
      // MAP ACTIVE TAB TO STATION CONFIG
      switch(activeTab) {
        // Production Flow
        case 'CUTTING': stCode='CUTTING'; devices=[]; break; // Cutting no scanner displayed in UI
        case 'CP': stCode='CP'; devices=['dhristi_scanner', 'tablet_interface']; break;
        case 'SEWING': stCode='SEWING'; devices=['dhristi_scanner', 'sparsha_counter']; break;
        case 'QC': stCode='QC'; devices=['tablet_interface']; break;
        case 'PACKING': stCode='PACKING'; devices=['sparsha_counter']; break;
        case 'FG': stCode='FG'; devices=['dhristi_scanner']; break;
        
        // Supporting Flow
        case 'MR': stCode='MR'; devices=['system_integration']; break;
        case 'OPREQ': stCode='OPREQ'; devices=['system_integration']; break;

        // System Management & Overview
        case 'USER_MGMT': stCode='USER_MGMT'; devices=['admin_console']; break;
        case 'ROLE_MGMT': stCode='ROLE_MGMT'; devices=['admin_console']; break;
        case 'PPC': stCode='PPC' as any; devices=['admin_console']; break;
        case 'MASTER_OP': stCode='MASTER_OP' as any; devices=['admin_console']; break;
      }

      let stationDisplayName = activeTab.replace('_', ' ');
      if (activeTab === 'MR') stationDisplayName = 'Material Request';
      if (activeTab === 'OPREQ') stationDisplayName = 'OP Pergantian';
      if (activeTab === 'USER_MGMT') stationDisplayName = 'User Management';
      if (activeTab === 'ROLE_MGMT') stationDisplayName = 'Role Management';
      if (activeTab === 'PPC') stationDisplayName = 'PPC Control Center';
      if (activeTab === 'MASTER_OP') stationDisplayName = 'Master Data OP';

      content = <StationInterface 
                  stationCode={stCode} 
                  stationName={stationDisplayName} 
                  devices={devices} 
                  onNavigate={handleNavigate} 
                />;
    }
    
    const getPageTitle = () => {
        if (activeTab === 'dashboard') return 'Factory Dashboard';
        if (activeTab === 'CP') return 'Check Panel (CP)';
        if (activeTab === 'FG') return 'Finished Goods';
        if (activeTab === 'MR') return 'Material Request Control';
        if (activeTab === 'OPREQ') return 'OP Pergantian (Replacement)';
        if (activeTab === 'USER_MGMT') return 'User Access Management';
        if (activeTab === 'ROLE_MGMT') return 'Role & Permission Config';
        if (activeTab === 'PPC') return 'PPC Control Center';
        if (activeTab === 'MASTER_OP') return 'Master Data Management';
        return activeTab.toLowerCase().replace(/^\w/, c => c.toUpperCase());
    };
    
    return (
      <div className="flex h-screen font-sans transition-colors duration-300 bg-slate-100 dark:bg-slate-950 text-black dark:text-white">
        <NetworkStatus />
        
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isMobile={isMobile} 
          isOpen={isSidebarOpen} 
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
          currentUser={currentUser}
        />
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header 
              toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
              isOpen={isSidebarOpen}
              onLogout={handleLogout}
              currentUser={currentUser}
          />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 dark:bg-slate-950">
            <div className="max-w-[1600px] mx-auto">
              <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-black dark:text-white capitalize">
                      {getPageTitle()}
                    </h1>
                </div>
                
                {activeTab === 'dashboard' && (
                  <button className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-black dark:text-white">
                    <BarChart3 size={14}/> Performance Report
                  </button>
                )}
              </div>
              {content}
            </div>
          </main>
        </div>
        
        {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" 
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}
      </div>
    );
  };

  export default function NextGApp() { 
    return (
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    ); 
  }