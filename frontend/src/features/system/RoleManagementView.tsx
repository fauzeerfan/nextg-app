import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Check, Lock, Edit3, Plus, X, Loader2, Save, Trash2 } from 'lucide-react';
import type { RoleData } from '../../types/production';

const API_BASE_URL = 'http://localhost:3000';

const AVAILABLE_FEATURES = [
  { id: 'dashboard', label: 'Dashboard', group: 'OVERVIEW' },
  { id: 'CUTTING', label: 'Cutting Station', group: 'PRODUCTION' },
  { id: 'CP', label: 'Check Panel', group: 'PRODUCTION' },
  { id: 'SEWING', label: 'Sewing Line', group: 'PRODUCTION' },
  { id: 'QC', label: 'Quality Control', group: 'PRODUCTION' },
  { id: 'PACKING', label: 'Packing', group: 'PRODUCTION' },
  { id: 'FG', label: 'Finished Goods', group: 'PRODUCTION' },
  { id: 'MR', label: 'Material Request', group: 'SUPPORTING' },
  { id: 'OPREQ', label: 'OP Pergantian', group: 'SUPPORTING' },
  { id: 'USER_MGMT', label: 'User Management', group: 'SYSTEM' },
  { id: 'ROLE_MGMT', label: 'Role Management', group: 'SYSTEM' },
];

export const RoleManagementView = () => {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/roles`);
      const data = await response.json();
      
      const formattedData: RoleData[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || 'No description.',
        userCount: r._count?.users || 0,
        permissions: r.permissions || [] 
      }));
      setRoles(formattedData);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const openModal = (role?: RoleData) => {
    if (role) {
      setIsEditMode(true);
      setFormData({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.name === 'SUPER_ADMIN' 
          ? AVAILABLE_FEATURES.map(f => f.id) 
          : role.permissions
      });
    } else {
      setIsEditMode(false);
      setFormData({ id: '', name: '', description: '', permissions: [] });
    }
    setIsModalOpen(true);
  };

  const togglePermission = (featureId: string) => {
    if (formData.name === 'SUPER_ADMIN') return;

    setFormData(prev => {
      const exists = prev.permissions.includes(featureId);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== featureId) };
      } else {
        return { ...prev, permissions: [...prev.permissions, featureId] };
      }
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSaving(true);
    try {
      const url = isEditMode ? `${API_BASE_URL}/roles/${formData.id}` : `${API_BASE_URL}/roles`;
      const method = isEditMode ? 'PATCH' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      await fetchRoles();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving role:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- DELETE ROLE HANDLER ---
  const handleDeleteRole = async (id: string, name: string) => {
    if (name === 'SUPER_ADMIN') {
        alert("Cannot delete Super Admin role!");
        return;
    }
    if (window.confirm(`Are you sure you want to delete role: ${name}?`)) {
        try {
            await fetch(`${API_BASE_URL}/roles/${id}`, { method: 'DELETE' });
            await fetchRoles();
        } catch (error) {
            console.error("Error deleting role:", error);
            alert("Failed to delete role.");
        }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <button 
          onClick={() => openModal()}
          className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group h-full min-h-[250px]"
        >
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
            <Plus className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" size={24}/>
          </div>
          <h3 className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Create New Role</h3>
        </button>

        {isLoading ? (
           <div className="col-span-2 flex items-center justify-center text-slate-400">
             <Loader2 className="animate-spin mr-2"/> Loading Roles...
           </div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col relative overflow-hidden group">
              <div className={`absolute top-0 right-0 p-3 rounded-bl-xl ${role.name === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                {role.name === 'SUPER_ADMIN' ? <Lock size={16}/> : <ShieldCheck size={16}/>}
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-black dark:text-white">{role.name.replace('_', ' ')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed h-10 line-clamp-2">
                  {role.description}
                </p>
              </div>

              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Accessible Features</div>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.slice(0, 5).map((perm, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-300">
                      <Check size={10} className="text-emerald-500"/> {perm}
                    </span>
                  ))}
                  {role.permissions.length > 5 && (
                    <span className="text-xs text-slate-400 py-1">+{role.permissions.length - 5} more</span>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <Users size={14} /> {role.userCount} Users
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => openModal(role)}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                        <Edit3 size={14}/> Edit
                    </button>
                    {/* BUTTON DELETE ROLE */}
                    {role.name !== 'SUPER_ADMIN' && (
                        <button 
                            onClick={() => handleDeleteRole(role.id, role.name)}
                            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-bold hover:underline"
                        >
                            <Trash2 size={14}/> Delete
                        </button>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-black dark:text-white">
                {isEditMode ? 'Configure Role' : 'Create New Role'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-black dark:hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. PACKING_LEADER" 
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                    disabled={formData.name === 'SUPER_ADMIN'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Feature Access Control</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['OVERVIEW', 'PRODUCTION', 'SUPPORTING', 'SYSTEM'].map(group => (
                    <div key={group} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-slate-400 mb-3">{group}</h4>
                      <div className="space-y-2">
                        {AVAILABLE_FEATURES.filter(f => f.group === group).map(feature => (
                          <label key={feature.id} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              formData.permissions.includes(feature.id) 
                                ? 'bg-blue-600 border-blue-600 text-white' 
                                : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                            }`}>
                              {formData.permissions.includes(feature.id) && <Check size={14} />}
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={formData.permissions.includes(feature.id)}
                              onChange={() => togglePermission(feature.id)}
                              disabled={formData.name === 'SUPER_ADMIN'}
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">{feature.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={handleSaveRole} disabled={isSaving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};