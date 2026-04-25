import React, { useState } from 'react';
import { X, Minimize2, Maximize2, MessageCircle, Users, Ticket } from 'lucide-react';
import { AiChatWidgetContent } from './AiChatWidgetContent'; // konten copilot yang sudah ada
import { FebySpace } from '../../features/chat/FebySpace';
import { FebySupportView } from '../../features/support/FebySupportView';

export const FebyWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'copilot' | 'space' | 'support'>('copilot');
  const [unreadCount, setUnreadCount] = useState(0);

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setActiveTab('copilot'); // default buka copilot
    } else {
      setIsOpen(false);
      setIsMaximized(false);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMaximized(false);
  };

  const toggleMaximize = () => setIsMaximized(!isMaximized);

  // Jika tidak terbuka, tampilkan tombol ikon dengan badge unread
  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 hover:scale-105 hover:-translate-y-1 transition-all duration-300"
        style={{ 
          background: 'transparent', 
          border: 'none', 
          padding: 0,
          fontFamily: "'Poppins', sans-serif" 
        }}
      >
        <img
          src="/feby.png"
          alt="Feby"
          className="w-48 h-48 object-contain"
          style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.25))' }}
        />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-4 bg-rose-500 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-lg shadow-rose-500/40 border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      style={{ fontFamily: "'Poppins', sans-serif" }}
      className={`fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 transition-all duration-300 ease-in-out ${
        isMaximized ? 'inset-4 w-auto h-auto' : 'w-[45vw] max-w-[700px] h-[80vh]'
      }`}
    >
      {/* Header dengan tab - Menggunakan warna solid modern yang rapi */}
      <div className="bg-indigo-600 px-4 py-3.5 flex justify-between items-center shadow-sm z-10">
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'copilot'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/40 scale-105 transform'
                : 'bg-white/10 text-indigo-100 hover:bg-white/20 hover:text-white'
            }`}
          >
            <MessageCircle size={18} strokeWidth={2.5} /> 
            <span>Feby Copilot</span>
          </button>
          
          <button
            onClick={() => setActiveTab('space')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300 relative ${
              activeTab === 'space'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/40 scale-105 transform'
                : 'bg-white/10 text-indigo-100 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Users size={18} strokeWidth={2.5} /> 
            <span>Feby Space</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm border-2 border-indigo-600">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300 relative ${
              activeTab === 'support'
                ? 'bg-green-500 text-white shadow-md shadow-green-500/40 scale-105 transform'
                : 'bg-white/10 text-indigo-100 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Ticket size={18} strokeWidth={2.5} /> 
            <span>Feby Support</span>
          </button>
        </div>

        <div className="flex gap-1.5 items-center">
          <button 
            onClick={toggleMaximize} 
            className="text-indigo-100 hover:bg-white/20 hover:text-white rounded-full p-2 transition-colors duration-200 focus:outline-none"
            title={isMaximized ? "Perkecil" : "Perbesar"}
          >
            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button 
            onClick={closeChat} 
            className="text-indigo-100 hover:bg-rose-500 hover:text-white rounded-full p-2 transition-colors duration-200 focus:outline-none"
            title="Tutup"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Konten */}
      <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
        {activeTab === 'copilot' ? (
          <AiChatWidgetContent />
        ) : activeTab === 'space' ? (
          <FebySpace onUnreadCountChange={setUnreadCount} />
        ) : (
          <FebySupportView />
        )}
      </div>
    </div>
  );
};