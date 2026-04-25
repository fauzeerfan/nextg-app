import React, { useState, useEffect } from 'react';
import { Factory, Cpu, MapPin, X, Monitor, Tablet, ScanLine, Camera, RadioReceiver, Printer } from 'lucide-react';
import FactoryScene from './FactoryScene';
import { STATION_LAYOUTS } from './LayoutData';

const AutomationIslandView: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [zoomStation, setZoomStation] = useState<string | null>(null);
  const [tourIndex, setTourIndex] = useState(-1);

// Urutan tur: semua stasiun + kapal di akhir
const tourStations = [...STATION_LAYOUTS, { id: 'SHIPPING', name: 'Kapal', description: '' }];

const startAutoTour = () => {
  setTourIndex(0);
  setZoomStation(tourStations[0].id);
};

useEffect(() => {
  if (tourIndex >= 0 && tourIndex < tourStations.length) {
    const timer = setTimeout(() => {
      const next = tourIndex + 1;
      if (next < tourStations.length) {
        setTourIndex(next);
        setZoomStation(tourStations[next].id);
      } else {
        setTourIndex(-1);
        setZoomStation(null);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [tourIndex]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'pc': return <Monitor size={20} />;
      case 'tablet': return <Tablet size={20} />;
      case 'scanner': return <ScanLine size={20} />;
      case 'dhristi': return <Camera size={20} />;
      case 'sparsha': return <RadioReceiver size={20} />;
      case 'printer': return <Printer size={20} />;
      default: return <Cpu size={20} />;
    }
  };

  const getDeviceTypeName = (type: string) => {
    switch (type) {
      case 'pc': return 'Komputer / PC';
      case 'tablet': return 'Tablet Mobile';
      case 'scanner': return 'Barcode Scanner';
      case 'dhristi': return 'Dhristi Vision IoT';
      case 'sparsha': return 'Sparsha Sensor IoT';
      case 'printer': return 'Printer Output';
      default: return 'IoT Device';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'); .font-inter { font-family: 'Inter', sans-serif; }`}</style>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 overflow-hidden font-inter">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <MapPin size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Automation Island
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Visualisasi 3D Alur Stasiun Produksi</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">

              {/* Tombol Zoom per Station */}
              <div className="flex flex-wrap gap-2 items-center">
  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mr-2">🔍 Zoom:</span>
  {STATION_LAYOUTS.map((station) => (
    <button
      key={station.id}
      onClick={() => setZoomStation(station.id)}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${
        zoomStation === station.id
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
          : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:border-indigo-400'
      }`}
    >
      {station.name}
    </button>
  ))}
  {/* Tombol Kapal */}
  <button
    onClick={() => setZoomStation('SHIPPING')}
    className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${
      zoomStation === 'SHIPPING'
        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
        : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:border-indigo-400'
    }`}
  >
    Ship
  </button>
  <button
    onClick={startAutoTour}
    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-600 ml-2"
  >
    ▶ Auto Tour
  </button>
</div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[75vh] rounded-2xl overflow-hidden relative shadow-inner font-inter">
        <FactoryScene
          onStationClick={(station) => setSelectedItem({ type: 'station', data: station })}
          onDeviceClick={(device) => setSelectedItem({ type: 'device', data: device })}
          zoomStation={zoomStation}
          onZoomDone={() => setZoomStation(null)}
        />
      </div>

      {selectedItem && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 font-inter">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedItem.type === 'station' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
              }`}>
                {selectedItem.type === 'station' ? <Factory size={20} /> : getDeviceIcon(selectedItem.data.type)}
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white">{selectedItem.data.name}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {selectedItem.type === 'station' ? 'Stasiun Produksi' : getDeviceTypeName(selectedItem.data.type)}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedItem(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"><X size={18} /></button>
          </div>
          
          {selectedItem.type === 'station' && selectedItem.data.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
              {selectedItem.data.description}
            </p>
          )}
          
          {selectedItem.type === 'device' && (
            <div className="space-y-2.5 text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 font-medium">Status Koneksi</span> 
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 text-xs bg-emerald-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Device ID</span> 
                <span className="font-mono text-xs font-semibold bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                  {selectedItem.data.id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Node Stasiun</span> 
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedItem.data.stationId}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutomationIslandView;