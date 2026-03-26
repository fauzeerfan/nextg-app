import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardView } from '../features/dashboard/DashboardView';
import { LineMasterView } from '../features/system/LineMasterView';
import { UserManagementView } from '../features/system/UserManagementView';
import { ReportsView } from '../features/reports/ReportsView';
import { TraceabilityView } from '../features/traceability/TraceabilityView';
import { CuttingEntanView } from '../features/stations/CuttingEntanView';
import { CuttingPondView } from '../features/stations/CuttingPondView';
import { CheckPanelView } from '../features/stations/CheckPanelView';
import { SewingView } from '../features/stations/SewingView';
import { QualityControlView } from '../features/stations/QualityControlView';
import { PackingView } from '../features/stations/PackingView';
import { FinishedGoodsView } from '../features/stations/FinishedGoodsView';

interface AppRouterProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  addLog: (msg: string, type?: any) => void;
  onNavigate: (tab: string) => void;
}

export const AppRouter: React.FC<AppRouterProps> = ({
  activeTab,
  setActiveTab,
  addLog,
  onNavigate
}) => {
  // Fungsi untuk menangani navigasi dan update tab
  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId);
    window.history.pushState({}, '', `/${tabId.replace('_', '-')}`);
  };

  // Mapping antara tab ID dan komponen
  const tabComponents: Record<string, React.ReactNode> = {
    'dashboard': <DashboardView />,
    'cutting_entan': <CuttingEntanView addLog={addLog} />,
    'cutting_pond': <CuttingPondView />,
    'cp': <CheckPanelView addLog={addLog} onNavigate={onNavigate} />,
    'sewing': <SewingView />,
    'qc': <QualityControlView addLog={addLog} onNavigate={onNavigate} />,
    'packing': <PackingView />,
    'fg': <FinishedGoodsView />,
    'reports': <ReportsView />,
    'traceability': <TraceabilityView />,
    'line_master': <LineMasterView onNavigate={onNavigate} />,
    'user_management': <UserManagementView />
  };

  return (
    <Routes>
      {/* Dashboard */}
      <Route 
        path="/" 
        element={
          <Navigate to="/dashboard" replace />
        } 
      />
      <Route 
        path="/dashboard" 
        element={tabComponents['dashboard']} 
      />
      
      {/* Stations */}
      <Route 
        path="/cutting-entan" 
        element={tabComponents['cutting_entan']} 
      />
      <Route 
        path="/cutting-pond" 
        element={tabComponents['cutting_pond']} 
      />
      <Route 
        path="/check-panel" 
        element={tabComponents['cp']} 
      />
      <Route 
        path="/sewing" 
        element={tabComponents['sewing']} 
      />
      <Route 
        path="/quality-control" 
        element={tabComponents['qc']} 
      />
      <Route 
        path="/packing" 
        element={tabComponents['packing']} 
      />
      <Route 
        path="/finished-goods" 
        element={tabComponents['fg']} 
      />

      <Route 
        path="/reports" 
        element={tabComponents['reports']} 
      />
      <Route 
        path="/traceability" 
        element={tabComponents['traceability']} 
      />
      
      {/* Master Data */}
      <Route 
        path="/line-master" 
        element={tabComponents['line_master']} 
      />
      <Route 
        path="/pattern-master" 
        element={tabComponents['pattern_master']} 
      />
      <Route 
        path="/user-management" 
        element={tabComponents['user_management']} 
      />
      
      {/* Fallback */}
      <Route 
        path="*" 
        element={<Navigate to="/dashboard" replace />} 
      />
    </Routes>
  );
};