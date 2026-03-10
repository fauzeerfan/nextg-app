import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Package, Search, BarChart, TrendingUp, QrCode, History,
  Warehouse, RefreshCw, MapPin, Calendar, CheckCircle, AlertCircle,
  Eye, Plus, Minus, Tag, ArrowRight, X, Loader2, ChevronDown, ChevronUp,
  FileText, User, Clock, CheckSquare, Square
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

// ==================== Tipe Data ====================

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

// 🔥 Perbaiki interface ShipmentRecord sesuai data dari backend
interface ShipmentRecord {
  id: string;
  suratJalan: string;        // dari backend: suratJalan
  tanggal: string;            // dari backend: createdAt
  customerName?: string;      // opsional, bisa diisi dari data eksternal nanti
  fgNumber: string;           // dari backend: fgNumber
  totalQty: number;           // dari backend: totalQty
  status: 'SHIPPED' | 'DELIVERED'; // default 'SHIPPED'
  items?: { opNumber: string; qty: number }[];
}

// ==================== Komponen Bantuan ====================

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
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/20 to-blue-900/10' },
    amber: { bg: 'from-amber-100 to-amber-50', icon: 'text-amber-600', darkBg: 'from-amber-900/20 to-amber-900/10' },
    purple: { bg: 'from-purple-100 to-purple-50', icon: 'text-purple-600', darkBg: 'from-purple-900/20 to-purple-900/10' }
  };
  
  const selected = colors[color] || colors.emerald;
  
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-10 h-10 bg-gradient-to-br ${selected.bg} dark:${selected.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={18} className={selected.icon} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">
        {value}{suffix && <span className="text-lg text-slate-500 dark:text-slate-400 ml-2">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtitle}</div>}
      {trend && <div className="flex items-center gap-2 mt-3 text-xs"><TrendingUp size={12} className="text-emerald-500"/><span className="text-emerald-600 dark:text-emerald-400 font-semibold">{trend}</span></div>}
    </div>
  );
};

// ==================== Komponen Utama ====================

