import React, { useState, useEffect, useCallback } from 'react';
import {
  Send, Ticket, Search, Filter, Clock, CheckCircle, AlertCircle,
  X, ChevronDown, MessageCircle, History, User, RefreshCw,
  Plus, Check, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://localhost:3000';

const categories = [
  { value: 'FEATURE', label: 'Feature Request', color: 'text-blue-500' },
  { value: 'BUG', label: 'Bug Report', color: 'text-red-500' },
  { value: 'DATA', label: 'Data Error', color: 'text-yellow-500' },
  { value: 'OTHER', label: 'Other', color: 'text-gray-500' },
];

const priorities = [
  { value: 'LOW', label: 'Low', color: 'text-gray-500' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-500' },
  { value: 'HIGH', label: 'High', color: 'text-orange-500' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-500' },
];

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400',
};

export const FebySupportView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');

  // Form state
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'FEATURE',
    description: '',
    priority: 'LOW',
  });

  // Filter (admin only)
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('nextg_token')}`,
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`${API_BASE_URL}/support/tickets?${params}`, { headers: getHeaders() });
      if (res.ok) setTickets(await res.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const fetchTicketDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets/${id}`, { headers: getHeaders() });
      if (res.ok) setSelectedTicket(await res.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) return;
    try {
      await fetch(`${API_BASE_URL}/support/tickets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newTicket),
      });
      setShowNewTicketForm(false);
      setNewTicket({ subject: '', category: 'FEATURE', description: '', priority: 'LOW' });
      fetchTickets();
    } catch (error) { console.error(error); }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !messageInput.trim()) return;
    try {
      await fetch(`${API_BASE_URL}/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message: messageInput }),
      });
      setMessageInput('');
      fetchTicketDetail(selectedTicket.id);
    } catch (error) { console.error(error); }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`${API_BASE_URL}/support/tickets/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTicketDetail(id);
      fetchTickets();
    } catch (error) { console.error(error); }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  const filteredTickets = tickets
    .filter(t => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        t.subject.toLowerCase().includes(s) ||
        t.ticketNumber.toLowerCase().includes(s) ||
        t.user?.fullName?.toLowerCase().includes(s)
      );
    });

  if (selectedTicket) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-800">
        {/* Header Detail Ticket */}
        <div className="p-4 border-b dark:border-slate-700 flex items-center gap-3">
          <button
            onClick={() => setSelectedTicket(null)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm">{selectedTicket.ticketNumber}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusColors[selectedTicket.status]}`}>
                {selectedTicket.status}
              </span>
            </div>
            <h3 className="font-bold text-sm mt-1 truncate">{selectedTicket.subject}</h3>
          </div>
          {isAdmin && (
            <select
              value={selectedTicket.status}
              onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
              className="text-xs border rounded-lg px-2 py-1 dark:bg-slate-700"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          )}
        </div>

{/* Messages */}
<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
  {/* Deskripsi awal tiket (initial report) */}
  <div className="flex justify-start">
    <div className="max-w-[80%] p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
      <div className="text-xs font-bold mb-1 text-amber-700 dark:text-amber-400">
        📝 Initial Report — {selectedTicket.user?.fullName || 'User'}
      </div>
      <div className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200">
        {selectedTicket.description}
      </div>
      <div className="text-[10px] mt-2 text-amber-600 dark:text-amber-500">
        {formatTime(selectedTicket.createdAt)}
      </div>
    </div>
  </div>

  {/* Pesan-pesan balasan */}
  {selectedTicket.messages?.map((msg: any) => (
    <div key={msg.id} className={`flex ${msg.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] p-3 rounded-xl ${msg.sender.id === user?.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border'}`}>
        <div className="text-xs font-bold mb-1">{msg.sender.fullName}</div>
        <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
        <div className="text-[10px] mt-2 opacity-70">{formatTime(msg.createdAt)}</div>
      </div>
    </div>
  ))}
</div>

        {/* Input Pesan (jika tidak closed) */}
        {selectedTicket.status !== 'CLOSED' && (
          <div className="p-3 border-t dark:border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Tulis pesan..."
                className="flex-1 px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-slate-700 dark:border-slate-600"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      {/* Header List */}
      <div className="p-4 border-b dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-bold text-sm">
          {isAdmin ? 'All Tickets' : 'My Tickets'}
        </h3>
        {!isAdmin && (
          <button
            onClick={() => setShowNewTicketForm(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <Plus size={14} /> New Ticket
          </button>
        )}
      </div>

      {/* New Ticket Form (Modal sederhana) */}
      {showNewTicketForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Buat Tiket Baru</h3>
              <button onClick={() => setShowNewTicketForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
                  placeholder="Judul tiket"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Kategori</label>
                <select
                  value={newTicket.category}
                  onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
                >
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Deskripsi</label>
                <textarea
                  rows={3}
                  value={newTicket.description}
                  onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
                  placeholder="Jelaskan masalah..."
                />
              </div>
              <div>
                <label className="text-xs font-bold">Prioritas</label>
                <select
                  value={newTicket.priority}
                  onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
                >
                  {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowNewTicketForm(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTicket}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Check size={16} /> Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search */}
      <div className="p-3 border-b dark:border-slate-700 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-xs dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
        {isAdmin && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-xs dark:bg-slate-700 dark:border-slate-600"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        )}
        <button onClick={fetchTickets} className="p-2 border rounded-lg"><RefreshCw size={16} /></button>
      </div>

      {/* List Tickets */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-500"/></div>}
        {!loading && filteredTickets.length === 0 && (
          <div className="text-center py-10 text-slate-500">Belum ada tiket.</div>
        )}
        {filteredTickets.map(ticket => (
          <div
            key={ticket.id}
            className="p-4 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition"
            onClick={() => fetchTicketDetail(ticket.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold">{ticket.ticketNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="text-sm font-bold mt-1 truncate">{ticket.subject}</div>
                {isAdmin && (
                  <div className="text-xs text-slate-500 mt-1">by {ticket.user?.fullName}</div>
                )}
                <div className="flex gap-2 mt-1 text-[10px] text-slate-500">
                  <span>{ticket.category}</span>
                  <span>·</span>
                  <span>{ticket.priority}</span>
                  {ticket._count?.messages > 0 && (
                    <>
                      <span>·</span>
                      <span>{ticket._count.messages} messages</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-400">{formatTime(ticket.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};