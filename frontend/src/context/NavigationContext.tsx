import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// Mapping dari ID tab ke path URL
const tabToPath: Record<string, string> = {
  dashboard: '/dashboard',
  cutting_entan: '/cutting-entan',
  cutting_pond: '/cutting-pond',
  cp: '/check-panel',
  sewing: '/sewing',
  qc: '/quality-control',
  packing: '/packing',
  fg: '/finished-goods',
  reports: '/reports',
  traceability: '/traceability',
  line_master: '/line-master',
  user_management: '/user-management',
  employee_management: '/employee-management',
  manpower_control: '/manpower-control',
  manpower_monitoring: '/manpower-monitoring',
  target_management: '/target-management',
  target_monitoring: '/target-monitoring',
  login_monitoring: '/login-monitoring',
  device_management: '/device-management',
  ai_management: '/ai-management',
  demand_simulator: '/demand-simulator',
  capacity_dashboard: '/capacity-dashboard',
  gantt_simulation: '/gantt-simulation',
  plan_vs_actual: '/plan-vs-actual',
};

// Mapping dari path ke ID tab (untuk sinkronisasi satu arah)
const pathToTab: Record<string, string> = {};
Object.entries(tabToPath).forEach(([tab, path]) => {
  pathToTab[path] = tab;
});

interface NavigationContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigateToTab: (tab: string) => void;
  navigateToPath: (path: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('nextg_active_tab') || 'dashboard';
  });
  const navigate = useNavigate();

  const navigateToTab = (tab: string) => {
    const path = tabToPath[tab] || '/dashboard';
    setActiveTab(tab);
    localStorage.setItem('nextg_active_tab', tab);
    navigate(path, { replace: true });
  };

  const navigateToPath = (path: string) => {
    const tab = pathToTab[path];
    if (tab) {
      navigateToTab(tab);
    } else {
      navigate(path, { replace: true });
    }
  };

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab, navigateToTab, navigateToPath }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used within NavigationProvider');
  return context;
};