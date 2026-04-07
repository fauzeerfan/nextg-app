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

  return (
    <div className="p-6">
      <div className="bg-gradient-to-br from-white to-green-50/30 dark:from-slate-900 dark:to-green-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Scan size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Manpower Control</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Daily attendance check-in via QR/NIK</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Calendar size={16} className="text-green-600" />
              <span className="font-medium">{todayDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in Form */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Scan size={20} /> Scan QR / NIK</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">NIK (from name tag QR)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border-2 rounded-lg focus:border-green-500"
                placeholder="Scan or type NIK..."
                value={nikInput}
                onChange={e => setNikInput(e.target.value)}
                autoFocus
              />
              {fetchingEmployee && <Loader2 size={14} className="animate-spin mt-1 text-green-600" />}
              {fetchedEmployee && !fetchingEmployee && (
                <div className="text-xs text-green-600 mt-1">
                  {fetchedEmployee.fullName} - {fetchedEmployee.department}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Line Code</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={lineCode}
                  onChange={e => handleLineCodeChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Station</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={station}
                  onChange={e => handleStationChange(e.target.value)}
                >
                  {stationOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={handleScan}
              disabled={submitting}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Check-in
            </button>
            {message && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>
            )}
          </div>
        </div>

        {/* Today's Attendance List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><Users size={20} /> Today's Attendance</h3>
            <button onClick={fetchToday} className="p-2 hover:bg-slate-100 rounded-lg"><RefreshCw size={16} /></button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-green-600" size={24} /></div>
          ) : attendances.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No check-ins today</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {attendances.map(att => (
                <div key={att.id} className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border">
                  <div className="flex justify-between">
                    <div><span className="font-mono font-bold">{att.nik}</span> - {att.employee.fullName}</div>
                    <span className="text-xs text-slate-500">{new Date(att.scanTime).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Line {att.lineCode} | {att.station} | {att.employee.jobTitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};