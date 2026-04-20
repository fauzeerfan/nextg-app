import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Package, BarChart, TrendingUp, History,
  Warehouse, RefreshCw, CheckCircle, AlertCircle,
  X, Loader2, ChevronDown, ChevronUp,
  FileText, Search
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

// ==================== Types ====================

interface FGStockItem {
  id: string;
  opId: string;
  op?: { opNumber: string; styleCode: string; qtyOp: number };
  qty: number;
  createdAt: string;
}

interface FGStock {
  id: string;
  fgNumber: string;
  totalQty: number;
  items: FGStockItem[];
}

interface ShippingDocument {
  no_surat_jalan: number;
  tanggal_surat_jalan: string;
  customer: string;
}

interface ShippingDocumentItem {
  no_surat_jalan: number;
  tanggal_surat_jalan: string;
  kode_item: string;
  name_finishgood: string;
  qty: number;
}

interface ShipmentRecord {
  id: string;
  suratJalan: string;
  tanggal: string;
  customerName?: string;
  fgNumber: string;
  totalQty: number;
  status: 'SHIPPED' | 'DELIVERED';
  items?: { opNumber: string; qty: number }[];
}

// ==================== Helper Components ====================

// Modern Solid Metric Card
const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'emerald', 
  subtitle, 
  suffix, 
  trend 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  color?: 'emerald' | 'blue' | 'amber' | 'purple'; 
  subtitle?: string; 
  suffix?: string; 
  trend?: string; 
}) => {
  const colors = {
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-500', darkBg: 'dark:bg-emerald-900/40', darkIcon: 'dark:text-emerald-400' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-500', darkBg: 'dark:bg-blue-900/40', darkIcon: 'dark:text-blue-400' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-amber-500', darkBg: 'dark:bg-amber-900/40', darkIcon: 'dark:text-amber-400' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-500', darkBg: 'dark:bg-purple-900/40', darkIcon: 'dark:text-purple-400' }
  };
  
  const selected = colors[color] || colors.emerald;
  
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${selected.border} border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-10 h-10 ${selected.bg} ${selected.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className={`${selected.icon} ${selected.darkIcon}`} />
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none">
        {value}{suffix && <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>}
      </div>
      {subtitle && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
      {trend && (
        <div className="flex items-center gap-1.5 mt-2.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 w-fit px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/30">
          <TrendingUp size={14} className="text-emerald-500"/>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{trend}</span>
        </div>
      )}
    </div>
  );
};

// ==================== Main Component ====================

