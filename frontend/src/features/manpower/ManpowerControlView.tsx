import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Scan, Calendar, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface AttendanceRecord {
  id: string;
  nik: string;
  lineCode: string;
  station: string;
  scanTime: string;
  employee: {
    fullName: string;
    jobTitle: string;
    department: string;
  };
}

interface EmployeeData {
  nik: string;
  fullName: string;
  lineCode: string;
  station: string;
  department: string;
  jobTitle: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const ManpowerControlView = () => {
  const [nikInput, setNikInput] = useState('');
  const [lineCode, setLineCode] = useState('K1YH');
  const [station, setStation] = useState('CUTTING_POND');
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [todayDate, setTodayDate] = useState('');

  const [fetchedEmployee, setFetchedEmployee] = useState<EmployeeData | null>(null);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [fetchingEmployee, setFetchingEmployee] = useState(false);
  
  // Simpan nilai original dari auto-fill untuk keperluan konfirmasi
  const [originalLineCode, setOriginalLineCode] = useState<string>('');
  const [originalStation, setOriginalStation] = useState<string>('');

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stationOptions = ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'];

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/manpower/today`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAttendances(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const today = new Date();
    setTodayDate(today.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }));
    fetchToday();
  }, [fetchToday]);

  const fetchEmployeeByNik = async (nik: string) => {
    if (!nik.trim()) return;
    setFetchingEmployee(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employee/nik/${nik}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setFetchedEmployee(data);
          const newLineCode = data.lineCode || '';
          const newStation = data.station || '';
          setLineCode(newLineCode);
          setStation(newStation);
          // Simpan nilai original
          setOriginalLineCode(newLineCode);
          setOriginalStation(newStation);
          setIsAutoFilled(true);
          setMessage({ type: 'success', text: `Data karyawan ditemukan: ${data.fullName}` });
        } else {
          setFetchedEmployee(null);
          setIsAutoFilled(false);
          setOriginalLineCode('');
          setOriginalStation('');
          setMessage({ type: 'error', text: 'NIK tidak ditemukan di master karyawan' });
        }
      } else {
        setFetchedEmployee(null);
        setIsAutoFilled(false);
        setOriginalLineCode('');
        setOriginalStation('');
        setMessage({ type: 'error', text: 'Gagal mengambil data karyawan' });
      }
    } catch (error) {
      console.error(error);
      setFetchedEmployee(null);
      setIsAutoFilled(false);
      setOriginalLineCode('');
      setOriginalStation('');
      setMessage({ type: 'error', text: 'Network error saat fetch karyawan' });
    } finally {
      setFetchingEmployee(false);
    }
  };

  // Debounce effect untuk fetch otomatis saat NIK berubah
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (nikInput.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        fetchEmployeeByNik(nikInput.trim());
      }, 500);
    } else {
      setFetchedEmployee(null);
      setIsAutoFilled(false);
      setOriginalLineCode('');
      setOriginalStation('');
      setMessage(null);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [nikInput]);

  // Handler untuk perubahan lineCode (tanpa konfirmasi langsung)
  const handleLineCodeChange = (newValue: string) => {
    setLineCode(newValue);
  };

  // Handler untuk perubahan station (tanpa konfirmasi langsung)
  const handleStationChange = (newValue: string) => {
    setStation(newValue);
  };

  const handleScan = async () => {
    if (!nikInput.trim()) {
      setMessage({ type: 'error', text: 'Please enter or scan NIK' });
      return;
    }

    // Jika ada perubahan dari nilai auto-fill, tampilkan konfirmasi
    let shouldProceed = true;
    if (isAutoFilled && (lineCode !== originalLineCode || station !== originalStation)) {
      const changes = [];
      if (lineCode !== originalLineCode) changes.push(`Line Code: ${originalLineCode} → ${lineCode}`);
      if (station !== originalStation) changes.push(`Station: ${originalStation} → ${station}`);
      const confirmMsg = `Ada perubahan data:\n${changes.join('\n')}\n\nLanjutkan check-in dengan data yang sudah diubah?`;
      shouldProceed = window.confirm(confirmMsg);
    }

    if (!shouldProceed) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/manpower/checkin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nik: nikInput.trim(), lineCode, station }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Check-in successful for ${data.employee.fullName}` });
        setNikInput('');
        setFetchedEmployee(null);
        setIsAutoFilled(false);
        setOriginalLineCode('');
        setOriginalStation('');
        fetchToday();
      } else {
        setMessage({ type: 'error', text: data.message || 'Check-in failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-base rounded-xl px-4 py-3.5 focus:ring-0 focus:border-green-500 dark:focus:border-green-400 transition-all font-semibold placeholder-slate-400 dark:placeholder-slate-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-500 outline-none";
  const labelClass = "block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2 ml-1";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
      `}</style>
      <div style={{ fontFamily: "'Poppins', sans-serif" }} className="p-4 md:p-6 space-y-6 bg-[#F8FAFC] dark:bg-slate-900 min-h-screen">
        {/* Header Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden relative group">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-green-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-80"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-80"></div>
          
          <div className="p-6 relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 transform transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                  <Scan size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manpower Control</h1>
                  <p className="text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 mt-1">Daily attendance check-in via QR/NIK</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-xl text-green-600 dark:text-green-400">
                  <Calendar size={20} />
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide">{todayDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Check-in Form */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-md flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8 pb-5 border-b-2 border-slate-100 dark:border-slate-700">
              <div className="p-3 bg-green-600 text-white rounded-xl shadow-md shadow-green-500/20">
                <Scan size={24} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Scan QR / NIK</h3>
            </div>
            
            <div className="space-y-6 flex-1">
              <div className="relative">
                <label className={labelClass}>NIK (from name tag QR)</label>
                <div className="relative">
                  <input
                    type="text"
                    className={`${inputClass} pl-5`}
                    placeholder="Scan or type NIK here..."
                    value={nikInput}
                    onChange={e => setNikInput(e.target.value)}
                    autoFocus
                  />
                  {fetchingEmployee && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 p-1">
                      <Loader2 size={20} className="animate-spin text-green-500" />
                    </div>
                  )}
                </div>
                
                {fetchedEmployee && !fetchingEmployee && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/40 border-2 border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                      {fetchedEmployee.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-slate-900 dark:text-white">{fetchedEmployee.fullName}</div>
                      <div className="text-xs font-bold text-green-700 dark:text-green-400 mt-0.5">{fetchedEmployee.department}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
                <div>
                  <label className={labelClass}>Line Code</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={lineCode}
                    onChange={e => handleLineCodeChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Station</label>
                  <div className="relative">
                    <select
                      className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                      value={station}
                      onChange={e => handleStationChange(e.target.value)}
                    >
                      {stationOptions.map(s => <option key={s} className="font-semibold">{s}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-auto">
                {message && (
                  <div className={`mb-6 p-4 rounded-2xl flex items-start gap-4 text-sm font-bold animate-in fade-in slide-in-from-bottom-2 border-2 shadow-sm ${
                    message.type === 'success' 
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border-emerald-400 dark:border-emerald-600' 
                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border-rose-400 dark:border-rose-600'
                  }`}>
                    <div className="mt-0.5 shrink-0 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm">
                      {message.type === 'success' ? <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" /> : <AlertCircle size={20} className="text-rose-600 dark:text-rose-400" />}
                    </div>
                    <div className="leading-relaxed mt-1">{message.text}</div>
                  </div>
                )}

                <button
                  onClick={handleScan}
                  disabled={submitting}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none focus:outline-none focus:ring-4 focus:ring-green-500/30"
                >
                  {submitting ? (
                    <><Loader2 size={22} className="animate-spin" /> Memproses...</>
                  ) : (
                    <><CheckCircle size={22} /> Konfirmasi Check-in</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Today's Attendance List */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-md flex flex-col h-full">
            <div className="flex justify-between items-center mb-8 pb-5 border-b-2 border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                  <Users size={24} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Today's Attendance</h3>
              </div>
              <button 
                onClick={fetchToday} 
                className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-green-600 dark:hover:text-green-400 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-600 transition-all hover:shadow-md active:scale-95 group focus:outline-none"
                title="Refresh Data"
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
            
            <div className="flex-1 relative min-h-[300px]">
              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl z-10 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-green-500" size={36} />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300 tracking-wide">Memuat data...</span>
                </div>
              ) : attendances.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                  <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm mb-4 border border-slate-200 dark:border-slate-600">
                    <Users size={32} className="text-slate-400" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-bold text-base">Belum ada data check-in untuk hari ini.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-3 pb-2">
                  {attendances.map(att => (
                    <div 
                      key={att.id} 
                      className="group relative overflow-hidden bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-5 rounded-2xl hover:shadow-md transition-all duration-300 hover:border-green-400 dark:hover:border-green-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left Accent Bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-green-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom"></div>
                      
                      <div className="flex-1 pl-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold font-mono bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-sm">
                            {att.nik}
                          </span>
                          <span className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                            {att.employee.fullName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span className="bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-300 px-2.5 py-1 rounded-md border border-green-200 dark:border-green-800">
                            Line {att.lineCode}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600 text-base">•</span>
                          <span className="bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                            {att.station}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600 text-base">•</span>
                          <span className="truncate max-w-[150px] bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700" title={att.employee.jobTitle}>
                            {att.employee.jobTitle}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t-2 sm:border-t-0 sm:border-l-2 border-slate-100 dark:border-slate-700 pt-3 sm:pt-0 sm:pl-5 mt-2 sm:mt-0 min-w-[100px]">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Scanned</span>
                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                          {new Date(att.scanTime).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Custom Scrollbar Styles Globally or Scoped */}
        <style dangerouslySetInnerHTML={{__html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #94a3b8;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #475569;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #64748b;
          }
        `}} />
      </div>
    </>
  );
};