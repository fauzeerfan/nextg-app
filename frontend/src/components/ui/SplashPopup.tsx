// frontend/src/components/ui/SplashPopup.tsx
import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface SplashPopupProps {
  show: boolean;
  onClose: () => void;
}

interface QuoteData {
  content: string;
  author: string;
  translatedContent?: string;
}

const QUOTE_API_URL = 'https://api.quotable.io/random?maxLength=100';
const TRANSLATE_API_URL = 'https://api.mymemory.translated.net/get';
const QUOTE_STORAGE_KEY = 'nextg_daily_quote';

const getTodayKey = () => new Date().toISOString().split('T')[0];

const fetchQuoteFromApi = async (): Promise<QuoteData> => {
  const response = await fetch(QUOTE_API_URL);
  if (!response.ok) throw new Error('Failed to fetch quote');
  const data = await response.json();
  return { content: data.content, author: data.author };
};

const translateText = async (text: string): Promise<string> => {
  const params = new URLSearchParams({ q: text, langpair: 'en|id' });
  const response = await fetch(`${TRANSLATE_API_URL}?${params}`);
  if (!response.ok) throw new Error('Translation failed');
  const data = await response.json();
  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    return data.responseData.translatedText;
  }
  throw new Error('Translation response invalid');
};

/**
 * Mengambil quote harian dengan terjemahan.
 * Jika cache ada tapi tanpa terjemahan, akan mencoba menerjemahkan ulang.
 * Jika tidak ada cache atau tanggal berbeda, ambil quote baru + terjemahan.
 */
const getDailyQuote = async (): Promise<QuoteData> => {
  const today = getTodayKey();
  const stored = localStorage.getItem(QUOTE_STORAGE_KEY);

  // 1. Cek cache
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        // Jika sudah punya translatedContent, langsung gunakan
        if (parsed.translatedContent) {
          return {
            content: parsed.content,
            author: parsed.author,
            translatedContent: parsed.translatedContent,
          };
        }
        // Jika belum punya terjemahan, coba terjemahkan sekarang
        if (parsed.content) {
          try {
            const translated = await translateText(parsed.content);
            parsed.translatedContent = translated;
            localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(parsed));
            return {
              content: parsed.content,
              author: parsed.author,
              translatedContent: translated,
            };
          } catch (e) {
            // Terjemahan gagal, tetap pakai asli
            return { content: parsed.content, author: parsed.author };
          }
        }
      }
    } catch (e) {}
  }

  // 2. Ambil quote baru dari API
  try {
    const quote = await fetchQuoteFromApi();
    let translatedContent: string | undefined;
    try {
      translatedContent = await translateText(quote.content);
    } catch (transErr) {
      console.warn('Translation failed, using original');
    }

    const finalQuote: QuoteData = {
      content: quote.content,
      author: quote.author,
      translatedContent,
    };

    localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify({
      date: today,
      content: finalQuote.content,
      author: finalQuote.author,
      translatedContent: finalQuote.translatedContent,
    }));
    return finalQuote;
  } catch (error) {
    // 3. Fallback lokal dengan terjemahan manual
    const fallbacks: { content: string; author: string; translatedContent: string }[] = [
      {
        content: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
        translatedContent: "Satu-satunya cara untuk melakukan pekerjaan hebat adalah mencintai apa yang Anda lakukan.",
      },
      {
        content: "Quality is not an act, it is a habit.",
        author: "Aristotle",
        translatedContent: "Kualitas bukanlah tindakan, melainkan kebiasaan.",
      },
      {
        content: "Perfection is not attainable, but if we chase perfection we can catch excellence.",
        author: "Vince Lombardi",
        translatedContent: "Kesempurnaan tidak mungkin dicapai, tetapi jika kita mengejar kesempurnaan, kita bisa meraih keunggulan.",
      },
      {
        content: "Strive not to be a success, but rather to be of value.",
        author: "Albert Einstein",
        translatedContent: "Berusahalah bukan untuk menjadi sukses, tetapi untuk menjadi bernilai.",
      },
      {
        content: "The future depends on what you do today.",
        author: "Mahatma Gandhi",
        translatedContent: "Masa depan bergantung pada apa yang kamu lakukan hari ini.",
      },
    ];
    const random = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    const finalQuote: QuoteData = {
      content: random.content,
      author: random.author,
      translatedContent: random.translatedContent,
    };
    localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify({
      date: today,
      content: finalQuote.content,
      author: finalQuote.author,
      translatedContent: finalQuote.translatedContent,
    }));
    return finalQuote;
  }
};

export const SplashPopup = ({ show, onClose }: SplashPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';

      // Mulai fetch quote (bisa dari cache atau API)
      getDailyQuote().then((result) => {
        // Jika translatedContent tidak ada (berarti terjemahan gagal total), tampilkan saja asli
        setQuote(result);
      });
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

  const displayContent = quote?.translatedContent || quote?.content || '';
  const isTranslated = !!quote?.translatedContent;

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm transition-all duration-300 animate-in fade-in p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-3xl flex flex-col items-center gap-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="self-end p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 border border-slate-200 dark:border-slate-700 -mb-4 mr-2 z-30"
          aria-label="Close"
        >
          <X size={20} className="text-slate-600 dark:text-slate-300" />
        </button>

        {/* Quote Section */}
        {quote ? (
          <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-5 md:px-8 md:py-6 text-center border border-white/20 shadow-2xl">
            {/* Loading indicator jika belum diterjemahkan & masih mungkin diproses */}
            {!isTranslated ? (
              <div className="flex items-center justify-center gap-2 text-white/70 mb-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Menerjemahkan...</span>
              </div>
            ) : null}
            <p className="text-white text-xl md:text-2xl lg:text-3xl font-serif italic leading-relaxed mb-4 drop-shadow-lg">
              &ldquo;{displayContent}&rdquo;
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-12 bg-white/30"></div>
              <p className="text-white/80 text-sm md:text-base font-medium">
                {quote.author}
              </p>
              <div className="h-px w-12 bg-white/30"></div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-10 text-center border border-white/20 shadow-2xl">
            <Loader2 size={24} className="animate-spin text-white/80 mx-auto mb-2" />
            <p className="text-white/80 text-sm">Memuat quote motivasi...</p>
          </div>
        )}

        {/* Image Below */}
        <div className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl relative">
          <img
            src="/splash-image.jpg"
            alt="Company Motto"
            className="w-full h-auto"
            style={{ maxHeight: '55vh', objectFit: 'contain' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shine-smooth pointer-events-none"></div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
        }

        @keyframes shine-smooth {
          0% { transform: translateX(-100%) skewX(-10deg); }
          30% { transform: translateX(100%) skewX(-10deg); }
          100% { transform: translateX(200%) skewX(-10deg); }
        }
        .animate-shine-smooth {
          animation: shine-smooth 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};