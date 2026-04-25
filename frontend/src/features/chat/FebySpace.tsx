// frontend/src/features/chat/FebySpace.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Plus, Send, Paperclip, Trash2, Users, X, Download, ArrowLeft, Check,
  Settings, UserPlus, UserMinus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://localhost:3000';

interface Room {
  id: string;
  name: string;
  type: string;
  department?: string;
  unreadCount: number;
  lastMessage?: {
    id: string;
    content: string | null;
    fileUrl: string | null;
    fileName: string | null;
    createdAt: string;
    sender: { id: string; fullName: string };
  } | null;
  participantCount?: number;
}

interface Message {
  id: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt?: string; // <-- tambahkan untuk indikator edited
  sender: { id: string; fullName: string; username: string };
}

interface Contact {
  id: string;
  fullName: string;
  username: string;
  department: string;
  jobTitle: string;
}

export const FebySpace: React.FC<{ onUnreadCountChange?: (count: number) => void }> = ({ onUnreadCountChange }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Admin state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: '' });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Manage participants state
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [manageRoomId, setManageRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Contact[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionList, setMentionList] = useState<Contact[]>([]);
  const [cursorPos, setCursorPos] = useState(0);

  // Toggle contacts view
  const [showContacts, setShowContacts] = useState(false);

  // ========== EDIT & DELETE MESSAGE STATE ==========
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // ========== CONTEXT MENU STATE (klik pesan) ==========
  const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('nextg_token')}`,
  });

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/rooms`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
        const totalUnread = data.reduce((sum: number, r: Room) => sum + r.unreadCount, 0);
        onUnreadCountChange?.(totalUnread);
      }
    } catch (error) {
      console.error(error);
    }
  }, [onUnreadCountChange]);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/contacts`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
        setAvailableContacts(data);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchContacts();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms, fetchContacts]);

  useEffect(() => {
    if (!activeRoomId) return;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}/messages?limit=100`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}/read`, {
            method: 'POST',
            headers: getHeaders(),
          });
          fetchRooms();
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeRoomId]);

  // Tutup context menu saat klik di luar
  useEffect(() => {
    if (!contextMenuMessageId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-message-id="${contextMenuMessageId}"]`)) {
        setContextMenuMessageId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenuMessageId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ========== MENTION LOGIC ==========
  useEffect(() => {
    if (!showMentions) return;
    const fetchParticipantsForMention = async () => {
      if (!activeRoomId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}/participants`, { headers: getHeaders() });
        if (res.ok) {
          const allParticipants: Contact[] = await res.json();
          const filtered = allParticipants.filter(p =>
            p.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            p.username.toLowerCase().includes(mentionQuery.toLowerCase())
          );
          setMentionList(filtered);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchParticipantsForMention();
  }, [mentionQuery, showMentions, activeRoomId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInput(value);
    setCursorPos(pos);

    const beforeCursor = value.slice(0, pos);
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const textAfterAt = beforeCursor.slice(atIndex + 1);
      if (!/\s/.test(textAfterAt)) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const handleSelectMention = (contact: Contact) => {
    const beforeCursor = input.slice(0, cursorPos);
    const afterCursor = input.slice(cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const newInput = beforeCursor.slice(0, atIndex) + `@${contact.fullName} ` + afterCursor;
      setInput(newInput);
      setShowMentions(false);
      inputRef.current?.focus();
    }
  };

  // ========== SEND MESSAGE ==========
  const handleSend = async () => {
    if (!input.trim() || !activeRoomId || sending) return;
    setSending(true);
    try {
      await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content: input }),
      });
      setInput('');
      setShowMentions(false);
      const res = await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}/messages?limit=100`, { headers: getHeaders() });
      if (res.ok) setMessages(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadRes = await fetch(`${API_BASE_URL}/chat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('nextg_token')}` },
        body: formData,
      });
      if (!uploadRes.ok) {
        alert('Upload failed. Max 5MB, only images, excel, pdf.');
        return;
      }
      const uploadData = await uploadRes.json();
      await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          fileUrl: uploadData.url,
          fileName: uploadData.name,
          fileSize: uploadData.size,
          fileType: uploadData.type,
        }),
      });
      const res = await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}/messages?limit=100`, { headers: getHeaders() });
      if (res.ok) setMessages(await res.json());
    } catch (error) {
      console.error(error);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ========== EDIT & DELETE MESSAGE HANDLERS ==========
  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: updated.content, updatedAt: updated.updatedAt } : m));
        setEditingMessageId(null);
      }
    } catch (error) {
      console.error('Edit message failed', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Hapus pesan ini?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Delete message failed', error);
    }
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content || '');
    setContextMenuMessageId(null); // tutup menu
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  // ========== PERSONAL CHAT ==========
  const startPersonalChat = async (targetUserId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/rooms/personal`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        const room = await res.json();
        setActiveRoomId(room.id);
        await fetchRooms();
      } else {
        const err = await res.json();
        alert('Gagal memulai percakapan: ' + (err.message || 'Unknown error'));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ========== ADMIN: ROOM MANAGEMENT ==========
  const handleCreateRoom = async () => {
    if (!roomForm.name) return;
    try {
      const res = await fetch(`${API_BASE_URL}/chat/rooms`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: roomForm.name }),
      });
      if (res.ok) {
        setRoomForm({ name: '' });
        await fetchRooms();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create room');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateRoom = async (roomId: string) => {
    if (!roomForm.name) return;
    try {
      await fetch(`${API_BASE_URL}/chat/rooms/${roomId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ name: roomForm.name }),
      });
      await fetchRooms();
      setEditingRoomId(null);
      setRoomForm({ name: '' });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Delete this room? All messages will be lost.')) return;
    try {
      await fetch(`${API_BASE_URL}/chat/rooms/${roomId}`, { method: 'DELETE', headers: getHeaders() });
      await fetchRooms();
      if (activeRoomId === roomId) setActiveRoomId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const openEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setRoomForm({ name: room.name });
  };

  const fetchParticipants = async (roomId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/participants`, { headers: getHeaders() });
      if (res.ok) {
        const currentParticipants = await res.json();
        setParticipants(currentParticipants);
        setManageRoomId(roomId);
        setShowParticipantModal(true);
        const participantIds = currentParticipants.map((p: any) => p.id);
        setAvailableContacts(contacts.filter(c => !participantIds.includes(c.id)));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddParticipant = async (userId: string) => {
    if (!manageRoomId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/chat/rooms/${manageRoomId}/participants`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const addedUser = availableContacts.find(c => c.id === userId);
        if (addedUser) {
          setParticipants(prev => [...prev, addedUser]);
          setAvailableContacts(prev => prev.filter(c => c.id !== userId));
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add participant');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!manageRoomId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/chat/rooms/${manageRoomId}/participants/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setParticipants(prev => prev.filter(p => p.id !== userId));
        const removedUser = participants.find(p => p.id === userId);
        if (removedUser) {
          setAvailableContacts(prev => [...prev, removedUser]);
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to remove participant');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const getFileIcon = (fileType?: string | null) => {
    if (!fileType) return <Download size={20} />;
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('pdf')) return '📄';
    return <Download size={20} />;
  };

  // ==============================================
  // MAIN RETURN
  // ==============================================
  return (
    <div className="flex h-full bg-white dark:bg-slate-900 overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Left Panel: Room List + Admin + Contacts Toggle */}
      <div className="w-60 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/95">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shadow-sm z-10">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
            {showContacts ? 'Contacts' : 'Chats'}
          </h3>
          <div className="flex gap-1.5">
            {user?.role === 'ADMINISTRATOR' && !showContacts && (
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Manage Rooms"
              >
                <Settings size={18} />
              </button>
            )}
            {!showContacts ? (
              <button
                onClick={() => setShowContacts(true)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Contacts"
              >
                <Users size={18} />
              </button>
            ) : (
              <button
                onClick={() => setShowContacts(false)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Back to Chats"
              >
                <ArrowLeft size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Admin Panel (only when not in contacts view) */}
        {showAdminPanel && user?.role === 'ADMINISTRATOR' && !showContacts && (
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-inner">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Room Management</h4>
            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="Room name..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                value={roomForm.name}
                onChange={e => setRoomForm({ name: e.target.value })}
              />
              {editingRoomId ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateRoom(editingRoomId)}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors shadow-sm shadow-blue-600/20"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => { setEditingRoomId(null); setRoomForm({ name: '' }); }}
                    className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs rounded-lg transition-colors shadow-sm shadow-emerald-500/20"
                >
                  Create Room
                </button>
              )}
            </div>
            <div className="mt-3 max-h-40 overflow-y-auto pr-1 space-y-1">
              {rooms.filter(r => r.type !== 'PERSONAL').map(room => (
                <div key={room.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-xs border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">{room.name}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => fetchParticipants(room.id)} className="text-blue-500 hover:text-blue-600 transition-colors" title="Members">
                      <Users size={14} />
                    </button>
                    <button onClick={() => openEditRoom(room)} className="text-amber-500 hover:text-amber-600 font-bold transition-colors" title="Edit">✎</button>
                    <button onClick={() => handleDeleteRoom(room.id)} className="text-rose-500 hover:text-rose-600 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content: either Contacts List or Room List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {showContacts ? (
            // Contacts View
            <div className="py-2">
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                    value={mentionQuery}
                    onChange={(e) => setMentionQuery(e.target.value)}
                  />
                </div>
              </div>
              {contacts
                .filter(c =>
                  c.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
                  c.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
                  (c.department && c.department.toLowerCase().includes(mentionQuery.toLowerCase()))
                )
                .map(contact => (
                  <div
                    key={contact.id}
                    className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-blue-500"
                    onClick={() => {
                      startPersonalChat(contact.id);
                      setShowContacts(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 shadow-sm">
                      {contact.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{contact.fullName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">@{contact.username} · {contact.jobTitle}</div>
                      {contact.department && (
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{contact.department}</div>
                      )}
                    </div>
                  </div>
                ))}
              {contacts.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 font-medium">No contacts available</div>
              )}
            </div>
          ) : (
            // Room List
            <div className="py-2">
              {rooms.map(room => (
                <div
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`px-4 py-3 cursor-pointer transition-all duration-200 border-l-4 ${
                    room.id === activeRoomId
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-600'
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm truncate ${room.id === activeRoomId ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {room.name}
                        </span>
                        {room.participantCount && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md font-medium">
                            {room.participantCount}
                          </span>
                        )}
                      </div>
                      {room.lastMessage && (
                        <div className={`text-[11px] truncate mt-1 ${room.unreadCount > 0 ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                          {room.lastMessage.fileUrl ? '📎 Attachment' : room.lastMessage.content || ''}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 ml-3">
                      {room.lastMessage && (
                        <span className="text-[10px] text-slate-400 font-medium">{formatTime(room.lastMessage.createdAt)}</span>
                      )}
                      {room.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm shadow-blue-600/30">
                          {room.unreadCount > 9 ? '9+' : room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom button: New Personal Chat */}
        {!showContacts && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              onClick={() => setShowContacts(true)}
              className="w-full text-xs py-2 bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20 transition-all duration-200"
            >
              <Users size={14} strokeWidth={2.5} /> New Personal Chat
            </button>
          </div>
        )}
      </div>

      {/* Right Panel: Chat Area */}
      {activeRoom ? (
        <div className="flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-900">
          {/* Chat Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4 shadow-sm z-10">
            <button
              onClick={() => setActiveRoomId(null)}
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm shadow-blue-600/30">
              {activeRoom.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{activeRoom.name}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                {activeRoom.participantCount} anggota
                {activeRoom.type === 'GLOBAL' && ' · Semua Pengguna'}
                {activeRoom.type === 'DEPARTMENT' && ` · ${activeRoom.department}`}
                {activeRoom.type === 'PERSONAL' && ' · Chat Pribadi'}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading && messages.length === 0 && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isOwn = msg.sender.id === user?.id;
              const showAvatar = idx === 0 || messages[idx - 1]?.sender.id !== msg.sender.id;
              const isEditing = editingMessageId === msg.id;
              // Highlight mentions
              const highlightMentions = (text: string | null) => {
                if (!text) return '';
                return text.replace(/@(\w+)/g, '<span class="text-indigo-200 font-bold bg-indigo-700/30 px-1 rounded">@$1</span>');
              };
              const highlightMentionsOther = (text: string | null) => {
                if (!text) return '';
                return text.replace(/@(\w+)/g, '<span class="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-1 rounded">@$1</span>');
              };

              return (
                <div
                  key={msg.id}
                  data-message-id={msg.id}
                  className={`relative flex ${isOwn ? 'justify-end' : 'justify-start'} ${!showAvatar ? 'mt-1.5' : 'mt-4'}`}
                  onClick={isOwn && !isEditing ? (e) => {
                    e.stopPropagation();
                    setContextMenuMessageId(msg.id === contextMenuMessageId ? null : msg.id);
                  } : undefined}
                  style={isOwn && !isEditing ? { cursor: 'pointer' } : undefined}
                >
                  <div className={`flex items-end gap-2.5 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwn && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300 flex-shrink-0 shadow-sm">
                        {msg.sender.fullName.charAt(0)}
                      </div>
                    )}
                    {!isOwn && !showAvatar && <div className="w-8 flex-shrink-0" />}

                    <div className={`px-4 py-2.5 rounded-[20px] shadow-sm ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-100 dark:border-slate-700'
                    }`}>
                      {!isOwn && showAvatar && (
                        <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1.5">{msg.sender.fullName}</div>
                      )}
                      {isEditing ? (
                        <div className="flex flex-col gap-2.5 min-w-[200px]">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditMessage(msg.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 rounded-lg border border-transparent focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={handleCancelEdit} className="text-[11px] font-medium px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-lg transition-colors">Batal</button>
                            <button onClick={() => handleEditMessage(msg.id)} className="text-[11px] font-medium px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">Simpan</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.content && (
                            <div className="relative">
                              <div
                                className="whitespace-pre-wrap text-[13px] leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: isOwn ? highlightMentions(msg.content) : highlightMentionsOther(msg.content) }}
                              />
                              {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 italic ml-1">(edited)</span>
                              )}
                            </div>
                          )}
                          {msg.fileUrl && (
                            <div className="mt-2.5">
                              {msg.fileType?.startsWith('image/') ? (
                                <a href={`${API_BASE_URL}${msg.fileUrl}`} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
                                  <img
                                    src={`${API_BASE_URL}${msg.fileUrl}`}
                                    alt={msg.fileName || 'Image'}
                                    className="max-w-[220px] max-h-[220px] object-cover hover:scale-105 transition-transform duration-300"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={`${API_BASE_URL}${msg.fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                                    isOwn ? 'bg-black/10 hover:bg-black/20 text-white' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600'
                                  }`}
                                >
                                  <span className="text-xl">{getFileIcon(msg.fileType)}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold truncate">{msg.fileName}</div>
                                    {msg.fileSize && <div className="text-[10px] opacity-75 mt-0.5">{(msg.fileSize / 1024).toFixed(1)} KB</div>}
                                  </div>
                                  <Download size={16} className="opacity-80" />
                                </a>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      <div className={`text-[9px] font-medium mt-1.5 text-right ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>

                    {/* Context Menu muncul di atas pesan */}
                    {isOwn && contextMenuMessageId === msg.id && !isEditing && (
                      <div
                        className="absolute z-50 bottom-full right-0 mb-2 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleStartEdit(msg)}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                        >
                          <span>✏️</span> Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteMessage(msg.id);
                            setContextMenuMessageId(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3 transition-colors"
                        >
                          <span>🗑️</span> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area with mention */}
          <div className="p-4 bg-white dark:bg-slate-900 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.03)] z-10 relative">
            {showMentions && mentionList.length > 0 && (
              <div className="absolute bottom-[calc(100%+10px)] left-4 right-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl max-h-48 overflow-y-auto shadow-xl z-20 py-2">
                {mentionList.map(contact => (
                  <div
                    key={contact.id}
                    className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 transition-colors"
                    onClick={() => handleSelectMention(contact)}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400">
                      {contact.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{contact.fullName}</div>
                      <div className="text-xs text-slate-500">@{contact.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
                title="Attach file"
              >
                <Paperclip size={20} />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.gif,.xlsx,.xls,.pdf"
                />
              </button>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={e => {
                    if (showMentions) return;
                    if (e.key === 'Enter' && !e.shiftKey) handleSend();
                  }}
                  placeholder="Ketik pesan... gunakan @ untuk mention"
                  className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 border border-transparent focus:bg-white focus:border-blue-400 rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-md shadow-blue-600/30"
              >
                <Send size={18} className="translate-x-[1px] translate-y-[-1px]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30 dark:bg-slate-900">
          <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <Users size={48} className="text-blue-600 dark:text-blue-500" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">Feby Space</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
            Pilih ruang obrolan dari daftar di samping atau mulai percakapan personal baru dengan kontak Anda.
          </p>
          <div className="mt-8">
            <button
              onClick={() => setShowContacts(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold flex items-center gap-2.5 transition-all shadow-md shadow-blue-600/30 hover:shadow-lg hover:-translate-y-0.5"
            >
              <Users size={18} />
              Lihat Kontak
            </button>
          </div>
        </div>
      )}

      {/* Participant Management Modal */}
      {showParticipantModal && manageRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-7 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-700 transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage Participants</h3>
              <button
                onClick={() => setShowParticipantModal(false)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                Current Members
                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 py-0.5 px-2 rounded-md text-xs">{participants.length}</span>
              </h4>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400">
                        {p.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{p.fullName}</div>
                        <div className="text-xs text-slate-500 font-medium">@{p.username}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveParticipant(p.id)}
                      className="text-rose-500 hover:text-white hover:bg-rose-500 p-2 rounded-lg transition-all"
                      title="Remove Member"
                    >
                      <UserMinus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <UserPlus size={16} className="text-blue-600" /> Add Member
              </h4>
              <select
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow cursor-pointer"
                onChange={async (e) => {
                  if (e.target.value) {
                    await handleAddParticipant(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="" className="text-slate-400">-- Select user to add --</option>
                {availableContacts.map(c => (
                  <option key={c.id} value={c.id}>{c.fullName} (@{c.username})</option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <button
                onClick={() => setShowParticipantModal(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold rounded-xl transition-all shadow-md"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};