import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Scissors, Grid, ClipboardCheck, Shirt,
  CheckCircle, Package, Truck, Factory, Users,
  PanelLeftClose, PanelLeftOpen, LogOut, Sun, Moon,
  BarChart3, History, Scan, Calendar
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
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobile,
  isOpen,
  toggleSidebar,
  currentUser,
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
    };
    const tab = pathToTab[location.pathname];
    if (tab && tab !== activeTab) setActiveTab(tab);
  }, [location.pathname, setActiveTab]);

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out shadow-xl h-screen flex flex-col ${
      isMobile
        ? (isOpen ? 'translate-x-0' : '-translate-x-full')
        : (isOpen ? 'w-64 lg:w-72' : 'w-16 lg:w-20')
    }`}>
      <div className="flex items-center h-20 lg:h-24 border-b border-slate-100 dark:border-slate-800/50 shrink-0 px-3 lg:px-4">
        <div className={`flex items-center w-full transition-all duration-300 ${isCollapsed ? 'justify-center' : 'gap-2 lg:gap-3'}`}>
          <NextGLogo className="h-14 lg:h-16 w-auto text-blue-600 dark:text-white drop-shadow-sm shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-xl lg:text-2xl font-bold italic tracking-wider text-slate-800 dark:text-white truncate max-w-[120px] lg:max-w-none">
                NextG<span className="text-blue-600 dark:text-blue-500">App</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <nav className="flex-1 overflow-y-auto py-3 px-2 lg:px-3">
          {filteredGroups.map((group, idx) => (
            <div key={idx} className="mb-4 lg:mb-6">
              {!isCollapsed && (
                <div className="text-[8px] lg:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 lg:mb-2 px-2 lg:px-3">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5 lg:space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 lg:py-3 rounded-xl transition-all duration-200 group relative overflow-hidden cursor-pointer
                        ${isActive
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
                        }
                        ${isCollapsed ? 'justify-center px-0' : ''}
                      `}
                      title={isCollapsed ? item.label : ''}
                    >
                      <div className={`p-1.5 lg:p-2 rounded-lg transition-colors ${
                        isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                      }`}>
                        <Icon size={18} className={isActive ? 'text-white' : item.color} />
                      </div>
                      {!isCollapsed && (
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-xs lg:text-sm truncate">{item.label}</div>
                        </div>
                      )}
                      {isActive && !isCollapsed && (
                        <div className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`border-t border-slate-100 dark:border-slate-800/50 shrink-0 ${isCollapsed ? 'px-1 lg:px-2' : 'px-3 lg:px-4'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4 pt-3 lg:pt-4">
              <div className="relative">
                <img
                  src={getAvatarUrl(currentUser?.username || 'default')}
                  alt={currentUser?.fullName || 'User'}
                  className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-slate-200 dark:bg-slate-700 object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                />
                {currentUser?.role === 'ADMINISTRATOR' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs lg:text-sm text-slate-800 dark:text-white truncate">
                  {currentUser?.fullName || 'User'}
                </div>
                <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                  {currentUser?.role?.toLowerCase().replace('_', ' ') || 'Operator'}
                </div>
                {currentUser?.lineCode && (
                  <div className="text-[9px] lg:text-xs text-slate-400 mt-0.5 truncate">
                    Line {currentUser.lineCode}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className={`flex gap-1 lg:gap-2 pb-3 lg:pb-4 ${isCollapsed ? 'flex-col items-center' : 'justify-center'}`}>
            <button onClick={toggleTheme} className="p-1.5 lg:p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={toggleSidebar} className="p-1.5 lg:p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center">
              {isOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
            <button onClick={() => { if (window.confirm('Are you sure you want to log out?')) onLogout(); }} className="p-1.5 lg:p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center">
              <LogOut size={16} className="text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};