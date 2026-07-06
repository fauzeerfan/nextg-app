// frontend/src/features/chat/FebySpace.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Plus, Send, Paperclip, Trash2, Users, X, Download, ArrowLeft, Check,
  Settings, UserPlus, UserMinus, Smile, Maximize2, Copy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://202.52.15.30:4000';

// ===== EMOJI PICKER DATA =====
const EMOJI_LIST = [
  '😀','😂','😊','😍','🤔','😅','😭','😎','🥳','😴',
  '👍','👎','👏','🙏','💪','🤝','✌️','🫡','❤️','🔥',
  '✅','⚠️','📦','📋','🎯','📈','⏰','🚀','💡','🔔',
  '😤','🤦','🫠','🥹','😬','🫢','🤩','🥺','😮','🫶',
];

// ===== INTERFACES =====
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
  updatedAt?: string;
  sender: { id: string; fullName: string; username: string };
}

interface Contact {
  id: string;
  fullName: string;
  username: string;
  department: string;
  jobTitle: string;
}

interface RoomContextMenu {
  roomId: string;
  x: number;
  y: number;
}

// ===== HELPERS =====
const avatarColors = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
];
const getAvatarColor = (name: string) =>
  avatarColors[name.charCodeAt(0) % avatarColors.length];

const getRoomIcon = (type: string) => {
  if (type === 'PERSONAL') return '💬';
  if (type === 'GLOBAL') return '🌐';
  if (type === 'DEPARTMENT') return '🏢';
  return '💬';
};

