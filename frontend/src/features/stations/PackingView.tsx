import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Package, Box, RefreshCw, Search, Plus, Printer, X, CheckCircle,
  Layers, Save, Loader2, QrCode, History, Delete, Activity
} from 'lucide-react';
import { TargetSummaryCard } from '../../components/ui/TargetSummaryCard';

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
  remainingPacking: number;
}

interface PackingSessionHistory extends PackingSession {}

interface PackedBox {
  id: string;
  fgNumber: string;
  totalQty: number;
  items: { opNumber: string; qty: number }[];
  qrCode: string;
  createdAt: string;
}

interface QrData {
  code: string;
  opNumbers: string;
  itemNumberFG: string;
  itemNameFG: string;
  qtyOp: number;
  createdAt?: string;
}

// Modern Solid Metric Card
const MetricCard = ({ title, value, icon: Icon, color = 'indigo', subtitle, suffix }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: 'indigo' | 'emerald' | 'amber' | 'blue';
  subtitle?: string;
  suffix?: string;
}) => {
  const colors = {
    indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-indigo-500', darkBg: 'dark:bg-indigo-900/40', darkIcon: 'dark:text-indigo-400' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-500', darkBg: 'dark:bg-emerald-900/40', darkIcon: 'dark:text-emerald-400' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-amber-500', darkBg: 'dark:bg-amber-900/40', darkIcon: 'dark:text-amber-400' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-500', darkBg: 'dark:bg-blue-900/40', darkIcon: 'dark:text-blue-400' }
  };
  const selected = colors[color] || colors.indigo;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${selected.border} border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-10 h-10 ${selected.bg} ${selected.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className={`${selected.icon} ${selected.darkIcon}`} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
        {value}{suffix && <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>}
      </div>
      {subtitle && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

// Item Row Component - Solid Style
const SessionItemRow = ({ item, onRemove }: { item: PackingItem; onRemove: () => void }) => (
  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm mb-2">
    <div>
      <div className="font-mono font-black text-sm text-slate-900 dark:text-white">{item.op?.opNumber}</div>
      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">Qty: {item.qty} sets</div>
    </div>
    <button onClick={onRemove} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl text-rose-500 transition-colors">
      <X size={16} />
    </button>
  </div>
);

// Compact Numpad - Solid Design
const CompactNumpad = ({ value, onChange, max }: { value: number; onChange: (val: number) => void; max: number }) => {
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 p-3 shadow-sm">
      <div className="mb-2">
        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Quantity</div>
        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 text-center py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
          {value}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {quickAmounts.map(amt => (
          <button
            key={amt}
            onClick={() => handleSet(amt)}
            className="py-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl font-black text-sm hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition-colors"
          >
            +{amt}
          </button>
        ))}
      </div>
      <button
        onClick={handleClear}
        className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center gap-1.5 text-xs transition-colors"
      >
        <Delete size={16} /> Clear
      </button>
    </div>
  );
};

// Modern Solid History Modal
const HistoryModal = ({ show, onClose, history, onReprint, loading }: any) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:hidden">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-lg text-white">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">Packing History</h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Recently Closed Sessions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm">
            <X size={24} className="text-slate-500" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center h-full py-10">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
              <History size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-lg">No packing history yet.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/50">
                  <tr className="text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-4 px-5">Date</th>
                    <th className="py-4 px-5">FG Number</th>
                    <th className="py-4 px-5">Qty</th>
                    <th className="py-4 px-5">Items</th>
                    <th className="py-4 px-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {history.map((s: PackingSessionHistory) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-4 px-5 font-semibold text-slate-700 dark:text-slate-300">{new Date(s.createdAt).toLocaleString()}</td>
                      <td className="py-4 px-5 font-black text-slate-900 dark:text-white">{s.fgNumber}</td>
                      <td className="py-4 px-5 font-bold text-indigo-600 dark:text-indigo-400">{s.totalQty} sets</td>
                      <td className="py-4 px-5 font-medium text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {s.items.map(item => `${item.op?.opNumber} (${item.qty})`).join(', ')}
                      </td>
                      <td className="py-4 px-5">
                        <button
                          onClick={() => { onClose(); onReprint(s.id); }}
                          className="px-4 py-1.5 bg-blue-600 text-white rounded-md font-bold text-xs hover:bg-blue-700 shadow-sm shadow-blue-600/30 uppercase tracking-wider"
                        >
                          Reprint
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Packed Box Card - Solid Style
const PackedBoxCard = ({ box, onReprint }: { box: PackedBox; onReprint: (qrCode: string) => void }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md hover:border-amber-400 transition-all duration-300">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono font-black text-base text-slate-900 dark:text-white leading-none">{box.fgNumber}</div>
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">{box.totalQty} sets</div>
        </div>
        <button
          onClick={() => onReprint(box.qrCode)}
          className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors"
          title="Reprint QR"
        >
          <Printer size={16} />
        </button>
      </div>
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-700/30 p-2 rounded-lg line-clamp-2">
        {box.items.map(item => `${item.opNumber} (${item.qty})`).join(', ')}
      </div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 dark:border-slate-700 pt-2">
        {new Date(box.createdAt).toLocaleString()}
      </div>
    </div>
  );
};

