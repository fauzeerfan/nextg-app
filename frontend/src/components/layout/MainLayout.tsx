import { 
  LayoutDashboard, Scissors, ClipboardCheck, Shirt, CheckCircle, Package, Truck, Database, Sun, Moon, PanelLeftOpen,
  FileInput, RefreshCw, LogOut, UserCog, ShieldCheck, BookOpen
} from 'lucide-react'; 
import { useTheme } from '../../context/ThemeContext';
import { NextGLogo } from '../ui/Logo';

export const Sidebar = ({ activeTab, setActiveTab, isMobile, isOpen, toggleSidebar, currentUser }: any) => {
  // DEFINISI GRUP MENU LENGKAP
  const menuGroups = [
    {
      title: "OVERVIEW",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: "PRODUCTION FLOW",
      items: [
        { id: 'CUTTING', label: 'Cutting', icon: Scissors },
        { id: 'CP', label: 'Check Panel', icon: ClipboardCheck },
        { id: 'SEWING', label: 'Sewing', icon: Shirt },
        { id: 'QC', label: 'Quality Control', icon: CheckCircle },
        { id: 'PACKING', label: 'Packing', icon: Package },
        { id: 'FG', label: 'Finished Goods', icon: Truck },
      ]
    },
    {
      title: "SUPPORTING FLOW",
      items: [
        { id: 'MR', label: 'Material Request', icon: FileInput },
        { id: 'OPREQ', label: 'OP Pergantian', icon: RefreshCw },
      ]
    },
    {
      title: "SYSTEM MANAGEMENT",
      items: [
        { id: 'PPC', label: 'PPC Control', icon: Database },
        { id: 'MASTER_OP', label: 'Pattern Master', icon: BookOpen }, // Moved here
        { id: 'USER_MGMT', label: 'User Management', icon: UserCog },
        { id: 'ROLE_MGMT', label: 'Role Management', icon: ShieldCheck },
      ]
    }
  ];
  
  const isCollapsed = !isMobile && !isOpen;

  // --- FILTER LOGIC (RBAC) ---
  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Super Admin bisa melihat semua
      if (currentUser?.role === 'SUPER_ADMIN') return true;
      // User lain hanya melihat sesuai permissions
      return currentUser?.permissions?.includes(item.id);
    })
  })).filter(group => group.items.length > 0); // Hapus grup kosong jika tidak ada item yang diizinkan

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden flex-shrink-0 transition-all duration-300 ease-in-out shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-64 md:translate-x-0 md:static ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
    >
      {/* HEADER SIDEBAR */}
      <div className="flex items-center h-24 border-b border-slate-100 dark:border-slate-800/50 mb-2 transition-colors duration-300">
        <div className={`flex items-center w-full px-4 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
          {/* Logo Icon */}
          <NextGLogo className="h-16 w-auto text-blue-600 dark:text-white drop-shadow-sm transition-colors duration-300 shrink-0" />
          
          {/* Text Branding */}
          <span 
            className={`text-2xl font-bold italic tracking-wider flex items-center gap-1 transition-all duration-300 text-slate-800 dark:text-white whitespace-nowrap overflow-hidden
              ${isCollapsed ? 'w-0 opacity-0 scale-0' : 'w-auto opacity-100 scale-100'}
            `}
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            NextG
            <span className="text-blue-600 dark:text-blue-500">App</span>
          </span>
        </div>
      </div>

      {/* NAVIGATION MENU */}
      <nav className="p-2 space-y-6 overflow-y-auto h-[calc(100vh-96px)] custom-scrollbar">
        {filteredGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {/* Group Title */}
            <div 
              className={`
                text-[10px] font-bold uppercase mb-2 pl-4 tracking-widest opacity-80 text-slate-400 dark:text-slate-500 
                transition-all duration-300 whitespace-nowrap overflow-hidden
                ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-80'}
              `}
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              {group.title}
            </div>
            
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                
                // Styling khusus untuk membedakan tipe grup (Optional, for better UX)
                const isSupport = ['MR', 'OPREQ'].includes(item.id);
                const isSystem = ['USER_MGMT', 'ROLE_MGMT', 'PPC', 'MASTER_OP'].includes(item.id);
                
                return (
                  <button 
                    key={item.id} 
                    onClick={() => { setActiveTab(item.id); if(isMobile) toggleSidebar(); }} 
                    aria-label={`Maps to ${item.label}`} 
                    title={isCollapsed ? item.label : ''} 
                    className={`
                      flex items-center w-full py-3 rounded-xl transition-all duration-300 group text-sm relative overflow-hidden
                      ${isCollapsed ? 'justify-center px-0' : 'px-4'}
                      ${isActive 
                        ? isSupport
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 shadow-sm'
                          : isSystem 
                            ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 shadow-sm'
                            : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
                      }
                    `}
                  >
                    <item.icon 
                      size={20} 
                      className={`transition-transform duration-300 shrink-0 ${isActive ? (isSupport ? 'text-orange-600 dark:text-orange-400' : isSystem ? 'text-slate-800 dark:text-slate-200' : 'text-white scale-110') : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:scale-110'}`} 
                    />
                    
                    <span 
                      className={`font-bold italic tracking-wide ml-3 whitespace-nowrap transition-all duration-300 overflow-hidden
                        ${isCollapsed ? 'w-0 opacity-0 translate-x-10' : 'w-auto opacity-100 translate-x-0'}
                      `} 
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      {item.label}
                    </span>

                    {/* Active Indicator Bar */}
                    {isActive && !isCollapsed && !isSupport && !isSystem && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/30 rounded-l-full" />}
                    {isActive && !isCollapsed && isSupport && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-l-full" />}
                    {isActive && !isCollapsed && isSystem && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-slate-500 rounded-l-full" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export const Header = ({ toggleSidebar, isOpen, onLogout, currentUser }: any) => {
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  
  return (
  <header 
    className={`
      h-16 flex items-center justify-between px-4 sticky top-0 z-40 backdrop-blur-md border-b 
      border-slate-200 dark:border-slate-800
      bg-white/80 dark:bg-[#0f172a]/80
      transition-colors duration-300
    `}
  >
    <div className="flex items-center">
      {/* Toggle Button with Animation */}
      <button 
        onClick={toggleSidebar} 
        className="p-2 mr-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 active:scale-95 transform"
        aria-label="Toggle Sidebar"
      >
        <PanelLeftOpen 
          size={24} 
          className={`transition-transform duration-500 ease-in-out ${!isOpen ? 'rotate-180' : 'rotate-0'}`} 
        />
      </button>

      <div className="hidden md:block">
        <h2 className="text-sm font-bold text-black dark:text-white transition-colors">PT Seikou Seat Cover</h2>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      {/* Theme Toggle */}
      <button 
        onClick={() => setTheme(next)} 
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-white transition-colors"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Logout Button */}
      <button 
        onClick={onLogout}
        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        title="Sign Out"
      >
        <LogOut size={18} />
      </button>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 border-l border-transparent"></div>
      
      {/* User Profile */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-bold text-black dark:text-white transition-colors">{currentUser?.fullName || 'User'}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 transition-colors">{currentUser?.jobTitle || 'Staff MSDC'}</div>
        </div>
        <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm transition-colors bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
           <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'User'}&backgroundColor=b6e3f4`} 
            alt="Profile" 
            className="h-full w-full object-cover hover:scale-110 transition-transform duration-300"
          />
        </div>
      </div>
    </div>
  </header>
)};