export const FinishedGoodsView = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'stock' | 'shipping'>('stock');

  // Stock state
  const [stocks, setStocks] = useState<FGStock[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // QR state
  const [qrInput, setQrInput] = useState('');
  const [processingQr, setProcessingQr] = useState(false);
  const [qrMessage, setQrMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // New states for preview
  const [previewBox, setPreviewBox] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Shipping documents state
  const [shippingDocs, setShippingDocs] = useState<ShippingDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ShippingDocument | null>(null);
  const [docItems, setDocItems] = useState<ShippingDocumentItem[]>([]);
  const [loadingDocItems, setLoadingDocItems] = useState(false);
  const [shippingQuantities, setShippingQuantities] = useState<Record<string, number>>({});
  const [processingShip, setProcessingShip] = useState(false);

  // History state
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Auth headers helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('nextg_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // ========== DATA FETCHING ==========
  const fetchStocks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/finished-goods/stock`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setStocks(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch stock', error);
    }
  }, []);

  const fetchShippingDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/finished-goods/shipping-documents`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setShippingDocs(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch shipping documents', error);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const fetchShipments = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/finished-goods/shipments`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const mapped: ShipmentRecord[] = data.map((item: any) => ({
          id: item.id,
          suratJalan: item.suratJalan,
          tanggal: item.createdAt,
          customerName: '-',
          fgNumber: item.fgNumber,
          totalQty: item.totalQty,
          status: 'SHIPPED',
          items: item.items?.map((i: any) => ({
            opNumber: i.op?.opNumber || '',
            qty: i.qty,
          })),
        }));
        setShipments(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch shipment history', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    fetchShippingDocs();
    fetchShipments();
    const interval = setInterval(fetchStocks, 10000);
    return () => clearInterval(interval);
  }, [fetchStocks, fetchShippingDocs, fetchShipments]);

  // ========== QR HANDLING (Preview & Receive) ==========
  // Preview box sebelum receive
  const handlePreview = async () => {
    if (!qrInput.trim()) {
      setQrMessage({ type: 'error', text: 'QR code cannot be empty' });
      return;
    }
    setPreviewLoading(true);
    setQrMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/packing/box/${encodeURIComponent(qrInput.trim())}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewBox(data);
      } else {
        const err = await res.json();
        setQrMessage({ type: 'error', text: err.message || 'Invalid QR code or box already received' });
        setPreviewBox(null);
      }
    } catch (error) {
      setQrMessage({ type: 'error', text: 'Network error' });
      setPreviewBox(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Konfirmasi receive setelah preview
  const handleReceive = async () => {
    if (!previewBox) return;
    setProcessingQr(true);
    try {
      const res = await fetch(`${API_BASE_URL}/finished-goods/receive`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ qrCode: previewBox.qrCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setQrMessage({ type: 'success', text: `Successfully received ${data.totalQty} pcs` });
        setPreviewBox(null);
        setQrInput('');
        fetchStocks();
      } else {
        const err = await res.json();
        setQrMessage({ type: 'error', text: err.message || 'Failed to receive' });
      }
    } catch (error) {
      setQrMessage({ type: 'error', text: 'Network error' });
    } finally {
      setProcessingQr(false);
    }
  };

  // ========== SHIPPING DOCUMENT SELECTION ==========
  const handleSelectDoc = async (doc: ShippingDocument | null) => {
    setSelectedDoc(doc);
    if (!doc) {
      setDocItems([]);
      setShippingQuantities({});
      return;
    }
    setLoadingDocItems(true);
    try {
      const res = await fetch(`${API_BASE_URL}/finished-goods/shipping-document-items/${doc.no_surat_jalan}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const items: ShippingDocumentItem[] = await res.json();
        setDocItems(items);
        const initialQty: Record<string, number> = {};
        items.forEach(item => {
          initialQty[item.kode_item] = 0;
        });
        setShippingQuantities(initialQty);
      }
    } catch (error) {
      console.error('Failed to fetch document items', error);
    } finally {
      setLoadingDocItems(false);
    }
  };

  // ========== SHIPMENT PROCESSING ==========
  const handleShip = async () => {
    if (!selectedDoc) {
      alert('Select a shipping document first');
      return;
    }

    const itemsToShip = docItems
      .filter(item => (shippingQuantities[item.kode_item] || 0) > 0)
      .map(item => ({
        fgNumber: item.kode_item,
        qty: shippingQuantities[item.kode_item],
      }));

    if (itemsToShip.length === 0) {
      alert('No items selected for shipment');
      return;
    }

    setProcessingShip(true);
    try {
      for (const item of itemsToShip) {
        const res = await fetch(`${API_BASE_URL}/finished-goods/ship`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            fgNumber: item.fgNumber,
            qty: item.qty,
            suratJalan: selectedDoc.no_surat_jalan.toString(),
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(`Failed to ship ${item.fgNumber}: ${err.message}`);
          break;
        }
      }
      fetchStocks();
      fetchShipments();
      setSelectedDoc(null);
      setDocItems([]);
      setShippingQuantities({});
    } catch (error) {
      console.error('Error during shipping', error);
    } finally {
      setProcessingShip(false);
    }
  };

  // ========== RENDER ==========

  const totalStock = stocks.reduce((sum, s) => sum + s.totalQty, 0);
  const totalItems = stocks.reduce((sum, s) => sum + s.items.length, 0);
  const totalShippedToday = shipments
    .filter(s => new Date(s.tanggal).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.totalQty, 0);

  return (
    <div className="font-poppins text-slate-800 dark:text-slate-100 min-h-screen animate-in fade-in duration-300">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
        `}
      </style>

      {/* Header - Solid Style */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
        <div className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Truck size={28} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                  <Package size={14} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  Finished Goods
                  <span className="text-[11px] px-2.5 py-1 bg-emerald-500 text-white rounded-md font-bold uppercase tracking-wider">
                    STOCK & SHIPPING
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Inventory Management & Fulfillment</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { fetchStocks(); fetchShippingDocs(); fetchShipments(); }}
                className="group px-5 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-400 dark:hover:text-emerald-400 transition-colors shadow-sm text-sm"
              >
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                Refresh
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="px-5 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 text-sm"
              >
                <History size={18} />
                History
              </button>
            </div>
          </div>
        </div>
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 md:px-8 pb-6 md:pb-8">
          <MetricCard title="Total Stock" value={totalStock} icon={Package} color="emerald" suffix="sets" subtitle={`${stocks.length} FG items available`} />
          <MetricCard title="Total Boxes" value={totalItems} icon={Warehouse} color="blue" suffix="boxes" subtitle="From packing station" />
          <MetricCard title="Shipped Today" value={totalShippedToday} icon={Truck} color="amber" suffix="sets" />
          <MetricCard title="Avg Sets / Box" value={totalItems > 0 ? Math.round(totalStock / totalItems) : 0} icon={BarChart} color="purple" suffix="sets" />
        </div>
      </div>

      {/* Tab Navigation - Solid Style */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 sm:flex-none px-6 py-3 text-sm font-black transition-all rounded-xl border-2 flex items-center justify-center gap-2 ${
            activeTab === 'stock'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:text-emerald-500'
          }`}
        >
          <Package size={18} />
          FG INVENTORY
        </button>
        <button
          onClick={() => setActiveTab('shipping')}
          className={`flex-1 sm:flex-none px-6 py-3 text-sm font-black transition-all rounded-xl border-2 flex items-center justify-center gap-2 ${
            activeTab === 'shipping'
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-500 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:text-amber-500'
          }`}
        >
          <Truck size={18} />
          SHIPPING PROCESS
        </button>
      </div>

      {/* Konten Berdasarkan Tab */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* QR Input Section */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-5 items-end">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Scan / Input Box QR Code
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="flex-1 px-5 py-4 text-base font-semibold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all outline-none"
                    placeholder="Scan QR Code here..."
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
                  />
                  <button
                    onClick={handlePreview}
                    disabled={previewLoading}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center justify-center gap-2 text-base transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none uppercase tracking-wider"
                  >
                    {previewLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    Preview Box
                  </button>
                </div>
              </div>
            </div>
            
            {qrMessage && (
              <div className={`mt-4 px-5 py-4 rounded-xl flex items-center gap-3 text-sm font-bold border-2 ${
                qrMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' 
                  : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400'
              }`}>
                {qrMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                {qrMessage.text}
              </div>
            )}

            {/* Box Preview Section */}
            {previewBox && (
              <div className="mt-6 p-5 bg-white dark:bg-slate-800 rounded-2xl border-2 border-blue-500 shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-lg text-slate-900 dark:text-white">Box Preview</h4>
                    <p className="text-xs font-semibold text-slate-500">Please verify before receiving</p>
                  </div>
                  <button onClick={() => setPreviewBox(null)} className="p-1 text-slate-400 hover:text-rose-500">
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">FG Number</div>
                    <div className="font-black text-lg text-slate-900 dark:text-white">{previewBox.fgNumber}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Total Qty</div>
                    <div className="font-black text-lg text-emerald-600 dark:text-emerald-400">{previewBox.totalQty} sets</div>
                  </div>
                </div>
                <div className="mb-5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase mb-2">Items in Box</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {previewBox.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <span className="font-mono font-bold text-sm">{item.opNumber}</span>
                        <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">{item.qty} sets</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPreviewBox(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-bold">
                    Cancel
                  </button>
                  <button onClick={handleReceive} disabled={processingQr} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    {processingQr ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    Confirm Receive
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stock Table */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-lg leading-none">Finished Goods Inventory</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Click row to view Box details</p>
                </div>
              </div>
              <div className="px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-black uppercase tracking-widest">
                {stocks.length} FG Types
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/50">
                  <tr className="text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-4 px-6">FG Number</th>
                    <th className="py-4 px-6">Total Stock</th>
                    <th className="py-4 px-6">Boxes</th>
                    <th className="py-4 px-6">Last Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {stocks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center font-bold text-slate-500 text-lg">
                        <Package size={48} className="mx-auto mb-4 opacity-30" />
                        No finished goods stock available
                       </td>
                    </tr>
                  ) : (
                    stocks.map((stock) => {
                      const isExpanded = expandedRows.has(stock.id);
                      return (
                        <>
                          <tr
                            key={stock.id}
                            className={`group hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-700/20' : ''}`}
                            onClick={() => {
                              const newSet = new Set(expandedRows);
                              if (isExpanded) newSet.delete(stock.id);
                              else newSet.add(stock.id);
                              setExpandedRows(newSet);
                            }}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'text-slate-400'}`}>
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                                <span className="font-mono font-black text-base text-slate-900 dark:text-white">{stock.fgNumber}</span>
                              </div>
                             </td>
                            <td className="py-4 px-6">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{stock.totalQty}</span>
                                <span className="text-xs font-bold text-slate-500 uppercase">sets</span>
                              </div>
                             </td>
                            <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-300">{stock.items.length}</td>
                            <td className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {stock.items[0]?.createdAt ? new Date(stock.items[0].createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                             </td>
                          </tr>
                          
                          {/* Expanded Content */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={4} className="p-0 border-b-2 border-emerald-100 dark:border-emerald-900/30">
                                <div className="bg-slate-50/80 dark:bg-slate-900/30 px-8 py-5">
                                  <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-widest">Boxes in this Inventory:</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {stock.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm hover:border-emerald-300 transition-colors">
                                        <div>
                                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs block">{item.op?.opNumber}</span>
                                          <span className="text-[10px] font-semibold text-slate-500 uppercase">{item.op?.styleCode}</span>
                                        </div>
                                        <div className="bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg">
                                          <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">{item.qty}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                               </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shipping' && (
        <div className="w-full space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg leading-none">Shipping Fulfillment</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Select document & assign quantities</p>
              </div>
            </div>
            
            <div className="p-6 md:p-8">
              {/* Shipping Document Select */}
              <div className="mb-8">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Shipping Document Number</label>
                <div className="relative">
                  <select
                    className="w-full pl-5 pr-10 py-4 text-base font-bold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all outline-none appearance-none cursor-pointer"
                    value={selectedDoc?.no_surat_jalan || ''}
                    onChange={(e) => {
                      const doc = shippingDocs.find(d => d.no_surat_jalan === Number(e.target.value));
                      handleSelectDoc(doc || null);
                    }}
                  >
                    <option value="">-- Choose Shipping Document --</option>
                    {shippingDocs.map(doc => (
                      <option key={doc.no_surat_jalan} value={doc.no_surat_jalan}>
                        DO #{doc.no_surat_jalan} - {doc.customer} ({new Date(doc.tanggal_surat_jalan).toLocaleDateString('en-US')})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
                  {loadingDocs && <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin text-amber-500" size={18} />}
                </div>
              </div>

              {/* Document Items Allocation */}
              {selectedDoc && (
                <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-700 mb-6">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Package size={16} className="text-amber-500" />
                    Items to Fulfill
                  </h4>
                  
                  {loadingDocItems ? (
                    <div className="flex justify-center items-center py-10"><Loader2 className="animate-spin text-amber-500" size={32} /></div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {docItems.map((item) => {
                        const stock = stocks.find(s => s.fgNumber === item.kode_item);
                        const available = stock?.totalQty || 0;
                        const qty = shippingQuantities[item.kode_item] || 0;
                        const isFulfilled = qty === item.qty;
                        
                        return (
                          <div key={item.kode_item} className={`p-4 bg-white dark:bg-slate-800 rounded-xl border-2 transition-colors ${
                            isFulfilled ? 'border-emerald-400 shadow-sm' : 'border-slate-200 dark:border-slate-700'
                          }`}>
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-mono font-black text-sm text-slate-900 dark:text-white">{item.kode_item}</div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate max-w-[200px]">{item.name_finishgood}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested</div>
                                <div className="text-base font-black text-amber-600 dark:text-amber-400">{item.qty}</div>
                              </div>
                            </div>
                            
<div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
  <div className="flex-1">
    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Ship Qty</div>
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <input
          type="number"
          min="0"
          max={Math.min(available, item.qty)}
          className="w-full pl-3 pr-10 py-2 text-base font-black border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:border-amber-500 outline-none transition-colors"
          placeholder="0"
          value={qty !== undefined ? qty : ''}
          onChange={(e) => {
            let rawValue = e.target.value;
            if (rawValue === '') rawValue = '0';
            let numValue = Number(rawValue);
            if (isNaN(numValue)) numValue = 0;
            const maxAllowed = Math.min(available, item.qty);
            const newValue = Math.min(numValue, maxAllowed);
            setShippingQuantities(prev => ({
              ...prev,
              [item.kode_item]: newValue
            }));
          }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">/{item.qty}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          const maxQty = Math.min(available, item.qty);
          setShippingQuantities(prev => ({
            ...prev,
            [item.kode_item]: maxQty
          }));
        }}
        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
      >
        Max
      </button>
    </div>
  </div>
  <div className="px-3 py-2 text-center">
    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available</div>
    <div className={`text-base font-black ${available >= item.qty ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {available}
    </div>
  </div>
</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              {selectedDoc && (
                <button
                  onClick={handleShip}
                  disabled={processingShip || loadingDocItems}
                  className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 text-lg transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:-translate-y-1 active:translate-y-0 uppercase tracking-wider"
                >
                  {processingShip ? <Loader2 className="animate-spin" size={24} /> : <Truck size={24} />}
                  Process Shipment Document
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Modal - Solid Style */}
      {showHistory && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-lg text-white">
                  <History size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">Shipping History</h3>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Processed Delivery Orders</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm">
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
              {loadingHistory ? (
                <div className="flex justify-center items-center h-full py-10">
                  <Loader2 className="animate-spin text-amber-500" size={32} />
                </div>
              ) : shipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
                  <History size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-lg">No shipment history yet.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                      <tr className="text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        <th className="py-4 px-5">Date</th>
                        <th className="py-4 px-5">Doc Number</th>
                        <th className="py-4 px-5">Customer</th>
                        <th className="py-4 px-5">FG Item</th>
                        <th className="py-4 px-5 text-right">Qty</th>
                        <th className="py-4 px-5">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {shipments.map(ship => (
                        <tr key={ship.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-4 px-5 font-semibold text-slate-700 dark:text-slate-300">{new Date(ship.tanggal).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                          <td className="py-4 px-5 font-mono font-black text-slate-900 dark:text-white">{ship.suratJalan}</td>
                          <td className="py-4 px-5 font-semibold text-slate-600 dark:text-slate-400">{ship.customerName || '-'}</td>
                          <td className="py-4 px-5 font-black text-indigo-600 dark:text-indigo-400">{ship.fgNumber}</td>
                          <td className="py-4 px-5 font-black text-right">{ship.totalQty}</td>
                          <td className="py-4 px-5">
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                              ship.status === 'SHIPPED' 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {ship.status}
                            </span>
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
                onClick={() => setShowHistory(false)}
                className="px-8 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};