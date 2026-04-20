import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Minimize2, Maximize2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  action?: any;
  options?: any[];
}

export const AiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: 'Halo! Saya Feby, asisten AI Anda. Ada yang bisa saya bantu?', isUser: false },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuTree, setMenuTree] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const token = localStorage.getItem('nextg_token');
      const res = await fetch(`${API_BASE_URL}/ai/menu`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMenuTree(data);
      }
    } catch (error) {
      console.error('Failed to fetch menu', error);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), text, isUser: true };
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
      };
      setMessages(prev => [...prev, botMsg]);

      if (data.action?.type === 'navigate') {
        setTimeout(() => {
          window.location.href = data.action.path;
        }, 1500);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: 'Maaf, terjadi kesalahan.', isUser: false }]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (option: any) => {
    if (option.type === 'navigate') {
      window.location.href = option.value;
    } else {
      sendMessage(option.value);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const minimize = () => setIsMinimized(true);
  const restore = () => setIsMinimized(false);

  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 w-40 h-40 rounded-3xl shadow-xl flex items-center justify-center hover:scale-105 transition-transform duration-300 group bg-transparent"
      >
        <img src="/feby.png" alt="Feby" className="w-40 h-40 object-contain drop-shadow-xl" />
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[500px] h-[650px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/feby.png" alt="Feby" className="w-12 h-12 object-contain" />
          <span className="font-bold text-white">Feby - AI Assistant</span>
        </div>
        <div className="flex gap-2">
          {isMinimized ? (
            <button onClick={restore} className="text-white hover:bg-white/20 rounded p-1">
              <Maximize2 size={16} />
            </button>
          ) : (
            <button onClick={minimize} className="text-white hover:bg-white/20 rounded p-1">
              <Minimize2 size={16} />
            </button>
          )}
          <button onClick={toggleChat} className="text-white hover:bg-white/20 rounded p-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-none shadow-sm border border-slate-200 dark:border-slate-700'}`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.options && msg.options.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(opt)}
                      className="px-3 py-1.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 hover:bg-blue-200 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Tanyakan sesuatu..."
            className="flex-1 px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-slate-50 dark:bg-slate-900"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto text-xs">
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full cursor-pointer hover:bg-blue-100" onClick={() => sendMessage('menu_main')}>🏠 Menu Utama</span>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full cursor-pointer hover:bg-blue-100" onClick={() => sendMessage('ng')}>📊 Data NG</span>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full cursor-pointer hover:bg-blue-100" onClick={() => sendMessage('output')}>📈 Output</span>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full cursor-pointer hover:bg-blue-100" onClick={() => sendMessage('wip')}>📋 WIP</span>
        </div>
      </div>
    </div>
  );
};