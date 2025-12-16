import React, { useEffect, useState } from 'react';
import { Download, Laptop, Smartphone, X } from 'lucide-react';

export const InstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center animate-fade-in">
      <div className="bg-[#151B21]/90 backdrop-blur-xl border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.3)] rounded-2xl p-4 flex items-center gap-4 max-w-md w-full mx-4 relative overflow-hidden group">
        
        {/* Neon Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-600/30">
          <Download className="text-white" size={24} />
        </div>

        <div className="flex-1 z-10">
          <h3 className="text-white font-bold text-sm tracking-wide">Install Urban Kanban</h3>
          <p className="text-slate-400 text-xs mt-0.5">Use on your devices seamlessly</p>
        </div>

        <button 
          onClick={handleInstallClick}
          className="bg-white text-black px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors flex items-center gap-2 z-10"
        >
          Install <Smartphone size={14} /> <Laptop size={14} />
        </button>

        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors z-10"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};