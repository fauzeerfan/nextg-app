// frontend/src/components/ui/SplashPopup.tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface SplashPopupProps {
  show: boolean;
  onClose: () => void;
}

export const SplashPopup = ({ show, onClose }: SplashPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="relative max-w-5xl w-full mx-4 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Close */}
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-10 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 border border-slate-200 dark:border-slate-700"
          aria-label="Close"
        >
          <X size={20} className="text-slate-600 dark:text-slate-300" />
        </button>

        {/* Gambar */}
        <img
          src="/splash-image.jpg"
          alt="Promotion"
          className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
          style={{ maxHeight: '85vh', objectFit: 'contain' }}
        />
      </div>

      {/* Animasi Bounce */}
      <style>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(100px);
          }
          50% {
            opacity: 1;
            transform: scale(1.05) translateY(-10px);
          }
          70% {
            transform: scale(0.95) translateY(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
      `}</style>
    </div>
  );
};