import React, { useState, useEffect } from 'react';
import {
  Factory, Layers, Plus, Edit, Trash2, Save, ArrowLeft,
  CheckCircle, XCircle, Search, Users, Package, ChevronRight,
  ImageIcon, RefreshCw, Loader2, Cpu, Server, Network, Hash,
  Tag, User, FolderTree, Grid, TrendingUp, Eye, MinusCircle,
  FileImage, X, FolderOpen, Info, AlertCircle, Clock, Calendar,
  BarChart3, Activity, Zap, Shield, Settings, CheckSquare,
  Square, Download, Upload, Filter, MoreVertical, Globe,
  Briefcase, HardDrive, Cpu as CpuIcon, PieChart, Target
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface BackendStation { id: string; lineId: string; station: string; required: boolean; order: number; }
interface FrontendStation { code: string; name: string; required: boolean; deviceType: string; }
interface BackendLineMaster { id: string; code: string; name: string; description?: string; patternMultiplier: number; stations: BackendStation[]; productionOrders?: any[]; createdAt: string; updatedAt: string; userCount: number; }
interface LineMaster { id: string; code: string; name: string; description?: string; patternMultiplier: number; stations: FrontendStation[]; createdAt: string; updatedAt: string; productionOrders?: any[]; userCount: number; }
interface PatternPart { name: string; imgGood: string; imgNg: string; }
interface PatternMaster { id: string; styleCode: string; lineId?: string; lineCode?: string; patterns: PatternPart[]; imgSetGood?: string; imgSetNg?: string; createdAt?: string; updatedAt?: string; }
interface LineMasterViewProps { onNavigate?: (tab: string) => void; }

const availStations = [
  { code: 'CUTTING_ENTAN', name: 'Cutting Entan (Rough)', deviceType: 'MANUAL' },
  { code: 'CUTTING_POND', name: 'Cutting Pond (Fine)', deviceType: 'SPARSHA' },
  { code: 'CP', name: 'Check Panel', deviceType: 'DRISTI' },
  { code: 'SEWING', name: 'Sewing', deviceType: 'SPARSHA' },
  { code: 'QC', name: 'Quality Control', deviceType: 'MANUAL' },
  { code: 'PACKING', name: 'Packing', deviceType: 'MANUAL' },
  { code: 'FG', name: 'Finished Goods', deviceType: 'MANUAL' },
];

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: any;
  color?: 'cyan' | 'indigo' | 'emerald' | 'purple';
  subtitle?: string;
  suffix?: string;
  trend?: string;
}

