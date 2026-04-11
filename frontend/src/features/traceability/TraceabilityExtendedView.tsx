import React, { useState } from 'react';
import {
  Search, Package, Truck, FileText, Layers, ClipboardCheck,
  CheckCircle, AlertCircle, Clock, Box, Archive,
  ChevronDown, ChevronRight, Loader2, TrendingUp,
  Scissors, Shirt, QrCode, Grid, Activity
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

// Types
interface BcDocument {
  nomor_er: number;
  kode_bc: string;
  nomor_dokumen_bc: string;
  tanggal_dokumen_bc: string;
}

interface PatternProgress {
  patternIndex: number;
  patternName: string;
  target: number;
  good: number;
  ng: number;
  completed: boolean;
}

interface CheckPanelInspection {
  patternIndex: number;
  patternName: string;
  good: number;
  ng: number;
  ngReasons: string[];
  createdAt: string;
}

interface QcInspection {
  good: number;
  ng: number;
  ngReasons: string[];
  createdAt: string;
}

interface PackingSession {
  sessionId: string;
  fgNumber: string;
  qty: number;
  qrCode: string;
  createdAt: string;
}

interface OpTraceResult {
  opNumber: string;
  styleCode: string;
  itemNumberFG: string;
  itemNameFG: string | null;
  qtyOp: number;
  status: string;
  currentStation: string;
  cuttingBatches: { batchNumber: number; qty: number; qrCode: string; createdAt: string }[];
  totalCutQty: number;
  patternProgress: PatternProgress[];
  pondTotalGood: number;
  pondTotalNg: number;
  pondTotalProcessed: number;
  checkPanelInspections: CheckPanelInspection[];
  cpTotalGood: number;
  cpTotalNg: number;
  cpTotalInspected: number;
  setsReadyForSewing: number;
  sewingStartProgress: { startIndex: number; qty: number }[];
  sewingFinishProgress: { finishIndex: number; qty: number }[];
  sewingIn: number;
  sewingOut: number;
  qcInspections: QcInspection[];
  qcGood: number;
  qcNg: number;
  packingSessions: PackingSession[];
  totalPacked: number;
  fgStockQty: number;
  bcDocuments: BcDocument[];
  updatedAt: string;
  cuttingEntanDetails?: {
    batches: { batchNumber: number; qty: number; createdAt: string }[];
    totalCutSets: number;
    totalCutPatterns: number;
    targetOpSets: number;
    fulfillmentPercent: number;
    dateRange: string;
  };
  cuttingPondDetails?: {
    inputFromEntanPatterns: number;
    wipPatterns: number;
    goodPatterns: number;
    ngPatterns: number;
    setsReadyForCP: number;
    dateRange: string;
    ngByPattern?: { patternName: string; ngQty: number }[];
  };
  checkPanelDetails?: {
    inputFromPondSets: number;
    wipSets: number;
    goodSets: number;
    ngSets: number;
    setsReadyForSewing: number;
    ngByPattern: { patternName: string; reason: string; qty: number }[];
    dateRange: string;
  };
  sewingDetails?: {
    inputFromCPSets: number;
    wipSets: number;
    startProgress: { startIndex: number; qty: number }[];
    finishProgress: { finishIndex: number; qty: number }[];
    outputSets: number;
    dateRange: string;
  };
  qcDetails?: {
    inputFromSewingSets: number;
    wipSets: number;
    goodSets: number;
    ngSets: number;
    ngByReason: { reason: string; qty: number }[];
    dateRange: string;
  };
  packingDetails?: {
    inputFromQCSets: number;
    wipSets: number;
    packedSets: number;
    sentToFGSets: number;
    dateRange: string;
  };
  fgDetails?: {
    inputFromPackingSets: number;
    currentStockSets: number;
    shippedSets: number;
    dateRange: string;
  };
  stationProgress: {
    station: string;
    status: 'not_started' | 'in_progress' | 'completed';
    percent?: number;
  }[];
}

interface TraceResult {
  suratJalan: string;
  shipmentDate: string;
  totalQty: number;
  fgItems: {
    fgNumber: string;
    totalQty: number;
    ops: OpTraceResult[];
  }[];
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

const uniqueBy = <T, K extends keyof T>(arr: T[], key: K): T[] => {
  const seen = new Set();
  return arr.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
};

const uniqueBcDocuments = (docs: BcDocument[]): BcDocument[] => {
  const seen = new Set();
  return docs.filter(doc => {
    const key = `${doc.nomor_dokumen_bc}|${doc.nomor_er}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const OpDetailCard = ({ 
  op, 
  isExpanded, 
  onToggle, 
  detailed = true, 
  showBcDocuments = true,
  showProductionInfo = true 
}: { 
  op: OpTraceResult; 
  isExpanded: boolean; 
  onToggle: () => void; 
  detailed?: boolean; 
  showBcDocuments?: boolean;
  showProductionInfo?: boolean;
}) => {
  const formatDateRange = (dateRange?: string) => {
    if (!dateRange || dateRange === '-') return '-';
    const parts = dateRange.split(' s/d ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} → ${parts[1]}`;
  };

  const ProgressBar = ({ percent, status }: { percent?: number; status: string }) => {
    const value = percent !== undefined ? Math.min(100, Math.max(0, percent)) : 0;
    let color = 'bg-slate-300';
    if (status === 'completed') color = 'bg-emerald-500';
    else if (status === 'in_progress') color = 'bg-blue-500';
    return (
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    );
  };

  const renderNgList = (items: { reason: string; qty: number }[], title: string) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mt-2">
        <div className="text-xs font-semibold text-rose-600">{title}</div>
        <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 mt-1">
          {items.map((item, idx) => (
            <li key={idx}>{item.reason} : {item.qty} pcs</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-3 overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-purple-500" />
          <span className="font-mono font-bold text-sm">{op.opNumber}</span>
          <span className="text-xs text-slate-500">({op.styleCode})</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {detailed ? (
            <>
              <span className="text-emerald-600">Good: {op.cpTotalGood + op.qcGood}</span>
              <span className="text-rose-600">NG: {op.cpTotalNg + op.qcNg}</span>
            </>
          ) : null}
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-5">
          {showBcDocuments && op.bcDocuments.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
              <h5 className="text-sm font-bold text-rose-600 mb-2">📄 Dokumen BC (Material Penerimaan)</h5>
              {uniqueBcDocuments(op.bcDocuments).map((doc, idx) => (
                <div key={idx} className="text-xs">No. ER: {doc.nomor_er} | No. Dokumen: {doc.nomor_dokumen_bc} | Tgl: {new Date(doc.tanggal_dokumen_bc).toLocaleDateString()}</div>
              ))}
            </div>
          )}

          {showProductionInfo && (
            <>
              {/* CUTTING ENTAN */}
              <div className="border-l-4 border-orange-500 pl-3">
                <h4 className="font-bold text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
                  ✂️ Cutting Entan
                  <span className="text-xs font-normal text-slate-500">({formatDateRange(op.cuttingEntanDetails?.dateRange)})</span>
                </h4>
                {op.cuttingEntanDetails ? (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>Target OP: <strong>{op.cuttingEntanDetails.targetOpSets}</strong> sets</div>
                    <div>Total Cut: <strong>{op.cuttingEntanDetails.totalCutSets}</strong> sets / <strong>{op.cuttingEntanDetails.totalCutPatterns}</strong> patterns</div>
                    <div>Fulfillment: <strong>{op.cuttingEntanDetails.fulfillmentPercent}%</strong></div>
                    <div>Batches: {op.cuttingEntanDetails.batches.map(b => `#${b.batchNumber} (${b.qty})`).join(', ')}</div>
                  </div>
                ) : <div className="text-xs text-slate-500">Belum ada data</div>}
              </div>

              {/* CUTTING POND */}
              <div className="border-l-4 border-blue-500 pl-3">
                <h4 className="font-bold text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  🔷 Cutting Pond
                  <span className="text-xs font-normal text-slate-500">({formatDateRange(op.cuttingPondDetails?.dateRange)})</span>
                </h4>
                {op.cuttingPondDetails ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Input dari Entan: <strong>{op.cuttingPondDetails.inputFromEntanPatterns}</strong> patterns</div>
                      <div>WIP: <strong>{op.cuttingPondDetails.wipPatterns}</strong> patterns</div>
                      <div className="text-emerald-600">Good: {op.cuttingPondDetails.goodPatterns}</div>
                      <div className="text-rose-600">NG: {op.cuttingPondDetails.ngPatterns}</div>
                      <div>Sets Ready for CP: <strong>{op.cuttingPondDetails.setsReadyForCP}</strong> sets</div>
                    </div>

                    {op.cuttingPondDetails.ngByPattern && op.cuttingPondDetails.ngByPattern.length > 0 && (
                      <div className="mt-2 bg-rose-50 dark:bg-rose-900/20 p-2 rounded">
                        <div className="text-xs font-semibold text-rose-600">Detail NG per Pattern:</div>
                        <ul className="list-disc list-inside text-xs mt-1">
                          {op.cuttingPondDetails.ngByPattern.map((item, idx) => (
                            <li key={idx}><strong>{item.patternName}</strong> : {item.ngQty} pcs</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <ProgressBar percent={(op.cuttingPondDetails.goodPatterns + op.cuttingPondDetails.ngPatterns) / (op.cuttingPondDetails.inputFromEntanPatterns || 1) * 100} status={op.cuttingPondDetails.setsReadyForCP > 0 ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-xs text-slate-500">Belum ada data</div>}
              </div>

              {/* CHECK PANEL */}
              <div className="border-l-4 border-emerald-500 pl-3">
                <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  👁️ Check Panel
                  <span className="text-xs font-normal text-slate-500">({formatDateRange(op.checkPanelDetails?.dateRange)})</span>
                </h4>
                {op.checkPanelDetails ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Input dari Pond: <strong>{op.checkPanelDetails.inputFromPondSets}</strong> sets</div>
                      <div>WIP: <strong>{op.checkPanelDetails.wipSets}</strong> sets</div>
                      <div className="text-emerald-600">Good: {op.checkPanelDetails.goodSets}</div>
                      <div className="text-rose-600">NG: {op.checkPanelDetails.ngSets}</div>
                      <div>Sets Ready for Sewing: <strong>{op.checkPanelDetails.setsReadyForSewing}</strong> sets</div>
                    </div>

{/* Detail NG per Pola */}
                    <div className="mt-2 bg-rose-50 dark:bg-rose-900/20 p-2 rounded">
                      <div className="text-xs font-semibold text-rose-600 mb-1">Detail NG per Pola:</div>
                      {op.checkPanelInspections && op.checkPanelInspections.some(insp => insp.ng > 0) ? (
                        <div className="space-y-2">
                          {op.checkPanelInspections
                            .filter(insp => insp.ng > 0)
                            .map((insp, idx) => {
                              const reasonsList = Array.isArray(insp.ngReasons) ? insp.ngReasons : [];
                              
                              // Hitung jumlah (qty) masing-masing reason
                              const reasonCounts: Record<string, number> = {};
                              reasonsList.forEach(reason => {
                                reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                              });
                              
                              const reasonEntries = Object.entries(reasonCounts);

                              return (
                                <div key={idx} className="text-xs border-b border-rose-200 dark:border-rose-800 pb-1 last:border-0">
                                  <div className="font-semibold">{insp.patternName}</div>
                                  <div className="text-rose-600">NG: {insp.ng} pcs</div>
                                  <div className="text-slate-600 dark:text-slate-400 mt-1">
                                    {reasonEntries.length > 0 ? (
                                      <>
                                        <div>Reasons:</div>
                                        <ul className="list-none ml-2">
                                          {reasonEntries.map(([reason, qty], i) => (
                                            <li key={i}>{reason} : {qty}</li>
                                          ))}
                                        </ul>
                                      </>
                                    ) : (
                                      <div>Reasons: Tidak ada keterangan</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 mt-1">Tidak ada catatan NG untuk Check Panel</div>
                      )}
                    </div>

                    <ProgressBar percent={(op.checkPanelDetails.goodSets + op.checkPanelDetails.ngSets) / (op.checkPanelDetails.inputFromPondSets || 1) * 100} status={op.checkPanelDetails.setsReadyForSewing > 0 ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-xs text-slate-500">Belum ada data</div>}
              </div>

              {/* SEWING */}
              <div className="border-l-4 border-purple-500 pl-3">
                <h4 className="font-bold text-sm text-purple-700 dark:text-purple-400 flex items-center gap-2">
                  🧵 Sewing
                  <span className="text-xs font-normal text-slate-500">({formatDateRange(op.sewingDetails?.dateRange)})</span>
                </h4>
                {op.sewingDetails ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Input dari CP: <strong>{op.sewingDetails.inputFromCPSets}</strong> sets</div>
                      <div>WIP: <strong>{op.sewingDetails.wipSets}</strong> sets</div>
                      <div>Start Progress: {op.sewingDetails.startProgress.map(s => `Start${s.startIndex}=${s.qty}`).join(', ')}</div>
                      <div>Finish Progress: {op.sewingDetails.finishProgress.map(f => `Finish${f.finishIndex}=${f.qty}`).join(', ')}</div>
                      <div>Output: <strong>{op.sewingDetails.outputSets}</strong> sets</div>
                    </div>
                    <ProgressBar percent={op.sewingDetails.outputSets / (op.sewingDetails.inputFromCPSets || 1) * 100} status={op.sewingDetails.outputSets >= op.sewingDetails.inputFromCPSets ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-xs text-slate-500">Belum ada data</div>}
              </div>

              {/* QUALITY CONTROL */}
              <div className="border-l-4 border-amber-500 pl-3">
                <h4 className="font-bold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  🔍 Quality Control
                  <span className="text-xs font-normal text-slate-500">({formatDateRange(op.qcDetails?.dateRange)})</span>
                </h4>
                {op.qcDetails ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Input dari Sewing: <strong>{op.qcDetails.inputFromSewingSets}</strong> sets</div>
                      <div>WIP: <strong>{op.qcDetails.wipSets}</strong> sets</div>
                      <div className="text-emerald-600">Good: {op.qcDetails.goodSets}</div>
                      <div className="text-rose-600">NG: {op.qcDetails.ngSets}</div>
                    </div>
                    {op.qcDetails.ngByReason.length > 0 && renderNgList(op.qcDetails.ngByReason, "Jenis NG:")}
                    <ProgressBar percent={(op.qcDetails.goodSets + op.qcDetails.ngSets) / (op.qcDetails.inputFromSewingSets || 1) * 100} status={(op.qcDetails.goodSets + op.qcDetails.ngSets) >= op.qcDetails.inputFromSewingSets ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-xs text-slate-500">Belum ada data</div>}
              </div>

              {/* PACKING */}
              <div className="border-l-4 border-indigo-500 pl-3">
                <h4 className="font-bold text-sm text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                  📦 Packing
                  <span className="text-xs font-normal text-slate-500">({formatDateRange(op.packingDetails?.dateRange)})</span>
                </h4>
                {op.packingDetails ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>Input dari QC: <strong>{op.packingDetails.inputFromQCSets}</strong> sets</div>
                    <div>WIP: <strong>{op.packingDetails.wipSets}</strong> sets (menunggu diterima FG)</div>
                    <div>Packed: <strong>{op.packingDetails.packedSets}</strong> sets</div>
                    <div>Sent ke FG: <strong>{op.packingDetails.sentToFGSets}</strong> sets</div>
                    <ProgressBar percent={op.packingDetails.packedSets / (op.packingDetails.inputFromQCSets || 1) * 100} status={op.packingDetails.packedSets >= op.packingDetails.inputFromQCSets ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-xs text-slate-500">Belum ada data</div>}
              </div>

              {/* FINISHED GOODS */}
              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="font-bold text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  ✅ Finished Goods
                  <span className="text-xs font-normal text-slate-500">({formatDateRange(op.fgDetails?.dateRange)})</span>
                </h4>
                {op.fgDetails ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>Input dari Packing: <strong>{op.fgDetails.inputFromPackingSets}</strong> sets</div>
                    <div>Stock Sekarang: <strong>{op.fgDetails.currentStockSets}</strong> sets</div>
                    <div>Sudah Dikirim: <strong>{op.fgDetails.shippedSets}</strong> sets</div>
                    <ProgressBar percent={op.fgDetails.shippedSets / (op.fgDetails.inputFromPackingSets || 1) * 100} status={op.fgDetails.shippedSets >= op.fgDetails.inputFromPackingSets ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-xs text-slate-500">Belum ada data</div>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const TraceabilityExtendedView = () => {
  const [searchType, setSearchType] = useState<'surat-jalan' | 'bc-document' | 'op'>('surat-jalan');
  const [searchQuery, setSearchQuery] = useState('');
  const [bcNomorEr, setBcNomorEr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OpTraceResult | TraceResult | BcTraceResult | null>(null);
  const [expandedFg, setExpandedFg] = useState<Set<string>>(new Set());
  const [expandedOp, setExpandedOp] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Masukkan nomor OP, surat jalan, atau nomor dokumen BC');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let url = '';
      if (searchType === 'op') {
        url = `${API_BASE_URL}/traceability-extended/op/${encodeURIComponent(searchQuery)}`;
      } else if (searchType === 'surat-jalan') {
        url = `${API_BASE_URL}/traceability-extended/surat-jalan/${encodeURIComponent(searchQuery)}`;
      } else {
        let params = `nomorDokumen=${encodeURIComponent(searchQuery)}`;
        if (bcNomorEr) params += `&nomorEr=${encodeURIComponent(bcNomorEr)}`;
        url = `${API_BASE_URL}/traceability-extended/bc-document?${params}`;
      }

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        let data = await res.json();
        if (searchType === 'surat-jalan' && data && (data as TraceResult).fgItems) {
          const traceData = data as TraceResult;
          traceData.fgItems = traceData.fgItems.map((fg: any) => ({
            ...fg,
            ops: uniqueBy(fg.ops, 'opNumber')
          }));
          traceData.fgItems.forEach((fg: any) => {
            fg.ops.forEach((op: OpTraceResult) => {
              if (op.bcDocuments) op.bcDocuments = uniqueBcDocuments(op.bcDocuments);
            });
          });
          setResult(traceData);
        } else {
          setResult(data);
        }
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

  const toggleOpDetail = (opNumber: string) => {
    const newSet = new Set(expandedOp);
    if (newSet.has(opNumber)) newSet.delete(opNumber);
    else newSet.add(opNumber);
    setExpandedOp(newSet);
  };

  const renderOpResult = (op: OpTraceResult) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Layers size={20} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{op.opNumber}</h2>
          <p className="text-sm text-slate-500">{op.styleCode} - {op.itemNumberFG} {op.itemNameFG ? `(${op.itemNameFG})` : ''}</p>
        </div>
      </div>
      <OpDetailCard op={op} isExpanded={true} onToggle={() => {}} detailed={true} showBcDocuments={false} showProductionInfo={true} />
    </div>
  );

  const renderSuratJalanResult = (res: TraceResult) => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Truck size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{res.suratJalan}</h2>
            <p className="text-sm text-slate-500">Tanggal: {new Date(res.shipmentDate).toLocaleString()} | Total: {res.totalQty} pcs</p>
          </div>
        </div>

        {res.fgItems.map(fg => (
          <div key={fg.fgNumber} className="mb-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                  <OpDetailCard
                    key={op.opNumber}
                    op={op}
                    isExpanded={expandedOp.has(op.opNumber)}
                    onToggle={() => toggleOpDetail(op.opNumber)}
                    detailed={false}
                    showBcDocuments={true}
                    showProductionInfo={false}
                  />
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
                  <div className="text-xs text-slate-500">{new Date(ship.shipmentDate).toLocaleDateString()}</div>
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Lacak dari OP, Surat Jalan, hingga Dokumen BC</p>
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
              onChange={e => {
                setResult(null);
                setError('');
                setSearchQuery('');
                setBcNomorEr('');
                setExpandedFg(new Set());
                setExpandedOp(new Set());
                setSearchType(e.target.value as any);
              }}
            >
              <option value="surat-jalan">Berdasarkan Surat Jalan</option>
              <option value="bc-document">Berdasarkan Dokumen BC</option>
              <option value="op">Berdasarkan OP Number</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">
              {searchType === 'op' ? 'Nomor OP' : searchType === 'surat-jalan' ? 'Nomor Surat Jalan' : 'Nomor Dokumen BC'}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700"
              placeholder={
                searchType === 'op' ? 'Contoh: K1YH260001' :
                searchType === 'surat-jalan' ? 'Contoh: 26007466' :
                'Contoh: 134746'
              }
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
          {searchType === 'surat-jalan' && renderSuratJalanResult(result as TraceResult)}
          {searchType === 'bc-document' && renderBcResult(result as BcTraceResult)}
          {searchType === 'op' && renderOpResult(result as OpTraceResult)}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
          <Archive size={48} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Traceability End-to-End</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Masukkan nomor OP untuk melihat detail proses produksi.<br />
            Atau masukkan Surat Jalan untuk menelusuri ke dokumen BC, atau sebaliknya.
          </p>
        </div>
      )}
    </div>
  );
};