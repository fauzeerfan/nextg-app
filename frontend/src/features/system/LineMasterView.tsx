import React, { useState, useEffect } from 'react';
import {
  Factory, Layers, Plus, Edit, Trash2, Save, ArrowLeft,
  CheckCircle, XCircle, Search, Users, Package, ChevronRight,
  ImageIcon, RefreshCw, Loader2, Cpu, Server, Network, Hash,
  Tag, User, Grid, TrendingUp, Eye, FileImage, X, Info, 
  Activity, Zap, Target, Settings, Cpu as CpuIcon
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
  // Mapping original gradient colors to the solid solid UI theme colors
  const colorStyles = {
    cyan: { border: 'border-blue-500', bg: 'bg-blue-100', icon: 'text-blue-600', darkBg: 'dark:bg-blue-900/40', darkIcon: 'dark:text-blue-400' },
    indigo: { border: 'border-purple-500', bg: 'bg-purple-100', icon: 'text-purple-600', darkBg: 'dark:bg-purple-900/40', darkIcon: 'dark:text-purple-400' },
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-100', icon: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/40', darkIcon: 'dark:text-emerald-400' },
    purple: { border: 'border-amber-500', bg: 'bg-amber-100', icon: 'text-amber-600', darkBg: 'dark:bg-amber-900/40', darkIcon: 'dark:text-amber-400' }
  }[color];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${colorStyles.border} border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
        <div className={`w-9 h-9 ${colorStyles.bg} ${colorStyles.darkBg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={`${colorStyles.icon} ${colorStyles.darkIcon}`} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none flex items-baseline gap-1.5">
        {value}
        {suffix && <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{suffix}</span>}
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 flex flex-col gap-1.5">
          {subtitle && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">{subtitle}</div>}
          {trend && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 w-fit px-2 py-0.5 rounded-md">
              <TrendingUp size={10} />
              <span>{trend}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PatternPreviewCard = ({ pattern, idx }: { pattern: PatternPart; idx: number }) => {
  const [goodErr, setGoodErr] = useState(false);
  const [ngErr, setNgErr] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-500 group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-xs">
          {idx + 1}
        </div>
        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{pattern.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100 dark:border-slate-700 group/img">
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
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm z-10">
            GOOD
          </div>
        </div>
        <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100 dark:border-slate-700 group/img">
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
          <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm z-10">
            NG
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 space-y-6 font-poppins text-slate-800 dark:text-slate-100">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      {/* HEADER - Solid Theme */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                  <Factory size={24} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md">
                  <Server size={10} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Line Master
                  <span className="text-[11px] px-2 py-1 bg-blue-600 text-white rounded-md font-bold tracking-wider uppercase">
                    PRODUCTION CORE
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Manage and configure your assembly lines</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-none">
                <div className="flex flex-col">
                  <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Total Lines</div>
                  <div className="text-xl font-black leading-none">{ls.length}</div>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Network size={18} className="text-blue-400" />
                </div>
              </div>
              <button
                onClick={fetchLs}
                disabled={load}
                className="group px-4 py-2 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 hover:border-blue-600 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm active:scale-95"
              >
                {load ? <RefreshCw size={16} className="animate-spin text-blue-600" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 py-5 bg-slate-50/50 dark:bg-slate-800/50">
          <MetricCard title="Total Lines" value={ls.length} icon={Factory} color="cyan" suffix="lines" subtitle={`${flt.length} active`} />
          <MetricCard title="Total Patterns" value={totalPats} icon={Layers} color="indigo" suffix="patterns" trend="+8.2% from last month" />
          <MetricCard title="Pattern Styles" value={totalStyles} icon={Tag} color="emerald" suffix="styles" subtitle={`Across ${ls.length} lines`} />
          <MetricCard title="Active Stations" value={sel?.stations?.filter(s => s.required).length || 0} icon={Cpu} color="purple" suffix="stations" subtitle={`Out of ${availStations.length} total`} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Column - Line List (TABLE VIEW) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden sticky top-6 h-[calc(100vh-140px)] flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/30">
                     <Network size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">Production Lines</h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{load ? 'Loading...' : `${flt.length} configured`}</p>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search lines..."
                  className="w-full pl-9 pr-4 py-2 text-sm font-semibold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:border-blue-500 focus:ring-0 transition-all outline-none"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Table View */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Line</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Multiplier</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Users</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Stations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {flt.map(l => {
                      const isSel = sel?.id === l.id;
                      return (
                        <tr
                          key={l.id}
                          className={`cursor-pointer transition-colors ${
                            isSel
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-600'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                          onClick={() => selectLine(l)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                isSel ? 'bg-blue-600 shadow-md shadow-blue-600/30' : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50'
                              }`}>
                                <Factory size={14} className={isSel ? 'text-white' : 'text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-slate-900 dark:text-white truncate leading-tight">{l.code}</div>
                                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{l.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                              {l.patternMultiplier}x
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Users size={12} className="text-slate-400" />
                              <span className="text-[11px] font-bold">{l.userCount || 0}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <CpuIcon size={12} className="text-slate-400" />
                              <span className="text-[11px] font-bold">{l.stations?.filter(s => s.required).length}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {!flt.length && !load && (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 m-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100 dark:border-slate-700">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No Lines Found</h4>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-5">
                    {search ? `No matches for "${search}"` : "Your directory is empty."}
                  </p>
                  {!search && (
                    <button
                      onClick={newLine}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 mx-auto hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
                    >
                      <Plus size={14} /> Add Line
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={newLine}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-95"
                >
                  <Plus size={16} />
                  New Line
                </button>
                {onNavigate && (
                  <button
                    onClick={back}
                    className="px-4 py-2.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:border-blue-600 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
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
        <div className="lg:col-span-3">
          {sel && !edit ? (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-140px)]">
                {/* Solid Tabs */}
                <div className="flex p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto hide-scrollbar gap-2">
                  {[
                    { id: 'details', label: 'Line Details', icon: Settings },
                    { id: 'patterns', label: 'Pattern Master', icon: Layers },
                    { id: 'sewing', label: 'Sewing Master', icon: CpuIcon },
                    { id: 'packing', label: 'Packing Master', icon: Package }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id as any)}
                      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all rounded-xl whitespace-nowrap ${tab === t.id
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400 shadow-sm'
                        }`}
                    >
                      <t.icon size={16} className={tab === t.id ? 'text-white' : 'text-slate-400'} />
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 flex-1 bg-white dark:bg-slate-800">
                  {tab === 'details' ? (
                    <div className="space-y-6">
                      {/* Header Actions */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Line Identity</div>
                          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            {sel.code} <span className="text-slate-300 dark:text-slate-600">|</span> {sel.name}
                          </h2>
                          {sel.description && (
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900 inline-block px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">{sel.description}</p>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={editLine}
                            className="px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md hover:bg-slate-800 dark:hover:bg-slate-600 active:scale-95"
                          >
                            <Edit size={16} />
                            Edit Line
                          </button>
                          <button
                            onClick={delLine}
                            disabled={deleting}
                            className="px-4 py-2.5 bg-white dark:bg-slate-800 text-rose-600 border-2 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                          >
                            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-blue-500 border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Users</div>
                            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                              <Users size={18} className="text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                            {sel.userCount || 0}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                            <CheckCircle size={12} className="text-emerald-500"/> Active operators
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-emerald-500 border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Orders</div>
                            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
                              <Package size={18} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                            {sel?.productionOrders?.filter(po => ['WIP', 'SCHEDULED'].includes(po.status)).length || 0}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                            <Activity size={12} className="text-emerald-500"/> In production
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-purple-500 border-y border-r border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pattern Multiplier</div>
                            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
                              <Layers size={18} className="text-purple-600 dark:text-purple-400" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                            {sel?.patternMultiplier || 1}<span className="text-sm text-slate-400 ml-1">x</span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                            <Zap size={12} className="text-purple-500"/> Parts per set
                          </div>
                        </div>
                      </div>

                      {/* Station Configuration */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                        <div className="mb-4">
                          <h3 className="font-black text-base text-slate-900 dark:text-white">Active Station Flow</h3>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Configured stations mapping for this line</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {availStations.map(st => {
                            const en = sel.stations?.some(s => s.code === st.code && s.required);
                            return (
                              <div
                                key={st.code}
                                className={`p-4 rounded-2xl border-2 transition-all duration-300 ${en
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
                                  }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${en ? 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                        {st.deviceType === 'SPARSHA' && <Cpu size={14} />}
                                        {st.deviceType === 'DRISTI' && <Eye size={14} />}
                                        {st.deviceType === 'MANUAL' && <User size={14} />}
                                      </div>
                                      <span className={`px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md border ${st.deviceType === 'SPARSHA'
                                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                          : st.deviceType === 'DRISTI'
                                            ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                                        }`}>
                                        {st.deviceType}
                                      </span>
                                    </div>
                                    <div className="font-black text-sm text-slate-900 dark:text-white mt-1.5">{st.name}</div>
                                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">
                                      Code: {st.code}
                                    </div>
                                  </div>
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${en
                                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
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
                  ) : tab === 'patterns' ? (
                    // Pattern Master Tab
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Configuration</div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white">Pattern Library</h3>
                        </div>
                        <button
                          onClick={() => openPatModal()}
                          className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
                        >
                          <Plus size={16} />
                          New Pattern
                        </button>
                      </div>

                      {patLoad ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700 border-dashed">
                          <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Loading pattern masters...</p>
                        </div>
                      ) : selPat ? (
                        <div className="space-y-6">
                          {/* Pattern Summary Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                              <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                                <Tag size={24} className="text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Style Code</p>
                                <p className="font-black text-xl text-slate-900 dark:text-white leading-none mt-1">{selPat.styleCode}</p>
                              </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                                <Grid size={24} className="text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Parts</p>
                                <p className="font-black text-xl text-slate-900 dark:text-white leading-none mt-1">
                                  {selPat?.patterns?.length || 0} <span className="text-sm font-semibold text-slate-400">parts</span>
                                </p>
                              </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                              <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl">
                                <FileImage size={24} className="text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Set Images</p>
                                <p className="font-black text-xl text-slate-900 dark:text-white leading-none mt-1">
                                  2 <span className="text-sm font-semibold text-slate-400">images</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Pattern Parts */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-5">
                              <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white">Pattern Components</h4>
                                <p className="text-xs font-semibold text-slate-500 mt-1">Detailed visual reference for quality checking</p>
                              </div>
                              <button
                                onClick={() => openPatModal(selPat)}
                                className="px-4 py-2 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-emerald-600 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
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
                        <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Layers size={28} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">No Pattern Configured</h4>
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">This line doesn't have a pattern configuration yet. Create one to enable CP and QC stations.</p>
                          <button
                            onClick={() => openPatModal()}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 mx-auto transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
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
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Routing Configuration</div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white">Sewing Flow Logic</h3>
                        </div>
                        <button
                          onClick={saveSewingConfig}
                          disabled={savingSewing}
                          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
                        >
                          {savingSewing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                        </button>
                      </div>

                      {loadingSewing ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="animate-spin text-purple-500" size={32} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          {/* Sewing Starts */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-bold">
                                  <CpuIcon size={16} />
                                </div>
                                <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wide">Input Terminals</h4>
                              </div>
                              <button
                                onClick={addStart}
                                className="px-3 py-1.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-blue-500 text-slate-700 dark:text-slate-300 hover:text-blue-600 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <Plus size={14} /> Add
                              </button>
                            </div>
                            <div className="p-4 space-y-4">
                              {sewingConfig.starts.map((start, idx) => (
                                <div key={idx} className="p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm relative group/item">
                                  <button onClick={() => removeStart(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity border-2 border-rose-200 hover:bg-rose-500 hover:text-white shadow-sm z-10">
                                    <X size={12} />
                                  </button>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Terminal Name</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-blue-500 focus:ring-0 transition-all outline-none"
                                        value={start.name}
                                        onChange={(e) => updateStart(idx, 'name', e.target.value)}
                                        placeholder={`Start ${idx+1}`}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assigned Patterns (IDs)</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-blue-600 dark:text-blue-400 focus:border-blue-500 focus:ring-0 transition-all outline-none"
                                        value={start.patterns?.join(', ') || ''}
                                        onChange={(e) => updateStart(idx, 'patterns', e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))}
                                        placeholder="e.g. 0, 1, 2"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {sewingConfig.starts.length === 0 && (
                                <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                  <p className="text-xs font-bold text-slate-500">No start terminals configured.</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Sewing Finishes */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center font-bold">
                                  <Target size={16} />
                                </div>
                                <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wide">Output Terminals</h4>
                              </div>
                              <button
                                onClick={addFinish}
                                className="px-3 py-1.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-purple-500 text-slate-700 dark:text-slate-300 hover:text-purple-600 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <Plus size={14} /> Add
                              </button>
                            </div>
                            <div className="p-4 space-y-4">
                              {sewingConfig.finishes.map((finish, idx) => (
                                <div key={idx} className="p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm relative group/item">
                                  <button onClick={() => removeFinish(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity border-2 border-rose-200 hover:bg-rose-500 hover:text-white shadow-sm z-10">
                                    <X size={12} />
                                  </button>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Terminal Name</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-purple-500 focus:ring-0 transition-all outline-none"
                                        value={finish.name}
                                        onChange={(e) => updateFinish(idx, 'name', e.target.value)}
                                        placeholder={`Finish ${idx+1}`}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Source Inputs (Starts IDs)</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-purple-600 dark:text-purple-400 focus:border-purple-500 focus:ring-0 transition-all outline-none"
                                        value={finish.inputStarts?.join(', ') || ''}
                                        onChange={(e) => updateFinish(idx, 'inputStarts', e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))}
                                        placeholder="e.g. 1, 2"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {sewingConfig.finishes.length === 0 && (
                                <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                  <p className="text-xs font-bold text-slate-500">No finish terminals configured.</p>
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
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Box Details</div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white">Packing Configuration</h3>
                        </div>
                        <button
                          onClick={savePackingConfig}
                          disabled={savingPacking}
                          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-600/30 active:scale-95 transition-all"
                        >
                          {savingPacking ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Settings
                        </button>
                      </div>

                      {loadingPacking ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="animate-spin text-amber-500" size={32} />
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 max-w-xl shadow-sm">
                          <div className="flex items-start gap-5">
                            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center flex-shrink-0 font-black">
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
                                    className="w-full px-4 py-3 text-lg font-black border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:ring-0 transition-all outline-none"
                                    value={packSize}
                                    onChange={(e) => setPackSize(parseInt(e.target.value) || 50)}
                                  />
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">sets</div>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mt-4 border border-amber-200 dark:border-amber-800/50">
                                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-start gap-2 leading-relaxed">
                                    <Info size={16} className="mt-0.5 flex-shrink-0" />
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[calc(100vh-140px)] flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/30">
                      {create ? <Plus size={24} className="text-white" /> : <Edit size={24} className="text-white" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                        {create ? 'New Production Line' : `Edit Configuration: ${sel?.code}`}
                      </h2>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                        {create ? 'Set up terminal properties and workflow' : 'Modify core line properties and stations'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={cancelEdit}
                      className="px-5 py-2.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:border-slate-400 transition-all text-sm shadow-sm active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveLine}
                      disabled={saving}
                      className="group px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 text-sm shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
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

              <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                {/* Basic Information */}
                <div className="space-y-5 bg-white dark:bg-slate-800">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
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
                        className="w-full px-4 py-3 text-sm font-black border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-blue-500 focus:ring-0 transition-all outline-none"
                        value={fd.code || ''}
                        onChange={e => setFd({ ...fd, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., K1YH"
                        disabled={!create}
                      />
                      <p className="text-[10px] font-semibold text-slate-400 mt-2">Unique identifier (locked after creation)</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Line Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-blue-500 focus:ring-0 transition-all outline-none"
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
                        className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-blue-500 focus:ring-0 transition-all outline-none"
                        value={fd.patternMultiplier || 1}
                        onChange={e => setFd({ ...fd, patternMultiplier: parseInt(e.target.value) || 1 })}
                      />
                      <p className="text-[10px] font-semibold text-slate-400 mt-2">Number of patterns per complete set</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Description / Notes</label>
                      <textarea
                        className="w-full px-4 py-3 text-sm font-semibold border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-blue-500 focus:ring-0 transition-all outline-none resize-none"
                        value={fd.description || ''}
                        onChange={e => setFd({ ...fd, description: e.target.value })}
                        rows={3}
                        placeholder="Add optional context about this line..."
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200 dark:border-slate-700" />

                {/* Station Configuration */}
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Network size={16} />
                      </div>
                      Station Flow Enablement
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-10 mt-1">Click to toggle the active stations that belong to this workflow.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-10">
                    {availStations.map(st => {
                      const en = fd.stations?.some(s => s.code === st.code && s.required);
                      return (
                        <div
                          key={st.code}
                          className={`group p-4 rounded-2xl border-2 transition-all cursor-pointer select-none relative ${en
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:shadow-sm'
                            }`}
                          onClick={() => toggleStation(st.code)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`p-2 rounded-xl transition-colors font-bold ${en ? 'bg-blue-200 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                  }`}>
                                  {st.deviceType === 'SPARSHA' && <Cpu size={14} />}
                                  {st.deviceType === 'DRISTI' && <Eye size={14} />}
                                  {st.deviceType === 'MANUAL' && <User size={14} />}
                                </div>
                                <span className={`px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md border ${st.deviceType === 'SPARSHA'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                    : st.deviceType === 'DRISTI'
                                      ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                                  }`}>
                                  {st.deviceType}
                                </span>
                              </div>
                              <div className="font-black text-sm text-slate-900 dark:text-white mt-2">{st.name}</div>
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                {st.code}
                              </div>
                            </div>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${en
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              }`}>
                              {en ? <CheckCircle size={14} /> : <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-500" />}
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[calc(100vh-140px)] flex items-center justify-center">
              <div className="p-12 text-center max-w-md">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Factory size={36} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">No Line Selected</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                  Select a production line from the sidebar to view its details, patterns, and configuration flow, or create a brand new one to get started.
                </p>
                <button
                  onClick={newLine}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 mx-auto transition-all shadow-lg shadow-blue-600/30 active:scale-95"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-slate-200 dark:border-slate-700">
            <div className="p-5 px-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
                  {patEdit ? <Edit size={20} className="text-white" /> : <Layers size={20} className="text-white" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {patEdit ? 'Edit Pattern Configuration' : 'New Pattern Configuration'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                    {patEdit ? 'Update parts and images' : 'Define AI vision logic models'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPatModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-400 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={savePat} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-8">
                {/* Style Code Setup */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Hash size={16} />
                    </div>
                    Identity
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-10">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Style Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 text-lg font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-purple-700 dark:text-purple-400 focus:border-purple-500 focus:ring-0 transition-all outline-none"
                        placeholder="e.g. K1YH"
                        value={patFd.styleCode}
                        onChange={e => setPatFd({ ...patFd, styleCode: e.target.value.toUpperCase() })}
                        disabled={patEdit}
                      />
                    </div>
                    <div className="flex items-center">
                      <div className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Line Association</span>
                        <span className="font-black text-base text-slate-900 dark:text-white">
                          {sel?.code} <span className="text-slate-400 font-normal">|</span> {sel?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <hr className="border-slate-200 dark:border-slate-700" />

                {/* Set Images */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <ImageIcon size={16} />
                      </div>
                      QC Set Images
                    </h4>
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Optional</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-10">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                      <label className="block text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Set Good Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm font-semibold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 dark:file:bg-emerald-500/20 dark:file:text-emerald-400 transition-colors"
                        onChange={e => setUpFiles(p => ({ ...p, setGood: e.target.files?.[0] }))}
                      />
                      {patFd.imgSetGood && !upFiles.setGood && (
                        <p className="mt-3 text-[11px] font-bold text-slate-500 flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500"/> Saved: {patFd.imgSetGood}</p>
                      )}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                      <label className="block text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2">Set NG Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm font-semibold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 dark:file:bg-rose-500/20 dark:file:text-rose-400 transition-colors"
                        onChange={e => setUpFiles(p => ({ ...p, setNg: e.target.files?.[0] }))}
                      />
                      {patFd.imgSetNg && !upFiles.setNg && (
                        <p className="mt-3 text-[11px] font-bold text-slate-500 flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500"/> Saved: {patFd.imgSetNg}</p>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200 dark:border-slate-700" />

                {/* Pattern Parts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Grid size={16} />
                        </div>
                        Pattern Components (Parts)
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 pl-10">Parts config used for Check Panel vision inspection</p>
                    </div>
                    <button
                      type="button"
                      onClick={addPat}
                      className="px-4 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <Plus size={14} /> Add Part Component
                    </button>
                  </div>

                  <div className="pl-10 space-y-4">
                    {(patFd.patterns || []).map((p, i) => (
                      <div
                        key={i}
                        className="group p-5 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm shadow-md shadow-blue-600/30">
                            {i + 1}
                          </div>
                          
                          <div className="flex-1 space-y-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Part Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-2.5 text-sm font-black border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-blue-500 focus:ring-0 transition-all outline-none"
                                placeholder={`e.g. Front Panel ${i + 1}`}
                                value={p.name}
                                onChange={e => handlePatName(i, e.target.value)}
                                autoFocus={i === (patFd.patterns?.length || 0) - 1 && i > 0}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                                <label className="block text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Good State Image</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-xs font-semibold text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 dark:file:bg-emerald-500/20 dark:file:text-emerald-400 transition-colors cursor-pointer"
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
                                  <p className="mt-2 text-[10px] font-bold text-slate-500 truncate" title={p.imgGood}>File: {p.imgGood}</p>
                                )}
                              </div>
                              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                                <label className="block text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2">NG State Image</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-xs font-semibold text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 dark:file:bg-rose-500/20 dark:file:text-rose-400 transition-colors cursor-pointer"
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
                                  <p className="mt-2 text-[10px] font-bold text-slate-500 truncate" title={p.imgNg}>File: {p.imgNg}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {(patFd.patterns?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => removePat(i)}
                              className="mt-4 sm:mt-0 sm:absolute sm:top-5 sm:right-5 p-2 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 hover:text-white hover:bg-rose-600 rounded-xl transition-colors flex-shrink-0"
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
              <div className="p-5 px-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPatModal(false)}
                  className="flex-1 py-3.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:border-slate-400 transition-all text-sm shadow-sm active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={patSaving}
                  className="group flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 text-sm uppercase tracking-wider"
                >
                  {patSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Saving Pattern...</span>
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