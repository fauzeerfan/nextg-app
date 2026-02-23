import { useState, useEffect } from 'react';
import { 
  AlertCircle, RefreshCw, Clock, TrendingUp, Activity,
  CheckCircle, Info
} from 'lucide-react';
import type { StationCode } from '../../types/production';
import { CuttingEntanView } from './CuttingEntanView';
import { CuttingPondView } from './CuttingPondView';
import { CheckPanelView } from './CheckPanelView';
import { SewingView } from './SewingView';
import { QualityControlView } from './QualityControlView';
import { PackingView } from './PackingView';
import { FinishedGoodsView } from './FinishedGoodsView';
import { LineMasterView } from '../system/LineMasterView';
import { UserManagementView } from '../system/UserManagementView';

interface StationInterfaceProps {
  stationCode: StationCode;
  stationName: string;
  devices: string[];
  onNavigate: (tab: string) => void;
}

export const StationInterface: React.FC<StationInterfaceProps> = ({ 
  stationCode, 
  stationName, 
  devices,
  onNavigate 
}) => {
  const [iotStatus, setIotStatus] = useState<Record<string, boolean>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const status: Record<string, boolean> = {};
    devices.forEach(device => {
      status[device] = Math.random() > 0.2;
    });
    setIotStatus(status);
    setLastUpdate(new Date().toLocaleTimeString());

    const interval = setInterval(() => {
      const newStatus: Record<string, boolean> = {};
      devices.forEach(device => {
        newStatus[device] = Math.random() > 0.1;
      });
      setIotStatus(newStatus);
      setIsOnline(Math.random() > 0.05);
      setLastUpdate(new Date().toLocaleTimeString());
    }, 10000);

    return () => clearInterval(interval);
  }, [devices]);

  const renderStationView = () => {
    switch (stationCode) {
      case 'CUTTING_ENTAN':
        return <CuttingEntanView addLog={(msg, type) => console.log(msg, type)} />;
      case 'CUTTING_POND':
        return <CuttingPondView />;
      case 'CP':
        return <CheckPanelView addLog={(msg, type) => console.log(msg, type)} onNavigate={onNavigate} />;
      case 'SEWING':
        return <SewingView />;
      case 'QC':
        return <QualityControlView />;
      case 'PACKING':
        return <PackingView />;
      case 'FG':
        return <FinishedGoodsView />;
      case 'LINE_MASTER':
        return <LineMasterView />;
      case 'USER_MGMT':
        return <UserManagementView />;
      default:
        return (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">
              Station "{stationName}" is under development
            </h3>
          </div>
        );
    }
  };

  const getStationColor = () => {
    const colors: Record<string, string> = {
      'CUTTING_ENTAN': 'bg-gradient-to-r from-orange-500 to-orange-600',
      'CUTTING_POND': 'bg-gradient-to-r from-blue-500 to-blue-600',
      'CP': 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      'SEWING': 'bg-gradient-to-r from-purple-500 to-purple-600',
      'QC': 'bg-gradient-to-r from-amber-500 to-amber-600',
      'PACKING': 'bg-gradient-to-r from-indigo-500 to-indigo-600',
      'FG': 'bg-gradient-to-r from-green-500 to-green-600',
      'LINE_MASTER': 'bg-gradient-to-r from-cyan-500 to-cyan-600',
      'USER_MGMT': 'bg-gradient-to-r from-pink-500 to-pink-600',
    };
    return colors[stationCode] || 'bg-gradient-to-r from-slate-500 to-slate-600';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className={`${getStationColor()} p-6 text-white`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{stationName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm opacity-90">Station Code: {stationCode}</span>
                {devices.length > 0 && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {devices.length} IoT Device{devices.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  {isOnline ? (
                    <>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-sm">Online</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                      <span className="text-sm">Offline</span>
                    </>
                  )}
                </div>
                <div className="text-xs opacity-75 mt-1">
                  Updated: {lastUpdate}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {devices.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  IoT Status:
                </span>
                <div className="flex gap-3">
                  {devices.map(device => (
                    <div key={device} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${iotStatus[device] ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        {device.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <RefreshCw size={12} />
                Auto-refresh every 10s
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Queue</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">12</div>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">Active operations</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Today's Output</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">1,248</div>
            </div>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">Units processed</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Efficiency</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">94.2%</div>
            </div>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Activity className="text-amber-600 dark:text-amber-400" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">Target: 92%</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Quality Rate</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">98.7%</div>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">Defect rate: 1.3%</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {renderStationView()}
      </div>

      <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Info size={16} />
          <span>Need help? Contact line supervisor or refer to SOP manual.</span>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300">
            View Station Logs
          </button>
          <button className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Emergency Stop
          </button>
        </div>
      </div>
    </div>
  );
};