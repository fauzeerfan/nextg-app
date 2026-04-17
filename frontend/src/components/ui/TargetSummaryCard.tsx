import React, { useState, useEffect } from 'react';
import { Target, Clock, TrendingUp, Users, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface TargetSummaryCardProps {
  lineCode: string;
  station: string;
  date?: string;
  className?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const TargetSummaryCard: React.FC<TargetSummaryCardProps> = ({
  lineCode,
  station,
  date,
  className = '',
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTarget = async () => {
    if (!lineCode || !station) return;
    setLoading(true);
    setError('');
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const res = await fetch(
        `${API_BASE_URL}/target-monitoring?lineCode=${lineCode}&station=${station}&date=${targetDate}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Failed to load target data');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTarget();
    const interval = setInterval(fetchTarget, 30000);
    return () => clearInterval(interval);
  }, [lineCode, station, date]);

  if (loading && !data) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-amber-500 p-4 shadow-sm animate-pulse ${className}`}>
        <div className="flex items-center gap-2"><Target size={20} className="text-amber-500" /><span className="font-black">Loading target...</span></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-rose-500 p-4 shadow-sm ${className}`}>
        <div className="flex items-center gap-2 text-rose-600"><AlertCircle size={20} /> {error}</div>
      </div>
    );
  }

  if (!data) return null;
  if (!data.isActive) return null;   // <-- tambahkan baris ini

  const { dailyTarget, dailyActual, dailyAchievement, manpower, hourlyTarget } = data;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-amber-500 p-4 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-amber-500" />
          <span className="font-black text-sm uppercase tracking-wider">Target Today</span>
        </div>
        <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
          <Users size={14} className="text-amber-600" />
          <span className="font-bold">MP: {manpower}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Daily Target</div>
          <div className="text-lg font-black text-slate-900 dark:text-white">{dailyTarget.toLocaleString()} sets</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Actual Output</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{dailyActual.toLocaleString()} sets</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Achievement</div>
          <div className={`text-lg font-black ${dailyAchievement >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {dailyAchievement}%
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Hourly Target</div>
          <div className="text-sm font-black text-blue-600 dark:text-blue-400">{hourlyTarget} sets</div>
        </div>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-3 overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(dailyAchievement, 100)}%` }}
        />
      </div>
    </div>
  );
};