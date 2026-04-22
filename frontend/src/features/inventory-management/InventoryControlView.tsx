import React, { useState, useEffect, useCallback } from 'react';
import { Box, Search, Loader2, Package } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface InventoryItem {
  id: string;
  material: { materialNumber: string; description: string; uom: string };
  storageLocation: string;
  batchLotNumber?: string;
  qtyOnHand: number;
  status: string;
  receivingDetail: { receivingHeader: { grnNumber: string; supplier: { name: string } } };
  lastUpdated: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const InventoryControlView = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inbound-warehouse/inventory`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
        setFiltered(data);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInventory(); }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(inventory);
    } else {
      const lower = search.toLowerCase();
      setFiltered(inventory.filter(item =>
        item.material.materialNumber.toLowerCase().includes(lower) ||
        item.material.description.toLowerCase().includes(lower) ||
        item.storageLocation.toLowerCase().includes(lower) ||
        (item.batchLotNumber && item.batchLotNumber.toLowerCase().includes(lower))
      ));
    }
  }, [search, inventory]);

  return (
    <div className="p-6 space-y-6 font-poppins min-h-screen bg-slate-50 dark:bg-slate-900">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap'); .font-poppins { font-family: 'Poppins', sans-serif; }`}</style>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Box size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Inventory Control</h1>
              <p className="text-xs text-slate-500">Current stock levels by location</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search material, location..."
              className="w-full pl-9 pr-4 py-2 border-2 rounded-xl text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p>No inventory data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-700/50">
                <tr>
                  <th className="py-3 px-4">Material Number</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Batch/Lot</th>
                  <th className="py-3 px-4">Qty On Hand</th>
                  <th className="py-3 px-4">UOM</th>
                  <th className="py-3 px-4">GRN</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-4 font-mono font-bold">{item.material.materialNumber}</td>
                    <td className="py-3 px-4">{item.material.description}</td>
                    <td className="py-3 px-4">{item.storageLocation}</td>
                    <td className="py-3 px-4">{item.batchLotNumber || '-'}</td>
                    <td className="py-3 px-4 font-black">{item.qtyOnHand}</td>
                    <td className="py-3 px-4">{item.material.uom}</td>
                    <td className="py-3 px-4 font-mono text-xs">{item.receivingDetail.receivingHeader.grnNumber}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};