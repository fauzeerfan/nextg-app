import React, { useState } from 'react';
import {
  Search, Package, Truck, FileText, Layers, ClipboardCheck,
  CheckCircle, AlertCircle, Clock, ArrowRight, Box, Archive,
  ChevronDown, ChevronRight, X, RefreshCw, Loader2, TrendingUp
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface BcDocument {
  nomor_er: number;
  kode_bc: string;
  nomor_dokumen_bc: string;
  tanggal_dokumen_bc: string;
}

interface OpDetail {
  opNumber: string;
  qty: number;
  styleCode: string;
  cuttingBatches: any[];
  patternProgress: any[];
  checkPanelInspections: any[];
  qcInspections: any[];
  packingSessions: any[];
  bcDocuments?: BcDocument[];
}

interface FgItem {
  fgNumber: string;
  totalQty: number;
  ops: OpDetail[];
}

interface TraceResult {
  suratJalan: string;
  shipmentDate: string;
  totalQty: number;
  fgItems: FgItem[];
}

interface BcTraceResult {
  bcDocument: string;
  bcEr: string | null;
  relatedShipments: {
    suratJalan: string;
    shipmentDate: string;
    totalQty: number;
    ops: { opNumber: string; qty: number }[];
  }[];
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const TraceabilityExtendedView = () => {
  const [searchType, setSearchType] = useState<'surat-jalan' | 'bc-document'>('surat-jalan');
  const [searchQuery, setSearchQuery] = useState('');
  const [bcNomorEr, setBcNomorEr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TraceResult | BcTraceResult | null>(null);
  const [expandedFg, setExpandedFg] = useState<Set<string>>(new Set());
  const [expandedOp, setExpandedOp] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Masukkan nomor surat jalan atau nomor dokumen BC');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let url = '';
      if (searchType === 'surat-jalan') {
        url = `${API_BASE_URL}/traceability-extended/surat-jalan/${encodeURIComponent(searchQuery)}`;
      } else {
        let params = `nomorDokumen=${encodeURIComponent(searchQuery)}`;
        if (bcNomorEr) params += `&nomorEr=${encodeURIComponent(bcNomorEr)}`;
        url = `${API_BASE_URL}/traceability-extended/bc-document?${params}`;
      }

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const err = await res.json();
        setError(err.message || 'Data tidak ditemukan');
      }
    } catch (err) {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  const toggleFg = (fgNumber: string) => {
    const newSet = new Set(expandedFg);
    if (newSet.has(fgNumber)) newSet.delete(fgNumber);
    else newSet.add(fgNumber);
    setExpandedFg(newSet);
  };

  const toggleOp = (opNumber: string) => {
    const newSet = new Set(expandedOp);
    if (newSet.has(opNumber)) newSet.delete(opNumber);
    else newSet.add(opNumber);
    setExpandedOp(newSet);
  };

  const renderSuratJalanResult = (res: TraceResult) => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Truck size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{res.suratJalan}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tanggal: {new Date(res.shipmentDate).toLocaleString('id-ID')} | Total: {res.totalQty} pcs
            </p>
          </div>
        </div>

        {res.fgItems.map(fg => (
          <div key={fg.fgNumber} className="mb-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              onClick={() => toggleFg(fg.fgNumber)}
            >
              <div className="flex items-center gap-2">
                <Package size={18} className="text-emerald-600" />
                <span className="font-bold text-slate-900 dark:text-white">{fg.fgNumber}</span>
                <span className="text-xs text-slate-500">({fg.totalQty} pcs)</span>
              </div>
              {expandedFg.has(fg.fgNumber) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>

            {expandedFg.has(fg.fgNumber) && (
              <div className="p-3 space-y-3">
                {fg.ops.map(op => (
                  <div key={op.opNumber} className="border-l-2 border-blue-300 pl-3">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1"
                      onClick={() => toggleOp(op.opNumber)}
                    >
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-purple-500" />
                        <span className="font-mono font-bold text-sm">{op.opNumber}</span>
                        <span className="text-xs text-slate-500">(Qty: {op.qty})</span>
                      </div>
                      {expandedOp.has(op.opNumber) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>

                    {expandedOp.has(op.opNumber) && (
                      <div className="mt-2 pl-4 text-sm space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
                            <span className="font-semibold">Style:</span> {op.styleCode}
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
                            <span className="font-semibold">Cutting Batches:</span> {op.cuttingBatches?.length || 0}
                          </div>
                        </div>

                        {op.bcDocuments && op.bcDocuments.length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-xs font-bold text-amber-600 mb-1">📄 Dokumen BC Terkait</h4>
                            <div className="space-y-1">
                              {op.bcDocuments.map((doc, idx) => (
                                <div key={idx} className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-xs">
                                  <div>No. ER: {doc.nomor_er}</div>
                                  <div>No. Dokumen: {doc.nomor_dokumen_bc}</div>
                                  <div>Tanggal: {new Date(doc.tanggal_dokumen_bc).toLocaleDateString('id-ID')}</div>
                                  <div>Kode BC: {doc.kode_bc}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>✅ CP Good: {op.checkPanelInspections?.reduce((s, i) => s + i.good, 0) || 0}</span>
                          <span>❌ CP NG: {op.checkPanelInspections?.reduce((s, i) => s + i.ng, 0) || 0}</span>
                          <span>🔍 QC Good: {op.qcInspections?.reduce((s, i) => s + i.good, 0) || 0}</span>
                          <span>⚠️ QC NG: {op.qcInspections?.reduce((s, i) => s + i.ng, 0) || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderBcResult = (res: BcTraceResult) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <FileText size={20} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dokumen BC: {res.bcDocument}</h2>
          {res.bcEr && <p className="text-sm text-slate-500">No. ER: {res.bcEr}</p>}
        </div>
      </div>

      <h3 className="font-bold text-md mt-4 mb-2">🚚 Surat Jalan Terkait</h3>
      {res.relatedShipments.length === 0 ? (
        <p className="text-slate-500">Tidak ditemukan surat jalan yang menggunakan material ini.</p>
      ) : (
        <div className="space-y-3">
          {res.relatedShipments.map(ship => (
            <div key={ship.suratJalan} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-blue-600">{ship.suratJalan}</span>
                  <div className="text-xs text-slate-500">{new Date(ship.shipmentDate).toLocaleDateString('id-ID')}</div>
                </div>
                <div className="text-right text-sm">
                  <div>Total: {ship.totalQty} pcs</div>
                  <div className="text-xs">OP: {ship.ops.map(o => o.opNumber).join(', ')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Traceability End-to-End</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Lacak dari Surat Jalan hingga Dokumen BC dan sebaliknya</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Jenis Pencarian</label>
            <select
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700"
              value={searchType}
              onChange={e => setSearchType(e.target.value as any)}
            >
              <option value="surat-jalan">Berdasarkan Surat Jalan</option>
              <option value="bc-document">Berdasarkan Dokumen BC</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">
              {searchType === 'surat-jalan' ? 'Nomor Surat Jalan' : 'Nomor Dokumen BC'}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700"
              placeholder={searchType === 'surat-jalan' ? 'Contoh: SJ-2024-001' : 'Contoh: 134746'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {searchType === 'bc-document' && (
            <div>
              <label className="block text-xs font-medium mb-1">Nomor ER (Opsional)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700"
                placeholder="Contoh: 25002828"
                value={bcNomorEr}
                onChange={e => setBcNomorEr(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Trace
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-600">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      {result && (
        <div className="mt-6">
          {searchType === 'surat-jalan' ? renderSuratJalanResult(result as TraceResult) : renderBcResult(result as BcTraceResult)}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
          <Archive size={48} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Traceability End-to-End</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Masukkan nomor Surat Jalan untuk melihat seluruh rantai produksi hingga material dan dokumen BC.<br />
            Atau masukkan nomor Dokumen BC untuk mengetahui ke mana material tersebut dikirim.
          </p>
        </div>
      )}
    </div>
  );
};