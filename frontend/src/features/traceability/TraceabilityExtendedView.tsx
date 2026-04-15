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
    let color = 'bg-slate-300 dark:bg-slate-600';
    if (status === 'completed') color = 'bg-emerald-500';
    else if (status === 'in_progress') color = 'bg-blue-500';
    return (
      <div className="w-full bg-slate-200/80 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden mt-3 shadow-inner">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${color} shadow-sm`} style={{ width: `${value}%` }} />
      </div>
    );
  };

  const renderNgList = (items: { reason: string; qty: number }[], title: string) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mt-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 md:p-4 border border-rose-200 dark:border-rose-800">
        <div className="text-xs md:text-sm font-bold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-1.5">
          <AlertCircle size={16} /> {title}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 px-3 py-2 rounded-lg text-xs md:text-sm border border-rose-100 dark:border-rose-700/50 shadow-sm hover:shadow transition-shadow">
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate pr-2">{item.reason}</span>
              <span className="font-bold text-white bg-rose-500 px-2.5 py-0.5 rounded-full shrink-0 shadow-sm">{item.qty} pcs</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const stageCardBase = "relative p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden";
  
  // Solid Data Boxes Templates
  const statBoxNeutral = "bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center";
  const statBoxAmber = "bg-amber-100 dark:bg-amber-900/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-center";
  const statBoxEmerald = "bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center";
  const statBoxRose = "bg-rose-100 dark:bg-rose-900/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800 text-center";

  return (
    <div className="border-0 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl mb-5 overflow-hidden bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-all duration-300">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 bg-slate-50 dark:bg-slate-800/80 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group gap-3 sm:gap-0"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-purple-600 text-white dark:bg-purple-500 rounded-xl group-hover:scale-105 group-hover:rotate-3 transition-transform shadow-md shadow-purple-500/30">
            <Layers size={20} />
          </div>
          <div>
            <div className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100">{op.opNumber}</div>
            <div className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{op.styleCode}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium self-end sm:self-auto">
          {detailed ? (
            <div className="flex gap-4 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle size={14}/> Good: {op.cpTotalGood + op.qcGood}</span>
              <span className="text-slate-300 dark:text-slate-600 font-bold">|</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5"><AlertCircle size={14}/> NG: {op.cpTotalNg + op.qcNg}</span>
            </div>
          ) : null}
          <div className="p-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 group-hover:text-purple-600 transition-colors shadow-sm">
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 md:p-6 space-y-6 bg-white dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
          {showBcDocuments && op.bcDocuments.length > 0 && (
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 p-5 rounded-2xl border border-rose-200 dark:border-rose-800/50 shadow-sm">
              <h5 className="text-sm md:text-base font-bold text-rose-700 dark:text-rose-400 mb-4 flex items-center gap-2">
                <FileText size={18} /> Dokumen BC (Material Penerimaan)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueBcDocuments(op.bcDocuments).map((doc, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-100 dark:border-rose-700/50 text-xs md:text-sm text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-700"><span className="text-slate-500 font-medium">No. ER</span> <span className="font-bold text-rose-600 dark:text-rose-400">{doc.nomor_er}</span></div>
                    <div className="flex justify-between items-center mb-2"><span className="text-slate-500 font-medium">Dokumen</span> <span className="font-bold">{doc.nomor_dokumen_bc}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Tanggal</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(doc.tanggal_dokumen_bc).toLocaleDateString()}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showProductionInfo && (
            <div className="space-y-5">
              {/* CUTTING ENTAN */}
              <div className={stageCardBase}>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-orange-500"></div>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pl-2">
                  <h4 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 rounded-lg"><Scissors size={18} /></div>
                    Cutting Entan
                  </h4>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shadow-sm">
                    <Clock size={14} /> {formatDateRange(op.cuttingEntanDetails?.dateRange)}
                  </span>
                </div>
                {op.cuttingEntanDetails ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs md:text-sm pl-2">
                    <div className={statBoxNeutral}>
                      <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Target OP</div>
                      <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{op.cuttingEntanDetails.targetOpSets} <span className="text-xs font-medium">sets</span></div>
                    </div>
                    <div className={statBoxNeutral}>
                      <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Total Cut</div>
                      <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{op.cuttingEntanDetails.totalCutSets} <span className="text-xs font-medium">sets</span></div>
                      <div className="text-[11px] font-medium text-slate-400 mt-0.5">{op.cuttingEntanDetails.totalCutPatterns} patterns</div>
                    </div>
                    <div className="bg-orange-100 dark:bg-orange-900/40 p-3 rounded-xl border border-orange-200 dark:border-orange-800 text-center">
                      <div className="text-orange-700 dark:text-orange-400 font-semibold mb-1">Fulfillment</div>
                      <div className="font-bold text-lg text-orange-700 dark:text-orange-400">{op.cuttingEntanDetails.fulfillmentPercent}%</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col justify-center">
                      <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Batches</div>
                      <div className="font-bold text-slate-700 dark:text-slate-300 truncate text-sm" title={op.cuttingEntanDetails.batches.map(b => `#${b.batchNumber} (${b.qty})`).join(', ')}>
                        {op.cuttingEntanDetails.batches.map(b => `#${b.batchNumber}`).join(', ')}
                      </div>
                    </div>
                  </div>
                ) : <div className="text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 pl-2"><Box size={16}/> Belum ada data</div>}
              </div>

              {/* CUTTING POND */}
              <div className={stageCardBase}>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500"></div>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pl-2">
                  <h4 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg"><Grid size={18} /></div>
                    Cutting Pond
                  </h4>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shadow-sm">
                    <Clock size={14} /> {formatDateRange(op.cuttingPondDetails?.dateRange)}
                  </span>
                </div>
                {op.cuttingPondDetails ? (
                  <div className="space-y-4 pl-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs md:text-sm">
                      <div className={statBoxNeutral}>
                        <div className="text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Input Entan</div>
                        <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{op.cuttingPondDetails.inputFromEntanPatterns}</div>
                      </div>
                      <div className={statBoxAmber}>
                        <div className="text-amber-700 dark:text-amber-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">WIP</div>
                        <div className="font-bold text-lg text-amber-700 dark:text-amber-500">{op.cuttingPondDetails.wipPatterns}</div>
                      </div>
                      <div className={statBoxEmerald}>
                        <div className="text-emerald-700 dark:text-emerald-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Good</div>
                        <div className="font-bold text-lg text-emerald-700 dark:text-emerald-400">{op.cuttingPondDetails.goodPatterns}</div>
                      </div>
                      <div className={statBoxRose}>
                        <div className="text-rose-700 dark:text-rose-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">NG</div>
                        <div className="font-bold text-lg text-rose-700 dark:text-rose-400">{op.cuttingPondDetails.ngPatterns}</div>
                      </div>
                      <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800 text-center sm:col-span-1 col-span-2 shadow-sm">
                        <div className="text-blue-700 dark:text-blue-400 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Ready for CP</div>
                        <div className="font-bold text-lg text-blue-700 dark:text-blue-400">{op.cuttingPondDetails.setsReadyForCP} <span className="text-xs font-semibold">sets</span></div>
                      </div>
                    </div>

                    {op.cuttingPondDetails.ngByPattern && op.cuttingPondDetails.ngByPattern.length > 0 && (
                      <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800 mt-2">
                        <div className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-3">Detail NG per Pattern:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {op.cuttingPondDetails.ngByPattern.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 px-3 py-2 rounded-lg text-sm border border-rose-100 dark:border-rose-700 shadow-sm">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate pr-2">{item.patternName}</span>
                              <span className="font-bold bg-rose-500 text-white px-2 py-0.5 rounded-md shrink-0 shadow-sm">{item.ngQty} pcs</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <ProgressBar percent={(op.cuttingPondDetails.goodPatterns + op.cuttingPondDetails.ngPatterns) / (op.cuttingPondDetails.inputFromEntanPatterns || 1) * 100} status={op.cuttingPondDetails.setsReadyForCP > 0 ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 pl-2"><Box size={16}/> Belum ada data</div>}
              </div>

              {/* CHECK PANEL */}
              <div className={stageCardBase}>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500"></div>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pl-2">
                  <h4 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg"><ClipboardCheck size={18} /></div>
                    Check Panel
                  </h4>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shadow-sm">
                    <Clock size={14} /> {formatDateRange(op.checkPanelDetails?.dateRange)}
                  </span>
                </div>
                {op.checkPanelDetails ? (
                  <div className="space-y-4 pl-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs md:text-sm">
                      <div className={statBoxNeutral}>
                        <div className="text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Input Pond</div>
                        <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{op.checkPanelDetails.inputFromPondSets}</div>
                      </div>
                      <div className={statBoxAmber}>
                        <div className="text-amber-700 dark:text-amber-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">WIP</div>
                        <div className="font-bold text-lg text-amber-700 dark:text-amber-500">{op.checkPanelDetails.wipSets}</div>
                      </div>
                      <div className={statBoxEmerald}>
                        <div className="text-emerald-700 dark:text-emerald-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Good</div>
                        <div className="font-bold text-lg text-emerald-700 dark:text-emerald-400">{op.checkPanelDetails.goodSets}</div>
                      </div>
                      <div className={statBoxRose}>
                        <div className="text-rose-700 dark:text-rose-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">NG</div>
                        <div className="font-bold text-lg text-rose-700 dark:text-rose-400">{op.checkPanelDetails.ngSets}</div>
                      </div>
                      <div className="bg-emerald-600 dark:bg-emerald-600/90 text-white p-3 rounded-xl border border-emerald-700 text-center sm:col-span-1 col-span-2 shadow-md">
                        <div className="text-emerald-100 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Ready Sewing</div>
                        <div className="font-bold text-lg">{op.checkPanelDetails.setsReadyForSewing} <span className="text-xs font-semibold text-emerald-200">sets</span></div>
                      </div>
                    </div>

                    {/* Detail NG per Pola Check Panel */}
                    {op.checkPanelInspections && op.checkPanelInspections.some(insp => insp.ng > 0) && (
                      <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800 mt-2">
                        <div className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-1.5">
                          <AlertCircle size={16} /> Detail NG per Pola:
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {op.checkPanelInspections
                            .filter(insp => insp.ng > 0)
                            .map((insp, idx) => {
                              const reasonsList = Array.isArray(insp.ngReasons) ? insp.ngReasons : [];
                              const reasonCounts: Record<string, number> = {};
                              reasonsList.forEach(reason => { reasonCounts[reason] = (reasonCounts[reason] || 0) + 1; });
                              const reasonEntries = Object.entries(reasonCounts);

                              return (
                                <div key={idx} className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border border-rose-100 dark:border-rose-700 shadow-sm">
                                  <div className="flex justify-between items-center mb-2.5 border-b border-rose-100 dark:border-slate-700 pb-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{insp.patternName}</span>
                                    <span className="bg-rose-500 text-white font-bold px-2.5 py-1 rounded-md text-xs shadow-sm">NG: {insp.ng} pcs</span>
                                  </div>
                                  <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                                    {reasonEntries.length > 0 ? (
                                      <ul className="space-y-1.5">
                                        {reasonEntries.map(([reason, qty], i) => (
                                          <li key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded">
                                            <span className="font-medium">{reason}</span> 
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{qty}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className="italic">Tidak ada keterangan detail</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    <ProgressBar percent={(op.checkPanelDetails.goodSets + op.checkPanelDetails.ngSets) / (op.checkPanelDetails.inputFromPondSets || 1) * 100} status={op.checkPanelDetails.setsReadyForSewing > 0 ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 pl-2"><Box size={16}/> Belum ada data</div>}
              </div>

              {/* SEWING */}
              <div className={stageCardBase}>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-purple-500"></div>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pl-2">
                  <h4 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 rounded-lg"><Shirt size={18} /></div>
                    Sewing
                  </h4>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shadow-sm">
                    <Clock size={14} /> {formatDateRange(op.sewingDetails?.dateRange)}
                  </span>
                </div>
                {op.sewingDetails ? (
                  <div className="space-y-4 pl-2">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs md:text-sm">
                      <div className={statBoxNeutral}>
                        <div className="text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Input CP</div>
                        <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{op.sewingDetails.inputFromCPSets} <span className="text-xs font-semibold">sets</span></div>
                      </div>
                      <div className={statBoxAmber}>
                        <div className="text-amber-700 dark:text-amber-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">WIP</div>
                        <div className="font-bold text-lg text-amber-700 dark:text-amber-500">{op.sewingDetails.wipSets} <span className="text-xs font-semibold">sets</span></div>
                      </div>
                      <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800 text-center col-span-2 lg:col-span-2 shadow-sm flex flex-col justify-center items-center">
                        <div className="text-purple-700 dark:text-purple-400 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Output Finished</div>
                        <div className="font-bold text-xl text-purple-700 dark:text-purple-400">{op.sewingDetails.outputSets} <span className="text-sm font-semibold">sets</span></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                         <div className="text-xs uppercase font-bold text-slate-500 mb-2.5 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Start Progress</div>
                         <div className="flex flex-wrap gap-2 mt-2">
                           {op.sewingDetails.startProgress.length > 0 ? op.sewingDetails.startProgress.map(s => (
                             <span key={s.startIndex} className="bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center gap-2">
                               <span className="text-slate-400">Idx {s.startIndex}:</span> <span className="text-blue-600 dark:text-blue-400">{s.qty}</span>
                             </span>
                           )) : <span className="text-slate-400 italic text-sm font-medium">Belum ada progress</span>}
                         </div>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                         <div className="text-xs uppercase font-bold text-slate-500 mb-2.5 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Finish Progress</div>
                         <div className="flex flex-wrap gap-2 mt-2">
                           {op.sewingDetails.finishProgress.length > 0 ? op.sewingDetails.finishProgress.map(f => (
                             <span key={f.finishIndex} className="bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center gap-2">
                               <span className="text-slate-400">Idx {f.finishIndex}:</span> <span className="text-emerald-600 dark:text-emerald-400">{f.qty}</span>
                             </span>
                           )) : <span className="text-slate-400 italic text-sm font-medium">Belum ada progress</span>}
                         </div>
                       </div>
                    </div>
                    <ProgressBar percent={op.sewingDetails.outputSets / (op.sewingDetails.inputFromCPSets || 1) * 100} status={op.sewingDetails.outputSets >= op.sewingDetails.inputFromCPSets ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 pl-2"><Box size={16}/> Belum ada data</div>}
              </div>

              {/* QUALITY CONTROL */}
              <div className={stageCardBase}>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-amber-500"></div>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pl-2">
                  <h4 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg"><Activity size={18} /></div>
                    Quality Control
                  </h4>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shadow-sm">
                    <Clock size={14} /> {formatDateRange(op.qcDetails?.dateRange)}
                  </span>
                </div>
                {op.qcDetails ? (
                  <div className="space-y-4 pl-2">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs md:text-sm">
                      <div className={statBoxNeutral}>
                        <div className="text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Input Sewing</div>
                        <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{op.qcDetails.inputFromSewingSets}</div>
                      </div>
                      <div className={statBoxAmber}>
                        <div className="text-amber-700 dark:text-amber-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">WIP</div>
                        <div className="font-bold text-lg text-amber-700 dark:text-amber-500">{op.qcDetails.wipSets}</div>
                      </div>
                      <div className={statBoxEmerald}>
                        <div className="text-emerald-700 dark:text-emerald-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Good</div>
                        <div className="font-bold text-lg text-emerald-700 dark:text-emerald-400">{op.qcDetails.goodSets}</div>
                      </div>
                      <div className={statBoxRose}>
                        <div className="text-rose-700 dark:text-rose-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">NG</div>
                        <div className="font-bold text-lg text-rose-700 dark:text-rose-400">{op.qcDetails.ngSets}</div>
                      </div>
                    </div>
                    {op.qcDetails.ngByReason.length > 0 && renderNgList(op.qcDetails.ngByReason, "Jenis NG Ditemukan:")}
                    <ProgressBar percent={(op.qcDetails.goodSets + op.qcDetails.ngSets) / (op.qcDetails.inputFromSewingSets || 1) * 100} status={(op.qcDetails.goodSets + op.qcDetails.ngSets) >= op.qcDetails.inputFromSewingSets ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 pl-2"><Box size={16}/> Belum ada data</div>}
              </div>

              {/* PACKING */}
              <div className={stageCardBase}>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500"></div>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pl-2">
                  <h4 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-lg"><Package size={18} /></div>
                    Packing
                  </h4>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shadow-sm">
                    <Clock size={14} /> {formatDateRange(op.packingDetails?.dateRange)}
                  </span>
                </div>
                {op.packingDetails ? (
                  <div className="space-y-4 pl-2">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs md:text-sm">
                      <div className={statBoxNeutral}>
                        <div className="text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Input QC</div>
                        <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{op.packingDetails.inputFromQCSets}</div>
                      </div>
                      <div className={`${statBoxAmber} relative group`}>
                        <div className="text-amber-700 dark:text-amber-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">WIP</div>
                        <div className="font-bold text-lg text-amber-700 dark:text-amber-500">{op.packingDetails.wipSets}</div>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white font-medium text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-10">Menunggu diterima FG</div>
                      </div>
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 text-center shadow-sm">
                        <div className="text-indigo-700 dark:text-indigo-400 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Packed</div>
                        <div className="font-bold text-lg text-indigo-700 dark:text-indigo-400">{op.packingDetails.packedSets}</div>
                      </div>
                      <div className={statBoxEmerald}>
                        <div className="text-emerald-700 dark:text-emerald-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Sent to FG</div>
                        <div className="font-bold text-lg text-emerald-700 dark:text-emerald-400">{op.packingDetails.sentToFGSets}</div>
                      </div>
                    </div>
                    <ProgressBar percent={op.packingDetails.packedSets / (op.packingDetails.inputFromQCSets || 1) * 100} status={op.packingDetails.packedSets >= op.packingDetails.inputFromQCSets ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 pl-2"><Box size={16}/> Belum ada data</div>}
              </div>

              {/* FINISHED GOODS */}
              <div className={stageCardBase}>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-green-500"></div>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pl-2">
                  <h4 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 rounded-lg"><CheckCircle size={18} /></div>
                    Finished Goods
                  </h4>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shadow-sm">
                    <Clock size={14} /> {formatDateRange(op.fgDetails?.dateRange)}
                  </span>
                </div>
                {op.fgDetails ? (
                  <div className="space-y-4 pl-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm">
                      <div className={statBoxNeutral}>
                        <div className="text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Input Packing</div>
                        <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{op.fgDetails.inputFromPackingSets}</div>
                      </div>
                      <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-xl border border-green-200 dark:border-green-800 text-center shadow-sm">
                        <div className="text-green-700 dark:text-green-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Current Stock</div>
                        <div className="font-bold text-lg text-green-700 dark:text-green-400">{op.fgDetails.currentStockSets}</div>
                      </div>
                      <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800 text-center shadow-sm">
                        <div className="text-blue-700 dark:text-blue-500 font-bold mb-1 uppercase tracking-wide text-[10px] md:text-xs">Shipped (Surat Jalan)</div>
                        <div className="font-bold text-lg text-blue-700 dark:text-blue-400">{op.fgDetails.shippedSets}</div>
                      </div>
                    </div>
                    <ProgressBar percent={op.fgDetails.shippedSets / (op.fgDetails.inputFromPackingSets || 1) * 100} status={op.fgDetails.shippedSets >= op.fgDetails.inputFromPackingSets ? 'completed' : 'in_progress'} />
                  </div>
                ) : <div className="text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 pl-2"><Box size={16}/> Belum ada data</div>}
              </div>
            </div>
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

  const inputClassName = "w-full px-5 py-3.5 bg-white border-2 border-slate-200 text-slate-800 text-sm font-medium rounded-2xl focus:ring-0 focus:border-purple-500 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:border-slate-600 dark:focus:border-purple-400";
  const labelClassName = "block text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 ml-1 tracking-wide";

  const renderOpResult = (op: OpTraceResult) => (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-lg">
      <div className="flex items-center gap-5 mb-8 pb-6 border-b-2 border-slate-100 dark:border-slate-700/50">
        <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-500/30">
          <Layers size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{op.opNumber}</h2>
          <div className="text-sm font-semibold text-slate-500 mt-1.5 flex flex-wrap items-center gap-3">
            <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-sm">{op.styleCode}</span> 
            <span className="text-slate-300 dark:text-slate-600 text-lg">•</span>
            <span className="text-slate-600 dark:text-slate-300">{op.itemNumberFG} {op.itemNameFG ? `(${op.itemNameFG})` : ''}</span>
          </div>
        </div>
      </div>
      <OpDetailCard op={op} isExpanded={true} onToggle={() => {}} detailed={true} showBcDocuments={true} showProductionInfo={true} />
    </div>
  );

  const renderSuratJalanResult = (res: TraceResult) => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b-2 border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30">
              <Truck size={32} />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded inline-block">Surat Jalan</div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{res.suratJalan}</h2>
            </div>
          </div>
          <div className="flex sm:flex-col gap-4 sm:gap-2 text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <div className="flex items-center gap-2.5"><Clock size={16} className="text-slate-400"/> <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(res.shipmentDate).toLocaleString()}</span></div>
            <div className="flex items-center gap-2.5"><Box size={16} className="text-slate-400"/> Total: <span className="font-extrabold text-blue-600 dark:text-blue-400 text-base">{res.totalQty} pcs</span></div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2"><Package size={20} className="text-emerald-500"/> Finished Goods Items</h3>
        <div className="space-y-4">
          {res.fgItems.map(fg => (
            <div key={fg.fgNumber} className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all">
              <div
                className="flex items-center justify-between p-5 md:p-6 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors group"
                onClick={() => toggleFg(fg.fgNumber)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-xl group-hover:scale-105 group-hover:rotate-3 transition-transform shadow-sm">
                    <Package size={24} />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white block">{fg.fgNumber}</span>
                    <span className="text-sm text-slate-500 font-semibold bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-sm inline-block mt-1">{fg.totalQty} pcs shipped</span>
                  </div>
                </div>
                <div className="p-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 group-hover:text-emerald-600 transition-colors shadow-sm">
                  {expandedFg.has(fg.fgNumber) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>
              {expandedFg.has(fg.fgNumber) && (
                <div className="p-5 md:p-6 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-bold text-slate-500 uppercase mb-4 ml-1 tracking-wide">Order Produksi (OP) Terkait</div>
                  <div className="space-y-4">
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
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBcResult = (res: BcTraceResult) => (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b-2 border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30">
            <FileText size={32} />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded inline-block">Dokumen Bea Cukai</div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{res.bcDocument}</h2>
          </div>
        </div>
        {res.bcEr && (
          <div className="bg-amber-100 dark:bg-amber-900/40 px-5 py-3 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-sm">
            <span className="text-amber-700 dark:text-amber-500 text-xs font-bold uppercase tracking-wide block mb-1">Nomor ER</span>
            <span className="font-extrabold text-lg text-amber-800 dark:text-amber-400">{res.bcEr}</span>
          </div>
        )}
      </div>

      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
        <Truck size={20} className="text-blue-500" /> Surat Jalan Terkait Penggunaan Material
      </h3>
      
      {res.relatedShipments.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-600">
            <Box size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ditemukan surat jalan yang menggunakan material dari dokumen BC ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {res.relatedShipments.map(ship => (
            <div key={ship.suratJalan} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-blue-400 dark:hover:border-blue-600 transition-colors shadow-sm hover:shadow-md group">
              <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-xl mt-0.5 group-hover:scale-105 transition-transform">
                    <Truck size={18} />
                  </div>
                  <div>
                    <span className="font-extrabold text-lg text-blue-700 dark:text-blue-400 block leading-tight">{ship.suratJalan}</span>
                    <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-1.5"><Clock size={12}/>{new Date(ship.shipmentDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Qty</div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-base">{ship.totalQty}</div>
                </div>
              </div>
              <div className="text-sm">
                <div className="text-slate-500 font-bold mb-2">Order Produksi (OP):</div>
                <div className="flex flex-wrap gap-2">
                  {ship.ops.map((o, idx) => (
                    <span key={idx} className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                      {o.opNumber}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
      `}</style>
      <div style={{ fontFamily: "'Poppins', sans-serif" }} className="p-4 md:p-8 max-w-full mx-auto space-y-8 bg-[#F8FAFC] dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-100">
        {/* Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100/50 via-transparent to-blue-50/50 dark:from-purple-900/20 dark:to-blue-900/20 pointer-events-none transition-opacity duration-500 group-hover:opacity-80"></div>
          <div className="p-6 md:p-8 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/30 text-white transform group-hover:scale-105 transition-transform duration-300">
                <TrendingUp size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Traceability End-to-End</h1>
                <p className="text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 mt-1">Lacak jejak produksi komprehensif dari OP, Surat Jalan, hingga Dokumen BC</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search / Filter Section */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-md relative z-20">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-1/4">
              <label className={labelClassName}>Jenis Pencarian</label>
              <div className="relative">
                <select
                  className={`${inputClassName} appearance-none pr-10 cursor-pointer`}
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
                  <option value="surat-jalan" className="font-medium">Berdasarkan Surat Jalan</option>
                  <option value="bc-document" className="font-medium">Berdasarkan Dokumen BC</option>
                  <option value="op" className="font-medium">Berdasarkan OP Number</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>
            
            <div className="w-full md:flex-1">
              <label className={labelClassName}>
                {searchType === 'op' ? 'Nomor OP' : searchType === 'surat-jalan' ? 'Nomor Surat Jalan' : 'Nomor Dokumen BC'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  className={`${inputClassName} pl-12`}
                  placeholder={
                    searchType === 'op' ? 'Contoh: K1YH260001' :
                    searchType === 'surat-jalan' ? 'Contoh: 26007466' :
                    'Contoh: 134746'
                  }
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            {searchType === 'bc-document' && (
              <div className="w-full md:w-1/4">
                <label className={labelClassName}>Nomor ER <span className="text-slate-400 font-medium">(Opsional)</span></label>
                <input
                  type="text"
                  className={inputClassName}
                  placeholder="Contoh: 25002828"
                  value={bcNomorEr}
                  onChange={e => setBcNomorEr(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            )}

            <div className="w-full md:w-auto md:pt-7">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full md:w-auto px-10 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-purple-500/40 transition-all duration-300 focus:ring-4 focus:ring-purple-500/30 outline-none"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                {loading ? 'Mencari...' : 'Lacak Data'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-400 animate-in fade-in slide-in-from-top-2 shadow-sm">
              <AlertCircle size={20} className="shrink-0" /> 
              <span className="text-sm md:text-base font-bold">{error}</span>
            </div>
          )}
        </div>

        {/* Results Container */}
        <div className="mt-8">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-purple-600 dark:border-slate-700 dark:border-t-purple-500"></div>
              <div className="text-base font-bold text-slate-500 animate-pulse tracking-wide">Menelusuri data traceability...</div>
            </div>
          )}

          {!loading && result && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
              {searchType === 'surat-jalan' && renderSuratJalanResult(result as TraceResult)}
              {searchType === 'bc-document' && renderBcResult(result as BcTraceResult)}
              {searchType === 'op' && renderOpResult(result as OpTraceResult)}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-16 text-center shadow-sm transition-all">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-700 rounded-3xl shadow-inner border border-slate-100 dark:border-slate-600 flex items-center justify-center mx-auto mb-6 rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300">
                <QrCode size={40} className="text-purple-400 dark:text-purple-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">Mulai Penelusuran</h3>
              <p className="text-base font-medium text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                Ketik nomor OP, Surat Jalan, atau Dokumen BC pada kolom pencarian di atas untuk melihat alur detail produksi dari hulu ke hilir dengan visualisasi yang jelas.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};