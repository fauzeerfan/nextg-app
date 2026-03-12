import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import {
  Package, Box, RefreshCw, Search, Plus, Printer, X, CheckCircle,
  Layers, Save, Loader2, QrCode, History, Delete, Minus
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface ProductionOrder {
  id: string;
  opNumber: string;
  styleCode: string;
  itemNumberFG: string;
  itemNameFG: string;
  qtyQC?: number;
  qtyPacking?: number;
  lineCode?: string;
}

interface PackingSession {
  id: string;
  fgNumber: string;
  totalQty: number;
  status: 'OPEN' | 'CLOSED';
  qrCode?: string;
  printed?: boolean;
  items: PackingItem[];
  createdAt: string;
  updatedAt: string;
}

interface PackingItem {
  id: string;
  sessionId: string;
  opId: string;
  qty: number;
  op?: ProductionOrder;
}

interface PackingOp extends ProductionOrder {
  remainingPacking: number; // qtyQC - qtyPacking
}

interface PackingSessionHistory extends PackingSession {}

// Interface untuk Packed Box (hasil packing yang menunggu diterima di Finished Goods)
interface PackedBox {
  id: string;
  fgNumber: string;
  totalQty: number;
  items: { opNumber: string; qty: number }[];
  qrCode: string;
  createdAt: string;
}

// Interface untuk Data QR
interface QrData {
  code: string;
  opNumbers: string;
  itemNumberFG: string;
  itemNameFG: string;
  qtyOp: number;
  createdAt?: string;
}

// Metric Card Component
const MetricCard = ({ title, value, icon: Icon, color = 'indigo', subtitle, suffix }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: 'indigo' | 'emerald' | 'amber' | 'blue';
  subtitle?: string;
  suffix?: string;
}) => {
  const colors = {
    indigo: { bg: 'from-indigo-100 to-indigo-50', icon: 'text-indigo-600', darkBg: 'from-indigo-900/20 to-indigo-900/10' },
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    amber: { bg: 'from-amber-100 to-amber-50', icon: 'text-amber-600', darkBg: 'from-amber-900/20 to-amber-900/10' },
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/20 to-blue-900/10' }
  }[color];

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-8 h-8 bg-gradient-to-br ${colors.bg} dark:${colors.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className={colors.icon} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}{suffix && <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
};

// Item Row Component
const SessionItemRow = ({ item, onRemove }: { item: PackingItem; onRemove: () => void }) => (
  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
    <div>
      <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">{item.op?.opNumber}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">Qty: {item.qty} sets</div>
    </div>
    <button onClick={onRemove} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-600">
      <X size={14} />
    </button>
  </div>
);

// Simple Numpad with only 1,5,10,50
const SimpleNumpad = ({ value, onChange, max }: { value: number; onChange: (val: number) => void; max: number }) => {
  const quickAmounts = [1, 5, 10, 50];

  const handleSet = (amt: number) => {
    const newVal = value + amt;
    if (newVal <= max) {
      onChange(newVal);
    } else {
      onChange(max);
    }
  };

  const handleClear = () => onChange(0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-lg">
      <div className="mb-2">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Quantity</div>
        <div className="text-3xl font-bold text-slate-900 dark:text-white text-center py-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
          {value}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {quickAmounts.map(amt => (
          <button
            key={amt}
            onClick={() => handleSet(amt)}
            className="py-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg font-bold text-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md"
          >
            +{amt}
          </button>
        ))}
      </div>
      <button
        onClick={handleClear}
        className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-slate-800 dark:text-white font-bold flex items-center justify-center gap-2 text-sm"
      >
        <Delete size={16} /> Clear
      </button>
    </div>
  );
};

// History Modal
const HistoryModal = ({ show, onClose, history, onReprint, loading }: any) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 print:hidden">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-bold">Packing History</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
          ) : history.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No packing history yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">FG Number</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Items</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s: PackingSessionHistory) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-2">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-2">{s.fgNumber}</td>
                    <td className="py-2">{s.totalQty}</td>
                    <td className="py-2">
                      {s.items.map(item => `${item.op?.opNumber} (${item.qty})`).join(', ')}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => { onClose(); onReprint(s.id); }}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Reprint
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// Komponen untuk menampilkan Packed Box (hasil packing yang menunggu)
const PackedBoxCard = ({ box, onReprint }: { box: PackedBox; onReprint: (qrCode: string) => void }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">{box.fgNumber}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{box.totalQty} sets</div>
        </div>
        <button
          onClick={() => onReprint(box.qrCode)}
          className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
          title="Cetak ulang QR"
        >
          <Printer size={14} />
        </button>
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
        {box.items.map(item => `${item.opNumber} (${item.qty})`).join(', ')}
      </div>
      <div className="text-[10px] text-slate-400">
        {new Date(box.createdAt).toLocaleString()}
      </div>
    </div>
  );
};

