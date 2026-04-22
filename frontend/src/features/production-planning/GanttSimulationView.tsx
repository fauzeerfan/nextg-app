import React, { useState, useEffect, useRef } from 'react';
import { Calendar, RefreshCw, Loader2, Download, GanttChartSquare, Info } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

interface GanttItem {
  id: string;
  name: string;
  type: 'existing' | 'planned';
  lineCode: string | null;
  startDate: string;
  endDate: string;
  progress: number;
}

export const GanttSimulationView = () => {
  const [lineCode, setLineCode] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State lokal untuk item Gantt yang dapat diedit (drag & drop)
  const [ganttItems, setGanttItems] = useState<GanttItem[]>([]);
  const [dragging, setDragging] = useState<{ id: string; startX: number; originalStart: Date } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<GanttItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (lineCode) params.append('lineCode', lineCode);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await fetch(`${API_BASE_URL}/production-planning/gantt?${params}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setGanttItems(json.items || []);
      } else {
        setError('Failed to load');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lineCode, startDate, endDate]);

  const exportToImage = () => {
    alert('Export to image feature can be implemented with html2canvas');
  };

  // Fungsi untuk mengubah startDate suatu item (simulasi)
  const updateItemStartDate = (id: string, newStartDate: Date) => {
    setGanttItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const duration =
          (new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) /
          (1000 * 60 * 60 * 24);
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newStartDate.getDate() + duration);
        return {
          ...item,
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
        };
      })
    );
  };

  // Dapatkan tanggal minimum dan maksimum dari semua item untuk skala persentase
  const getDateRange = () => {
    if (ganttItems.length === 0) return { minDate: new Date(), maxDate: new Date() };
    const dates = ganttItems.flatMap(item => [new Date(item.startDate), new Date(item.endDate)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    // Tambahkan padding 2 hari di kiri dan kanan untuk ruang gerak
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);
    return { minDate, maxDate };
  };

  const { minDate, maxDate } = getDateRange();
  const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  const getLeftPercent = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    return (diff / totalDays) * 100;
  };

  const getWidthPercent = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return (duration / totalDays) * 100;
  };

  // Format durasi dalam hari
  const formatDuration = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${diff} day${diff > 1 ? 's' : ''}`;
  };

  // Implementasi drag (mouse event)
  const startDrag = (e: React.MouseEvent, item: GanttItem) => {
    e.preventDefault();
    const startX = e.clientX;
    const originalStart = new Date(item.startDate);
    setDragging({ id: item.id, startX, originalStart });

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragging) return;
      const deltaX = moveEvent.clientX - dragging.startX;
      const containerWidth = containerRef.current?.clientWidth || 800;
      const pxPerDay = containerWidth / totalDays;
      const deltaDays = Math.round(deltaX / pxPerDay);
      const newStart = new Date(dragging.originalStart);
      newStart.setDate(newStart.getDate() + deltaDays);
      updateItemStartDate(dragging.id, newStart);
      setDragging(prev => (prev ? { ...prev, startX: moveEvent.clientX, originalStart: newStart } : null));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setDragging(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Render skala hari pada header (dengan marker bulan)
  const renderTimelineHeader = () => {
    const days: Date[] = [];
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return (
      <div className="flex-1 relative h-10 flex border-b border-slate-200 dark:border-slate-700">
        {/* Marker bulan */}
        {days.reduce((acc: React.ReactElement[], day, idx) => {
          const isFirstOfMonth = day.getDate() === 1;
          const isLastDay = idx === days.length - 1;
          if (isFirstOfMonth || idx === 0 || isLastDay) {
            const leftPercent = ((day.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
            acc.push(
              <div
                key={`month-${idx}`}
                className="absolute top-0 text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap"
                style={{ left: `${leftPercent}%`, transform: 'translateX(-2px)' }}
              >
                {day.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </div>
            );
          }
          // Marker hari (tiap 3 hari)
          if (idx % 3 === 0 || idx === 0) {
            const leftPercent = ((day.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
            acc.push(
              <div
                key={`day-${idx}`}
                className="absolute bottom-0 text-[9px] text-slate-400 dark:text-slate-500"
                style={{ left: `${leftPercent}%`, transform: 'translateX(-2px)' }}
              >
                {day.getDate()}
              </div>
            );
          }
          return acc;
        }, [])}
        {/* Garis vertikal tipis setiap hari */}
        {days.map((day, idx) => {
          const leftPercent = ((day.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
          return (
            <div
              key={`vline-${idx}`}
              className="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700"
              style={{ left: `${leftPercent}%` }}
            />
          );
        })}
      </div>
    );
  };

  // Hitung total item
  const totalItems = ganttItems.length;
  const existingCount = ganttItems.filter(i => i.type === 'existing').length;
  const plannedCount = ganttItems.filter(i => i.type === 'planned').length;

  return (
    <div className="p-6 space-y-6 font-poppins">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <GanttChartSquare size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Planning Gantt (Simulation)</h1>
              <p className="text-xs text-slate-500">
                Visualize existing OP and planned orders — drag bars to simulate schedule
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={exportToImage}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 transition"
            >
              <Download size={16} /> Export Image
            </button>
          </div>
        </div>

        {/* Filter & Stats Ringkas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Line Code</label>
            <input
              type="text"
              className="w-full px-3 py-2 border-2 rounded-xl dark:bg-slate-700 dark:border-slate-600"
              value={lineCode}
              onChange={e => setLineCode(e.target.value)}
              placeholder="All lines"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Start Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border-2 rounded-xl dark:bg-slate-700 dark:border-slate-600"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">End Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border-2 rounded-xl dark:bg-slate-700 dark:border-slate-600"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-3 w-full flex justify-between items-center">
              <span className="text-xs font-bold uppercase">Total Items</span>
              <span className="text-lg font-black">{totalItems}</span>
              <span className="text-[10px] text-slate-500 ml-2">
                ({existingCount} existing, {plannedCount} planned)
              </span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-purple-500" size={32} />
          </div>
        )}
        {error && <div className="bg-rose-100 p-4 rounded-xl text-rose-700">{error}</div>}
        {data && ganttItems.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            <Info size={48} className="mx-auto mb-3 opacity-50" />
            <p>No data available for the selected filters.</p>
          </div>
        )}

        {data && ganttItems.length > 0 && (
          <div className="overflow-x-auto" ref={containerRef}>
            <div className="min-w-[900px]">
              {/* Header timeline (hari) */}
              <div className="flex border-b pb-2 mb-3 font-bold text-sm sticky top-0 bg-white dark:bg-slate-800 z-10">
                <div className="w-40 shrink-0 pr-3 flex items-end">
                  <span className="text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Line / Order</span>
                </div>
                {renderTimelineHeader()}
              </div>

              {/* Group by line */}
              {data.lines?.map((line: any) => {
                const lineItems = ganttItems.filter((i: GanttItem) => i.lineCode === line.code);
                if (lineItems.length === 0) return null;
                return (
                  <div key={line.id} className="mb-6">
                    <div className="font-black text-sm mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                        {line.code}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{line.name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{lineItems.length} item(s)</span>
                    </div>
                    <div className="space-y-2">
                      {lineItems.map((item: GanttItem) => {
                        const durationText = formatDuration(item.startDate, item.endDate);
                        const isHovered = hoveredItem?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            className="relative h-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-move select-none group transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
                            onMouseDown={e => startDrag(e, item)}
                            onMouseEnter={() => setHoveredItem(item)}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            {/* Garis latar untuk membantu visual */}
                            <div className="absolute inset-0 flex">
                              {Array.from({ length: Math.ceil(totalDays) }).map((_, i) => (
                                <div key={i} className="flex-1 border-r border-slate-100 dark:border-slate-800 last:border-r-0" />
                              ))}
                            </div>

                            <div
                              className={`absolute top-1 bottom-1 rounded-lg text-white text-xs p-2 truncate shadow-md transition-all ${
                                item.type === 'existing'
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-l-4 border-blue-800'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-500 border border-dashed border-white/50'
                              } ${isHovered ? 'brightness-110 shadow-lg scale-y-105' : ''}`}
                              style={{
                                left: `${getLeftPercent(item.startDate)}%`,
                                width: `${Math.max(getWidthPercent(item.startDate, item.endDate), 2)}%`,
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold truncate">{item.name}</span>
                                <span className="text-[10px] opacity-80 ml-2 shrink-0">{durationText}</span>
                              </div>
                              {item.progress !== undefined && item.progress > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-lg overflow-hidden">
                                  <div
                                    className="h-full bg-white/50"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Tooltip saat hover */}
                            {isHovered && (
                              <div className="absolute top-full left-0 mt-2 bg-slate-800 text-white text-xs rounded-lg p-2 shadow-xl z-50 whitespace-nowrap">
                                <div><span className="opacity-70">Start:</span> {new Date(item.startDate).toLocaleDateString()}</div>
                                <div><span className="opacity-70">End:</span> {new Date(item.endDate).toLocaleDateString()}</div>
                                <div><span className="opacity-70">Duration:</span> {durationText}</div>
                                <div><span className="opacity-70">Type:</span> {item.type}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Unassigned items */}
              {ganttItems.filter((i: GanttItem) => !i.lineCode).length > 0 && (
                <div className="mt-6">
                  <div className="font-black text-sm mb-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">
                      UNASSIGNED
                    </span>
                    <span className="text-slate-500 text-xs">Planned orders without line assignment</span>
                  </div>
                  <div className="space-y-2">
                    {ganttItems
                      .filter((i: GanttItem) => !i.lineCode)
                      .map((item: GanttItem) => {
                        const durationText = formatDuration(item.startDate, item.endDate);
                        const isHovered = hoveredItem?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            className="relative h-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-move select-none group"
                            onMouseDown={e => startDrag(e, item)}
                            onMouseEnter={() => setHoveredItem(item)}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            <div className="absolute inset-0 flex">
                              {Array.from({ length: Math.ceil(totalDays) }).map((_, i) => (
                                <div key={i} className="flex-1 border-r border-slate-100 dark:border-slate-800 last:border-r-0" />
                              ))}
                            </div>
                            <div
                              className={`absolute top-1 bottom-1 rounded-lg text-white text-xs p-2 truncate shadow-md transition-all ${
                                item.type === 'existing'
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-l-4 border-blue-800'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-500 border border-dashed border-white/50'
                              } ${isHovered ? 'brightness-110 shadow-lg scale-y-105' : ''}`}
                              style={{
                                left: `${getLeftPercent(item.startDate)}%`,
                                width: `${Math.max(getWidthPercent(item.startDate, item.endDate), 2)}%`,
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold truncate">{item.name}</span>
                                <span className="text-[10px] opacity-80 ml-2 shrink-0">{durationText}</span>
                              </div>
                            </div>
                            {isHovered && (
                              <div className="absolute top-full left-0 mt-2 bg-slate-800 text-white text-xs rounded-lg p-2 shadow-xl z-50 whitespace-nowrap">
                                <div><span className="opacity-70">Start:</span> {new Date(item.startDate).toLocaleDateString()}</div>
                                <div><span className="opacity-70">End:</span> {new Date(item.endDate).toLocaleDateString()}</div>
                                <div><span className="opacity-70">Duration:</span> {durationText}</div>
                                <div><span className="opacity-70">Type:</span> {item.type}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-6 mt-8 pt-4 border-t text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded bg-gradient-to-r from-blue-500 to-blue-600"></div>
                  <span>Existing OP (WIP)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded bg-gradient-to-r from-amber-500 to-orange-500 border border-dashed border-white/50"></div>
                  <span>Planned Order</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-slate-300 dark:bg-slate-600"></div>
                  <span>Drag bars to simulate schedule changes</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};