import React, { useState, useEffect, useCallback } from 'react';
import { Package, Save, Loader2, CheckCircle, AlertCircle, MapPin, Hash, ClipboardCheck } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface PendingPutawayItem {
  id: string;
  materialId: string;
  material: { materialNumber: string; description: string; uom: string };
  acceptedQty: number;
  batchLotNumber?: string;
  receivingHeader: { grnNumber: string; deliveryNoteNumber: string; supplier: { name: string } };
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const InspectionStorageView = () => {
  const [items, setItems] = useState<PendingPutawayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [storageInputs, setStorageInputs] = useState<Record<string, string>>({});
  const [batchInputs, setBatchInputs] = useState<Record<string, string>>({});

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inbound-warehouse/pending-putaway`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        const storage: Record<string, string> = {};
        const batch: Record<string, string> = {};
        data.forEach((item: PendingPutawayItem) => {
          storage[item.id] = '';
          batch[item.id] = item.batchLotNumber || '';
        });
        setStorageInputs(storage);
        setBatchInputs(batch);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, []);

  const handlePutaway = async (itemId: string) => {
    const storageLocation = storageInputs[itemId];
    if (!storageLocation) {
      setMessage({ type: 'error', text: 'Storage location is required' });
      return;
    }
    setSubmitting(itemId);
    try {
      const res = await fetch(`${API_BASE_URL}/inbound-warehouse/putaway`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          receivingDetailId: itemId,
          storageLocation,
          batchLotNumber: batchInputs[itemId] || undefined,
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Item processed and stored successfully' });
        fetchItems();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(null);
    }
  };

  const inputClass = "w-full px-3 py-2 border-2 rounded-xl bg-white dark:bg-slate-800 text-sm font-semibold";

  return (
    <div className="p-6 space-y-6 font-poppins min-h-screen bg-slate-50 dark:bg-slate-900">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap'); .font-poppins { font-family: 'Poppins', sans-serif; }`}</style>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <ClipboardCheck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Inspection & Storage</h1>
            <p className="text-xs text-slate-500">Inspect and assign storage locations to received materials</p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={32} /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No items pending inspection & storage</div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs font-bold text-slate-500">Material</div>
                    <div className="font-black">{item.material.materialNumber}</div>
                    <div className="text-sm">{item.material.description}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">GRN / Supplier</div>
                    <div className="font-mono">{item.receivingHeader.grnNumber}</div>
                    <div className="text-sm">{item.receivingHeader.supplier.name}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">Quantity</div>
                    <div className="font-black text-lg">{item.acceptedQty} {item.material.uom}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Storage Location (e.g., RACK-A-01)"
                      className={inputClass}
                      value={storageInputs[item.id] || ''}
                      onChange={e => setStorageInputs({...storageInputs, [item.id]: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash size={16} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Batch/Lot Number"
                      className={inputClass}
                      value={batchInputs[item.id] || ''}
                      onChange={e => setBatchInputs({...batchInputs, [item.id]: e.target.value})}
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handlePutaway(item.id)}
                    disabled={submitting === item.id}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2"
                  >
                    {submitting === item.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Confirm Storage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};