// ===== COMPONENT =====
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

  // Participant modal
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [manageRoomId, setManageRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Contact[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);

  // Mention
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionList, setMentionList] = useState<Contact[]>([]);
  const [cursorPos, setCursorPos] = useState(0);

  // Contacts view
  const [showContacts, setShowContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Edit & delete
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Room search
  const [roomSearch, setRoomSearch] = useState('');

  // Message search
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Reply to message
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Hover action bar
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Copy feedback
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Pinned rooms (localStorage)
  const [pinnedRoomIds, setPinnedRoomIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('feby_pinned_rooms') || '[]');
    } catch {
      return [];
    }
  });

  // Room context menu (right-click)
  const [roomContextMenu, setRoomContextMenu] = useState<RoomContextMenu | null>(null);

  // Typing indicator timer
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('nextg_token')}`,
  });

  // ===== PIN ROOM =====
  const togglePin = (roomId: string) => {
    setPinnedRoomIds(prev => {
      const next = prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId];
      localStorage.setItem('feby_pinned_rooms', JSON.stringify(next));
      return next;
    });
    setRoomContextMenu(null);
  };

  // ===== COPY MESSAGE =====
  const handleCopyMessage = (content: string | null, messageId: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // ===== FETCH ROOMS =====
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

  // ===== FETCH CONTACTS =====
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

  // ===== FETCH MESSAGES =====
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

  // Close room context menu on outside click
  useEffect(() => {
    if (!roomContextMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-room-context-menu]')) {
        setRoomContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [roomContextMenu]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-emoji-picker]')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== MENTION LOGIC =====
  useEffect(() => {
    if (!showMentions) return;
    const fetchParticipantsForMention = async () => {
      if (!activeRoomId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}/participants`, { headers: getHeaders() });
        if (res.ok) {
          const allParticipants: Contact[] = await res.json();
          const filtered = allParticipants.filter(
            p =>
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

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {}, 2000);

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

  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // ===== SEND MESSAGE =====
  const handleSend = async () => {
    if (!input.trim() || !activeRoomId || sending) return;
    setSending(true);

    let content = input;
    if (replyTo) {
      const replyName = replyTo.sender?.fullName ?? '';
      const replyPreview = (replyTo.content || '📎 Attachment').slice(0, 60);
      content = `[↩ ${replyName}: ${replyPreview}]\n${input}`;
    }

    try {
      await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      });
      setInput('');
      setReplyTo(null);
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
        alert('Upload gagal. Maks 5MB, hanya gambar, excel, pdf.');
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

  // ===== EDIT & DELETE MESSAGE =====
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
        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, content: updated.content, updatedAt: updated.updatedAt } : m))
        );
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
    setHoveredMessageId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  // ===== PERSONAL CHAT =====
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

  // ===== ADMIN: ROOM MANAGEMENT =====
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
    if (!confirm('Hapus room ini? Semua pesan akan hilang.')) return;
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
        if (removedUser) setAvailableContacts(prev => [...prev, removedUser]);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to remove participant');
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ===== HELPERS =====
  const activeRoom = rooms.find(r => r.id === activeRoomId);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (msgDate.getTime() === today.getTime()) return 'Hari ini';
    if (msgDate.getTime() === yesterday.getTime()) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getFileIcon = (fileType?: string | null) => {
    if (!fileType) return <Download size={20} />;
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('pdf')) return '📄';
    return <Download size={20} />;
  };

  const highlightMentions = (text: string | null, isOwn: boolean) => {
    if (!text) return '';
    const mentionClass = isOwn
      ? 'text-indigo-200 font-bold bg-indigo-700/30 px-1 rounded'
      : 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-1 rounded';
    return text.replace(/@([\w\s]+?)(?=\s|$|[,\.\!\?])/g, `<span class="${mentionClass}">@$1</span>`);
  };

  const parseReply = (content: string | null) => {
    if (!content) return { replyPart: null, mainContent: content };
    const replyMatch = content.match(/^\[↩ (.+?)\]\n([\s\S]*)$/);
    if (replyMatch) {
      return { replyPart: replyMatch[1], mainContent: replyMatch[2] };
    }
    return { replyPart: null, mainContent: content };
  };

  const getDateSeparators = (msgs: Message[]) => {
    const result: Array<{ type: 'date'; label: string } | { type: 'message'; message: Message; index: number }> = [];
    let lastDate = '';
    msgs.forEach((msg, idx) => {
      const dateLabel = formatDate(msg.createdAt);
      if (dateLabel !== lastDate) {
        result.push({ type: 'date', label: dateLabel });
        lastDate = dateLabel;
      }
      result.push({ type: 'message', message: msg, index: idx });
    });
    return result;
  };

  // Sorted rooms: pinned first, then original order
  const filteredRooms = rooms
    .filter(r => !roomSearch || r.name.toLowerCase().includes(roomSearch.toLowerCase()))
    .sort((a, b) => {
      const aPinned = pinnedRoomIds.includes(a.id);
      const bPinned = pinnedRoomIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  const filteredMessages = msgSearch
    ? messages.filter(m => m.content?.toLowerCase().includes(msgSearch.toLowerCase()))
    : messages;

  const groupedContacts = contacts
    .filter(
      c =>
        !contactSearch ||
        c.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.username.toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.department && c.department.toLowerCase().includes(contactSearch.toLowerCase()))
    )
    .reduce((acc: Record<string, Contact[]>, c) => {
      const dept = c.department || 'Lainnya';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(c);
      return acc;
    }, {});

  const renderedItems = getDateSeparators(filteredMessages);

  // Can delete: own message OR admin
  const canDelete = (msg: Message) =>
    msg.sender?.id === user?.id || user?.role === 'ADMINISTRATOR';

  return (
    <div
      className="flex h-full bg-white dark:bg-slate-900 overflow-hidden"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ===== IMAGE LIGHTBOX ===== */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl cursor-default"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ===== ROOM CONTEXT MENU (right-click) ===== */}
      {roomContextMenu && (
        <div
          data-room-context-menu
          className="fixed z-[150] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 min-w-[160px]"
          style={{ left: roomContextMenu.x, top: roomContextMenu.y }}
        >
          <button
            onClick={() => togglePin(roomContextMenu.roomId)}
            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
          >
            <span className="text-base">
              {pinnedRoomIds.includes(roomContextMenu.roomId) ? '📌' : '📍'}
            </span>
            {pinnedRoomIds.includes(roomContextMenu.roomId) ? 'Unpin Chat' : 'Pin Chat'}
          </button>
          <button
            onClick={() => {
              setActiveRoomId(roomContextMenu.roomId);
              setRoomContextMenu(null);
            }}
            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
          >
            <span className="text-base">💬</span> Buka Chat
          </button>
        </div>
      )}

      {/* ===== LEFT PANEL ===== */}
      <div className="w-60 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/95 flex-shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              {showContacts ? '👥 Kontak' : '💬 Feby Space'}
            </h3>
            <div className="flex gap-1">
              {user?.role === 'ADMINISTRATOR' && !showContacts && (
                <button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Manage Rooms"
                >
                  <Settings size={16} />
                </button>
              )}
              {!showContacts ? (
                <button
                  onClick={() => { setShowContacts(true); setContactSearch(''); }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Contacts"
                >
                  <Users size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setShowContacts(false)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Back to Chats"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={showContacts ? 'Cari kontak...' : 'Cari chat...'}
              value={showContacts ? contactSearch : roomSearch}
              onChange={e => showContacts ? setContactSearch(e.target.value) : setRoomSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-white"
            />
          </div>
        </div>

        {/* Admin Panel */}
        {showAdminPanel && user?.role === 'ADMINISTRATOR' && !showContacts && (
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-inner">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">Room Management</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nama room..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={roomForm.name}
                onChange={e => setRoomForm({ name: e.target.value })}
              />
              {editingRoomId ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateRoom(editingRoomId)}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => { setEditingRoomId(null); setRoomForm({ name: '' }); }}
                    className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={13} /> Buat Room
                </button>
              )}
              <div className="max-h-36 overflow-y-auto space-y-1 mt-1">
                {rooms.filter(r => r.type !== 'PERSONAL').map(room => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs border border-transparent"
                  >
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{room.name}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => fetchParticipants(room.id)} className="text-blue-500 hover:text-blue-600" title="Members">
                        <Users size={13} />
                      </button>
                      <button onClick={() => openEditRoom(room)} className="text-amber-500 hover:text-amber-600 font-bold text-sm" title="Edit">✎</button>
                      <button onClick={() => handleDeleteRoom(room.id)} className="text-rose-500 hover:text-rose-600" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {showContacts ? (
            /* ===== CONTACTS VIEW ===== */
            <div className="py-2">
              {Object.keys(groupedContacts).length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">Tidak ada kontak ditemukan</div>
              )}
              {Object.entries(groupedContacts).map(([dept, deptContacts]) => (
                <div key={dept}>
                  <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50">
                    {dept}
                  </div>
                  {deptContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center gap-2.5 transition-colors border-l-2 border-transparent hover:border-blue-500"
                      onClick={() => {
                        startPersonalChat(contact.id);
                        setShowContacts(false);
                      }}
                    >
                      <div
                        className={`w-9 h-9 rounded-full ${getAvatarColor(contact.fullName)} flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm`}
                      >
                        {contact.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {contact.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          @{contact.username} · {contact.jobTitle}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            /* ===== ROOM LIST ===== */
            <div className="py-1">
              {/* Pinned section label */}
              {pinnedRoomIds.length > 0 && filteredRooms.some(r => pinnedRoomIds.includes(r.id)) && (
                <div className="px-4 py-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  📌 Disematkan
                </div>
              )}

              {filteredRooms.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">Tidak ada chat ditemukan</div>
              )}

              {filteredRooms.map((room, index) => {
                const isPinned = pinnedRoomIds.includes(room.id);
                const prevIsPinned = index > 0 ? pinnedRoomIds.includes(filteredRooms[index - 1].id) : true;
                const showOtherLabel =
                  pinnedRoomIds.length > 0 &&
                  !isPinned &&
                  prevIsPinned &&
                  filteredRooms.some(r => pinnedRoomIds.includes(r.id));

                return (
                  <React.Fragment key={room.id}>
                    {showOtherLabel && (
                      <div className="px-4 py-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Semua Chat
                      </div>
                    )}
                    <div
                      className={`px-3 py-2.5 cursor-pointer transition-all duration-200 border-l-4 group/room relative ${
                        room.id === activeRoomId
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-600'
                          : isPinned
                          ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                      onClick={() => {
                        setActiveRoomId(room.id);
                        setShowMsgSearch(false);
                        setMsgSearch('');
                        setRoomContextMenu(null);
                      }}
                      onContextMenu={e => {
                        e.preventDefault();
                        setRoomContextMenu({ roomId: room.id, x: e.clientX, y: e.clientY });
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-full ${getAvatarColor(room.name)} flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm relative`}
                        >
                          {room.name.charAt(0).toUpperCase()}
                          <span className="absolute -top-0.5 -right-0.5 text-[10px]">{getRoomIcon(room.type)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-semibold text-xs truncate ${
                                room.id === activeRoomId
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : 'text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              {isPinned && <span className="mr-1 text-[10px]">📌</span>}
                              {room.name}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                              {room.lastMessage && (
                                <span className="text-[9px] text-slate-400">
                                  {formatTime(room.lastMessage.createdAt ?? '')}
                                </span>
                              )}
                              {room.unreadCount > 0 && (
                                <span className="bg-blue-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                                  {room.unreadCount > 9 ? '9+' : room.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          {room.lastMessage && (
                            <div
                              className={`text-[10px] truncate mt-0.5 ${
                                room.unreadCount > 0
                                  ? 'text-slate-700 dark:text-slate-200 font-semibold'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {room.lastMessage.sender?.id === user?.id ? 'Kamu: ' : `${room.lastMessage.sender?.fullName?.split(' ')[0] ?? ''}: `}
                              {room.lastMessage.fileUrl ? '📎 Attachment' : room.lastMessage.content || ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom: New Chat button */}
        {!showContacts && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              onClick={() => { setShowContacts(true); setContactSearch(''); }}
              className="w-full text-xs py-2 bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <Plus size={14} /> Chat Personal
            </button>
          </div>
        )}
      </div>

      {/* ===== RIGHT PANEL: CHAT AREA ===== */}
      {activeRoom ? (
        <div className="flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-900 overflow-hidden">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shadow-sm z-10 flex-shrink-0">
            <button
              onClick={() => setActiveRoomId(null)}
              className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div
              className={`w-9 h-9 rounded-full ${getAvatarColor(activeRoom.name)} flex items-center justify-center font-bold text-white text-sm shadow-sm flex-shrink-0`}
            >
              {activeRoom.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                {activeRoom.name}
                <span className="text-base">{getRoomIcon(activeRoom.type)}</span>
                {pinnedRoomIds.includes(activeRoom.id) && <span className="text-xs">📌</span>}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {activeRoom.participantCount} anggota
                {activeRoom.type === 'GLOBAL' && ' · Global'}
                {activeRoom.type === 'DEPARTMENT' && ` · ${activeRoom.department}`}
                {activeRoom.type === 'PERSONAL' && ' · Chat Pribadi'}
              </div>
            </div>
            {/* Pin toggle from header */}
            <button
              onClick={() => togglePin(activeRoom.id)}
              className={`p-2 rounded-lg transition-colors ${
                pinnedRoomIds.includes(activeRoom.id)
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              }`}
              title={pinnedRoomIds.includes(activeRoom.id) ? 'Unpin chat' : 'Pin chat'}
            >
              <span className="text-base leading-none">{pinnedRoomIds.includes(activeRoom.id) ? '📌' : '📍'}</span>
            </button>
            {/* Message search toggle */}
            <button
              onClick={() => {
                setShowMsgSearch(v => !v);
                setMsgSearch('');
              }}
              className={`p-2 rounded-lg transition-colors ${
                showMsgSearch
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
              title="Cari pesan"
            >
              <Search size={16} />
            </button>
          </div>

          {/* Message search bar */}
          {showMsgSearch && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input
                  type="text"
                  value={msgSearch}
                  onChange={e => setMsgSearch(e.target.value)}
                  placeholder="Cari dalam percakapan..."
                  autoFocus
                  className="w-full pl-8 pr-4 py-2 text-xs bg-white dark:bg-slate-800 rounded-xl border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-white"
                />
                {msgSearch && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 font-semibold">
                    {filteredMessages.length} hasil
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-1"
            onClick={() => setHoveredMessageId(null)}
          >
            {loading && messages.length === 0 && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            )}

            {renderedItems.map((item, idx) => {
              if (item.type === 'date') {
                return (
                  <div key={`date-${idx}`} className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>
                );
              }

              const msg = item.message;
              const isOwn = msg.sender?.id === user?.id;
              const showAvatar = item.index === 0 || filteredMessages[item.index - 1]?.sender?.id !== msg.sender?.id;
              const isEditing = editingMessageId === msg.id;
              const isHovered = hoveredMessageId === msg.id;
              const isCopied = copiedMessageId === msg.id;
              const { replyPart, mainContent } = parseReply(msg.content);

              return (
                <div
                  key={msg.id}
                  className={`relative flex ${isOwn ? 'justify-end' : 'justify-start'} ${!showAvatar ? 'mt-0.5' : 'mt-3'}`}
                  onMouseEnter={() => !isEditing && setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {!isOwn && showAvatar && (
                      <div
                        className={`w-7 h-7 rounded-full ${getAvatarColor(msg.sender?.fullName ?? '?')} flex items-center justify-center font-bold text-xs text-white flex-shrink-0 shadow-sm`}
                      >
                        {(msg.sender?.fullName ?? '?').charAt(0)}
                      </div>
                    )}
                    {!isOwn && !showAvatar && <div className="w-7 flex-shrink-0" />}

                    {/* Bubble */}
                    <div
                      className={`px-3.5 py-2.5 rounded-[18px] shadow-sm max-w-full ${
                        isOwn
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      {/* Sender name */}
                      {!isOwn && showAvatar && (
                        <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                          {msg.sender?.fullName ?? ''}
                        </div>
                      )}

                      {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[180px]">
                          <input
                            type="text"
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleEditMessage(msg.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 rounded-lg border border-transparent focus:border-blue-400 focus:outline-none"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={handleCancelEdit}
                              className="text-[11px] font-medium px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleEditMessage(msg.id)}
                              className="text-[11px] font-medium px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                            >
                              Simpan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Reply quote */}
                          {replyPart && (
                            <div
                              className={`text-[10px] mb-1.5 px-2 py-1 rounded-lg border-l-2 ${
                                isOwn
                                  ? 'bg-blue-500/40 border-blue-300 text-blue-100'
                                  : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <span className="inline mr-1">↩</span>
                              {replyPart}
                            </div>
                          )}

                          {/* Text content */}
                          {mainContent && (
                            <div className="relative">
                              <div
                                className="whitespace-pre-wrap text-[13px] leading-relaxed"
                                dangerouslySetInnerHTML={{
                                  __html: highlightMentions(mainContent, isOwn),
                                }}
                              />
                              {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                                <span className="text-[9px] text-blue-200 dark:text-slate-500 italic ml-1">
                                  (edited)
                                </span>
                              )}
                            </div>
                          )}

                          {/* File attachment */}
                          {msg.fileUrl && (
                            <div className="mt-2">
                              {msg.fileType?.startsWith('image/') ? (
                                <div className="relative group/img">
                                  <img
                                    src={`${API_BASE_URL}${msg.fileUrl}`}
                                    alt={msg.fileName || 'Image'}
                                    className="max-w-[200px] max-h-[200px] object-cover rounded-xl cursor-zoom-in hover:opacity-90 transition-opacity"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setLightboxUrl(`${API_BASE_URL}${msg.fileUrl}`);
                                    }}
                                  />
                                  <div className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setLightboxUrl(`${API_BASE_URL}${msg.fileUrl}`);
                                      }}
                                      className="p-1 bg-black/40 rounded-lg text-white"
                                    >
                                      <Maximize2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <a
                                  href={`${API_BASE_URL}${msg.fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
                                    isOwn
                                      ? 'bg-black/10 hover:bg-black/20 text-white'
                                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600'
                                  }`}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span className="text-lg">{getFileIcon(msg.fileType)}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold truncate">{msg.fileName}</div>
                                    {msg.fileSize && (
                                      <div className="text-[10px] opacity-75">{(msg.fileSize / 1024).toFixed(1)} KB</div>
                                    )}
                                  </div>
                                  <Download size={14} className="opacity-70 flex-shrink-0" />
                                </a>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Timestamp */}
                      <div
                        className={`text-[9px] font-medium mt-1 text-right ${
                          isOwn ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                        {isOwn && (
                          <Check size={9} className="inline ml-1 text-blue-200" />
                        )}
                      </div>
                    </div>

                    {/* ===== HOVER ACTION BAR ===== */}
                    {!isEditing && isHovered && (
                      <div
                        className={`flex items-center gap-0.5 self-center flex-shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1.5 py-1 shadow-lg transition-all`}
                        onClick={e => e.stopPropagation()}
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                      >
                        {/* Reply */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setReplyTo(msg);
                            inputRef.current?.focus();
                            setHoveredMessageId(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-full transition-colors"
                          title="Reply"
                        >
                          <span className="text-sm leading-none">↩</span>
                        </button>

                        {/* Copy */}
                        {msg.content && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleCopyMessage(mainContent, msg.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-full transition-colors"
                            title="Salin pesan"
                          >
                            {isCopied
                              ? <Check size={13} className="text-emerald-500" />
                              : <Copy size={13} />
                            }
                          </button>
                        )}

                        {/* Edit (own text messages only) */}
                        {isOwn && msg.content && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleStartEdit(msg);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-full transition-colors"
                            title="Edit pesan"
                          >
                            <span className="text-sm leading-none">✏️</span>
                          </button>
                        )}

                        {/* Delete (own or admin) */}
                        {canDelete(msg) && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteMessage(msg.id);
                              setHoveredMessageId(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-full transition-colors"
                            title="Hapus pesan"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            {/* Reply indicator */}
            {replyTo && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                <span className="text-blue-500 flex-shrink-0 text-sm">↩</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                    Reply ke {replyTo.sender?.fullName ?? ''}
                  </span>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 truncate">
                    {replyTo.content || '📎 Attachment'}
                  </div>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="p-1 text-blue-400 hover:text-blue-600 rounded transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Mention dropdown */}
            {showMentions && mentionList.length > 0 && (
              <div className="mx-4 mb-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl max-h-40 overflow-y-auto shadow-xl py-2">
                {mentionList.map(contact => (
                  <div
                    key={contact.id}
                    className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 transition-colors"
                    onClick={() => handleSelectMention(contact)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${getAvatarColor(contact.fullName)} flex items-center justify-center font-bold text-xs text-white`}
                    >
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

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div
                data-emoji-picker
                className="mx-4 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xl"
              >
                <div className="grid grid-cols-10 gap-1">
                  {EMOJI_LIST.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-1 transition-colors leading-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input row */}
            <div className="flex items-center gap-2 px-4 py-3">
              {/* File attach */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-all flex-shrink-0"
                title="Lampirkan file"
              >
                <Paperclip size={18} />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.gif,.xlsx,.xls,.pdf"
                />
              </button>

              {/* Emoji picker button */}
              <button
                data-emoji-picker
                onClick={() => setShowEmojiPicker(v => !v)}
                className={`p-2 rounded-full transition-all flex-shrink-0 ${
                  showEmojiPicker
                    ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                }`}
                title="Emoji"
              >
                <Smile size={18} />
              </button>

              {/* Text input */}
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
                  placeholder="Ketik pesan... @ untuk mention"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-transparent focus:bg-white dark:focus:bg-slate-700 focus:border-blue-400 rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white"
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-md shadow-blue-600/30 flex-shrink-0"
              >
                <Send size={18} className="translate-x-[1px] -translate-y-[1px]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ===== EMPTY STATE ===== */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30 dark:bg-slate-900">
          <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <Users size={40} className="text-blue-600 dark:text-blue-500" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Feby Space</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            Pilih ruang obrolan dari daftar atau mulai percakapan personal dengan kontak Anda.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            💡 Klik kanan pada chat untuk pin/unpin
          </p>
          <button
            onClick={() => { setShowContacts(true); setContactSearch(''); }}
            className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/30 hover:-translate-y-0.5"
          >
            <Users size={16} />
            Lihat Kontak
          </button>
        </div>
      )}

      {/* ===== PARTICIPANT MODAL ===== */}
      {showParticipantModal && manageRoomId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manage Participants</h3>
              <button
                onClick={() => setShowParticipantModal(false)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                Anggota Saat Ini
                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 py-0.5 px-2 rounded-md text-xs">
                  {participants.length}
                </span>
              </h4>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {participants.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${getAvatarColor(p.fullName)} flex items-center justify-center font-bold text-xs text-white`}
                      >
                        {p.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{p.fullName}</div>
                        <div className="text-xs text-slate-500 font-medium">@{p.username}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveParticipant(p.id)}
                      className="text-rose-500 hover:text-white hover:bg-rose-500 p-1.5 rounded-lg transition-all"
                      title="Remove"
                    >
                      <UserMinus size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-4">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <UserPlus size={15} className="text-blue-600" /> Tambah Anggota
              </h4>
              <select
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer dark:text-white"
                onChange={async e => {
                  if (e.target.value) {
                    await handleAddParticipant(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">-- Pilih pengguna --</option>
                {availableContacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} (@{c.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <button
                onClick={() => setShowParticipantModal(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold rounded-xl transition-all shadow-md"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};