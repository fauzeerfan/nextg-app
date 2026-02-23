import { useState, useEffect } from 'react';
import { Truck, Package, Search, BarChart, TrendingUp, QrCode, History, Warehouse, RefreshCw, MapPin, Calendar, CheckCircle, AlertCircle, Eye, Plus, Minus, Tag, ArrowRight } from 'lucide-react';

interface FinishedGoodsStock {
  id: string; itemNumberFG: string; styleCode: string; description: string; totalStock: number; totalBoxes: number; availableStock: number; warehouse: string; shelfLocation?: string; lastUpdated: string;
}
interface ShippingRecord {
  id: string; shippingNo: string; shippingDate: string; customerName: string; itemNumberFG: string; styleCode: string; qty: number; status: 'DRAFT' | 'SHIPPED' | 'DELIVERED'; createdBy: string;
}

interface MetricCardProps { title: string; value: number | string; icon: any; color?: 'emerald' | 'blue' | 'amber' | 'purple'; subtitle?: string; suffix?: string; trend?: string; }
const MetricCard = ({ title, value, icon: Icon, color = 'emerald', subtitle, suffix, trend }: MetricCardProps) => {
  const c = {
    emerald: { bg: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-600', darkBg: 'from-emerald-900/20 to-emerald-900/10' },
    blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', darkBg: 'from-blue-900/20 to-blue-900/10' },
    amber: { bg: 'from-amber-100 to-amber-50', icon: 'text-amber-600', darkBg: 'from-amber-900/20 to-amber-900/10' },
    purple: { bg: 'from-purple-100 to-purple-50', icon: 'text-purple-600', darkBg: 'from-purple-900/20 to-purple-900/10' }
  }[color];
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <div className={`w-10 h-10 bg-gradient-to-br ${c.bg} dark:${c.darkBg} rounded-lg flex items-center justify-center`}>
          <Icon size={18} className={c.icon} />
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

const ShippingCard = ({ ship, onConfirm }: { ship: ShippingRecord; onConfirm: (id: string) => void }) => (
  <div className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-all hover:border-emerald-300 dark:hover:border-emerald-700">
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center ${ship.status === 'SHIPPED' ? 'from-amber-500 to-amber-400' : ship.status === 'DELIVERED' ? 'from-emerald-500 to-emerald-400' : 'from-slate-500 to-slate-400'}`}><Truck size={18} className="text-white"/></div>
        <div><div className="font-bold text-slate-900 dark:text-white">{ship.shippingNo}</div><div className="text-xs text-slate-500">{ship.customerName}</div></div>
      </div>
      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ship.status === 'SHIPPED' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : ship.status === 'DELIVERED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-400'}`}>{ship.status}</span>
    </div>
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="flex items-center gap-2"><div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg"><Tag size={14} className="text-slate-600 dark:text-slate-400"/></div><div><div className="text-xs text-slate-500 dark:text-slate-400">Style Code</div><div className="font-medium text-slate-900 dark:text-white">{ship.styleCode}</div></div></div>
      <div className="flex items-center gap-2"><div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg"><Package size={14} className="text-slate-600 dark:text-slate-400"/></div><div><div className="text-xs text-slate-500 dark:text-slate-400">Quantity</div><div className="font-bold text-slate-900 dark:text-white">{ship.qty} pcs</div></div></div>
    </div>
    <div className="flex items-center justify-between text-xs text-slate-500">
      <div className="flex items-center gap-1"><Calendar size={12}/><span>{new Date(ship.shippingDate).toLocaleDateString()}</span></div>
      <div className="flex items-center gap-2">{ship.status === 'DRAFT' && <button onClick={() => onConfirm(ship.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors">Confirm Ship</button>}<button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400"><Eye size={14}/></button></div>
    </div>
  </div>
);

export const FinishedGoodsView = () => {
  const [stk, setStk] = useState<FinishedGoodsStock[]>([]);
  const [shp, setShp] = useState<ShippingRecord[]>([]);
  const [sel, setSel] = useState<FinishedGoodsStock | null>(null);
  const [scan, setScan] = useState(false);
  const [ref, setRef] = useState(false);
  const [upd, setUpd] = useState('');
  const [qr, setQr] = useState('');
  const [form, setForm] = useState({ customerName: '', shippingNo: '', qty: 0, remarks: '' });

  const tot = {
    totalStock: stk.reduce((s, i) => s + i.totalStock, 0),
    totalBoxes: stk.reduce((s, i) => s + i.totalBoxes, 0),
    totalValue: stk.reduce((s, i) => s + (i.totalStock * 150000), 0),
    totalShipped: shp.reduce((s, i) => s + i.qty, 0),
    todayShipped: shp.filter(s => new Date(s.shippingDate).toDateString() === new Date().toDateString()).reduce((s, i) => s + i.qty, 0)
  };

  const scanQR = () => { setScan(true); setTimeout(() => { setQr('SCANNED-BOX-001-100PCS'); setScan(false); alert('QR Code scanned: BOX-001-100PCS'); }, 1000); };
  const refresh = () => { setRef(true); setTimeout(() => { setUpd(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })); setRef(false); }, 1000); };

  const stockIn = () => {
    if (!qr) return alert('Please scan a QR code first');
    const parts = qr.split('-');
    if (parts.length < 4) return alert('Invalid QR code format');
    const styleCode = 'STYLE', qty = 100;
    const exist = stk.find(s => s.styleCode === styleCode);
    if (exist) {
      setStk(p => p.map(s => s.styleCode === styleCode ? { ...s, totalStock: s.totalStock + qty, totalBoxes: s.totalBoxes + 1, availableStock: s.availableStock + qty, lastUpdated: new Date().toISOString() } : s));
      alert(`Stock updated: +${qty} pieces`); setQr('');
    } else {
      setStk([...stk, { id: Date.now().toString(), itemNumberFG: `FG-${styleCode}-${Date.now().toString().slice(-4)}`, styleCode, description: 'New finished goods', totalStock: qty, totalBoxes: 1, availableStock: qty, warehouse: 'MAIN_WAREHOUSE', shelfLocation: 'A-01-1', lastUpdated: new Date().toISOString() }]);
      alert(`New stock created: +${qty} pieces of ${styleCode}`); setQr('');
    }
  };

  const createShip = () => {
    if (!sel || form.qty <= 0) return alert('Please select stock and enter quantity');
    if (form.qty > sel.availableStock) return alert(`Insufficient stock! Available: ${sel.availableStock}`);
    const newShip: ShippingRecord = {
      id: Date.now().toString(),
      shippingNo: form.shippingNo || `SJ-${new Date().getFullYear()}-${String(shp.length + 1).padStart(3, '0')}`,
      shippingDate: new Date().toISOString(),
      customerName: form.customerName || 'Customer',
      itemNumberFG: sel.itemNumberFG,
      styleCode: sel.styleCode,
      qty: form.qty,
      status: 'DRAFT',
      createdBy: 'Current User'
    };
    setShp(p => [newShip, ...p]);
    setStk(p => p.map(s => s.id === sel.id ? { ...s, availableStock: s.availableStock - form.qty } : s));
    setForm({ customerName: '', shippingNo: '', qty: 0, remarks: '' });
    alert(`Shipping ${form.qty} pieces created!`);
  };

  const confirmShip = (id: string) => setShp(p => p.map(s => s.id === id ? { ...s, status: 'SHIPPED' } : s));

  useEffect(() => { setUpd(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })); }, []);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-900/10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative"><div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg"><Truck size={28} className="text-white"/></div><div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg"><Package size={16} className="text-white"/></div></div>
              <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">Finished Goods<span className="text-xs px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-bold">SHIPPING READY</span></h1></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl shadow-lg"><div className="flex flex-col"><div className="text-xs font-medium opacity-90">Total Value</div><div className="text-2xl font-bold">Rp 0</div></div><div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"><BarChart size={20} className="text-white"/></div></div>
              <button onClick={refresh} disabled={ref} className="group px-5 py-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 shadow-sm hover:shadow-md">
                {ref ? <RefreshCw size={18} className="animate-spin"/> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500"/>}Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 pb-8">
          <MetricCard title="Total Stock" value={tot.totalStock} icon={Package} color="emerald" suffix="units" subtitle={`${tot.totalBoxes} boxes total`} />
          <MetricCard title="Stock Value" value="Rp 0" icon={BarChart} color="blue" trend="No data for comparison" />
          <MetricCard title="Today Shipped" value={tot.todayShipped} icon={Truck} color="amber" suffix="units" subtitle={`Total shipped: ${tot.totalShipped}`} />
          <MetricCard title="Warehouses" value={new Set(stk.map(s => s.warehouse)).size} icon={Warehouse} color="purple" suffix="active" subtitle={`${stk.length} total items`} />
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={scanQR} disabled={scan} className="group flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50">
            {scan ? <><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Scanning...</span></> : <><QrCode size={24}/><span>Scan QR Code for Stock In</span><ArrowRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/></>}
          </button>
          {qr && !scan && <div className="flex-1 p-4 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800/30 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-xl flex items-center justify-center"><CheckCircle size={20} className="text-white"/></div><div><div className="text-sm font-semibold text-slate-700 dark:text-slate-300">QR Code Scanned</div><div className="font-mono text-slate-900 dark:text-white">{qr}</div></div></div><button onClick={stockIn} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-medium transition-all duration-300 shadow-sm hover:shadow-md">Process Stock In</button></div></div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 rounded-xl flex items-center justify-center"><Package size={20} className="text-emerald-600 dark:text-emerald-400"/></div><div><h3 className="font-bold text-slate-900 dark:text-white">Finished Goods Stock</h3><p className="text-sm text-slate-500 dark:text-slate-400">Real-time inventory status and availability</p></div></div>
                <div className="flex items-center gap-3"><div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2"><Search size={18} className="text-slate-400"/></div><input type="text" placeholder="Search FG#, style, or description..." className="pl-10 pr-4 py-2.5 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all"/></div><div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{stk.length} Items</span></div></div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700"><th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">FG Number</th><th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Style</th><th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock Status</th><th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</th><th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stk.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center"><div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package size={32} className="text-slate-400"/></div><h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Stock Available</h4><p className="text-slate-500 dark:text-slate-400">No finished goods in stock yet</p></td></tr>
                  ) : stk.map(s => {
                    const isSel = sel?.id === s.id;
                    return (
                      <tr key={s.id} className={`group cursor-pointer transition-all duration-300 ${isSel ? 'bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 border-l-4 border-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'}`} onClick={() => setSel(s)}>
                        <td className="py-4 px-6"><div className="font-mono font-bold text-slate-900 dark:text-white">{s.itemNumberFG}</div><div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.description}</div></td>
                        <td className="py-4 px-6"><span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium">{s.styleCode}</span></td>
                        <td className="py-4 px-6"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${s.availableStock > 500 ? 'bg-emerald-500' : s.availableStock > 100 ? 'bg-amber-500' : 'bg-rose-500'}`}></div><div className="font-bold text-slate-900 dark:text-white text-lg">{s.availableStock}<span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/ {s.totalStock}</span></div></div><div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.totalBoxes} boxes • {s.totalBoxes > 0 ? Math.round(s.totalStock / s.totalBoxes) : 0} pcs/box</div></td>
                        <td className="py-4 px-6"><div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/><div><div className="text-sm text-slate-700 dark:text-slate-300">{s.warehouse.replace('_', ' ')}</div><div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{s.shelfLocation}</div></div></div></td>
                        <td className="py-4 px-6"><div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"><BarChart size={16}/></button><button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"><Eye size={16}/></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 rounded-xl flex items-center justify-center"><Truck size={20} className="text-amber-600 dark:text-amber-400"/></div><div><h3 className="font-bold text-slate-900 dark:text-white">Create Shipping</h3><p className="text-sm text-slate-500 dark:text-slate-400">Ship selected stock to customer</p></div></div></div>
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Customer Name</label><input type="text" className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="Enter customer name"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Shipping Number</label><input type="text" className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all" value={form.shippingNo} onChange={e => setForm({...form, shippingNo: e.target.value})} placeholder="Auto-generated if empty"/></div>
                {sel && <div className="p-4 bg-gradient-to-r from-slate-50 to-emerald-50 dark:from-slate-900/50 dark:to-emerald-900/20 rounded-xl border border-slate-200 dark:border-slate-700"><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg"><Package className="text-emerald-600 dark:text-emerald-400" size={16}/></div><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Selected Stock</span></div><span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded text-xs font-medium">{sel.styleCode}</span></div><div className="grid grid-cols-2 gap-3 text-sm"><div><div className="text-slate-500 dark:text-slate-400 text-xs">Available Stock</div><div className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{sel.availableStock}</div></div><div><div className="text-slate-500 dark:text-slate-400 text-xs">FG Number</div><div className="font-mono font-bold">{sel.itemNumberFG}</div></div></div></div>}
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quantity to Ship</label><div className="flex items-center gap-3"><div className="relative flex-1"><input type="number" className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all" value={form.qty} onChange={e => setForm({...form, qty: parseInt(e.target.value) || 0})} min="0" max={sel?.availableStock || 0} placeholder="Enter quantity"/><div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">units</div></div><div className="flex gap-1"><button onClick={() => setForm({...form, qty: Math.min(sel?.availableStock || 0, form.qty + 10)})} className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl border border-slate-300 dark:border-slate-700"><Plus size={16} className="text-slate-600 dark:text-slate-400"/></button><button onClick={() => setForm({...form, qty: Math.max(0, form.qty - 10)})} className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl border border-slate-300 dark:border-slate-700"><Minus size={16} className="text-slate-600 dark:text-slate-400"/></button></div></div>{sel && form.qty > 0 && <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><AlertCircle size={12}/>Will remain: {sel.availableStock - form.qty} units after shipping</div>}</div>
              </div>
              <button onClick={createShip} disabled={!sel || form.qty <= 0} className={`group w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}><CheckCircle size={20}/><span>Create Shipping Order</span><ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/></button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center"><History size={20} className="text-slate-600 dark:text-slate-400"/></div><div><h3 className="font-bold text-slate-900 dark:text-white">Recent Shippings</h3><p className="text-sm text-slate-500 dark:text-slate-400">Last shipping orders</p></div></div><div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{shp.length} Total</span></div></div></div>
            <div className="p-4"><div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">{shp.map(s => <ShippingCard key={s.id} ship={s} onConfirm={confirmShip} />)}{shp.length === 0 && <div className="text-center py-8"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4"><Truck size={24} className="text-slate-400"/></div><p className="text-slate-500 dark:text-slate-400 text-sm">No shipping orders yet</p></div>}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};