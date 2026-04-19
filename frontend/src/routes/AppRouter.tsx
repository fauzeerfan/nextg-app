import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardView } from '../features/dashboard/DashboardView';
import { LineMasterView } from '../features/system/LineMasterView';
import { UserManagementView } from '../features/system/UserManagementView';
import { EmployeeManagementView } from '../features/employee/EmployeeManagementView';
import { ManpowerControlView } from '../features/manpower/ManpowerControlView';
import { ManpowerMonitoringView } from '../features/manpower/ManpowerMonitoringView';
import { ReportsView } from '../features/reports/ReportsView';
import { TraceabilityExtendedView } from '../features/traceability/TraceabilityExtendedView';
import { CuttingEntanView } from '../features/stations/CuttingEntanView';
import { CuttingPondView } from '../features/stations/CuttingPondView';
import { CheckPanelView } from '../features/stations/CheckPanelView';
import { SewingView } from '../features/stations/SewingView';
import { QualityControlView } from '../features/stations/QualityControlView';
import { PackingView } from '../features/stations/PackingView';
import { FinishedGoodsView } from '../features/stations/FinishedGoodsView';
import { TargetManagementView } from '../features/system/TargetManagementView';
import { TargetMonitoringView } from '../features/reports/TargetMonitoringView';
import { LoginMonitoringView } from '../features/system/LoginMonitoringView';
import { DeviceManagementView } from '../features/system/DeviceManagementView';
import { AiManagementView } from '../features/ai/AiManagementView';

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
    'traceability': <TraceabilityExtendedView />,
    'line_master': <LineMasterView onNavigate={onNavigate} />,
    'user_management': <UserManagementView />,
    'employee_management': <EmployeeManagementView />,
    'manpower_control': <ManpowerControlView />,
    'manpower_monitoring': <ManpowerMonitoringView />,
    'target_management': <TargetManagementView />,
    'target_monitoring': <TargetMonitoringView />,
    'login_monitoring': <LoginMonitoringView />,
    'device_management': <DeviceManagementView />,
    'ai_management': <AiManagementView />,
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={tabComponents['dashboard']} />

      {/* Stations */}
      <Route path="/cutting-entan" element={tabComponents['cutting_entan']} />
      <Route path="/cutting-pond" element={tabComponents['cutting_pond']} />
      <Route path="/check-panel" element={tabComponents['cp']} />
      <Route path="/sewing" element={tabComponents['sewing']} />
      <Route path="/quality-control" element={tabComponents['qc']} />
      <Route path="/packing" element={tabComponents['packing']} />
      <Route path="/finished-goods" element={tabComponents['fg']} />

      <Route path="/reports" element={tabComponents['reports']} />
      <Route path="/traceability" element={tabComponents['traceability']} />
      <Route path="/target-monitoring" element={tabComponents['target_monitoring']} />

      {/* Master Data */}
      <Route path="/line-master" element={tabComponents['line_master']} />
      <Route path="/pattern-master" element={tabComponents['pattern_master']} />
      <Route path="/user-management" element={tabComponents['user_management']} />
      <Route path="/employee-management" element={tabComponents['employee_management']} />
      <Route path="/manpower-control" element={tabComponents['manpower_control']} />
      <Route path="/manpower-monitoring" element={tabComponents['manpower_monitoring']} />
      <Route path="/target-management" element={tabComponents['target_management']} />
      <Route path="/login-monitoring" element={tabComponents['login_monitoring']} />
      <Route path="/device-management" element={tabComponents['device_management']} />
      <Route path="/ai-management" element={tabComponents['ai_management']} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};