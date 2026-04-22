import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, Save, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface Material {
  id: string;
  materialNumber: string;
  description: string;
  uom: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
}

interface ReceivingDetailItem {
  materialId: string;
  poDetailId?: string;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  batchLotNumber?: string;
}

interface ReceivingHeader {
  id: string;
  grnNumber: string;
  deliveryNoteNumber: string;
  supplier: Supplier;
  receivedDate: string;
  status: string;
  details: any[];
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const InboundReceivingView = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receivingHeaders, setReceivingHeaders] = useState<ReceivingHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    supplierId: '',
    poId: '',
    deliveryNoteNumber: '',
    note: '',
  });

  const [details, setDetails] = useState<ReceivingDetailItem[]>([
    { materialId: '', receivedQty: 0, acceptedQty: 0, rejectedQty: 0 },
  ]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inbound-warehouse/suppliers`, { headers: getAuthHeaders() });
      if (res.ok) setSuppliers(await res.json());
    } catch (error) { console.error(error); }
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inbound-warehouse/materials`, { headers: getAuthHeaders() });
      if (res.ok) setMaterials(await res.json());
    } catch (error) { console.error(error); }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inbound-warehouse/purchase-orders`, { headers: getAuthHeaders() });
      if (res.ok) setPurchaseOrders(await res.json());
    } catch (error) { console.error(error); }
  }, []);

  const fetchReceivingHeaders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inbound-warehouse/receiving`, { headers: getAuthHeaders() });
      if (res.ok) setReceivingHeaders(await res.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchMaterials();
    fetchPurchaseOrders();
    fetchReceivingHeaders();
  }, []);

  const handleAddDetail = () => {
    setDetails([...details, { materialId: '', receivedQty: 0, acceptedQty: 0, rejectedQty: 0 }]);
  };

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const handleDetailChange = (index: number, field: keyof ReceivingDetailItem, value: any) => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    if (field === 'receivedQty') {
      newDetails[index].acceptedQty = value;
    }
    setDetails(newDetails);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplierId || !form.deliveryNoteNumber || details.some(d => !d.materialId || d.receivedQty <= 0)) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/inbound-warehouse/receiving`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...form, details }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Goods Receipt created successfully' });
        setShowForm(false);
        setForm({ supplierId: '', poId: '', deliveryNoteNumber: '', note: '' });
        setDetails([{ materialId: '', receivedQty: 0, acceptedQty: 0, rejectedQty: 0 }]);
        fetchReceivingHeaders();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Failed to create receipt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border-2 rounded-xl bg-white dark:bg-slate-800 text-sm font-semibold";
  const labelClass = "block text-xs font-bold uppercase text-slate-500 mb-1";

  return (
    <div className="p-6 space-y-6 font-poppins min-h-screen bg-slate-50 dark:bg-slate-900">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap'); .font-poppins { font-family: 'Poppins', sans-serif; }`}</style>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Truck size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Inbound Receiving</h1>
              <p className="text-xs text-slate-500">Goods Receipt from Supplier</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <Plus size={16} /> New Receipt
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border">
            <h3 className="font-black text-lg mb-4">New Goods Receipt</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Supplier *</label>
                <select className={inputClass} value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})} required>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Delivery Note Number *</label>
                <input type="text" className={inputClass} value={form.deliveryNoteNumber} onChange={e => setForm({...form, deliveryNoteNumber: e.target.value})} required />
              </div>
              <div>
                <label className={labelClass}>Purchase Order (Optional)</label>
                <select className={inputClass} value={form.poId} onChange={e => setForm({...form, poId: e.target.value})}>
                  <option value="">Select PO</option>
                  {purchaseOrders.filter(po => !form.supplierId || po.supplierId === form.supplierId).map(po => <option key={po.id} value={po.id}>{po.poNumber}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Note</label>
                <input type="text" className={inputClass} value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className={labelClass}>Items Received</label>
                <button type="button" onClick={handleAddDetail} className="text-sm text-amber-600 font-bold">+ Add Item</button>
              </div>
              {details.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end border-b pb-2">
                  <div className="col-span-3">
                    <select className={inputClass} value={item.materialId} onChange={e => handleDetailChange(idx, 'materialId', e.target.value)} required>
                      <option value="">Material</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.materialNumber}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" className={inputClass} placeholder="Qty Received" value={item.receivedQty || ''} onChange={e => handleDetailChange(idx, 'receivedQty', parseInt(e.target.value)||0)} required />
                  </div>
                  <div className="col-span-2">
                    <input type="number" className={inputClass} placeholder="Accepted" value={item.acceptedQty || ''} onChange={e => handleDetailChange(idx, 'acceptedQty', parseInt(e.target.value)||0)} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" className={inputClass} placeholder="Rejected" value={item.rejectedQty || ''} onChange={e => handleDetailChange(idx, 'rejectedQty', parseInt(e.target.value)||0)} />
                  </div>
                  <div className="col-span-2">
                    <input type="text" className={inputClass} placeholder="Batch/Lot" value={item.batchLotNumber || ''} onChange={e => handleDetailChange(idx, 'batchLotNumber', e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <button type="button" onClick={() => handleRemoveDetail(idx)} className="p-2 text-rose-500"><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Confirm Receipt
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/50">
              <tr>
                <th className="py-3 px-4">GRN Number</th>
                <th className="py-3 px-4">Delivery Note</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Items</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></td></tr> :
                receivingHeaders.map(h => (
                  <tr key={h.id} className="border-b">
                    <td className="py-3 px-4 font-mono font-bold">{h.grnNumber}</td>
                    <td className="py-3 px-4">{h.deliveryNoteNumber}</td>
                    <td className="py-3 px-4">{h.supplier?.name}</td>
                    <td className="py-3 px-4">{new Date(h.receivedDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs font-bold ${h.status === 'PUTAWAY_COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{h.status}</span></td>
                    <td className="py-3 px-4">{h.details?.length || 0} items</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};