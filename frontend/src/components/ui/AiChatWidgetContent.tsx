// frontend/src/components/ui/AiChatWidgetContent.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Trash2, Copy, Check, Bot, BarChart3, Navigation2,
  FileText, ChevronRight, Sparkles, Search,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://202.52.15.30:4000';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  action?: any;
  options?: any[];
  timestamp: Date;
}

type CopilotTab = 'chat' | 'data' | 'navigate' | 'laporan';

// ===== NAVIGATION SHORTCUTS =====
const NAV_CATEGORIES = [
  {
    category: '📊 Produksi',
    items: [
      { label: 'Dashboard', tab: 'dashboard', emoji: '🏠' },
      { label: 'Cutting Entan', tab: 'cutting_entan', emoji: '✂️' },
      { label: 'Cutting Pond', tab: 'cutting_pond', emoji: '🌊' },
      { label: 'Check Panel', tab: 'cp', emoji: '🔍' },
      { label: 'Sewing', tab: 'sewing', emoji: '🧵' },
      { label: 'Quality Control', tab: 'qc', emoji: '✅' },
      { label: 'Packing', tab: 'packing', emoji: '📦' },
      { label: 'Finished Goods', tab: 'fg', emoji: '🏭' },
    ],
  },
  {
    category: '📋 Laporan & Analisa',
    items: [
      { label: 'Reports', tab: 'reports', emoji: '📑' },
      { label: 'Traceability', tab: 'traceability', emoji: '🔎' },
      { label: 'Target Monitoring', tab: 'target_monitoring', emoji: '🎯' },
      { label: 'Plan vs Actual', tab: 'plan_vs_actual', emoji: '📈' },
      { label: 'Demand Simulator', tab: 'demand_simulator', emoji: '📉' },
      { label: 'Capacity Dashboard', tab: 'capacity_dashboard', emoji: '⚡' },
      { label: 'Gantt Simulation', tab: 'gantt_simulation', emoji: '📊' },
    ],
  },
  {
    category: '👥 SDM & Manpower',
    items: [
      { label: 'Manpower Control', tab: 'manpower_control', emoji: '📲' },
      { label: 'Manpower Monitoring', tab: 'manpower_monitoring', emoji: '👁️' },
      { label: 'Employee Management', tab: 'employee_management', emoji: '👤' },
    ],
  },
  {
    category: '📦 Inventory',
    items: [
      { label: 'Inbound Receiving', tab: 'inbound_receiving', emoji: '📥' },
      { label: 'Inspection & Storage', tab: 'inspection_storage', emoji: '🔬' },
      { label: 'Inventory Control', tab: 'inventory_control', emoji: '🗃️' },
    ],
  },
  {
    category: '⚙️ Sistem',
    items: [
      { label: 'User Management', tab: 'user_management', emoji: '👨‍💼' },
      { label: 'Line Master', tab: 'line_master', emoji: '🏗️' },
      { label: 'Target Management', tab: 'target_management', emoji: '🎯' },
      { label: 'Device Management', tab: 'device_management', emoji: '💻' },
      { label: 'AI Management', tab: 'ai_management', emoji: '🤖' },
      { label: 'Login Monitoring', tab: 'login_monitoring', emoji: '🔐' },
      { label: 'Automation Island', tab: 'automation_island', emoji: '🏝️' },
    ],
  },
];

// ===== QUICK DATA QUERIES =====
const QUICK_QUERIES = [
  { label: 'Total NG Hari Ini', value: 'total_ng_today', icon: '⚠️', color: 'rose' },
  { label: 'Defect Rate Hari Ini', value: 'defect_rate_today', icon: '📊', color: 'orange' },
  { label: 'Output Packing', value: 'total_output_today', icon: '📦', color: 'emerald' },
  { label: 'Output Sewing', value: 'total_output_sewing_today', icon: '🧵', color: 'blue' },
  { label: 'Output Cutting Entan', value: 'total_output_cutting_entan_today', icon: '✂️', color: 'purple' },
  { label: 'Jumlah WIP', value: 'wip_ops_count', icon: '🔄', color: 'amber' },
  { label: 'WIP per Stasiun', value: 'wip_by_station', icon: '📍', color: 'sky' },
  { label: 'NG Check Panel', value: 'ng_check_panel', icon: '🔍', color: 'rose' },
  { label: 'NG Quality Control', value: 'ng_qc', icon: '✅', color: 'rose' },
  { label: 'NG Cutting Pond', value: 'ng_cutting_pond', icon: '🌊', color: 'rose' },
  { label: 'Total Hadir Hari Ini', value: 'manpower_today', icon: '👥', color: 'green' },
  { label: 'Kehadiran per Stasiun', value: 'attendance_by_station', icon: '📍', color: 'teal' },
];