export const FinishedGoodsView = () => {
  // State Stok
  const [stocks, setStocks] = useState<FGStock[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // State QR
  const [qrInput, setQrInput] = useState('');
  const [processingQr, setProcessingQr] = useState(false);
  const [qrMessage, setQrMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State Shipping Documents
  const [shippingDocs, setShippingDocs] = useState<ShippingDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ShippingDocument | null>(null);
  const [docItems, setDocItems] = useState<ShippingDocumentItem[]>([]);
  const [loadingDocItems, setLoadingDocItems] = useState(false);
  const [shippingQuantities, setShippingQuantities] = useState<Record<string, number>>({});
  const [processingShip, setProcessingShip] = useState(false);

  // State History
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Helper untuk auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('nextg_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // ========== FETCH DATA ==========
  const fetchStocks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/finished-goods/stock`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setStocks(await res.json());
      }
    } catch (error) {
      console.error('Gagal mengambil stok', error);
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
      console.error('Gagal mengambil dokumen surat jalan', error);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // 🔥 Perbaiki fungsi fetchShipments
  const fetchShipments = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/finished-goods/shipments`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        // Mapping data dari backend ke format ShipmentRecord
        const mapped: ShipmentRecord[] = data.map((item: any) => ({
          id: item.id,
          suratJalan: item.suratJalan,
          tanggal: item.createdAt,
          customerName: '-', // sementara, nanti bisa diisi dari relasi jika ada
          fgNumber: item.fgNumber,
          totalQty: item.totalQty,
          status: 'SHIPPED', // default
          items: item.items?.map((i: any) => ({
            opNumber: i.op?.opNumber || '',
            qty: i.qty,
          })),
        }));
        setShipments(mapped);
      }
    } catch (error) {
      console.error('Gagal mengambil history shipment', error);
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

  // ========== HANDLE QR ==========
  const handleConfirmQr = async () => {
    if (!qrInput.trim()) {
      setQrMessage({ type: 'error', text: 'QR code tidak boleh kosong' });
      return;
    }
    setProcessingQr(true);
    setQrMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/finished-goods/receive`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ qrCode: qrInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setQrMessage({ type: 'success', text: `Berhasil menerima ${data.totalQty} pcs` });
        setQrInput('');
        fetchStocks();
      } else {
        const err = await res.json();
        setQrMessage({ type: 'error', text: err.message || 'Gagal memproses QR' });
      }
    } catch (error) {
      setQrMessage({ type: 'error', text: 'Network error' });
    } finally {
      setProcessingQr(false);
    }
  };

  // ========== HANDLE SHIPPING DOC SELECTION ==========
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
      console.error('Gagal mengambil item dokumen', error);
    } finally {
      setLoadingDocItems(false);
    }
  };

  // ========== HANDLE SHIP ==========
  const handleShip = async () => {
    if (!selectedDoc) {
      alert('Pilih surat jalan terlebih dahulu');
      return;
    }

    const itemsToShip = docItems
      .filter(item => (shippingQuantities[item.kode_item] || 0) > 0)
      .map(item => ({
        fgNumber: item.kode_item,
        qty: shippingQuantities[item.kode_item],
      }));

    if (itemsToShip.length === 0) {
      alert('Tidak ada item yang dipilih untuk dikirim');
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
          alert(`Gagal mengirim ${item.fgNumber}: ${err.message}`);
          break;
        }
      }
      fetchStocks();
      fetchShipments();
      setSelectedDoc(null);
      setDocItems([]);
      setShippingQuantities({});
    } catch (error) {
      console.error('Error saat shipping', error);
    } finally {
      setProcessingShip(false);
    }
  };

  // ========== RENDER ==========

  // 🔥 Perbaiki perhitungan totalShippedToday
  const totalStock = stocks.reduce((sum, s) => sum + s.totalQty, 0);
  const totalItems = stocks.reduce((sum, s) => sum + s.items.length, 0);
  const totalShippedToday = shipments
    .filter(s => new Date(s.tanggal).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.totalQty, 0);

  return (
    <div className="animate-in fade-in duration-300 p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-900/10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Truck size={28} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                  <Package size={16} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Finished Goods
                  <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-bold">
                    STOCK & SHIPPING
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { fetchStocks(); fetchShippingDocs(); fetchShipments(); }}
                className="group px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 hover:border-emerald-300 transition-all"
              >
                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform" />
                Refresh
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:from-purple-700 transition-all"
              >
                <History size={16} />
                History
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 pb-8">
          <MetricCard title="Total Stock" value={totalStock} icon={Package} color="emerald" suffix="pcs" subtitle={`${stocks.length} FG items`} />
          <MetricCard title="Total Boxes" value={totalItems} icon={Warehouse} color="blue" suffix="boxes" subtitle="From packing" />
          <MetricCard title="Shipped Today" value={totalShippedToday} icon={Truck} color="amber" suffix="pcs" />
          <MetricCard title="Avg per Box" value={totalItems > 0 ? Math.round(totalStock / totalItems) : 0} icon={BarChart} color="purple" suffix="pcs" />
        </div>
      </div>

      {/* QR Input Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Scan / Input QR Code Box
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-3 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                placeholder="Contoh: PACK-123456"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmQr()}
              />
              <button
                onClick={handleConfirmQr}
                disabled={processingQr}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {processingQr ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                Konfirmasi
              </button>
            </div>
          </div>
          {qrMessage && (
            <div className={`px-4 py-3 rounded-xl flex items-center gap-2 ${
              qrMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
            }`}>
              {qrMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {qrMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Stock Table + Shipping Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Stock Table - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 rounded-xl flex items-center justify-center">
                    <Package size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Stok Finished Goods</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Klik baris untuk melihat detail OP</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{stocks.length} FG</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">FG Number</th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Stock</th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Boxes</th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stocks.map((stock) => {
                    const isExpanded = expandedRows.has(stock.id);
                    return (
                      <>
                        <tr
                          key={stock.id}
                          className="group hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer transition-colors"
                          onClick={() => {
                            const newSet = new Set(expandedRows);
                            if (isExpanded) newSet.delete(stock.id);
                            else newSet.add(stock.id);
                            setExpandedRows(newSet);
                          }}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                              <span className="font-mono font-bold text-slate-900 dark:text-white">{stock.fgNumber}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stock.totalQty}</span>
                            <span className="text-xs text-slate-500 ml-1">pcs</span>
                          </td>
                          <td className="py-4 px-6">{stock.items.length}</td>
                          <td className="py-4 px-6 text-sm text-slate-500">
                            {new Date(stock.items[0]?.createdAt || '').toLocaleDateString()}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50 dark:bg-slate-900/30">
                            <td colSpan={4} className="p-4">
                              <div className="ml-8 space-y-2">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Detail OP dalam stok ini:</h4>
                                {stock.items.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div>
                                      <span className="font-mono text-sm">{item.op?.opNumber}</span>
                                      <span className="text-xs text-slate-500 ml-2">({item.op?.styleCode})</span>
                                    </div>
                                    <span className="font-bold text-emerald-600">{item.qty} pcs</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {stocks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        Belum ada stok finished goods
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Shipping Form - 1/3 width */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Pengiriman Barang</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Pilih surat jalan & masukkan jumlah</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Dropdown Surat Jalan */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nomor Surat Jalan</label>
                <select
                  className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                  value={selectedDoc?.no_surat_jalan || ''}
                  onChange={(e) => {
                    const doc = shippingDocs.find(d => d.no_surat_jalan === Number(e.target.value));
                    handleSelectDoc(doc || null);
                  }}
                >
                  <option value="">-- Pilih Surat Jalan --</option>
                  {shippingDocs.map(doc => (
                    <option key={doc.no_surat_jalan} value={doc.no_surat_jalan}>
                      {doc.no_surat_jalan} - {doc.customer} ({new Date(doc.tanggal_surat_jalan).toLocaleDateString('id-ID')})
                    </option>
                  ))}
                </select>
                {loadingDocs && <Loader2 className="animate-spin mt-2" size={16} />}
              </div>

              {/* Tabel Item Surat Jalan */}
              {selectedDoc && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Item yang akan dikirim</h4>
                  {loadingDocItems ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-600" size={24} /></div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {docItems.map((item) => {
                        const stock = stocks.find(s => s.fgNumber === item.kode_item);
                        const available = stock?.totalQty || 0;
                        const qty = shippingQuantities[item.kode_item] || 0;
                        return (
                          <div key={item.kode_item} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-mono font-bold text-sm">{item.kode_item}</div>
                                <div className="text-xs text-slate-500 truncate max-w-[150px]">{item.name_finishgood}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-slate-500">Dokumen: {item.qty}</div>
                                <div className="text-xs text-emerald-600">Stok: {available}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={Math.min(available, item.qty)}
                                className="flex-1 px-3 py-2 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:border-amber-500"
                                placeholder="Jumlah"
                                value={qty}
                                onChange={(e) => setShippingQuantities({
                                  ...shippingQuantities,
                                  [item.kode_item]: Math.min(Number(e.target.value) || 0, available, item.qty)
                                })}
                              />
                              <span className="text-xs text-slate-500 w-12">/{item.qty}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tombol Proses Shipping */}
              {selectedDoc && (
                <button
                  onClick={handleShip}
                  disabled={processingShip || loadingDocItems}
                  className="w-full mt-4 py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingShip ? <Loader2 className="animate-spin" size={18} /> : <Truck size={18} />}
                  Proses Pengiriman
                </button>
              )}
            </div>
          </div>

          {/* Ringkasan Stok */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 rounded-xl flex items-center justify-center">
                  <Warehouse size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Ringkasan Stok</h3>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total FG Number:</span>
                  <span className="font-bold">{stocks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Boxes:</span>
                  <span className="font-bold">{totalItems}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Pcs:</span>
                  <span className="font-bold">{totalStock}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">History Pengiriman</h3>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-600" size={32} /></div>
              ) : shipments.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Belum ada pengiriman</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-500">
                      <th className="pb-3">Tanggal</th>
                      <th className="pb-3">No. Surat</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">FG</th>
                      <th className="pb-3">Qty</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map(ship => (
                      <tr key={ship.id} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="py-3">{new Date(ship.tanggal).toLocaleDateString('id-ID')}</td>
                        <td className="py-3">{ship.suratJalan}</td>
                        <td className="py-3">{ship.customerName || '-'}</td>
                        <td className="py-3">{ship.fgNumber}</td>
                        <td className="py-3">{ship.totalQty}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            ship.status === 'SHIPPED' 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>{ship.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};