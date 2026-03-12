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
    cyan: { bg: 'from-cyan-500 to-cyan-400', lightBg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
    indigo: { bg: 'from-indigo-500 to-indigo-400', lightBg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
    emerald: { bg: 'from-emerald-500 to-emerald-400', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    purple: { bg: 'from-purple-500 to-purple-400', lightBg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' }
  }[color];

  return (
    <div className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
            {suffix && <span className="text-xs text-slate-500 dark:text-slate-400">{suffix}</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={12} />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorStyles.lightBg} border ${colorStyles.border}`}>
          <Icon size={16} className={colorStyles.text} />
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 rounded-b-xl bg-gradient-to-r ${colorStyles.bg} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
    </div>
  );
};

const PatternPreviewCard = ({ pattern, idx }: { pattern: PatternPart; idx: number }) => {
  const [goodErr, setGoodErr] = useState(false);
  const [ngErr, setNgErr] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:shadow-md transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-white font-bold text-xs">
          {idx + 1}
        </div>
        <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{pattern.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-emerald-200 dark:border-emerald-800 group">
          {!goodErr ? (
            <img
              src={`${API_BASE_URL}/uploads/patterns/${pattern.imgGood}`}
              alt="Good"
              className="w-full h-full object-cover"
              onError={() => setGoodErr(true)}
            />
          ) : (
            <div className="w-full h-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <ImageIcon size={16} className="text-emerald-500 dark:text-emerald-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">GOOD</span>
          </div>
        </div>
        <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-rose-200 dark:border-rose-800 group">
          {!ngErr ? (
            <img
              src={`${API_BASE_URL}/uploads/patterns/${pattern.imgNg}`}
              alt="NG"
              className="w-full h-full object-cover"
              onError={() => setNgErr(true)}
            />
          ) : (
            <div className="w-full h-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <ImageIcon size={16} className="text-rose-500 dark:text-rose-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">NG</span>
          </div>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 space-y-5">
      {/* HEADER - compact */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
        <div className="p-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                  <Factory size={22} className="text-white" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center border-3 border-white dark:border-slate-900 shadow-md">
                  <Server size={12} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Line Master
                  <span className="text-[10px] px-2 py-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-full font-bold">
                    PRODUCTION CORE
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-lg shadow-md">
                <div className="flex flex-col">
                  <div className="text-[10px] font-medium opacity-90">Total Lines</div>
                  <div className="text-xl font-bold">{ls.length}</div>
                </div>
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Network size={16} className="text-white" />
                </div>
              </div>
              <button
                onClick={fetchLs}
                disabled={load}
                className="group px-3 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all"
              >
                {load ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />}
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 pb-5">
          <MetricCard title="Total Lines" value={ls.length} icon={Factory} color="cyan" suffix="lines" subtitle={`${flt.length} active`} />
          <MetricCard title="Total Patterns" value={totalPats} icon={Layers} color="indigo" suffix="patterns" trend="+8.2% from last month" />
          <MetricCard title="Pattern Styles" value={totalStyles} icon={Tag} color="emerald" suffix="styles" subtitle={`Across ${ls.length} lines`} />
          <MetricCard title="Active Stations" value={sel?.stations?.filter(s => s.required).length || 0} icon={Cpu} color="purple" suffix="stations" subtitle={`Out of ${availStations.length} total`} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Column - Line List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden sticky top-4">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Production Lines</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{load ? 'Loading...' : `${flt.length} lines configured`}</p>
                </div>
                <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-[10px] font-bold rounded-full">
                  {flt.length}
                </span>
              </div>
            </div>
            <div className="p-3">
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-1 custom-scrollbar">
                {flt.map(l => {
                  const isSel = sel?.id === l.id;
                  return (
                    <div
                      key={l.id}
                      className={`group p-3 rounded-xl cursor-pointer transition-all ${isSel
                          ? 'bg-gradient-to-r from-cyan-50 to-white dark:from-cyan-900/20 dark:to-slate-800 border-l-4 border-cyan-500 shadow-sm'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/30 border border-slate-200 dark:border-slate-700'
                        }`}
                      onClick={() => selectLine(l)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSel ? 'bg-gradient-to-br from-cyan-500 to-cyan-400' : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                            <Factory size={14} className={isSel ? 'text-white' : 'text-slate-400'} />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white">{l.code}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">{l.name}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-medium">
                            {l.patternMultiplier}x
                          </span>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Users size={8} />
                            {l.userCount || 0}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span>{l.stations?.filter(s => s.required).length} stations</span>
                          <span>•</span>
                          <span>{new Date(l.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <ChevronRight size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isSel ? 'opacity-100' : ''}`} />
                      </div>
                    </div>
                  );
                })}
                {!flt.length && !load && (
                  <div className="p-5 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Factory size={20} className="text-slate-400" />
                    </div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No Lines Found</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Create your first production line</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-3 border-t border-slate-100 dark:border-slate-700/50">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search lines..."
                    className="w-full pl-7 pr-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/30 transition-all"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={newLine}
                    className="group px-3 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:from-cyan-700 hover:to-cyan-600 transition-all"
                  >
                    <Plus size={14} />
                    New Line
                  </button>
                  {onNavigate && (
                    <button
                      onClick={back}
                      className="px-3 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:border-cyan-300 dark:hover:border-cyan-700 transition-all flex items-center justify-center gap-1"
                    >
                      <ArrowLeft size={14} />
                      Back
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-3 space-y-5">
          {sel && !edit ? (
            <>
              {/* Tab Navigation */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setTab('details')}
                    className={`px-4 py-2 text-xs font-medium transition-colors relative ${tab === 'details'
                        ? 'text-cyan-600 dark:text-cyan-400 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-cyan-500'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    Line Details
                  </button>
                  <button
                    onClick={() => setTab('patterns')}
                    className={`px-4 py-2 text-xs font-medium transition-colors relative ${tab === 'patterns'
                        ? 'text-cyan-600 dark:text-cyan-400 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-cyan-500'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    Pattern Master
                  </button>
                  <button
                    onClick={() => setTab('sewing')}
                    className={`px-4 py-2 text-xs font-medium transition-colors relative ${tab === 'sewing'
                        ? 'text-cyan-600 dark:text-cyan-400 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-cyan-500'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    Sewing Master
                  </button>
                  {/* ========== NEW TAB BUTTON ========== */}
                  <button
                    onClick={() => setTab('packing')}
                    className={`px-4 py-2 text-xs font-medium transition-colors relative ${tab === 'packing'
                        ? 'text-cyan-600 dark:text-cyan-400 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-cyan-500'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    Packing Master
                  </button>
                  {/* ==================================== */}
                </div>

                {/* Tab Content */}
                <div className="p-4">
                  {tab === 'details' ? (
                    <div className="space-y-4">
                      {/* Header Actions */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {sel.code} - {sel.name}
                          </h2>
                          {sel.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sel.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={editLine}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:from-blue-700 hover:to-blue-600 transition-all"
                          >
                            <Edit size={14} />
                            Edit Line
                          </button>
                          <button
                            onClick={delLine}
                            disabled={deleting}
                            className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:from-rose-700 hover:to-rose-600 transition-all disabled:opacity-50"
                          >
                            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Assigned Users</p>
                              <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">{sel.userCount || 0}</p>
                            </div>
                            <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                              <Users size={18} className="text-cyan-600 dark:text-cyan-400" />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">Currently assigned</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Orders</p>
                              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                                {sel?.productionOrders?.filter(po => ['WIP', 'SCHEDULED'].includes(po.status)).length || 0}
                              </p>
                            </div>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <Package size={18} className="text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">In production</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pattern Multiplier</p>
                              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{sel?.patternMultiplier || 1}</p>
                            </div>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <Layers size={18} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">Patterns per set</p>
                        </div>
                      </div>

                      {/* Station Configuration */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Station Configuration</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Active stations for this line</p>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {availStations.map(st => {
                              const en = sel.stations?.some(s => s.code === st.code && s.required);
                              return (
                                <div
                                  key={st.code}
                                  className={`group p-3 rounded-xl border-2 transition-all ${en
                                      ? 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-white dark:from-cyan-900/20 dark:to-slate-800 shadow-sm'
                                      : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className={`p-1.5 rounded-lg ${en ? 'bg-cyan-100 dark:bg-cyan-900/40' : 'bg-slate-100 dark:bg-slate-800'
                                          }`}>
                                          {st.deviceType === 'SPARSHA' && <Cpu size={12} className={en ? 'text-cyan-600' : 'text-slate-400'} />}
                                          {st.deviceType === 'DRISTI' && <Eye size={12} className={en ? 'text-cyan-600' : 'text-slate-400'} />}
                                          {st.deviceType === 'MANUAL' && <User size={12} className={en ? 'text-cyan-600' : 'text-slate-400'} />}
                                        </div>
                                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${st.deviceType === 'SPARSHA'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                            : st.deviceType === 'DRISTI'
                                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                          }`}>
                                          {st.deviceType}
                                        </span>
                                      </div>
                                      <div className="font-bold text-xs text-slate-900 dark:text-white">{st.name}</div>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                        Code: <span className="font-mono">{st.code}</span>
                                      </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${en
                                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-white shadow-sm'
                                        : 'bg-slate-200 dark:bg-slate-700'
                                      }`}>
                                      {en ? <CheckCircle size={12} /> : <XCircle size={12} className="text-slate-400" />}
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
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">Pattern Master</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Manage patterns for {sel.code}</p>
                        </div>
                        <button
                          onClick={() => openPatModal()}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:from-emerald-700 hover:to-emerald-600 transition-all"
                        >
                          <Plus size={14} />
                          New Pattern
                        </button>
                      </div>

                      {patLoad ? (
                        <div className="flex flex-col items-center justify-center h-40">
                          <div className="relative mb-3">
                            <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Layers className="text-indigo-600 dark:text-indigo-400" size={16} />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Loading pattern masters...</p>
                        </div>
                      ) : selPat ? (
                        <div className="space-y-4">
                          {/* Pattern Summary Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                                  <Tag size={14} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-400">Style Code</p>
                                  <p className="font-bold text-base text-slate-900 dark:text-white">{selPat.styleCode}</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                                  <Grid size={14} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Patterns Count</p>
                                  <p className="font-bold text-base text-slate-900 dark:text-white">
                                    {selPat?.patterns?.length || 0}
                                    <span className="text-sm text-slate-500 ml-1">patterns</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                  <FileImage size={14} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-blue-700 dark:text-blue-400">Set Images</p>
                                  <p className="font-bold text-base text-slate-900 dark:text-white">
                                    2
                                    <span className="text-sm text-slate-500 ml-1">images</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Pattern Parts */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Pattern Parts</h4>
                              <button
                                onClick={() => openPatModal(selPat)}
                                className="px-2 py-1 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:from-indigo-700 hover:to-indigo-600 transition-all"
                              >
                                <Edit size={12} />
                                Edit
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(selPat?.patterns || []).map((p, i) => (
                                <PatternPreviewCard key={i} pattern={p} idx={i} />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                          <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <Layers size={20} className="text-slate-400" />
                          </div>
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No Pattern Master</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Create a pattern master for this line</p>
                          <button
                            onClick={() => openPatModal()}
                            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 mx-auto hover:from-indigo-700 hover:to-indigo-600 transition-all"
                          >
                            <Plus size={14} />
                            Create Pattern Master
                          </button>
                        </div>
                      )}
                    </div>
                  ) : tab === 'sewing' ? (
                    // Sewing Master Tab
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold">Sewing Configuration</h3>
                        <button
                          onClick={saveSewingConfig}
                          disabled={savingSewing}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:from-emerald-700 hover:to-emerald-600"
                        >
                          {savingSewing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                        </button>
                      </div>

                      {loadingSewing ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="animate-spin text-cyan-600" size={24} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          {/* Sewing Starts */}
                          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-sm">Sewing Starts</h4>
                              <button
                                onClick={addStart}
                                className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-200"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <div className="space-y-3">
                              {sewingConfig.starts.map((start, idx) => (
                                <div key={idx} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <input
                                      type="text"
                                      className="flex-1 px-2 py-1 text-sm border rounded-lg dark:bg-slate-700"
                                      value={start.name}
                                      onChange={(e) => updateStart(idx, 'name', e.target.value)}
                                      placeholder={`Start ${idx+1}`}
                                    />
                                    <button onClick={() => removeStart(idx)} className="text-rose-500 hover:text-rose-600">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1">Pattern Indices (comma separated)</label>
                                    <input
                                      type="text"
                                      className="w-full px-2 py-1 text-sm border rounded-lg dark:bg-slate-700"
                                      value={start.patterns?.join(',') || ''}
                                      onChange={(e) => updateStart(idx, 'patterns', e.target.value.split(',').map(Number).filter(n => !isNaN(n)))}
                                      placeholder="e.g. 0,1"
                                    />
                                  </div>
                                </div>
                              ))}
                              {sewingConfig.starts.length === 0 && (
                                <p className="text-center text-xs text-slate-500 py-3">No sewing starts configured.</p>
                              )}
                            </div>
                          </div>

                          {/* Sewing Finishes */}
                          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-sm">Sewing Finishes</h4>
                              <button
                                onClick={addFinish}
                                className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-200"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <div className="space-y-3">
                              {sewingConfig.finishes.map((finish, idx) => (
                                <div key={idx} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <input
                                      type="text"
                                      className="flex-1 px-2 py-1 text-sm border rounded-lg dark:bg-slate-700"
                                      value={finish.name}
                                      onChange={(e) => updateFinish(idx, 'name', e.target.value)}
                                      placeholder={`Finish ${idx+1}`}
                                    />
                                    <button onClick={() => removeFinish(idx)} className="text-rose-500 hover:text-rose-600">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1">Input Start Indices (comma separated)</label>
                                    <input
                                      type="text"
                                      className="w-full px-2 py-1 text-sm border rounded-lg dark:bg-slate-700"
                                      value={finish.inputStarts?.join(',') || ''}
                                      onChange={(e) => updateFinish(idx, 'inputStarts', e.target.value.split(',').map(Number).filter(n => !isNaN(n)))}
                                      placeholder="e.g. 1,2"
                                    />
                                  </div>
                                </div>
                              ))}
                              {sewingConfig.finishes.length === 0 && (
                                <p className="text-center text-xs text-slate-500 py-3">No sewing finishes configured.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // ========== PACKING MASTER TAB ==========
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold">Packing Configuration</h3>
                        <button
                          onClick={savePackingConfig}
                          disabled={savingPacking}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:from-emerald-700 hover:to-emerald-600"
                        >
                          {savingPacking ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                        </button>
                      </div>

                      {loadingPacking ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="animate-spin text-cyan-600" size={24} />
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Pack Size (sets per box)
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/30 transition-all"
                              value={packSize}
                              onChange={(e) => setPackSize(parseInt(e.target.value) || 50)}
                            />
                            <p className="text-xs text-slate-500 mt-2">Number of sets per box for this line.</p>
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                      {create ? <Plus size={22} className="text-white" /> : <Edit size={22} className="text-white" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {create ? 'Create New Production Line' : `Edit Line: ${sel?.code}`}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {create ? 'Configure a new line' : 'Modify line configuration'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:border-cyan-300 dark:hover:border-cyan-700 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveLine}
                      disabled={saving}
                      className="group px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-50 text-sm"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Save size={16} />
                          {create ? 'Create Line' : 'Save Changes'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Basic Information */}
                <div className="bg-gradient-to-r from-cyan-50 to-white dark:from-cyan-900/10 dark:to-slate-800/30 rounded-xl border border-cyan-100 dark:border-cyan-800/30 p-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Tag className="text-cyan-600" size={16} />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Line Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/30 transition-all"
                        value={fd.code || ''}
                        onChange={e => setFd({ ...fd, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., K1YH"
                        disabled={!create}
                      />
                      <p className="text-xs text-slate-500 mt-1">Unique identifier</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Line Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/30 transition-all"
                        value={fd.name || ''}
                        onChange={e => setFd({ ...fd, name: e.target.value })}
                        placeholder="e.g., Line K1YH - Cover Sewing"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Pattern Multiplier</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/30 transition-all"
                        value={fd.patternMultiplier || 1}
                        onChange={e => setFd({ ...fd, patternMultiplier: parseInt(e.target.value) || 1 })}
                      />
                      <p className="text-xs text-slate-500 mt-1">Number of patterns per set</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                      <textarea
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/30 transition-all"
                        value={fd.description || ''}
                        onChange={e => setFd({ ...fd, description: e.target.value })}
                        rows={2}
                        placeholder="Describe this line..."
                      />
                    </div>
                  </div>
                </div>

                {/* Station Configuration */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Station Configuration</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Enable or disable stations</p>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {availStations.map(st => {
                        const en = fd.stations?.some(s => s.code === st.code && s.required);
                        return (
                          <div
                            key={st.code}
                            className={`group p-3 rounded-xl border-2 transition-all cursor-pointer ${en
                                ? 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-white dark:from-cyan-900/20 dark:to-slate-800 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            onClick={() => toggleStation(st.code)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`p-1.5 rounded-lg ${en ? 'bg-cyan-100 dark:bg-cyan-900/40' : 'bg-slate-100 dark:bg-slate-800'
                                    }`}>
                                    {st.deviceType === 'SPARSHA' && <Cpu size={12} className={en ? 'text-cyan-600' : 'text-slate-400'} />}
                                    {st.deviceType === 'DRISTI' && <Eye size={12} className={en ? 'text-cyan-600' : 'text-slate-400'} />}
                                    {st.deviceType === 'MANUAL' && <User size={12} className={en ? 'text-cyan-600' : 'text-slate-400'} />}
                                  </div>
                                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${st.deviceType === 'SPARSHA'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                      : st.deviceType === 'DRISTI'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                    {st.deviceType}
                                  </span>
                                </div>
                                <div className="font-bold text-xs text-slate-900 dark:text-white">{st.name}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                  Code: <span className="font-mono">{st.code}</span>
                                </div>
                              </div>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${en
                                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-white shadow-sm'
                                  : 'bg-slate-200 dark:bg-slate-700'
                                }`}>
                                {en ? <CheckCircle size={12} /> : <XCircle size={12} className="text-slate-400" />}
                              </div>
                            </div>
                            {edit && (
                              <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
                                <span className="text-[10px] text-slate-500">{en ? 'Click to disable' : 'Click to enable'}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // No Line Selected
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-md">
                  <Factory size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Line Selected</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 max-w-sm mx-auto">
                  Select a line from the list, or create a new one to get started.
                </p>
                <button
                  onClick={newLine}
                  className="group px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-bold flex items-center gap-2 mx-auto hover:from-blue-700 hover:to-blue-600 transition-all text-sm"
                >
                  <Plus size={16} />
                  Create New Line
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pattern Modal */}
      {patModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  {patEdit ? <Edit size={20} className="text-white" /> : <Plus size={20} className="text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {patEdit ? 'Edit Pattern' : 'New Pattern'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {patEdit ? 'Update pattern details' : 'Create new pattern configuration'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPatModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={savePat} className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
              {/* Style Code */}
              <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/10 dark:to-slate-800/30 rounded-xl border border-indigo-100 dark:border-indigo-800/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                    <Hash size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Style Code</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Style code for pattern configuration</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Style Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all font-mono text-base tracking-wider"
                    placeholder="e.g. K1YH"
                    value={patFd.styleCode}
                    onChange={e => setPatFd({ ...patFd, styleCode: e.target.value.toUpperCase() })}
                    disabled={patEdit}
                  />
                  <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Line Association:</span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {sel?.code} - {sel?.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Set Images */}
              <div className="bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-800/30 rounded-xl border border-amber-100 dark:border-amber-800/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                    <ImageIcon size={16} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Set Images (Optional)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload custom images for QC station (leave empty for auto-generated)
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Set Good Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                      onChange={e => setUpFiles(p => ({ ...p, setGood: e.target.files?.[0] }))}
                    />
                    {patFd.imgSetGood && !upFiles.setGood && (
                      <p className="mt-1 text-xs text-slate-500">Current: {patFd.imgSetGood}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Set NG Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                      onChange={e => setUpFiles(p => ({ ...p, setNg: e.target.files?.[0] }))}
                    />
                    {patFd.imgSetNg && !upFiles.setNg && (
                      <p className="mt-1 text-xs text-slate-500">Current: {patFd.imgSetNg}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* File Naming Convention */}
              <div className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-800/30 rounded-xl border border-blue-100 dark:border-blue-800/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <Info size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">File Naming Convention</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Auto-generated if no file uploaded</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800/30">
                    <div className="flex items-center gap-1 mb-1">
                      <FolderOpen size={12} className="text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">QC Station</span>
                    </div>
                    <div className="space-y-0.5 font-mono text-xs">
                      <div className="text-emerald-600">{previewStyle().toLowerCase()}_good.png</div>
                      <div className="text-rose-600">{previewStyle().toLowerCase()}_ng.png</div>
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800/30">
                    <div className="flex items-center gap-1 mb-1">
                      <FolderTree size={12} className="text-blue-600" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-400">CP Station</span>
                    </div>
                    <div className="font-mono text-xs text-blue-600">
                      {previewStyle().toLowerCase()}_[1-{patFd.patterns?.length || 1}]_*.png
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{patFd.patterns?.length || 0} pattern files</p>
                  </div>
                </div>
              </div>

              {/* Pattern Parts */}
              <div className="bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-800/30 rounded-xl border border-emerald-100 dark:border-emerald-800/30 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                      <Layers size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Pattern Parts</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Define parts for Check Panel inspection</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addPat}
                    className="group px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:from-emerald-700 hover:to-emerald-600 transition-all"
                  >
                    <Plus size={14} />
                    Add Part
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {(patFd.patterns || []).map((p, i) => (
                    <div
                      key={i}
                      className="group p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">{i + 1}</span>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Pattern Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all"
                              placeholder={`e.g. Part ${i + 1}`}
                              value={p.name}
                              onChange={e => handlePatName(i, e.target.value)}
                              autoFocus={i === (patFd.patterns?.length || 0) - 1}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Good Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all"
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
                                <p className="mt-1 text-xs text-slate-500">Current: {p.imgGood}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">NG Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                className="w-full px-3 py-2 text-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30 transition-all"
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
                                <p className="mt-1 text-xs text-slate-500">Current: {p.imgNg}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {(patFd.patterns?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => removePat(i)}
                            className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors flex-shrink-0"
                            title="Remove Pattern"
                          >
                            <MinusCircle size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      Total Patterns: <span className="font-bold">{patFd.patterns?.length || 0}</span>
                    </span>
                    <span className="text-slate-500 text-[10px]">Minimum 1 required</span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setPatModal(false)}
                  className="flex-1 py-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:border-slate-300 dark:hover:border-slate-600 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={patSaving}
                  className="group flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md hover:shadow-lg text-sm"
                >
                  {patSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{patEdit ? 'Update Pattern' : 'Create Pattern'}</span>
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