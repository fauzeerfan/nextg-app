import { Server } from 'lucide-react';
import type { StationCode } from '../../types/production';
import { CuttingView } from './CuttingView'; 
import { CheckpanelView } from './CheckpanelView';
import { SewingView } from './SewingView'; 
import { QCStationView } from './QCView'; 
import { PackingView } from './PackingView'; 
import { FinishedGoodsView } from './FinishedGoodsView';
import { MaterialRequestView } from './MaterialRequestView';
import { OpPergantianView } from './OpPergantianView';
import { UserManagementView } from '../system/UserManagementView';
import { RoleManagementView } from '../system/RoleManagementView';
import { PpcOrderView } from './PpcOrderView';
// FIX: Import PatternMasterView (Bukan MasterDataOpView)
import { PatternMasterView } from '../master/PatternMasterView';

interface StationInterfaceProps {
  stationCode: StationCode;
  stationName: string;
  devices: string[];
  onNavigate: (tab: string) => void;
}

export const StationInterface = ({ 
  stationCode, 
  stationName, 
  devices, 
  onNavigate 
}: StationInterfaceProps) => {
  
  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${type.toUpperCase()}: ${msg}`);
  };

  let stationView;
  switch (stationCode) {
      // PRODUCTION FLOW
      case 'CUTTING': stationView = <CuttingView addLog={addLog} />; break; 
      case 'CP': stationView = <CheckpanelView addLog={addLog} onNavigate={onNavigate} />; break;
      case 'SEWING': stationView = <SewingView addLog={addLog} />; break;
      case 'QC': stationView = <QCStationView addLog={addLog} onNavigate={onNavigate} />; break;
      case 'PACKING': stationView = <PackingView addLog={addLog} />; break;
      case 'FG': stationView = <FinishedGoodsView addLog={addLog} />; break;
      
      // SUPPORTING FLOW
      case 'MR': stationView = <MaterialRequestView addLog={addLog} />; break;
      case 'OPREQ': stationView = <OpPergantianView addLog={addLog} />; break;
      
      // SYSTEM MANAGEMENT
      case 'USER_MGMT': stationView = <UserManagementView />; break;
      case 'ROLE_MGMT': stationView = <RoleManagementView />; break;
      case 'PPC': stationView = <PpcOrderView addLog={addLog} />; break;
      
      // FIX: Render PatternMasterView
      case 'MASTER_OP': stationView = <PatternMasterView addLog={addLog} />; break;
      
      default: stationView = <div className="p-8 text-center text-slate-400">Unknown Station</div>;
  }

  const isFullWidthPage = [
    'CUTTING', 
    'USER_MGMT', 
    'ROLE_MGMT', 
    'PPC', 
    'MASTER_OP',
    'MR',
    'OPREQ'
  ].includes(stationCode);

  return (
    <div className="animate-in fade-in duration-300">
        {isFullWidthPage ? (
             <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[80vh]">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2 text-black dark:text-white">
                        {stationName}
                      </h2>
                      
                      {devices.length > 0 && (
                        <div className="flex gap-2 mt-2">
                            {devices.map(d => (
                                <span key={d} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono uppercase border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900/50">
                                    <Server size={10}/> {d.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                      )}
                  </div>
                </div>
                {stationView}
             </div>
        ) : (
             <div className="min-h-[80vh]">
                {stationView}
             </div>
        )}
    </div>
  );
};