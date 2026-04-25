import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://localhost:3000';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  action?: any;
  options?: any[];
}

export const AiChatWidgetContent: React.FC = () => {
  const { user } = useAuth();
  const { navigateToPath } = useNavigation();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Halo! Saya Feby, asisten AI Anda. Silakan pilih menu atau ketik pertanyaan Anda:',
      isUser: false,
      options: [
        { label: '🏠 Menu Utama', value: 'menu_main' },
        { label: '📊 Data NG', value: 'ng' },
        { label: '📈 Output', value: 'output' },
        { label: '📋 Status WIP', value: 'wip' },
        { label: '📑 Laporan', value: 'report' },
        { label: '🔍 Navigasi', value: 'navigate' },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        navigateToPath(data.action.path);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: 'Maaf, terjadi kesalahan.', isUser: false }]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (option: any) => {
    if (option.type === 'navigate') {
      navigateToPath(option.value);
    } else {
      sendMessage(option.value);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-none shadow-sm border border-slate-200 dark:border-slate-700'}`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.options && msg.options.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {msg.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(opt)}
                      className="px-4 py-3 text-sm font-semibold rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/60 transition-all border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow flex items-center justify-center gap-1.5"
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
      </div>
    </div>
  );
};