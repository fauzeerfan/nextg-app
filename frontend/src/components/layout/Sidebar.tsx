import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Scissors, Grid, ClipboardCheck, Shirt,
  CheckCircle, Package, Truck, Factory, Users,
  PanelLeftClose, PanelLeftOpen, LogOut, Sun, Moon,
  BarChart3, History, Scan, Calendar, Target, LogIn
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { NextGLogo } from '../ui/Logo';

interface UserData {
  username: string;
  fullName: string;
  role: string;
  permissions?: string[];
  email?: string;
  lineCode?: string;
  allowedStations?: string[];
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobile: boolean;
  isOpen: boolean;
  toggleSidebar: () => void;
  currentUser: UserData | null;
  multiUsers?: UserData[];
  sessionType?: 'single' | 'multi' | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
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

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
  };

  const menuGroups = [
    {
      title: "DASHBOARD",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
      ]
    },
    {
      title: "PRODUCTION FLOW",
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
      title: "REPORTS AND ANALYTICS",
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-cyan-500' },
        { id: 'traceability', label: 'Traceability', icon: History, color: 'text-violet-500' },
        { id: 'target_monitoring', label: 'Target Monitoring', icon: BarChart3, color: 'text-amber-500' },
        { id: 'login_monitoring', label: 'Login Monitoring', icon: LogIn, color: 'text-blue-500' },
      ]
    },
    {
      title: "MANPOWER MANAGEMENT",
      items: [
        { id: 'manpower_control', label: 'Manpower Control', icon: Scan, color: 'text-green-500' },
        { id: 'manpower_monitoring', label: 'Manpower Monitoring', icon: Calendar, color: 'text-purple-500' },
      ]
    },
    {
      title: "MASTER DATA",
      items: [
        { id: 'line_master', label: 'Line Master', icon: Factory, color: 'text-cyan-500' },
        { id: 'user_management', label: 'User Management', icon: Users, color: 'text-red-500' },
        { id: 'employee_management', label: 'Employee Management', icon: Users, color: 'text-green-500' },
        { id: 'target_management', label: 'Target Management', icon: Target, color: 'text-amber-500' },
      ]
    }
  ];

  const isCollapsed = !isMobile && !isOpen;

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!currentUser) return false;
      const role = currentUser.role?.toUpperCase();
      if (role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
      if (role === 'MANAGER') {
        if (group.title === 'SYSTEM ADMIN') return false;
        return true;
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

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    const tabToPath: Record<string, string> = {
      'dashboard': '/dashboard',
      'cutting_entan': '/cutting-entan',
      'cutting_pond': '/cutting-pond',
      'cp': '/check-panel',
      'sewing': '/sewing',
      'qc': '/quality-control',
      'packing': '/packing',
      'fg': '/finished-goods',
      'reports': '/reports',
      'traceability': '/traceability',
      'line_master': '/line-master',
      'pattern_master': '/pattern-master',
      'user_management': '/user-management',
      'employee_management': '/employee-management',
      'manpower_control': '/manpower-control',
      'manpower_monitoring': '/manpower-monitoring',
      'target_management': '/target-management',
      'target_monitoring': '/target-monitoring',
      'login_monitoring': '/login-monitoring',   // ✅ mapping sudah benar
    };
    const path = tabToPath[tabId];
    if (path) {
      navigate(path);
      if (isMobile) toggleSidebar();
    }
  };

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
      '/login-monitoring': 'login_monitoring',   // ✅ mapping sudah benar
    };
    const tab = pathToTab[location.pathname];
    if (tab && tab !== activeTab) setActiveTab(tab);
  }, [location.pathname, setActiveTab]);

  // Helper to display user info in footer
  const renderUserInfo = () => {
    if (sessionType === 'single' && currentUser) {
      return (
        <div className="bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-3 flex items-center gap-3 mb-4 shadow-sm transition-all hover:shadow-md">
          <div className="relative shrink-0">
            <img
              src={getAvatarUrl(currentUser.username)}
              alt={currentUser.fullName}
              className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white dark:bg-slate-800 object-cover shadow-sm ring-2 ring-white dark:ring-slate-700"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
            />
            {currentUser.role === 'ADMINISTRATOR' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-slate-800 dark:text-white truncate">
              {currentUser.fullName}
            </div>
            <div className="text-[10px] lg:text-xs font-medium text-slate-500 dark:text-slate-400 capitalize truncate mt-0.5">
              {currentUser.role?.toLowerCase().replace('_', ' ') || 'Operator'}
            </div>
            {currentUser.lineCode && (
              <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold">
                Line {currentUser.lineCode}
              </div>
            )}
          </div>
        </div>
      );
    } else if (sessionType === 'multi' && multiUsers.length > 0) {
      return (
        <div className="bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-3 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-blue-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Multi-User ({multiUsers.length})</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {multiUsers.map((u, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <img src={getAvatarUrl(u.username)} className="w-6 h-6 rounded-full" alt="" />
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{u.fullName}</span>
                <span className="text-[10px] text-slate-400">@{u.username}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/60 transition-all duration-300 ease-in-out shadow-2xl h-screen flex flex-col ${
      isMobile
        ? (isOpen ? 'translate-x-0' : '-translate-x-full')
        : (isOpen ? 'w-64 lg:w-72' : 'w-16 lg:w-20')
    }`}>
      {/* Header / Logo */}
      <div className="flex items-center h-20 lg:h-24 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0 px-4 lg:px-5">
        <div className={`flex items-center w-full transition-all duration-300 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <NextGLogo className="h-14 lg:h-16 w-auto text-blue-600 dark:text-blue-500 drop-shadow-sm shrink-0 hover:scale-105 transition-transform duration-300" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-xl lg:text-2xl font-black italic tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 truncate">
                NextG<span className="text-blue-600 dark:text-blue-500">App</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <nav className="flex-1 overflow-y-auto py-4 px-3 lg:px-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full">
          {filteredGroups.map((group, idx) => (
            <div key={idx} className="mb-6 lg:mb-8 last:mb-2">
              {!isCollapsed && (
                <div className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2.5 px-3 flex items-center gap-2">
                  {group.title}
                  <div className="h-px flex-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-full"></div>
                </div>
              )}
              <div className="space-y-1 lg:space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center gap-3 px-2 lg:px-3 py-2.5 lg:py-3 rounded-xl transition-all duration-300 group relative overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                        ${isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_20px_-4px_rgba(59,130,246,0.4)]'
                          : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }
                        ${isCollapsed ? 'justify-center px-0' : ''}
                      `}
                      title={isCollapsed ? item.label : ''}
                    >
                      <div className={`p-2 lg:p-2.5 rounded-lg transition-all duration-300 flex items-center justify-center ${
                        isActive 
                          ? 'bg-white/20 shadow-inner' 
                          : 'bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 group-hover:scale-110'
                      }`}>
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : item.color} />
                      </div>
                      
                      {!isCollapsed && (
                        <div className="flex-1 text-left overflow-hidden">
                          <div className={`font-semibold text-xs lg:text-sm truncate transition-transform duration-300 ${!isActive && 'group-hover:translate-x-1'}`}>
                            {item.label}
                          </div>
                        </div>
                      )}

                      {/* Active Indicator Dot */}
                      {isActive && !isCollapsed && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer / User Profile & Actions */}
        <div className={`border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md shrink-0 ${isCollapsed ? 'p-2 lg:p-3' : 'p-4 lg:p-5'}`}>
          {!isCollapsed && renderUserInfo()}
          
          <div className={`flex gap-2 ${isCollapsed ? 'flex-col items-center' : 'justify-between'}`}>
            <div className={`flex gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
              <button 
                onClick={toggleTheme} 
                className="p-2 lg:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all duration-200 flex items-center justify-center group outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Toggle Theme"
              >
                <div className="group-hover:rotate-12 transition-transform duration-300">
                  {theme === 'dark' ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
                </div>
              </button>
              <button 
                onClick={toggleSidebar} 
                className="p-2 lg:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all duration-200 flex items-center justify-center group outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <div className="group-hover:-translate-x-0.5 transition-transform duration-300">
                  {isOpen ? <PanelLeftClose size={18} strokeWidth={2.5} /> : <PanelLeftOpen size={18} strokeWidth={2.5} />}
                </div>
              </button>
            </div>
            <button 
              onClick={() => { if (window.confirm('Are you sure you want to log out?')) onLogout(); }} 
              className={`p-2 lg:p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center group outline-none focus-visible:ring-2 focus-visible:ring-red-500
                ${isCollapsed 
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white shadow-sm hover:shadow-red-500/30 flex-1 ml-2'
                }`}
              title="Logout"
            >
              <div className="flex items-center justify-center gap-2">
                <LogOut size={18} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
                {!isCollapsed && <span className="font-bold text-sm">Logout</span>}
              </div>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};