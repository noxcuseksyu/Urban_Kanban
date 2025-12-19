import React, { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

export const InstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-pop-in">
      <button 
        onClick={handleInstallClick}
        className="group relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#0B0E11] border-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 hover:scale-110 active:scale-95"
      >
        {/* Pulsing Rings */}
        <span className="absolute inset-0 rounded-full border border-indigo-500 opacity-0 group-hover:opacity-100 group-hover:animate-ping"></span>
        <span className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md group-hover:blur-xl transition-all"></span>

        {/* Icon */}
        <div className="relative z-10 flex flex-col items-center justify-center">
            <Smartphone className="text-white group-hover:text-indigo-300 transition-colors icon-hover-wiggle" size={24} />
            <span className="text-[8px] font-bold text-indigo-400 mt-0.5">APP</span>
        </div>

        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#151B21] border border-white/10 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-md">
           <span className="text-xs text-white font-bold flex items-center gap-2">
             Install PWA <Download size={12} className="animate-bounce" />
           </span>
        </div>
      </button>
    </div>
  );
};