const MetricCard = ({ title, value, icon: Icon, color = 'cyan', subtitle, suffix, trend }: MetricCardProps) => {
  const colorStyles = {
    cyan: { bg: 'from-cyan-500 to-cyan-400', lightBg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200/50 dark:border-cyan-800/50' },
    indigo: { bg: 'from-indigo-500 to-indigo-400', lightBg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200/50 dark:border-indigo-800/50' },
    emerald: { bg: 'from-emerald-500 to-emerald-400', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/50 dark:border-emerald-800/50' },
    purple: { bg: 'from-purple-500 to-purple-400', lightBg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200/50 dark:border-purple-800/50' }
  }[color];

  return (
    <div className="group relative bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-900/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mb-2">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</span>
            {suffix && <span className="text-sm font-medium text-slate-400 dark:text-slate-500">{suffix}</span>}
          </div>
          {subtitle && <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 inline-flex px-2 py-0.5 rounded-full">
              <TrendingUp size={12} />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorStyles.lightBg} border ${colorStyles.border} shadow-inner`}>
          <Icon size={20} className={colorStyles.text} />
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r ${colorStyles.bg} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
    </div>
  );
};

const PatternPreviewCard = ({ pattern, idx }: { pattern: PatternPart; idx: number }) => {
  const [goodErr, setGoodErr] = useState(false);
  const [ngErr, setNgErr] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-600 group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none">
          {idx + 1}
        </div>
        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{pattern.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm group/img">
          {!goodErr ? (
            <img
              src={`${API_BASE_URL}/uploads/patterns/${pattern.imgGood}`}
              alt="Good"
              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
              onError={() => setGoodErr(true)}
            />
          ) : (
            <div className="w-full h-full bg-emerald-50 dark:bg-emerald-900/20 flex flex-col gap-1 items-center justify-center">
              <ImageIcon size={20} className="text-emerald-400 dark:text-emerald-500/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
            <span className="text-[10px] font-bold tracking-wider text-emerald-400">GOOD</span>
          </div>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        </div>
        <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm group/img">
          {!ngErr ? (
            <img
              src={`${API_BASE_URL}/uploads/patterns/${pattern.imgNg}`}
              alt="NG"
              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
              onError={() => setNgErr(true)}
            />
          ) : (
            <div className="w-full h-full bg-rose-50 dark:bg-rose-900/20 flex flex-col gap-1 items-center justify-center">
              <ImageIcon size={20} className="text-rose-400 dark:text-rose-500/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-rose-900/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
            <span className="text-[10px] font-bold tracking-wider text-rose-400">NG</span>
          </div>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
        </div>
      </div>
    </div>
  );
};

export const LineMasterView: React.FC<LineMasterViewProps> = ({ onNavigate }) => {
  const [ls, setLs] = useState<LineMaster[]>([]);
  const [flt, setFlt] = useState<LineMaster[]>([]);
  const [sel, setSel] = useState<LineMaster | null>(null);
  const [load, setLoad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pats, setPats] = useState<PatternMaster[]>([]);
  const [selPat, setSelPat] = useState<PatternMaster | null>(null);
  const [patLoad, setPatLoad] = useState(false);
  const [edit, setEdit] = useState(false);
  const [create, setCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'details' | 'patterns' | 'sewing' | 'packing'>('details');
  const [fd, setFd] = useState<Partial<LineMaster>>({ code: '', name: '', description: '', patternMultiplier: 1, stations: availStations.map(s => ({ ...s, required: true })) });
  const [patModal, setPatModal] = useState(false);
  const [patEdit, setPatEdit] = useState(false);
  const [patFd, setPatFd] = useState({ id: '', styleCode: '', patterns: [{ name: '', imgGood: '', imgNg: '' }] as PatternPart[], imgSetGood: '', imgSetNg: '' });
  const [upFiles, setUpFiles] = useState<{ setGood?: File; setNg?: File; patternGood: (File | null)[]; patternNg: (File | null)[]; }>({ patternGood: [], patternNg: [] });
  const [patSaving, setPatSaving] = useState(false);
  
  // ========== STATE FOR SEWING CONFIG ==========
  const [sewingConfig, setSewingConfig] = useState<{ starts: any[], finishes: any[] }>({ starts: [], finishes: [] });
  const [loadingSewing, setLoadingSewing] = useState(false);
  const [savingSewing, setSavingSewing] = useState(false);
  // ==============================================

  // ========== NEW STATE FOR PACKING CONFIG ==========
  const [packSize, setPackSize] = useState<number>(50);
  const [loadingPacking, setLoadingPacking] = useState(false);
  const [savingPacking, setSavingPacking] = useState(false);
  // ==================================================

  const convBack = (b: BackendLineMaster): LineMaster => {
    const active = new Set(b.stations.filter(s => s.required).map(s => s.station));
    return { ...b, stations: availStations.map(s => ({ code: s.code, name: s.name, required: active.has(s.code), deviceType: s.deviceType })) };
  };
  const prepStations = (st: FrontendStation[]) => st.filter(s => s.required).map((s, i) => ({ station: s.code, required: true, order: i + 1 }));

  const fetchLs = async () => {
    setLoad(true);
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters`);
      if (res.ok) {
        const data: BackendLineMaster[] = await res.json();
        const conv = data.map(convBack);
        setLs(conv); setFlt(conv);
        if (conv.length && !sel) setSel(conv[0]);
      } else console.error('Failed to fetch lines');
    } catch { alert('Failed to fetch lines'); } finally { setLoad(false); }
  };

  const fetchPats = async (lineCode: string) => {
    setPatLoad(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pattern-masters?lineCode=${lineCode}`);
      if (res.ok) {
        const data: PatternMaster[] = await res.json();
        const norm = data.map(i => ({ ...i, patterns: Array.isArray(i.patterns) ? i.patterns : [] }));
        setPats(norm); setSelPat(norm[0] || null);
      } else { setPats([]); setSelPat(null); }
    } catch { setPats([]); setSelPat(null); } finally { setPatLoad(false); }
  };

  const fetchSewingConfig = async (lineCode: string) => {
    setLoadingSewing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters/${lineCode}/sewing-config`);
      if (res.ok) {
        const data = await res.json();
        setSewingConfig(data);
      } else {
        setSewingConfig({ starts: [], finishes: [] });
      }
    } catch {
      setSewingConfig({ starts: [], finishes: [] });
    } finally {
      setLoadingSewing(false);
    }
  };

  // ========== NEW FUNCTION TO FETCH PACKING CONFIG ==========
  const fetchPackingConfig = async (lineCode: string) => {
    setLoadingPacking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters/${lineCode}/packing-config`);
      if (res.ok) {
        const data = await res.json();
        setPackSize(data.packSize);
      }
    } catch (error) {
      console.error('Failed to fetch packing config', error);
    } finally {
      setLoadingPacking(false);
    }
  };
  // ==========================================================

  useEffect(() => { fetchLs(); }, []);
  
  // ========== MODIFIED useEffect untuk menangani perubahan line ==========
  useEffect(() => {
    if (sel) {
      fetchPats(sel.code);
      fetchSewingConfig(sel.code);
      fetchPackingConfig(sel.code); // <-- tambah
    } else {
      setPats([]);
      setSelPat(null);
      setSewingConfig({ starts: [], finishes: [] });
      setPackSize(50); // reset ke default
    }
  }, [sel]);
  // ========================================================================
  
  useEffect(() => { setFlt(search.trim() ? ls.filter(l => l.code.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase())) : ls); }, [search, ls]);

  const totalPats = pats.reduce((s, i) => s + (i.patterns?.length || 0), 0);
  const totalStyles = pats.length;

  const selectLine = (l: LineMaster) => { setSel(l); setEdit(false); setCreate(false); setPatEdit(false); setTab('details'); };
  const newLine = () => { setFd({ code: '', name: '', description: '', patternMultiplier: 1, stations: availStations.map(s => ({ ...s, required: true })) }); setSel(null); setSelPat(null); setCreate(true); setEdit(true); setTab('details'); };
  const editLine = () => { if (sel) { setFd({ ...sel }); setEdit(true); } };
  const cancelEdit = () => { setEdit(false); setCreate(false); setPatEdit(false); if (sel) setFd({ ...sel }); };
  const delLine = async () => {
    if (!sel || !confirm(`Delete line "${sel.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters/${sel.code}`, { method: 'DELETE' });
      if (res.ok) { setLs(ls.filter(l => l.id !== sel.id)); setSel(null); setSelPat(null); setEdit(false); alert('Line deleted!'); fetchLs(); }
      else { const e = await res.json(); alert(`Error: ${e.message || 'Delete failed'}`); }
    } catch { alert('Error deleting'); } finally { setDeleting(false); }
  };
  const saveLine = async () => {
    if (!fd.code || !fd.name) return alert('Code and Name required');
    setSaving(true);
    try {
      const url = create ? `${API_BASE_URL}/line-masters` : `${API_BASE_URL}/line-masters/${fd.code}`;
      const method = create ? 'POST' : 'PUT';
      const payload = { code: fd.code, name: fd.name, description: fd.description, patternMultiplier: fd.patternMultiplier, stations: prepStations(fd.stations || []) };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const saved: BackendLineMaster = await res.json();
        const conv = convBack(saved);
        setLs(create ? [...ls, conv] : ls.map(l => l.id === conv.id ? conv : l));
        setSel(conv); setEdit(false); setCreate(false); alert('Line saved!'); fetchLs();
      } else { const e = await res.json(); alert(`Error: ${e.message || 'Save failed'}`); }
    } catch { alert('Error saving'); } finally { setSaving(false); }
  };
  const toggleStation = (code: string) => setFd({ ...fd, stations: fd.stations?.map(s => s.code === code ? { ...s, required: !s.required } : s) });

  const openPatModal = (p?: PatternMaster) => {
    setPatEdit(!!p);
    if (p) {
      setPatFd({
        ...p,
        patterns: p.patterns?.length ? p.patterns : [{ name: '', imgGood: '', imgNg: '' }],
        imgSetGood: p.imgSetGood || '',
        imgSetNg: p.imgSetNg || ''
      });
    } else {
      setPatFd({
        id: '',
        styleCode: sel?.code || '',
        patterns: [{ name: '', imgGood: '', imgNg: '' }],
        imgSetGood: '',
        imgSetNg: ''
      });
    }
    setUpFiles({ setGood: undefined, setNg: undefined, patternGood: [], patternNg: [] });
    setPatModal(true);
  };
  const handlePatName = (idx: number, val: string) => {
    const p = [...(patFd.patterns || [])];
    if (!p[idx]) p[idx] = { name: '', imgGood: '', imgNg: '' };
    p[idx].name = val;
    setPatFd({ ...patFd, patterns: p });
  };
  const addPat = () => setPatFd({ ...patFd, patterns: [...(patFd.patterns || []), { name: '', imgGood: '', imgNg: '' }] });
  const removePat = (idx: number) => {
    setPatFd({ ...patFd, patterns: patFd.patterns?.filter((_, i) => i !== idx) });
    setUpFiles(p => ({ ...p, patternGood: p.patternGood.filter((_, i) => i !== idx), patternNg: p.patternNg.filter((_, i) => i !== idx) }));
  };
  const previewStyle = () => { const r = patFd.styleCode.trim().toUpperCase(); return r.length >= 4 ? r.substring(0, 4) : (r || '...'); };

  const savePat = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = patFd.styleCode.trim().toUpperCase();
    const clean = raw.length >= 4 ? raw.substring(0, 4) : raw;
    const valid = (patFd.patterns || []).filter(p => p.name.trim() !== '');
    if (!clean || valid.length === 0) return alert("Style Code and at least 1 Pattern Name required.");
    setPatSaving(true);
    try {
      const form = new FormData();
      if (upFiles.setGood) form.append('images', upFiles.setGood);
      if (upFiles.setNg) form.append('images', upFiles.setNg);
      for (let i = 0; i < (patFd.patterns?.length || 0); i++) {
        if (upFiles.patternGood[i]) form.append('images', upFiles.patternGood[i]!);
        if (upFiles.patternNg[i]) form.append('images', upFiles.patternNg[i]!);
      }
      let uploaded: string[] = [];
      if (form.has('images')) {
        const upRes = await fetch(`${API_BASE_URL}/pattern-masters/upload`, { method: 'POST', body: form });
        if (!upRes.ok) throw new Error('Upload failed');
        uploaded = await upRes.json();
      }
      let idx = 0;
      const next = () => uploaded[idx++] || '';
      const imgSetGood = upFiles.setGood ? next() : `${clean.toLowerCase()}_good.png`;
      const imgSetNg = upFiles.setNg ? next() : `${clean.toLowerCase()}_ng.png`;
      const patterns = valid.map((p, i) => ({
        name: p.name,
        imgGood: upFiles.patternGood[i] ? next() : `${clean.toLowerCase()}_${i + 1}_good.png`,
        imgNg: upFiles.patternNg[i] ? next() : `${clean.toLowerCase()}_${i + 1}_ng.png`
      }));
      const payload: any = { styleCode: clean, patterns, imgSetGood, imgSetNg };
      if (!patEdit) payload.lineCode = sel?.code;
      const url = patEdit ? `${API_BASE_URL}/pattern-masters/${patFd.id}` : `${API_BASE_URL}/pattern-masters`;
      const method = patEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const updated = await res.json();
        setPats(prev => {
          const i = prev.findIndex(p => p.id === updated.id);
          if (i !== -1) { const n = [...prev]; n[i] = updated; return n; } else return [...prev, updated];
        });
        setSelPat(updated);
        setPatModal(false);
        alert(`Pattern ${patEdit ? 'Updated' : 'Created'} successfully!`);
      } else { const e = await res.json(); alert(`Failed: ${e.message || 'Duplicate style code?'}`); }
    } catch (err) { console.error(err); alert('Error saving pattern'); } finally { setPatSaving(false); }
  };

  // ========== HELPER FUNCTIONS FOR SEWING CONFIG ==========
  const addStart = () => {
    setSewingConfig(prev => ({
      ...prev,
      starts: [...prev.starts, { id: prev.starts.length + 1, name: `Start ${prev.starts.length + 1}`, patterns: [] }]
    }));
  };

  const removeStart = (idx: number) => {
    setSewingConfig(prev => ({
      ...prev,
      starts: prev.starts.filter((_, i) => i !== idx)
    }));
  };

  const updateStart = (idx: number, field: string, value: any) => {
    setSewingConfig(prev => {
      const newStarts = [...prev.starts];
      newStarts[idx] = { ...newStarts[idx], [field]: value };
      return { ...prev, starts: newStarts };
    });
  };

  const addFinish = () => {
    setSewingConfig(prev => ({
      ...prev,
      finishes: [...prev.finishes, { id: prev.finishes.length + 1, name: `Finish ${prev.finishes.length + 1}`, inputStarts: [] }]
    }));
  };

  const removeFinish = (idx: number) => {
    setSewingConfig(prev => ({
      ...prev,
      finishes: prev.finishes.filter((_, i) => i !== idx)
    }));
  };

  const updateFinish = (idx: number, field: string, value: any) => {
    setSewingConfig(prev => {
      const newFinishes = [...prev.finishes];
      newFinishes[idx] = { ...newFinishes[idx], [field]: value };
      return { ...prev, finishes: newFinishes };
    });
  };

  const saveSewingConfig = async () => {
    if (!sel) return;
    setSavingSewing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters/${sel.code}/sewing-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sewingConfig),
      });
      if (res.ok) {
        alert('Sewing configuration saved!');
      } else {
        alert('Failed to save');
      }
    } catch {
      alert('Error saving');
    } finally {
      setSavingSewing(false);
    }
  };
  // =========================================================

  // ========== NEW FUNCTION TO SAVE PACKING CONFIG ==========
  const savePackingConfig = async () => {
    if (!sel) return;
    setSavingPacking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/line-masters/${sel.code}/packing-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSize }),
      });
      if (res.ok) {
        alert('Packing configuration saved!');
      } else {
        alert('Failed to save');
      }
    } catch (error) {
      console.error('Error saving packing config', error);
    } finally {
      setSavingPacking(false);
    }
  };
  // ==========================================================

  const back = () => { if (onNavigate) onNavigate('dashboard'); };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* HEADER - compact & modern */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 relative overflow-hidden">
          {/* Subtle Background Decoration */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/5 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Factory size={26} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-[3px] border-white dark:border-slate-900 shadow-sm">
                  <Server size={10} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                  Line Master
                  <span className="text-[10px] px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-md font-bold tracking-widest shadow-sm">
                    PRODUCTION CORE
                  </span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and configure your assembly lines</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 text-white rounded-xl shadow-lg shadow-slate-900/10">
                <div className="flex flex-col">
                  <div className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">Total Lines</div>
                  <div className="text-xl font-bold leading-none mt-1">{ls.length}</div>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md">
                  <Network size={18} className="text-cyan-400" />
                </div>
              </div>
              <button
                onClick={fetchLs}
                disabled={load}
                className="group px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-cyan-300 dark:hover:border-cyan-600 transition-all shadow-sm active:scale-95"
              >
                {load ? <RefreshCw size={16} className="animate-spin text-cyan-500" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500 text-cyan-500" />}
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 px-6 pb-6 relative z-10">
          <MetricCard title="Total Lines" value={ls.length} icon={Factory} color="cyan" suffix="lines" subtitle={`${flt.length} active`} />
          <MetricCard title="Total Patterns" value={totalPats} icon={Layers} color="indigo" suffix="patterns" trend="+8.2% from last month" />
          <MetricCard title="Pattern Styles" value={totalStyles} icon={Tag} color="emerald" suffix="styles" subtitle={`Across ${ls.length} lines`} />
          <MetricCard title="Active Stations" value={sel?.stations?.filter(s => s.required).length || 0} icon={Cpu} color="purple" suffix="stations" subtitle={`Out of ${availStations.length} total`} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Line List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden sticky top-6">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Production Lines</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{load ? 'Loading...' : `${flt.length} configured`}</p>
                </div>
                <span className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold rounded-lg border border-cyan-100 dark:border-cyan-500/20">
                  {flt.length}
                </span>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search lines..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none shadow-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3">
              <div className="space-y-1.5 max-h-[calc(100vh-440px)] overflow-y-auto pr-2 custom-scrollbar">
                {flt.map(l => {
                  const isSel = sel?.id === l.id;
                  return (
                    <div
                      key={l.id}
                      className={`group p-3.5 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${isSel
                          ? 'bg-gradient-to-r from-cyan-50 to-white dark:from-cyan-900/20 dark:to-slate-800/50 border border-cyan-200/60 dark:border-cyan-800/60 shadow-sm'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      onClick={() => selectLine(l)}
                    >
                      {isSel && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-l-2xl" />}
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isSel ? 'bg-cyan-500 shadow-md shadow-cyan-500/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700'
                            }`}>
                            <Factory size={16} className={isSel ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'} />
                          </div>
                          <div>
                            <div className={`font-bold text-sm transition-colors ${isSel ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-900 dark:text-white'}`}>{l.code}</div>
                            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{l.name}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-bold shadow-sm">
                            {l.patternMultiplier}x
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium pl-12">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1"><Users size={10} className="text-slate-400"/> {l.userCount || 0}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                          <span className="flex items-center gap-1"><CpuIcon size={10} className="text-slate-400"/> {l.stations?.filter(s => s.required).length}</span>
                        </div>
                        <ChevronRight size={14} className={`text-slate-400 transition-transform duration-300 ${isSel ? 'translate-x-1 text-cyan-500' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-1'}`} />
                      </div>
                    </div>
                  );
                })}
                {!flt.length && !load && (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100 dark:border-slate-700">
                      <Search size={20} className="text-slate-400" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No Lines Found</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Try adjusting your search</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={newLine}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
                >
                  <Plus size={16} />
                  New Line
                </button>
                {onNavigate && (
                  <button
                    onClick={back}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-3 space-y-6">
          {sel && !edit ? (
            <>
              {/* Tab Navigation - Modern Pill or Sleek Underline */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="flex px-2 pt-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto hide-scrollbar">
                  {[
                    { id: 'details', label: 'Line Details', icon: Settings },
                    { id: 'patterns', label: 'Pattern Master', icon: Layers },
                    { id: 'sewing', label: 'Sewing Master', icon: CpuIcon },
                    { id: 'packing', label: 'Packing Master', icon: Package }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id as any)}
                      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all relative whitespace-nowrap ${tab === t.id
                          ? 'text-cyan-600 dark:text-cyan-400 bg-white dark:bg-slate-900 rounded-t-2xl border-t border-l border-r border-slate-200/60 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-t-2xl'
                        }`}
                    >
                      <t.icon size={16} className={tab === t.id ? 'text-cyan-500' : 'text-slate-400'} />
                      {t.label}
                      {tab === t.id && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 translate-y-px" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 flex-1 bg-white dark:bg-slate-900">
                  {tab === 'details' ? (
                    <div className="space-y-6">
                      {/* Header Actions */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            {sel.code} <span className="text-slate-300 dark:text-slate-600 font-light">|</span> {sel.name}
                          </h2>
                          {sel.description && (
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 bg-slate-50 dark:bg-slate-800/50 inline-block px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700/50">{sel.description}</p>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={editLine}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                          >
                            <Edit size={16} />
                            Edit Line
                          </button>
                          <button
                            onClick={delLine}
                            disabled={deleting}
                            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                          >
                            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Users</p>
                              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{sel.userCount || 0}</p>
                            </div>
                            <div className="p-2.5 bg-cyan-50 dark:bg-cyan-500/10 rounded-xl border border-cyan-100 dark:border-cyan-500/20">
                              <Users size={20} className="text-cyan-600 dark:text-cyan-400" />
                            </div>
                          </div>
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-4 flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500"/> Currently active on line</p>
                        </div>

                        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Orders</p>
                              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                                {sel?.productionOrders?.filter(po => ['WIP', 'SCHEDULED'].includes(po.status)).length || 0}
                              </p>
                            </div>
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                              <Package size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-4 flex items-center gap-1"><Activity size={12} className="text-blue-500"/> Orders in production</p>
                        </div>

                        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Multiplier</p>
                              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{sel?.patternMultiplier || 1}<span className="text-lg text-slate-400 ml-1">x</span></p>
                            </div>
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                              <Layers size={20} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                          </div>
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-4 flex items-center gap-1"><Zap size={12} className="text-emerald-500"/> Patterns per standard set</p>
                        </div>
                      </div>

                      {/* Station Configuration */}
                      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-transparent">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Station Flow</h3>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Configured stations for this production line</p>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availStations.map(st => {
                              const en = sel.stations?.some(s => s.code === st.code && s.required);
                              return (
                                <div
                                  key={st.code}
                                  className={`relative group p-4 rounded-2xl transition-all duration-300 ${en
                                      ? 'border border-cyan-400 bg-gradient-to-br from-cyan-50/50 to-white dark:from-cyan-900/10 dark:to-slate-800 shadow-md shadow-cyan-100 dark:shadow-none'
                                      : 'border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 opacity-70'
                                    }`}
                                >
                                  {en && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-cyan-400/10 to-transparent rounded-tr-2xl pointer-events-none" />}
                                  <div className="flex items-start justify-between relative z-10">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className={`p-2 rounded-xl shadow-sm ${en ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                          }`}>
                                          {st.deviceType === 'SPARSHA' && <Cpu size={14} />}
                                          {st.deviceType === 'DRISTI' && <Eye size={14} />}
                                          {st.deviceType === 'MANUAL' && <User size={14} />}
                                        </div>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-md border ${st.deviceType === 'SPARSHA'
                                            ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                            : st.deviceType === 'DRISTI'
                                              ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                                          }`}>
                                          {st.deviceType}
                                        </span>
                                      </div>
                                      <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">{st.name}</div>
                                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                                        Code: <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-600 dark:text-slate-300">{st.code}</span>
                                      </div>
                                    </div>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${en
                                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                      }`}>
                                      {en ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : tab === 'patterns' ? (
                    // Pattern Master Tab
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Pattern Library</h3>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage configuration for {sel.code}</p>
                        </div>
                        <button
                          onClick={() => openPatModal()}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                        >
                          <Plus size={16} />
                          New Pattern
                        </button>
                      </div>

                      {patLoad ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
                          <div className="relative mb-4">
                            <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Layers className="text-indigo-600 dark:text-indigo-400" size={18} />
                            </div>
                          </div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading pattern masters...</p>
                        </div>
                      ) : selPat ? (
                        <div className="space-y-6">
                          {/* Pattern Summary Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-slate-800/50 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl shadow-inner">
                                  <Tag size={20} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-indigo-700/70 dark:text-indigo-400/70 uppercase tracking-wider">Style Code</p>
                                  <p className="font-extrabold text-2xl text-slate-900 dark:text-white mt-0.5">{selPat.styleCode}</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-800/50 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl shadow-inner">
                                  <Grid size={20} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-emerald-700/70 dark:text-emerald-400/70 uppercase tracking-wider">Total Parts</p>
                                  <p className="font-extrabold text-2xl text-slate-900 dark:text-white mt-0.5">
                                    {selPat?.patterns?.length || 0}
                                    <span className="text-sm font-medium text-slate-500 ml-1.5">parts</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-800/50 rounded-2xl border border-blue-100 dark:border-blue-800/30 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl shadow-inner">
                                  <FileImage size={20} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-blue-700/70 dark:text-blue-400/70 uppercase tracking-wider">Set Images</p>
                                  <p className="font-extrabold text-2xl text-slate-900 dark:text-white mt-0.5">
                                    2
                                    <span className="text-sm font-medium text-slate-500 ml-1.5">images</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Pattern Parts */}
                          <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-center justify-between mb-5">
                              <div>
                                <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">Pattern Components</h4>
                                <p className="text-xs font-medium text-slate-500 mt-1">Detailed visual reference for quality checking</p>
                              </div>
                              <button
                                onClick={() => openPatModal(selPat)}
                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                              >
                                <Edit size={14} />
                                Edit Configuration
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {(selPat?.patterns || []).map((p, i) => (
                                <PatternPreviewCard key={i} pattern={p} idx={i} />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
                            <Layers size={28} className="text-slate-400" />
                          </div>
                          <h4 className="text-lg font-extrabold text-slate-700 dark:text-slate-300 mb-2">No Pattern Configured</h4>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">This line doesn't have a pattern configuration yet. Create one to enable CP and QC stations.</p>
                          <button
                            onClick={() => openPatModal()}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 mx-auto hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                          >
                            <Plus size={18} />
                            Create Pattern Master
                          </button>
                        </div>
                      )}
                    </div>
                  ) : tab === 'sewing' ? (
                    // Sewing Master Tab
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Sewing Flow Configuration</h3>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Define routing logic for the sewing station</p>
                        </div>
                        <button
                          onClick={saveSewingConfig}
                          disabled={savingSewing}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          {savingSewing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                        </button>
                      </div>

                      {loadingSewing ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="animate-spin text-cyan-500" size={32} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          {/* Sewing Starts */}
                          <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-transparent">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                  <CpuIcon size={16} />
                                </div>
                                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Input Terminals (Starts)</h4>
                              </div>
                              <button
                                onClick={addStart}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-500/20 flex items-center gap-1 transition-colors"
                              >
                                <Plus size={14} /> Add Terminal
                              </button>
                            </div>
                            <div className="p-5 space-y-4 bg-slate-50/30 dark:bg-slate-900/20 flex-1">
                              {sewingConfig.starts.map((start, idx) => (
                                <div key={idx} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm relative group/item">
                                  <button onClick={() => removeStart(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity border border-rose-200 hover:bg-rose-500 hover:text-white shadow-sm z-10">
                                    <X size={12} />
                                  </button>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Terminal Name</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all outline-none"
                                        value={start.name}
                                        onChange={(e) => updateStart(idx, 'name', e.target.value)}
                                        placeholder={`Start ${idx+1}`}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assigned Patterns (IDs)</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all outline-none"
                                        value={start.patterns?.join(', ') || ''}
                                        onChange={(e) => updateStart(idx, 'patterns', e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))}
                                        placeholder="e.g. 0, 1, 2"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {sewingConfig.starts.length === 0 && (
                                <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                  <p className="text-sm font-medium text-slate-500">No start terminals configured.</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Sewing Finishes */}
                          <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-transparent">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg">
                                  <Target size={16} />
                                </div>
                                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Output Terminals (Finishes)</h4>
                              </div>
                              <button
                                onClick={addFinish}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-500/20 flex items-center gap-1 transition-colors"
                              >
                                <Plus size={14} /> Add Terminal
                              </button>
                            </div>
                            <div className="p-5 space-y-4 bg-slate-50/30 dark:bg-slate-900/20 flex-1">
                              {sewingConfig.finishes.map((finish, idx) => (
                                <div key={idx} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm relative group/item">
                                  <button onClick={() => removeFinish(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity border border-rose-200 hover:bg-rose-500 hover:text-white shadow-sm z-10">
                                    <X size={12} />
                                  </button>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Terminal Name</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all outline-none"
                                        value={finish.name}
                                        onChange={(e) => updateFinish(idx, 'name', e.target.value)}
                                        placeholder={`Finish ${idx+1}`}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Source Inputs (Starts IDs)</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all outline-none"
                                        value={finish.inputStarts?.join(', ') || ''}
                                        onChange={(e) => updateFinish(idx, 'inputStarts', e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))}
                                        placeholder="e.g. 1, 2"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {sewingConfig.finishes.length === 0 && (
                                <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                  <p className="text-sm font-medium text-slate-500">No finish terminals configured.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // ========== PACKING MASTER TAB ==========
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Packing Configuration</h3>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Define standard quantities for final boxing</p>
                        </div>
                        <button
                          onClick={savePackingConfig}
                          disabled={savingPacking}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          {savingPacking ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Settings
                        </button>
                      </div>

                      {loadingPacking ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="animate-spin text-cyan-500" size={32} />
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 max-w-xl">
                          <div className="flex items-start gap-5">
                            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0 border border-amber-200 dark:border-amber-500/20 shadow-sm">
                              <Package size={28} />
                            </div>
                            <div className="flex-1 space-y-4">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                  Standard Pack Size (Sets / Box)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-full px-4 py-3 text-lg font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all outline-none shadow-sm"
                                    value={packSize}
                                    onChange={(e) => setPackSize(parseInt(e.target.value) || 50)}
                                  />
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">sets</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 mt-4 border border-slate-100 dark:border-slate-800">
                                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                    <Info size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                    <span>When packing station registers <strong>{packSize}</strong> valid sets, a complete box is marked ready for Finished Goods.</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    // =========================================
                  )}
                </div>
              </div>
            </>
          ) : edit || create ? (
            // Edit / Create Form
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-md">
                      {create ? <Plus size={24} className="text-white dark:text-slate-900" /> : <Edit size={24} className="text-white dark:text-slate-900" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {create ? 'Create New Production Line' : `Edit Configuration: ${sel?.code}`}
                      </h2>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {create ? 'Set up terminal properties and workflow' : 'Modify core line properties and stations'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={cancelEdit}
                      className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm shadow-sm active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveLine}
                      disabled={saving}
                      className="group px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl font-bold flex items-center gap-2 hover:from-cyan-700 hover:to-cyan-600 transition-all disabled:opacity-50 text-sm shadow-md shadow-cyan-500/20 active:scale-95"
                    >
                      {saving ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <Save size={18} />
                          {create ? 'Save New Line' : 'Update Line'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                {/* Basic Information */}
                <div className="space-y-5">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                      <Tag size={16} />
                    </div>
                    Identity Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-10">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Line Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-sm outline-none"
                        value={fd.code || ''}
                        onChange={e => setFd({ ...fd, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., K1YH"
                        disabled={!create}
                      />
                      <p className="text-xs font-medium text-slate-400 mt-2">Unique identifier (locked after creation)</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Line Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-sm outline-none"
                        value={fd.name || ''}
                        onChange={e => setFd({ ...fd, name: e.target.value })}
                        placeholder="e.g., Line K1YH - Cover Sewing"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Pattern Multiplier</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-4 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-sm outline-none"
                        value={fd.patternMultiplier || 1}
                        onChange={e => setFd({ ...fd, patternMultiplier: parseInt(e.target.value) || 1 })}
                      />
                      <p className="text-xs font-medium text-slate-400 mt-2">Number of patterns per complete set</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Description / Notes</label>
                      <textarea
                        className="w-full px-4 py-3 text-sm font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-sm outline-none resize-none"
                        value={fd.description || ''}
                        onChange={e => setFd({ ...fd, description: e.target.value })}
                        rows={3}
                        placeholder="Add optional context about this line..."
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Station Configuration */}
                <div className="space-y-5">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Network size={16} />
                    </div>
                    Station Flow Enablement
                  </h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 pl-10 mb-2">Click to toggle the active stations that belong to this workflow.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-10">
                    {availStations.map(st => {
                      const en = fd.stations?.some(s => s.code === st.code && s.required);
                      return (
                        <div
                          key={st.code}
                          className={`group p-4 rounded-2xl border transition-all cursor-pointer select-none overflow-hidden relative ${en
                              ? 'border-cyan-400 bg-cyan-50/50 dark:bg-cyan-900/10 shadow-md shadow-cyan-100/50 dark:shadow-none hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
                            }`}
                          onClick={() => toggleStation(st.code)}
                        >
                          {en && <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent pointer-events-none" />}
                          <div className="flex items-start justify-between relative z-10">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`p-2 rounded-xl transition-colors ${en ? 'bg-cyan-100 dark:bg-cyan-800/50 text-cyan-600 dark:text-cyan-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  }`}>
                                  {st.deviceType === 'SPARSHA' && <Cpu size={14} />}
                                  {st.deviceType === 'DRISTI' && <Eye size={14} />}
                                  {st.deviceType === 'MANUAL' && <User size={14} />}
                                </div>
                                <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-md border ${st.deviceType === 'SPARSHA'
                                    ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                    : st.deviceType === 'DRISTI'
                                      ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                                  }`}>
                                  {st.deviceType}
                                </span>
                              </div>
                              <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-2">{st.name}</div>
                              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                                {st.code}
                              </div>
                            </div>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${en
                                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30 scale-110'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500'
                              }`}>
                              {en ? <CheckCircle size={14} /> : <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // No Line Selected Empty State
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden h-full flex items-center justify-center min-h-[500px]">
              <div className="p-12 text-center max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-cyan-100 dark:border-slate-700">
                  <Factory size={36} className="text-cyan-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">No Line Selected</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                  Select a production line from the sidebar to view its details, patterns, and configuration flow, or create a brand new one to get started.
                </p>
                <button
                  onClick={newLine}
                  className="group px-6 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold flex items-center gap-2 mx-auto transition-all shadow-lg shadow-slate-900/20 dark:shadow-white/10 active:scale-95"
                >
                  <Plus size={18} />
                  Setup New Line
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pattern Modal */}
      {patModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-900/20 w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-5 px-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                  {patEdit ? <Edit size={20} className="text-indigo-600 dark:text-indigo-400" /> : <Layers size={20} className="text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {patEdit ? 'Edit Pattern Configuration' : 'New Pattern Configuration'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    {patEdit ? 'Update parts and images' : 'Define AI vision logic models'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPatModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={savePat} className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
              <div className="p-6 space-y-8">
                {/* Style Code Setup */}
                <div className="space-y-4">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Hash size={16} className="text-indigo-500" />
                    Identity
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-6">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Style Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 text-lg font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-indigo-700 dark:text-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                        placeholder="e.g. K1YH"
                        value={patFd.styleCode}
                        onChange={e => setPatFd({ ...patFd, styleCode: e.target.value.toUpperCase() })}
                        disabled={patEdit}
                      />
                    </div>
                    <div className="flex items-center">
                      <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Line Association</span>
                        <span className="font-extrabold text-base text-slate-900 dark:text-white">
                          {sel?.code} <span className="text-slate-400 font-normal">|</span> {sel?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Set Images */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <ImageIcon size={16} className="text-amber-500" />
                      QC Set Images
                    </h4>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Optional</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-6">
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-emerald-600 dark:text-emerald-400">Set Good Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-500/10 dark:file:text-emerald-400 transition-colors"
                        onChange={e => setUpFiles(p => ({ ...p, setGood: e.target.files?.[0] }))}
                      />
                      {patFd.imgSetGood && !upFiles.setGood && (
                        <p className="mt-3 text-[11px] font-medium text-slate-500 flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500"/> Saved: {patFd.imgSetGood}</p>
                      )}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-rose-600 dark:text-rose-400">Set NG Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 dark:file:bg-rose-500/10 dark:file:text-rose-400 transition-colors"
                        onChange={e => setUpFiles(p => ({ ...p, setNg: e.target.files?.[0] }))}
                      />
                      {patFd.imgSetNg && !upFiles.setNg && (
                        <p className="mt-3 text-[11px] font-medium text-slate-500 flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500"/> Saved: {patFd.imgSetNg}</p>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Pattern Parts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Grid size={16} className="text-emerald-500" />
                        Pattern Components (Parts)
                      </h4>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 pl-6">Parts config used for Check Panel vision inspection</p>
                    </div>
                    <button
                      type="button"
                      onClick={addPat}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <Plus size={14} /> Add Part Component
                    </button>
                  </div>

                  <div className="pl-6 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {(patFd.patterns || []).map((p, i) => (
                      <div
                        key={i}
                        className="group p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600/50 transition-all shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/50 rounded-l-2xl group-hover:bg-emerald-500 transition-colors" />
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                            <span className="text-slate-500 group-hover:text-emerald-600 dark:text-slate-400 dark:group-hover:text-emerald-400 font-extrabold text-sm">{i + 1}</span>
                          </div>
                          
                          <div className="flex-1 space-y-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Part Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                                placeholder={`e.g. Front Panel ${i + 1}`}
                                value={p.name}
                                onChange={e => handlePatName(i, e.target.value)}
                                autoFocus={i === (patFd.patterns?.length || 0) - 1 && i > 0}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Good State Image</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 dark:file:bg-emerald-500/20 dark:file:text-emerald-400 transition-colors cursor-pointer"
                                  onChange={e => {
                                    const f = e.target.files?.[0];
                                    setUpFiles(pv => {
                                      const g = [...pv.patternGood];
                                      g[i] = f || null;
                                      return { ...pv, patternGood: g };
                                    });
                                  }}
                                />
                                {p.imgGood && !upFiles.patternGood[i] && (
                                  <p className="mt-2 text-[10px] font-medium text-slate-500 truncate" title={p.imgGood}>File: {p.imgGood}</p>
                                )}
                              </div>
                              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2">NG State Image</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 dark:file:bg-rose-500/20 dark:file:text-rose-400 transition-colors cursor-pointer"
                                  onChange={e => {
                                    const f = e.target.files?.[0];
                                    setUpFiles(pv => {
                                      const ng = [...pv.patternNg];
                                      ng[i] = f || null;
                                      return { ...pv, patternNg: ng };
                                    });
                                  }}
                                />
                                {p.imgNg && !upFiles.patternNg[i] && (
                                  <p className="mt-2 text-[10px] font-medium text-slate-500 truncate" title={p.imgNg}>File: {p.imgNg}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {(patFd.patterns?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => removePat(i)}
                              className="mt-4 sm:mt-0 sm:absolute sm:top-5 sm:right-5 p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-colors flex-shrink-0"
                              title="Remove Component"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Actions footer */}
              <div className="p-5 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex gap-3">
                <button
                  type="button"
                  onClick={() => setPatModal(false)}
                  className="flex-1 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm shadow-sm active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={patSaving}
                  className="group flex-[2] py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 active:scale-95 text-sm"
                >
                  {patSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Saving Architecture...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>{patEdit ? 'Update Pattern Architecture' : 'Save Pattern Architecture'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};