// ===== LAPORAN SHORTCUTS =====
const LAPORAN_ITEMS = [
  { emoji: '📑', label: 'Laporan NG (Pond & CP)', tab: 'reports' },
  { emoji: '✅', label: 'Laporan NG QC', tab: 'reports' },
  { emoji: '🔎', label: 'Traceability OP', tab: 'traceability' },
  { emoji: '🎯', label: 'Target Monitoring', tab: 'target_monitoring' },
  { emoji: '📈', label: 'Plan vs Actual', tab: 'plan_vs_actual' },
  { emoji: '📉', label: 'Demand Simulator', tab: 'demand_simulator' },
  { emoji: '⚡', label: 'Capacity Dashboard', tab: 'capacity_dashboard' },
  { emoji: '📊', label: 'Gantt Simulation', tab: 'gantt_simulation' },
  { emoji: '👁️', label: 'Manpower Monitoring', tab: 'manpower_monitoring' },
  { emoji: '🏝️', label: 'Automation Island', tab: 'automation_island' },
];

// ===== SUGGESTION CHIPS =====
const SUGGESTIONS = [
  'Total NG hari ini',
  'Berapa WIP saat ini?',
  'Defect rate hari ini',
  'Output packing hari ini',
  'Karyawan hadir berapa?',
];

// Simple formatter: highlight numbers & line breaks
const renderMessage = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const parts = line.split(/(\d+(?:\.\d+)?%?)/g);
    return (
      <span key={li}>
        {parts.map((part, pi) =>
          /^\d+(?:\.\d+)?%?$/.test(part) ? (
            <strong key={pi} className="text-blue-600 dark:text-blue-400 font-bold">
              {part}
            </strong>
          ) : (
            <span key={pi}>{part}</span>
          )
        )}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
};

const colorMap: Record<string, string> = {
  rose: 'border-rose-200 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20',
  orange: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20',
  emerald: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  blue: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  purple: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20',
  amber: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20',
  sky: 'border-sky-200 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20',
  green: 'border-green-200 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
  teal: 'border-teal-200 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20',
};

