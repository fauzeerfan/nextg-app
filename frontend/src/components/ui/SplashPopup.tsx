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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="relative max-w-5xl w-full mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-10 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 border border-slate-200 dark:border-slate-700"
          aria-label="Close"
        >
          <X size={20} className="text-slate-600 dark:text-slate-300" />
        </button>

        {/* Image container with smooth shine effect */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <img
            src="/splash-image.jpg"
            alt="Company Motto"
            className="w-full h-auto"
            style={{ maxHeight: '85vh', objectFit: 'contain' }}
          />
          {/* Smoother moving shine overlay - less opaque, slower, gentler skew */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent translate-x-[-100%] animate-shine-smooth pointer-events-none"></div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
        }

        @keyframes shine-smooth {
          0% {
            transform: translateX(-100%) skewX(-10deg);
          }
          30% {
            transform: translateX(100%) skewX(-10deg);
          }
          100% {
            transform: translateX(200%) skewX(-10deg);
          }
        }
        .animate-shine-smooth {
          animation: shine-smooth 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};