export const PackingView = () => {
  const [allQcOps, setAllQcOps] = useState<ProductionOrder[]>([]);
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
  const [cancelling, setCancelling] = useState(false);
  const [qr, setQr] = useState<QrData | null>(null);

  const [history, setHistory] = useState<PackingSessionHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [packedBoxes, setPackedBoxes] = useState<PackedBox[]>([]);
  const [loadingPacked, setLoadingPacked] = useState(false);

  // Ref untuk membandingkan data sebelumnya
  const prevOpsRef = useRef<PackingOp[]>([]);
  const prevAllQcOpsRef = useRef<ProductionOrder[]>([]);
  const prevActiveSessionRef = useRef<PackingSession | null>(null);
  const prevPackedBoxesRef = useRef<PackedBox[]>([]);

  // ========== PACK SIZE ==========
  const [packSize, setPackSize] = useState<number>(100);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('nextg_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

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

  // ========== FETCH FUNCTIONS WITH showLoading PARAM ==========
  const fetchOps = useCallback(async (showLoading = true) => {
    if (showLoading) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/production-orders?station=PACKING`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data: ProductionOrder[] = await res.json();
        
        if (JSON.stringify(prevAllQcOpsRef.current) !== JSON.stringify(data)) {
          setAllQcOps(data);
          prevAllQcOpsRef.current = data;
        }

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
        if (JSON.stringify(fgOptions) !== JSON.stringify(fgs)) {
          setFgOptions(fgs);
        }
      }
    } catch (error) {
      console.error('Failed to fetch packing OPs', error);
    } finally {
      if (showLoading) setRefreshing(false);
    }
  }, [updateOpCache, fgOptions]);

  const fetchActiveSession = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingSession(true);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/sessions/active`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 404) {
        if (prevActiveSessionRef.current !== null) {
          setActiveSession(null);
          prevActiveSessionRef.current = null;
        }
      } else if (res.ok) {
        const session = await res.json();
        if (JSON.stringify(prevActiveSessionRef.current) !== JSON.stringify(session)) {
          setActiveSession(session);
          prevActiveSessionRef.current = session;
        }
        if (session && session.fgNumber !== selectedFG) {
          setSelectedFG(session.fgNumber);
        }
        
        if (session && session.items) {
          const sessionOps = session.items.map((i: any) => i.op).filter(Boolean);
          updateOpCache(sessionOps);
        }
      } else {
        console.error('Failed to fetch active session', res.status);
        if (prevActiveSessionRef.current !== null) {
          setActiveSession(null);
          prevActiveSessionRef.current = null;
        }
      }
    } catch (error) {
      console.error('Failed to fetch active session', error);
      if (prevActiveSessionRef.current !== null) {
        setActiveSession(null);
        prevActiveSessionRef.current = null;
      }
    } finally {
      if (showLoading) setLoadingSession(false);
    }
  }, [updateOpCache, selectedFG]);

  const fetchHistory = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingHistory(true);
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
      if (showLoading) setLoadingHistory(false);
    }
  }, []);

  const fetchPackedBoxes = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingPacked(true);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/packed-boxes`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (JSON.stringify(prevPackedBoxesRef.current) !== JSON.stringify(data)) {
          setPackedBoxes(data);
          prevPackedBoxesRef.current = data;
        }
      }
    } catch (error) {
      console.error('Failed to fetch packed boxes', error);
    } finally {
      if (showLoading) setLoadingPacked(false);
    }
  }, []);

  // Effect untuk pack size
  useEffect(() => {
    if (activeSession && activeSession.items && activeSession.items.length > 0) {
      const firstOp = activeSession.items[0].op;
      if (firstOp && firstOp.lineCode) {
        fetch(`${API_BASE_URL}/line-masters/${firstOp.lineCode}/packing-config`, {
          headers: getAuthHeaders(),
        })
          .then(res => res.ok ? res.json() : { packSize: 100 })
          .then(data => setPackSize(data.packSize))
          .catch(() => setPackSize(100));
      } else {
        setPackSize(100);
      }
    } else {
      setPackSize(100);
    }
  }, [activeSession]);

  // Initial fetch dan interval
  useEffect(() => {
    fetchOps(true);
    fetchActiveSession(true);
    fetchHistory(true);
    fetchPackedBoxes(true);

    const interval = setInterval(() => {
      fetchOps(false);
      fetchActiveSession(false);
      fetchPackedBoxes(false);
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
        prevActiveSessionRef.current = session;
      } else {
        const err = await res.json();
        alert(`Failed to create session: ${err.message || res.status}`);
      }
    } catch (error) {
      console.error(error);
      alert('Network error while creating session');
    } finally {
      setLoadingSession(false);
    }
  };

  const addItem = async () => {
    if (!activeSession || !selectedOpId || inputQty <= 0) return;
    const op = ops.find(o => o.id === selectedOpId);
    if (!op) return;
    if (inputQty > op.remainingPacking) {
      alert(`Maximum ${op.remainingPacking} sets remaining`);
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
        prevActiveSessionRef.current = updatedSession;
        setSelectedOpId('');
        setInputQty(0);
        await fetchOps(false);
        await fetchActiveSession(false);
      } else {
        const err = await res.json();
        alert(`Failed: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAdding(false);
    }
  };

  const removeItem = async (itemId: string) => {
    alert('Remove item function not yet available');
  };

  const closeSession = async () => {
    if (!activeSession) return;
    if (activeSession.totalQty !== packSize) {
      alert(`Session must reach ${packSize} sets to close`);
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
        prevActiveSessionRef.current = null;
        setSelectedFG('');
        await fetchOps(false);
        await fetchActiveSession(false);
        fetchHistory(false); 
        fetchPackedBoxes(false);
      } else {
        alert('Failed to close session');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setClosing(false);
    }
  };

  const cancelSession = async () => {
    if (!activeSession) return;
    if (!confirm('Are you sure you want to cancel this packing session? All items will be removed.')) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/session/${activeSession.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setActiveSession(null);
        prevActiveSessionRef.current = null;
        setSelectedFG('');
        await fetchOps(false);
        await fetchActiveSession(false);
        await fetchPackedBoxes(false);
      } else {
        const err = await res.json();
        alert(`Failed to cancel session: ${err.message || res.status}`);
      }
    } catch (error) {
      console.error(error);
      alert('Network error while cancelling session');
    } finally {
      setCancelling(false);
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
        alert('Failed to reprint');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const reprintPackedBox = (qrCode: string) => {
    const box = packedBoxes.find(b => b.qrCode === qrCode);
    if (!box) return;
    setQr({
      code: box.qrCode,
      opNumbers: box.items.map(i => i.opNumber).join(', '),
      itemNumberFG: box.fgNumber,
      itemNameFG: box.items.map(i => i.opNumber).join(', '), // Approximation since itemNameFG might not be fully stored in box
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

  const totalTarget = allQcOps.reduce((sum, op) => sum + (op.qtyQC || 0), 0);
  const totalPacked = allQcOps.reduce((sum, op) => sum + (op.qtyPacking || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalPacked / totalTarget) * 100) : 0;

  const selectedOp = ops.find(o => o.id === selectedOpId);
  const maxQty = selectedOp?.remainingPacking || 0;

  return (
    <div className="font-poppins text-slate-800 dark:text-slate-100 min-h-screen animate-in fade-in duration-300">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        .font-poppins { font-family: 'Poppins', sans-serif; }
        
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
          {/* ========================================================= */}
          {/* 1. VERSI CETAK MESIN */}
          {/* ========================================================= */}
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
                    <div>{qr.qtyOp} SETS</div>
                    <div>{formatDate(qr.createdAt ? new Date(qr.createdAt) : new Date())}</div>
                  </div>
                </div>
                <div className="mt-1.5 font-bold text-[11pt] text-left uppercase leading-none tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-[7.5cm]">
                  {qr.itemNameFG}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. VERSI LAYAR MODAL */}
          {/* ========================================================= */}
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:hidden">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              
              <div className="absolute top-5 right-5">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">QR Generated</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Box packing label ready</p>
              </div>

              <div
                className="label-container mx-auto border-2 border-dashed border-slate-300 dark:border-slate-600 p-5 rounded-2xl bg-white shadow-sm"
                style={{ width: '100%', maxWidth: '380px' }}
              >
                <div className="w-full bg-white text-black" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  <div className="flex flex-col justify-center items-center">
                    <div className="flex flex-col w-full">
                      <div className="flex flex-row items-center gap-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qr.code}`}
                          alt="QR Code"
                          className="w-20 h-20 object-contain shrink-0"
                        />
                        <div className="flex flex-col justify-center text-left font-bold text-[15px] leading-tight tracking-wide">
                          <div className="truncate">{qr.itemNumberFG}</div>
                          <div className="line-clamp-2 break-words text-sm">{qr.opNumbers}</div>
                          <div>{qr.qtyOp} SETS</div>
                          <div>{formatDate(qr.createdAt ? new Date(qr.createdAt) : new Date())}</div>
                        </div>
                      </div>
                      <div className="mt-3 font-black text-lg text-left uppercase leading-none tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                        {qr.itemNameFG}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setQr(null)}
                  className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-base uppercase tracking-wider"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex justify-center items-center gap-2 text-base uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-colors"
                >
                  <Printer size={20} />
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

        {/* Header - Solid Style */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
          <div className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                    <Package size={28} className="text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                    <Box size={14} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    Packing Station
                    <span className="text-[11px] px-2.5 py-1 bg-indigo-600 text-white rounded-md font-bold uppercase tracking-wider">
                      PACKING SYSTEM
                    </span>
                  </h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Finished Goods Consolidation</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-4 px-5 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
                  <div className="flex flex-col">
                    <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Remaining Sets</div>
                    <div className="text-2xl font-black leading-none mt-1">{totalRemaining}</div>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Layers size={24} className="text-white" />
                  </div>
                </div>
                <button
                  onClick={() => { 
                    fetchOps(true); 
                    fetchActiveSession(true); 
                    fetchPackedBoxes(true); 
                  }}
                  disabled={refreshing}
                  className="group px-5 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:border-indigo-600 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors shadow-sm text-sm"
                >
                  {refreshing ? <RefreshCw size={18} className="animate-spin text-indigo-600" /> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />}
                  Refresh
                </button>
                <button
                  onClick={() => { fetchHistory(true); setShowHistory(true); }}
                  className="px-5 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 text-sm"
                >
                  <History size={18} />
                  History
                </button>
              </div>
            </div>
          </div>
          
          {/* Header Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 md:px-8 pb-6 md:pb-8">
            <MetricCard title="Remaining to Pack" value={totalRemaining} icon={Package} color="indigo" suffix="sets" subtitle="From QC" />
            <MetricCard title="Packed Today" value={totalPackedToday} icon={Box} color="emerald" suffix="sets" />
            <MetricCard title="Active Session" value={activeSession ? `${activeSession.totalQty}/${packSize}` : 'None'} icon={Layers} color="amber" subtitle={activeSession ? `FG: ${activeSession.fgNumber}` : 'No active session'} />
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-blue-500 border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Progress</div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <Activity size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{overallProgress}%</div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          </div>
          <div className="px-6 md:px-8 pb-6">
            <TargetSummaryCard lineCode="K1YH" station="PACKING" />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Left Column - Available OPs */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md text-white">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">Available from QC</h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Select OP to pack</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-black text-slate-700 dark:text-slate-200">
                  {ops.length} OPs
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search OP, style, FG..."
                    className="w-full pl-10 pr-4 py-3 text-sm font-semibold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredOps.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package size={28} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No OPs ready for packing</p>
                    </div>
                  ) : (
                    filteredOps.map(op => {
                      const isSelected = selectedOpId === op.id;
                      return (
                        <div
                          key={op.id}
                          className={`group p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md ring-1 ring-indigo-500'
                              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:shadow-sm bg-white dark:bg-slate-800'
                          }`}
                          onClick={() => setSelectedOpId(op.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-mono font-black text-lg leading-none mb-1 text-slate-900 dark:text-white">{op.opNumber}</div>
                              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Style: {op.styleCode}</div>
                              <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">FG: {op.itemNumberFG}</div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Rem: {op.remainingPacking}</span>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total QC</div>
                              <div className="text-sm font-black text-slate-900 dark:text-white">{op.qtyQC || 0}</div>
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
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-md text-white">
                  <Box size={22} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-lg leading-none">Packing Session</h3>
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1 uppercase tracking-wider">
                    {activeSession ? `Active Box: ${activeSession.fgNumber} (${activeSession.totalQty}/${packSize})` : 'No active session'}
                  </p>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                {loadingSession ? (
                  <div className="flex flex-1 justify-center items-center">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                  </div>
                ) : !activeSession ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10">
                    <div className="w-full max-w-md bg-slate-50 dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 text-center">
                      <Box size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-6" />
                      <h4 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">Create New Box</h4>
                      <p className="text-sm font-medium text-slate-500 mb-8">Select a Finished Goods number to start a new packing session box.</p>
                      
                      <div className="text-left mb-6">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Select FG Number</label>
                        <select
                          className="w-full px-4 py-3 text-sm font-semibold border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all outline-none"
                          value={selectedFG}
                          onChange={e => setSelectedFG(e.target.value)}
                        >
                          <option value="">-- Choose Finished Goods --</option>
                          {fgOptions.map(fg => (
                            <option key={fg} value={fg}>{fg}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={createSession}
                        disabled={!selectedFG}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black flex items-center justify-center gap-2 text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
                      >
                        <Plus size={20} />
                        Start Packing Box
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {/* Left Inner: Items */}
                    <div className="flex flex-col h-full">
                      <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-5">
                        <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wider">
                          <span className="text-slate-500 dark:text-slate-400">Box Fill Progress</span>
                          <span className="text-indigo-600 dark:text-indigo-400">{activeSession.totalQty} / {packSize} sets</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${(activeSession.totalQty / packSize) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex-1 overflow-hidden flex flex-col">
                        <h4 className="font-black text-sm text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">Items inside Box</h4>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                          {activeSession.items?.map(item => (
                            <SessionItemRow
                              key={item.id}
                              item={item}
                              onRemove={() => removeItem(item.id)}
                            />
                          ))}
                          {(!activeSession.items || activeSession.items.length === 0) && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                              <Box size={32} className="mb-2 opacity-50" />
                              <p className="text-sm font-bold">Box is empty</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Inner: Add Item Numpad */}
                    <div className="flex flex-col">
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700 flex-1">
                        <h4 className="font-black text-sm text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-2">
                          <Plus size={16} className="text-indigo-500" />
                          Add Item to Box
                        </h4>
                        
                        <div className="mb-5">
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Selected OP</label>
                          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl">
                            {selectedOp ? (
                              <div className="font-mono font-black text-lg text-indigo-600 dark:text-indigo-400 leading-none">
                                {selectedOp.opNumber} <span className="text-xs text-slate-400 font-semibold">(Rem: {selectedOp.remainingPacking})</span>
                              </div>
                            ) : (
                              <div className="text-sm font-semibold text-slate-400">Select an OP from left panel</div>
                            )}
                          </div>
                        </div>

                        <CompactNumpad
                          value={inputQty}
                          onChange={setInputQty}
                          max={maxQty}
                        />

                        <button
                          onClick={addItem}
                          disabled={adding || !selectedOpId || inputQty <= 0}
                          className="mt-4 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black flex items-center justify-center gap-2 text-base transition-colors shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                          {adding ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                          Add To Box
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {activeSession && (
                <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 grid grid-cols-2 gap-4">
                  <button
                    onClick={cancelSession}
                    disabled={cancelling}
                    className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-black flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50 uppercase tracking-wider"
                  >
                    {cancelling ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                    Cancel Box
                  </button>
                  <button
                    onClick={closeSession}
                    disabled={closing || activeSession.totalQty !== packSize}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center justify-center gap-2 text-sm transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed uppercase tracking-wider"
                  >
                    {closing ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
                    Seal Box & Generate QR
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Packed Boxes Bottom Section */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-md text-white">
                <Box size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">Packed Boxes</h3>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Sealed and ready for transfer</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black uppercase tracking-widest">
              {packedBoxes.length} Boxes
            </div>
          </div>
          
          <div className="p-6">
            {loadingPacked ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-amber-500" size={32} />
              </div>
            ) : packedBoxes.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Box size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">No packed boxes awaiting transfer</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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