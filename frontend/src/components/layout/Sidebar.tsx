import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Scissors, Grid, ClipboardCheck, Shirt,
  CheckCircle, Package, Truck, Factory, Users,
  PanelLeftClose, PanelLeftOpen, LogOut, Sun, Moon,
  BarChart3, History, Scan, Calendar, Target, LogIn, Cpu, Bot, TrendingUp, Box, MapPin
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '../../context/NavigationContext'; // <-- tambah import
import { NextGLogo } from '../ui/Logo';


interface UserData {
  username: string;
  fullName: string;
  role: string;
  permissions?: string[];
  email?: string;
  lineCode?: string;
  allowedStations?: string[];
  allowedMenus?: string[];
}

interface SidebarProps {
  // activeTab: string;            // <-- dihapus
  // setActiveTab: (tab: string) => void; // <-- dihapus
  isMobile: boolean;
  isOpen: boolean;
  toggleSidebar: () => void;
  currentUser: UserData | null;
  multiUsers?: UserData[];
  sessionType?: 'single' | 'multi' | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  // activeTab,       // <-- dihapus
  // setActiveTab,    // <-- dihapus
  isMobile,
  isOpen,
  toggleSidebar,
  currentUser,
  multiUsers = [],
  sessionType = 'single',
  onLogout
}) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setActiveTab, navigateToTab } = useNavigation(); // <-- gunakan context
  const [openGroup, setOpenGroup] = useState<number | null>(0); // Grup pertama (HOME) terbuka default

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
  };

  const menuGroups = [
    {
      title: "HOME",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
        { id: 'automation_island', label: 'Automation Island', icon: MapPin, color: 'text-teal-500' },
      ]
    },
    {
      title: (
        <>
          <div>INVENTORY MANAGEMENT</div>
          <div className="text-sm text-red-500">(COMING SOON)</div>
        </>
      ),
    items: [
      { id: 'inbound_receiving', label: 'Inbound Receiving', icon: Truck, color: 'text-amber-500' },
      { id: 'inspection_storage', label: 'Inspection & Storage', icon: Package, color: 'text-emerald-500' },
      { id: 'inventory_control', label: 'Inventory Control', icon: Box, color: 'text-blue-500' },
    ]
    },
    {
      title: (
        <>
          <div>PRODUCTION PLANNING</div>
          <div className="text-sm text-red-500">(COMING SOON)</div>
        </>
      ),
      items: [
        { id: 'demand_simulator', label: 'Demand Simulator', icon: Calendar, color: 'text-sky-500' },
        { id: 'capacity_dashboard', label: 'Capacity Dashboard', icon: BarChart3, color: 'text-amber-500' },
        { id: 'gantt_simulation', label: 'Planning Gantt', icon: Calendar, color: 'text-purple-500' },
        { id: 'plan_vs_actual', label: 'Plan vs Actual', icon: TrendingUp, color: 'text-emerald-500' },
      ]
    },
    {
      title: "PRODUCTION EXECUTION",
      items: [
        { id: 'cutting_entan', label: 'Cutting Entan', icon: Scissors, color: 'text-orange-500' },
        { id: 'cutting_pond', label: 'Cutting Pond', icon: Grid, color: 'text-blue-500' },
        { id: 'cp', label: 'Check Panel', icon: ClipboardCheck, color: 'text-emerald-500' },
        { id: 'sewing', label: 'Sewing', icon: Shirt, color: 'text-purple-500' },
        { id: 'qc', label: 'Quality Control', icon: CheckCircle, color: 'text-amber-500' },
        { id: 'packing', label: 'Packing', icon: Package, color: 'text-indigo-500' },
        { id: 'fg', label: 'Finished Goods', icon: Truck, color: 'text-green-500' },
      ]
    },
    {
      title: "PRODUCTION MONITORING",
      items: [
        { id: 'target_monitoring', label: 'Target Monitoring', icon: BarChart3, color: 'text-amber-500' },
        
        { id: 'manpower_monitoring', label: 'Manpower Monitoring', icon: Calendar, color: 'text-purple-500' },
        { id: 'manpower_control', label: 'Manpower Control', icon: Scan, color: 'text-green-500' },
      ]
    },
    {
      title: "REPORTS & TRACEABILITY",
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-cyan-500' },
        { id: 'traceability', label: 'Traceability', icon: History, color: 'text-violet-500' },
      ]
    },
    {
      title: "SYSTEM & MASTER DATA",
      items: [
        { id: 'line_master', label: 'Line Master', icon: Factory, color: 'text-cyan-500' },
        { id: 'user_management', label: 'User Management', icon: Users, color: 'text-red-500' },
        { id: 'employee_management', label: 'Employee Management', icon: Users, color: 'text-green-500' },
        { id: 'target_management', label: 'Target Management', icon: Target, color: 'text-amber-500' },
        { id: 'device_management', label: 'Device Management', icon: Cpu, color: 'text-cyan-500' },
        { id: 'ai_management', label: 'AI Management', icon: Bot, color: 'text-purple-500' },
        { id: 'login_monitoring', label: 'Login Monitoring', icon: LogIn, color: 'text-blue-500' },
      ]
    },
  ];

  const isCollapsed = !isMobile && !isOpen;

  const allowedMenus = currentUser?.allowedMenus || [];
  const hasMenuAccess = allowedMenus.length > 0;

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!currentUser) return false;
      const role = currentUser.role?.toUpperCase();
      
      if (role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
      
      if (hasMenuAccess) {
        return allowedMenus.includes(item.id);
      }
      
      const stationMap: Record<string, string> = {
        cutting_entan: 'CUTTING_ENTAN',
        cutting_pond: 'CUTTING_POND',
        cp: 'CP',
        sewing: 'SEWING',
        qc: 'QC',
        packing: 'PACKING',
        fg: 'FG'
      };
      const stationKey = stationMap[item.id];
      if (item.id === 'dashboard') return true;
      if (['line_master', 'user_management'].includes(item.id)) return false;
      if (stationKey && currentUser.allowedStations?.includes(stationKey)) return true;
      return false;
    })
  })).filter(group => group.items.length > 0);

  const toggleGroup = (index: number) => {
    setOpenGroup(prev => prev === index ? null : index);
  };

  // Gunakan navigateToTab dari context
  const handleTabClick = (tabId: string) => {
    navigateToTab(tabId);
    if (isMobile) toggleSidebar();
  };

  // Sinkronisasi path ke tab (untuk back/forward browser)
  React.useEffect(() => {
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
      '/pattern-master': 'pattern_master',
      '/user-management': 'user_management',
      '/employee-management': 'employee_management',
      '/manpower-control': 'manpower_control',
      '/manpower-monitoring': 'manpower_monitoring',
      '/target-management': 'target_management',
      '/target-monitoring': 'target_monitoring',
      '/login-monitoring': 'login_monitoring',
      '/device-management': 'device_management',
      '/ai-management': 'ai_management',
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

  const renderUserInfo = () => {
    if (sessionType === 'single' && currentUser) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 flex items-center gap-3 mb-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="relative shrink-0">
            <img
              src={getAvatarUrl(currentUser.username)}
              alt={currentUser.fullName}
              className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-slate-100 dark:bg-slate-800 object-cover border-2 border-white dark:border-slate-700"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
            />
            {currentUser.role === 'ADMINISTRATOR' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-solid bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-slate-800 dark:text-white truncate">
              {currentUser.fullName}
            </div>
            <div className="text-[10px] lg:text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize truncate">
              {currentUser.role?.toLowerCase().replace('_', ' ') || 'Operator'}
            </div>
            {currentUser.lineCode && (
              <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-white bg-blue-500 dark:bg-blue-600 text-[10px] font-bold shadow-sm">
                Line {currentUser.lineCode}
              </div>
            )}
          </div>
        </div>
      );
    } else if (sessionType === 'multi' && multiUsers.length > 0) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Users size={14} className="text-blue-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Multi-User ({multiUsers.length})</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
            {multiUsers.map((u, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <img src={getAvatarUrl(u.username)} className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700" alt="" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{u.fullName}</span>
                  <span className="text-[9px] text-slate-400 font-medium truncate">@{u.username}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <aside 
      style={{ fontFamily: "'Poppins', sans-serif" }}
      className={`fixed inset-y-0 left-0 z-50 bg-slate-50 dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out shadow-xl flex flex-col ${
      isMobile
        ? (isOpen ? 'translate-x-0' : '-translate-x-full')
        : (isOpen ? 'w-64 lg:w-72' : 'w-16 lg:w-20')
    }`}>
      {/* Header / Logo */}
      <div className="flex items-center justify-center h-20 lg:h-24 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0 px-4">
        <div className={`flex items-center w-full transition-all duration-300 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <NextGLogo className="h-12 lg:h-14 w-auto text-blue-600 dark:text-blue-500 drop-shadow-sm shrink-0 hover:scale-105 transition-transform duration-300" />
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xl lg:text-2xl font-black italic tracking-wide text-slate-800 dark:text-white truncate">
                NextG<span className="text-blue-600 dark:text-blue-500">App</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <nav className="flex-1 overflow-y-auto py-4 px-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          {filteredGroups.map((group, idx) => {
            const isOpen = openGroup === idx;
            return (
              <div key={idx} className="mb-1">
                {!isCollapsed ? (
                  <>
                    <button
                      onClick={() => toggleGroup(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider transition-all rounded-lg outline-none
                        ${isOpen 
                          ? 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 mb-1' 
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                      <span>{group.title}</span>
                      <svg
                        className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 mb-3' : 'max-h-0 opacity-0'}`}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleTabClick(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                              ${isActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                                : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'
                              }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                              isActive 
                                ? 'bg-white/20 text-white' 
                                : `bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700 ${item.color} group-hover:scale-110`
                            }`}>
                              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <div className="flex-1 text-left overflow-hidden">
                              <div className={`text-xs lg:text-sm truncate transition-transform duration-200 ${!isActive && 'group-hover:translate-x-1'}`}>
                                {item.label}
                              </div>
                            </div>
                            {isActive && (
                              <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  // State saat sidebar di-collapse
                  <div className="space-y-2 mb-4">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleTabClick(item.id)}
                          className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                            ${isActive
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'bg-transparent hover:bg-slate-200/70 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : item.color} />
                          
                          {/* Custom Floating Tooltip yang modern */}
                          <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-800 text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap shadow-xl flex items-center gap-2 border border-slate-700 dark:border-slate-200">
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-800 dark:bg-white rotate-45 border-l border-b border-slate-700 dark:border-slate-200"></div>
                            <Icon size={14} className={isActive ? 'text-white dark:text-slate-800' : item.color} />
                            {item.label}
                          </div>
                        </button>
                      );
                    })}
                    {/* Divider tipis pemisah antar grup saat di-collapse */}
                    <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 mx-auto mt-2"></div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer / User Profile & Actions */}
        <div className={`border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/80 shrink-0 ${isCollapsed ? 'p-3' : 'p-4'}`}>
          {!isCollapsed && renderUserInfo()}
          
          <div className={`flex gap-2 ${isCollapsed ? 'flex-col items-center' : 'justify-between'}`}>
            <div className={`flex gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
              <button 
                onClick={toggleTheme} 
                className="p-2.5 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Toggle Theme"
              >
                <div className="group-hover:rotate-45 transition-transform duration-300">
                  {theme === 'dark' ? <Sun size={18} strokeWidth={2.5} className="text-amber-500" /> : <Moon size={18} strokeWidth={2.5} className="text-slate-700" />}
                </div>
              </button>
              <button 
                onClick={toggleSidebar} 
                className="p-2.5 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40 dark:hover:text-blue-400 transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <div className="group-hover:scale-110 transition-transform duration-300">
                  {isOpen ? <PanelLeftClose size={18} strokeWidth={2.5} /> : <PanelLeftOpen size={18} strokeWidth={2.5} />}
                </div>
              </button>
            </div>
            
            <button 
              onClick={() => { if (window.confirm('Are you sure you want to log out?')) onLogout(); }} 
              className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center group outline-none focus-visible:ring-2 focus-visible:ring-red-500
                ${isCollapsed 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white shadow-sm hover:shadow-red-500/30 flex-1 ml-2'
                }`}
              title="Logout"
            >
              <div className="flex items-center justify-center gap-2">
                <LogOut size={18} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform duration-300" />
                {!isCollapsed && <span className="font-bold text-sm tracking-wide">Logout</span>}
              </div>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};