export const PackingView = () => {
  const [ops, setOps] = useState<PackingOp[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  const [activeSession, setActiveSession] = useState<PackingSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [selectedFG, setSelectedFG] = useState('');
  const [fgOptions, setFgOptions] = useState<string[]>([]);

  const [selectedOpId, setSelectedOpId] = useState<string>('');
  const [inputQty, setInputQty] = useState<number>(0);
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState(false);
  const [qr, setQr] = useState<QrData | null>(null);

  // History
  const [history, setHistory] = useState<PackingSessionHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ===== NEW: Packed boxes (menunggu diterima di Finished Goods) =====
  const [packedBoxes, setPackedBoxes] = useState<PackedBox[]>([]);
  const [loadingPacked, setLoadingPacked] = useState(false);

  // Ref untuk scroll & data sebelumnya
  const prevOpsRef = useRef<PackingOp[]>([]);
  const leftListRef = useRef<HTMLDivElement>(null);
  const prevScrollTop = useRef(0);

  // ========== PACK SIZE ==========
  const [packSize, setPackSize] = useState<number>(50);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('nextg_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Cache OP untuk history label
  const updateOpCache = useCallback((opsData: any[]) => {
    try {
      const cache = JSON.parse(localStorage.getItem('packing_op_cache') || '{}');
      let isUpdated = false;
      opsData.forEach(op => {
        if (op.opNumber && op.itemNumberFG) {
          cache[op.opNumber] = {
            itemNumberFG: op.itemNumberFG,
            itemNameFG: op.itemNameFG,
          };
          isUpdated = true;
        }
      });
      if (isUpdated) {
        localStorage.setItem('packing_op_cache', JSON.stringify(cache));
      }
    } catch (e) {
      console.error('Failed to update cache', e);
    }
  }, []);

  const fetchOps = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=QC`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data: ProductionOrder[] = await res.json();
        
        updateOpCache(data);

        const withRemaining: PackingOp[] = data.map(op => ({
          ...op,
          remainingPacking: (op.qtyQC || 0) - (op.qtyPacking || 0)
        })).filter(op => op.remainingPacking > 0);

        if (JSON.stringify(prevOpsRef.current) !== JSON.stringify(withRemaining)) {
          setOps(withRemaining);
          prevOpsRef.current = withRemaining;
        }

        setLastUpdate(new Date().toLocaleTimeString());

        const fgs = [...new Set(withRemaining.map(op => op.itemNumberFG))];
        setFgOptions(fgs);
      }
    } catch (error) {
      console.error('Failed to fetch packing OPs', error);
    } finally {
      setRefreshing(false);
    }
  }, [updateOpCache]);

  const fetchActiveSession = useCallback(async () => {
    setLoadingSession(true);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/sessions/active`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 404) {
        setActiveSession(null);
      } else if (res.ok) {
        const session = await res.json();
        setActiveSession(session);
        if (session) setSelectedFG(session.fgNumber);
        
        if (session && session.items) {
          const sessionOps = session.items.map((i: any) => i.op).filter(Boolean);
          updateOpCache(sessionOps);
        }
      } else {
        console.error('Failed to fetch active session', res.status);
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Failed to fetch active session', error);
      setActiveSession(null);
    } finally {
      setLoadingSession(false);
    }
  }, [updateOpCache]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/history`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch packing history', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // ===== NEW: Fetch packed boxes (menunggu diterima di Finished Goods) =====
  const fetchPackedBoxes = useCallback(async () => {
    setLoadingPacked(true);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/packed-boxes`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setPackedBoxes(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch packed boxes', error);
    } finally {
      setLoadingPacked(false);
    }
  }, []);

  useEffect(() => {
    if (activeSession && activeSession.items && activeSession.items.length > 0) {
      const firstOp = activeSession.items[0].op;
      if (firstOp && firstOp.lineCode) {
        fetch(`${API_BASE_URL}/line-masters/${firstOp.lineCode}/packing-config`, {
          headers: getAuthHeaders(),
        })
          .then(res => res.ok ? res.json() : { packSize: 50 })
          .then(data => setPackSize(data.packSize))
          .catch(() => setPackSize(50));
      } else {
        setPackSize(50);
      }
    } else {
      setPackSize(50);
    }
  }, [activeSession]);

  useEffect(() => {
    fetchOps();
    fetchActiveSession();
    fetchHistory();
    fetchPackedBoxes(); // <-- fetch packed boxes
    const interval = setInterval(() => {
      fetchOps();
      fetchActiveSession();
      fetchPackedBoxes(); // <-- update packed boxes setiap 10 detik
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchOps, fetchActiveSession, fetchHistory, fetchPackedBoxes]);

  const filteredOps = useMemo(() => {
    if (search.trim() === '') return ops;
    const lower = search.toLowerCase();
    return ops.filter(op => 
      op.opNumber.toLowerCase().includes(lower) || 
      op.styleCode.toLowerCase().includes(lower) ||
      op.itemNumberFG?.toLowerCase().includes(lower)
    );
  }, [ops, search]);

  useLayoutEffect(() => {
    if (leftListRef.current) {
      prevScrollTop.current = leftListRef.current.scrollTop;
    }
  });

  useEffect(() => {
    if (leftListRef.current && prevScrollTop.current > 0) {
      leftListRef.current.scrollTop = prevScrollTop.current;
    }
  }, [filteredOps]);

  const handleLeftScroll = (e: React.UIEvent<HTMLDivElement>) => {
    prevScrollTop.current = e.currentTarget.scrollTop;
  };

  const createSession = async () => {
    if (!selectedFG) return;
    setLoadingSession(true);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/session`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fgNumber: selectedFG })
      });
      if (res.ok) {
        const session = await res.json();
        setActiveSession(session);
      } else {
        const err = await res.json();
        alert(`Gagal membuat sesi: ${err.message || res.status}`);
      }
    } catch (error) {
      console.error(error);
      alert('Network error saat membuat sesi');
    } finally {
      setLoadingSession(false);
    }
  };

  const addItem = async () => {
    if (!activeSession || !selectedOpId || inputQty <= 0) return;
    const op = ops.find(o => o.id === selectedOpId);
    if (!op) return;
    if (inputQty > op.remainingPacking) {
      alert(`Maksimal ${op.remainingPacking} sets tersisa`);
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId: activeSession.id,
          opId: selectedOpId,
          qty: inputQty
        })
      });
      if (res.ok) {
        const updatedSession = await res.json();
        setActiveSession(updatedSession);
        setSelectedOpId('');
        setInputQty(0);
        await fetchOps();
        await fetchActiveSession();
      } else {
        const err = await res.json();
        alert(`Gagal: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAdding(false);
    }
  };

  const removeItem = async (itemId: string) => {
    alert('Fungsi hapus item belum tersedia');
  };

  const closeSession = async () => {
    if (!activeSession) return;
    if (activeSession.totalQty !== packSize) {
      alert(`Sesi harus mencapai ${packSize} sets untuk ditutup`);
      return;
    }
    setClosing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/close`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId: activeSession.id })
      });
      if (res.ok) {
        const result = await res.json();
        
        const opNumbers = activeSession.items.map(i => i.op?.opNumber).filter(Boolean).join(', ');
        const itemNameFG = activeSession.items[0]?.op?.itemNameFG || '-';

        setQr({
          code: result.qrCode,
          opNumbers: opNumbers || '-',
          itemNumberFG: activeSession.fgNumber,
          itemNameFG: itemNameFG,
          qtyOp: activeSession.totalQty,
          createdAt: new Date().toISOString()
        });

        setActiveSession(null);
        setSelectedFG('');
        await fetchOps(); 
        await fetchActiveSession(); 
        fetchHistory(); 
        fetchPackedBoxes(); // <-- perbarui daftar packed boxes
      } else {
        alert('Gagal menutup sesi');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setClosing(false);
    }
  };

  const handlePrint = () => window.print();

  const reprintQR = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/packing/reprint/${sessionId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const session = history.find(s => s.id === sessionId);
        
        const cache = JSON.parse(localStorage.getItem('packing_op_cache') || '{}');
        const firstOpNum = session?.items?.[0]?.op?.opNumber;
        const cachedItemName = firstOpNum ? cache[firstOpNum]?.itemNameFG : null;
        
        const opNumbers = session?.items?.map(i => i.op?.opNumber).filter(Boolean).join(', ') || '-';
        const itemNameFG = session?.items?.[0]?.op?.itemNameFG || cachedItemName || '-';

        setQr({
          code: data.qrCode,
          opNumbers: opNumbers,
          itemNumberFG: session?.fgNumber || '-',
          itemNameFG: itemNameFG,
          qtyOp: session?.totalQty || 0,
          createdAt: session?.createdAt || new Date().toISOString()
        });
      } else {
        alert('Gagal mencetak ulang');
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Fungsi untuk mencetak ulang dari packed box
  const reprintPackedBox = (qrCode: string) => {
    // Cari box berdasarkan qrCode di packedBoxes
    const box = packedBoxes.find(b => b.qrCode === qrCode);
    if (!box) return;
    setQr({
      code: box.qrCode,
      opNumbers: box.items.map(i => i.opNumber).join(', '),
      itemNumberFG: box.fgNumber,
      itemNameFG: box.items.map(i => i.opNumber).join(', '), // Nama item tidak tersedia, gunakan opNumbers sementara
      qtyOp: box.totalQty,
      createdAt: box.createdAt
    });
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const totalRemaining = ops.reduce((sum, op) => sum + op.remainingPacking, 0);
  const totalPackedToday = history.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).reduce((sum, s) => sum + s.totalQty, 0);

  const selectedOp = ops.find(o => o.id === selectedOpId);
  const maxQty = selectedOp?.remainingPacking || 0;

  return (
    <div className="animate-in fade-in duration-300">
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap');
        
        @media print {
          @page {
            size: 7.9cm 3.8cm; 
            margin: 0; 
          }
          html, body {
            width: 7.9cm !important;
            height: 3.8cm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background-color: white !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {qr && (
        <>
          <div className="hidden print:flex w-[7.9cm] h-[3.8cm] bg-white text-black m-0 p-0 box-border flex-col items-center justify-center overflow-hidden fixed top-0 left-0 z-[9999]">
            <div className="flex flex-col h-full justify-center items-center w-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
              <div className="flex flex-col">
                <div className="flex flex-row items-center gap-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qr.code}`}
                    alt="QR Code"
                    className="w-[1.8cm] h-[1.8cm] object-contain shrink-0"
                  />
                  <div className="flex flex-col justify-center text-left font-semibold text-[9pt] leading-[1.1] tracking-wide max-w-[5.5cm]">
                    <div className="truncate">{qr.itemNumberFG}</div>
                    <div className="line-clamp-2 break-words text-[8pt]">{qr.opNumbers}</div>
                    <div>{qr.qtyOp} PCS</div>
                    <div>{formatDate(qr.createdAt ? new Date(qr.createdAt) : new Date())}</div>
                  </div>
                </div>
                <div className="mt-1.5 font-semibold text-[11pt] text-left uppercase leading-none tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-[7.5cm]">
                  {qr.itemNameFG}
                </div>
              </div>
            </div>
          </div>

          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
              
              <div className="absolute top-4 right-4">
                <CheckCircle size={24} className="text-emerald-500" />
              </div>

              <div
                className="label-container mx-auto border border-dashed border-slate-300 dark:border-slate-700 p-6 rounded bg-white"
                style={{ width: '100%', maxWidth: '380px' }}
              >
                <div className="w-full bg-white text-black" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  <div className="flex flex-col justify-center items-center">
                    <div className="flex flex-col">
                      <div className="flex flex-row items-center gap-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qr.code}`}
                          alt="QR Code"
                          className="w-20 h-20 object-contain shrink-0"
                        />
                        <div className="flex flex-col justify-center text-left font-semibold text-base leading-tight tracking-wide">
                          <div className="truncate">{qr.itemNumberFG}</div>
                          <div className="line-clamp-2 break-words text-sm">{qr.opNumbers}</div>
                          <div>{qr.qtyOp} PCS</div>
                          <div>{formatDate(qr.createdAt ? new Date(qr.createdAt) : new Date())}</div>
                        </div>
                      </div>
                      <div className="mt-2 font-semibold text-lg text-left uppercase leading-none tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                        {qr.itemNameFG}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setQr(null)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-semibold flex justify-center items-center gap-2"
                >
                  <Printer size={18} />
                  Print Label
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="print:hidden">
        <HistoryModal
          show={showHistory}
          onClose={() => setShowHistory(false)}
          history={history}
          onReprint={reprintQR}
          loading={loadingHistory}
        />

        {/* Header */}
        <div className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Package size={24} className="text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                    <Box size={14} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Packing
                    <span className="text-xs px-2 py-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full font-bold">
                      BOXING SYSTEM
                    </span>
                  </h1>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl shadow-lg">
                  <div className="flex flex-col">
                    <div className="text-xs font-medium opacity-90">Remaining Sets</div>
                    <div className="text-xl font-bold">{totalRemaining}</div>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Layers size={18} className="text-white" />
                  </div>
                </div>
                <button
                  onClick={() => { fetchOps(); fetchActiveSession(); fetchPackedBoxes(); }}
                  disabled={refreshing}
                  className="group px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {refreshing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
                  Refresh
                </button>
                <button
                  onClick={() => { fetchHistory(); setShowHistory(true); }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:from-purple-700 hover:to-purple-600 transition-all"
                >
                  <History size={16} />
                  History
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-6 pb-6">
            <MetricCard title="Remaining to Pack" value={totalRemaining} icon={Package} color="indigo" suffix="sets" subtitle="From QC" />
            <MetricCard title="Packed Today" value={totalPackedToday} icon={Box} color="emerald" suffix="sets" />
            <MetricCard title="Active Session" value={activeSession ? `${activeSession.totalQty}/${packSize}` : 'None'} icon={Layers} color="amber" subtitle={activeSession ? `FG: ${activeSession.fgNumber}` : 'No active session'} />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left Column - Available OPs */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden h-full">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-900/10 rounded-lg flex items-center justify-center">
                      <Package size={16} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Available from QC</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Select OP to add to session</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{ops.length}</span>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search OP, style, FG..."
                    className="w-full pl-9 pr-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div
                  className="space-y-2 max-h-[400px] overflow-y-auto pr-1"
                  ref={leftListRef}
                  onScroll={handleLeftScroll}
                >
                  {filteredOps.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Package size={20} className="text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">No OPs ready for packing</p>
                    </div>
                  ) : (
                    filteredOps.map(op => {
                      const isSelected = selectedOpId === op.id;
                      return (
                        <div
                          key={op.id}
                          className={`group p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 shadow-lg'
                              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg'
                          }`}
                          onClick={() => setSelectedOpId(op.id)}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">{op.opNumber}</div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">Style: {op.styleCode}</div>
                              <div className="text-xs text-slate-500 mt-0.5">FG: {op.itemNumberFG}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Sisa: {op.remainingPacking}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-bold text-slate-900 dark:text-white">{op.qtyQC || 0}</div>
                              <div className="text-[10px] text-slate-500">total QC good</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Packing Session */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 rounded-lg flex items-center justify-center">
                    <Box size={16} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Packing Session</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeSession ? `Active: ${activeSession.fgNumber} (${activeSession.totalQty}/${packSize})` : 'No active session'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {loadingSession ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                  </div>
                ) : !activeSession ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Pilih Finished Goods Number</label>
                      <select
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all"
                        value={selectedFG}
                        onChange={e => setSelectedFG(e.target.value)}
                      >
                        <option value="">-- Pilih FG --</option>
                        {fgOptions.map(fg => (
                          <option key={fg} value={fg}>{fg}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={createSession}
                      disabled={!selectedFG}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      <Plus size={18} />
                      Buat Sesi Baru
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Progress Box</span>
                          <span className="text-slate-600 dark:text-slate-400">{activeSession.totalQty} / {packSize} sets</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                            style={{ width: `${(activeSession.totalQty / packSize) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 mb-2">Items in this box</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {activeSession.items?.map(item => (
                            <SessionItemRow
                              key={item.id}
                              item={item}
                              onRemove={() => removeItem(item.id)}
                            />
                          ))}
                          {(!activeSession.items || activeSession.items.length === 0) && (
                            <p className="text-center text-xs text-slate-500 py-3">Belum ada item</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 mb-3">Tambah Item</h4>
                      
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Pilih OP</label>
                        <select
                          className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all"
                          value={selectedOpId}
                          onChange={e => setSelectedOpId(e.target.value)}
                        >
                          <option value="">-- Pilih OP --</option>
                          {ops.map(op => (
                            <option key={op.id} value={op.id}>
                              {op.opNumber} (sisa {op.remainingPacking})
                            </option>
                          ))}
                        </select>
                      </div>

                      <SimpleNumpad
                        value={inputQty}
                        onChange={setInputQty}
                        max={maxQty}
                      />

                      <button
                        onClick={addItem}
                        disabled={adding || !selectedOpId || inputQty <= 0}
                        className="mt-3 w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                      >
                        {adding ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Tambah ke Sesi
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {activeSession && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-700/50">
                  <button
                    onClick={closeSession}
                    disabled={closing || activeSession.totalQty !== packSize}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {closing ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
                    Tutup Sesi & Generate QR
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== NEW SECTION: Packed Boxes (Menunggu Diterima di Finished Goods) ===== */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 rounded-lg flex items-center justify-center">
                  <Package size={16} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Packed Boxes (Menunggu Diterima di Finished Goods)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Box yang sudah di-pack dan siap dikirim</p>
                </div>
              </div>
              <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{packedBoxes.length}</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            {loadingPacked ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-amber-600" size={24} />
              </div>
            ) : packedBoxes.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Tidak ada box yang menunggu diterima.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {packedBoxes.map(box => (
                  <PackedBoxCard key={box.id} box={box} onReprint={reprintPackedBox} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};