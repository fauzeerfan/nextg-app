import React, { useState, useEffect } from 'react';
import { CloudOff } from 'lucide-react';

// HAPUS: AiInsightModal dan import Sparkles/Loader2

export const KpiCard = React.memo(({ title, value, subtext, icon: Icon, accentColor }: any) => (
  <div className="theme-card rounded-xl p-5 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[11px] font-bold theme-text-muted uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold theme-text mt-1">{value}</h3>
        <p className="text-xs mt-2 font-medium theme-text-muted">{subtext}</p>
      </div>
      <div className="icon-box p-2.5" style={{ backgroundColor: `var(${accentColor})`, color: 'white' }}>
        <Icon size={20} />
      </div>
    </div>
  </div>
));

export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);
  if (isOnline) return null;
  return (
    <div className="fixed bottom-4 right-4 bg-rose-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 offline-pulse" role="alert">
      <CloudOff size={16} /> <span className="text-xs font-bold">OFFLINE MODE - Queuing Actions</span>
    </div>
  );
};