export const AiChatWidgetContent: React.FC = () => {
  const { user } = useAuth();
  const { navigateToTab, navigateToPath } = useNavigation();

  const [activeTab, setActiveTab] = useState<CopilotTab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: `Halo${user?.fullName ? ` ${user.fullName.split(' ')[0]}` : ''}! 👋 Saya Feby, asisten AI produksi Anda.\n\nSaya bisa membantu:\n• 📊 Cek data produksi & NG real-time\n• 🗺️ Navigasi ke menu manapun\n• 📋 Akses laporan & analisa\n• 💬 Jawab pertanyaan seputar produksi`,
      isUser: false,
      timestamp: new Date(),
      options: [
        { label: '⚠️ Data NG', value: 'ng' },
        { label: '📈 Data Output', value: 'output' },
        { label: '🔄 Status WIP', value: 'wip' },
        { label: '👥 Manpower', value: 'manpower' },
        { label: '🗺️ Navigasi', value: 'navigate' },
        { label: '❓ Bantuan', value: 'bantuan' },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('nextg_token');
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        action: data.action,
        options: data.options,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);

      if (data.action?.type === 'navigate') {
        navigateToPath(data.action.path);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: 'Maaf, terjadi kesalahan koneksi. Silakan coba lagi.',
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (option: any) => {
    if (option.type === 'navigate') {
      navigateToPath(option.value);
    } else {
      setActiveTab('chat');
      sendMessage(option.value);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearConversation = () => {
    setMessages([
      {
        id: Date.now().toString(),
        text: 'Percakapan dihapus. Ada yang bisa saya bantu?',
        isUser: false,
        timestamp: new Date(),
        options: [
          { label: '⚠️ Data NG', value: 'ng' },
          { label: '📈 Output', value: 'output' },
          { label: '🔄 WIP', value: 'wip' },
          { label: '🗺️ Navigasi', value: 'navigate' },
        ],
      },
    ]);
  };

  const filteredNavCategories = NAV_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(
      item => !navSearch || item.label.toLowerCase().includes(navSearch.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  const TABS = [
    { key: 'chat' as CopilotTab, icon: <Bot size={14} />, label: 'Copilot' },
    { key: 'data' as CopilotTab, icon: <BarChart3 size={14} />, label: 'Data' },
    { key: 'navigate' as CopilotTab, icon: <Navigation2 size={14} />, label: 'Navigate' },
    { key: 'laporan' as CopilotTab, icon: <FileText size={14} />, label: 'Laporan' },
  ];

  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-slate-900"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {activeTab === 'chat' && (
            <button
              onClick={clearConversation}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
              title="Hapus percakapan"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ====== TAB: CHAT ====== */}
      {activeTab === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/80">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} group`}>
                {!msg.isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-2 mt-1 flex-shrink-0 shadow-sm">
                    <span className="text-white text-[10px] font-bold">F</span>
                  </div>
                )}
                <div className="max-w-[80%] relative">
                  <div
                    className={`p-3 rounded-2xl text-sm ${
                      msg.isUser
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-none shadow-sm border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {msg.isUser ? (
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    ) : (
                      <div className="leading-relaxed">{renderMessage(msg.text)}</div>
                    )}

                    {/* Quick reply options */}
                    {msg.options && msg.options.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {msg.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleOptionClick(opt)}
                            className="px-3 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-all border border-blue-200 dark:border-blue-700 text-left leading-tight"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div
                      className={`text-[9px] mt-1.5 font-medium ${
                        msg.isUser ? 'text-blue-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Copy button */}
                  {!msg.isUser && (
                    <button
                      onClick={() => copyMessage(msg.id, msg.text)}
                      className="absolute -bottom-3 right-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-[10px] font-medium text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
                    >
                      {copiedId === msg.id ? (
                        <><Check size={10} className="text-emerald-500" /> Copied</>
                      ) : (
                        <><Copy size={10} /> Copy</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-2 flex-shrink-0 shadow-sm">
                  <span className="text-white text-[10px] font-bold">F</span>
                </div>
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Feby sedang mengetik...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          <div className="px-3 py-2 flex gap-2 overflow-x-auto bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="flex-shrink-0 px-3 py-1.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage(input)}
                placeholder="Tanyakan sesuatu kepada Feby..."
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-slate-50 dark:bg-slate-900 dark:text-white placeholder-slate-400"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ====== TAB: DATA ====== */}
      {activeTab === 'data' && (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 font-semibold uppercase tracking-wider">
            Query Data Real-Time
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveTab('chat');
                  sendMessage(q.value);
                }}
                className={`flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border rounded-xl transition-all text-left shadow-sm group ${
                  colorMap[q.color] || 'border-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                <span className="text-lg flex-shrink-0">{q.icon}</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                  {q.label}
                </span>
                <ChevronRight size={12} className="ml-auto text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>

          {/* Teach Feby info */}
          <div className="mt-4 p-3.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-700">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={13} /> Ajarkan Feby Informasi Baru
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 leading-relaxed">
              Di tab Chat, ketik:{' '}
              <code className="bg-indigo-100 dark:bg-indigo-900 px-1.5 py-0.5 rounded text-[10px] font-mono">
                tolong simpan informasi ini : [isi informasi]
              </code>
            </p>
          </div>
        </div>
      )}

      {/* ====== TAB: NAVIGATE ====== */}
      {activeTab === 'navigate' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={navSearch}
                onChange={e => setNavSearch(e.target.value)}
                placeholder="Cari menu..."
                className="w-full pl-8 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 border border-transparent focus:border-blue-400 dark:text-white"
              />
            </div>
          </div>

          {/* Nav items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {filteredNavCategories.map(cat => (
              <div key={cat.category}>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                  {cat.category}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {cat.items.map(item => (
                    <button
                      key={item.tab}
                      onClick={() => navigateToTab(item.tab)}
                      className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 transition-all text-left shadow-sm"
                    >
                      <span className="text-base">{item.emoji}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filteredNavCategories.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-400">
                Tidak ditemukan menu &quot;{navSearch}&quot;
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== TAB: LAPORAN ====== */}
      {activeTab === 'laporan' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 font-semibold uppercase tracking-wider">
            Laporan &amp; Analisa
          </p>
          {LAPORAN_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => navigateToTab(item.tab)}
              className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left shadow-sm group"
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 flex-1">
                {item.label}
              </span>
              <ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};