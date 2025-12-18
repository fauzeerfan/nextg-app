import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Save, X, Loader2, MinusCircle, Image as ImageIcon, AlertCircle, Database } from 'lucide-react';
import type { PatternMaster, PatternPart } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

export const PatternMasterView = ({ addLog }: { addLog?: any }) => {
  const [data, setData] = useState<PatternMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    styleCode: '',
    patterns: [{ name: '', imgGood: '', imgNg: '' }] as PatternPart[],
    imgSetGood: '',
    imgSetNg: ''
  });

  // --- FETCH DATA ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pattern-masters`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- FORM HANDLERS ---
  const openModal = (item?: PatternMaster) => {
    setIsEditMode(!!item);
    if (item) {
        setFormData({ ...item, imgSetGood: item.imgSetGood || '', imgSetNg: item.imgSetNg || '' });
    } else {
        setFormData({ id: '', styleCode: '', patterns: [{ name: '', imgGood: '', imgNg: '' }], imgSetGood: '', imgSetNg: '' });
    }
    setIsModalOpen(true);
  };

  const handlePatternNameChange = (idx: number, val: string) => {
      const newPatterns = [...formData.patterns];
      newPatterns[idx] = { ...newPatterns[idx], name: val };
      setFormData({ ...formData, patterns: newPatterns });
  };

  const addPatternField = () => {
      setFormData({ ...formData, patterns: [...formData.patterns, { name: '', imgGood: '', imgNg: '' }] });
  };

  const removePatternField = (idx: number) => {
      const newPatterns = formData.patterns.filter((_, i) => i !== idx);
      setFormData({ ...formData, patterns: newPatterns });
  };

  // --- SAVE LOGIC ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanStyleCode = formData.styleCode.trim().toUpperCase();
    const validPatterns = formData.patterns.filter(p => p.name.trim() !== '');

    if (!cleanStyleCode || validPatterns.length === 0) {
        alert("Style Code and at least 1 Pattern Name are required.");
        return;
    }

    // AUTO-GENERATE FILENAMES
    // 1. Pattern Parts
    const patternsWithImages: PatternPart[] = validPatterns.map((p, idx) => ({
        name: p.name,
        imgGood: `${cleanStyleCode.toLowerCase()}_${idx + 1}_good.png`,
        imgNg: `${cleanStyleCode.toLowerCase()}_${idx + 1}_ng.png`
    }));

    // 2. Set Images
    const imgSetGood = `${cleanStyleCode.toLowerCase()}_good.png`;
    const imgSetNg = `${cleanStyleCode.toLowerCase()}_ng.png`;

    setIsSaving(true);
    try {
        const url = isEditMode ? `${API_BASE_URL}/pattern-masters/${formData.id}` : `${API_BASE_URL}/pattern-masters`;
        const method = isEditMode ? 'PATCH' : 'POST';
        
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                styleCode: cleanStyleCode,
                patterns: patternsWithImages,
                imgSetGood,
                imgSetNg
            })
        });

        if (res.ok) {
            if(addLog) addLog(`Pattern Master ${isEditMode ? 'Updated' : 'Created'}: ${cleanStyleCode}`, 'success');
            fetchData();
            setIsModalOpen(false);
        } else {
            alert("Failed to save. Style code might be duplicate.");
        }
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Delete this Style Pattern Config?")) return;
      try {
          await fetch(`${API_BASE_URL}/pattern-masters/${id}`, { method: 'DELETE' });
          fetchData();
      } catch(e) {}
  };

  const filteredData = data.filter(d => d.styleCode.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
       
       {/* HEADER ACTIONS */}
       <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Search Style Code (e.g. K1YH)..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <button 
            onClick={() => openModal()} 
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm active:scale-95 transition-colors"
          >
            <Plus size={18} /> Add Style Pattern
          </button>
       </div>

       {/* DATA TABLE */}
       <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Loader2 className="animate-spin mb-2" size={32}/><p>Loading...</p></div>
          ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="px-6 py-4">Style Code</th>
                            <th className="px-6 py-4">Set Images (QC)</th>
                            <th className="px-6 py-4">Pattern Parts (CP)</th>
                            <th className="px-6 py-4 text-right">Total Patterns</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-slate-400 italic">
                                    <Database size={32} className="mx-auto mb-2 opacity-20"/>
                                    No pattern configurations found.
                                </td>
                            </tr>
                        )}
                        {filteredData.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="px-6 py-4 font-bold font-mono text-blue-600 text-lg align-top">{item.styleCode}</td>
                                <td className="px-6 py-4 align-top">
                                    <div className="flex flex-col gap-1 text-xs font-mono text-slate-500">
                                        <span className="flex items-center gap-1 text-emerald-600"><ImageIcon size={12}/> {item.imgSetGood || '-'}</span>
                                        <span className="flex items-center gap-1 text-rose-600"><ImageIcon size={12}/> {item.imgSetNg || '-'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        {item.patterns.map((p, i) => (
                                            <div key={i} className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-1 min-w-[120px]">
                                                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{p.name}</span>
                                                <div className="flex gap-2 text-[10px] text-slate-400 font-mono">
                                                    <span title={p.imgGood} className="text-emerald-500 flex items-center gap-0.5 truncate max-w-[80px]"><ImageIcon size={10}/> OK</span>
                                                    <span title={p.imgNg} className="text-rose-500 flex items-center gap-0.5 truncate max-w-[80px]"><ImageIcon size={10}/> NG</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold align-top">{item.patterns.length}</td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2 align-top">
                                    <button onClick={() => openModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit">
                                        <Edit3 size={16}/>
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Delete">
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          )}
       </div>

       {/* MODAL */}
       {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-black dark:text-white">{isEditMode ? 'Edit Pattern Config' : 'New Pattern Config'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-black dark:hover:text-white transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Style Code</label>
                  <input 
                    required 
                    type="text" 
                    className="input-std uppercase font-mono text-lg tracking-wider" 
                    placeholder="e.g. K1YH" 
                    value={formData.styleCode} 
                    onChange={e => setFormData({...formData, styleCode: e.target.value.toUpperCase()})} 
                    disabled={isEditMode} 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Must match the Style Code in OP (first 4 chars of ProdNo)</p>
               </div>

               {/* Filename Convention Info */}
               <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3 items-start">
                   <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18}/>
                   <div>
                       <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400">Auto-Generated Filenames</h4>
                       <div className="text-xs text-blue-600/80 dark:text-blue-300/80 mt-1 leading-relaxed">
                           <p className="mb-2">Please ensure files exist in <code>public/patterns/</code> with these names:</p>
                           <ul className="list-disc pl-4 space-y-1 font-mono text-[10px]">
                               <li><b>Set Images (QC):</b> <br/>
                                   {formData.styleCode ? formData.styleCode.toLowerCase() : 'style'}_good.png, <br/>
                                   {formData.styleCode ? formData.styleCode.toLowerCase() : 'style'}_ng.png
                               </li>
                               <li><b>Pattern Parts (CP):</b> <br/>
                                   {formData.styleCode ? formData.styleCode.toLowerCase() : 'style'}_1_good.png, etc.
                               </li>
                           </ul>
                       </div>
                   </div>
               </div>

               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex justify-between items-center">
                      <span>Pattern Parts List (Checkpanel)</span>
                      <button type="button" onClick={addPatternField} className="text-blue-600 flex items-center gap-1 hover:underline font-bold text-xs transition-colors">
                          <Plus size={14}/> Add Part
                      </button>
                  </label>
                  
                  <div className="space-y-3">
                      {formData.patterns.map((pat, idx) => (
                          <div key={idx} className="flex gap-3 items-center animate-in slide-in-from-left-2 fade-in duration-300">
                              <div className="w-8 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-sm rounded-lg border border-slate-200 dark:border-slate-700">
                                  {idx + 1}
                              </div>
                              
                              <div className="flex-1">
                                  <input 
                                    type="text" 
                                    className="input-std" 
                                    placeholder={`Pattern Name (e.g. ${idx===0 ? 'Sandaran' : idx===1 ? 'Dudukan' : 'Part Name' })`}
                                    value={pat.name}
                                    onChange={e => handlePatternNameChange(idx, e.target.value)}
                                    autoFocus={idx === formData.patterns.length - 1} 
                                  />
                              </div>
                              
                              {/* Preview Filename Hint */}
                              <div className="hidden md:block text-[10px] font-mono text-slate-400 w-40 truncate text-right opacity-70">
                                  {formData.styleCode ? `${formData.styleCode.toLowerCase()}_${idx+1}_*.png` : '...'}
                              </div>
                              
                              <button 
                                type="button" 
                                onClick={() => removePatternField(idx)} 
                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                title="Remove Part"
                              >
                                  <MinusCircle size={18}/>
                              </button>
                          </div>
                      ))}
                  </div>
               </div>

               <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving} 
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-70 transition-all"
                  >
                      {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} 
                      {isEditMode ? 'Update Config' : 'Save Config'}
                  </button>
               </div>
            </form>
          </div>
        </div>
       )}
       
       <style>{`
        .input-std { @apply w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all; }
       `}</style>
    </div>
  );
};