import React, { useState } from 'react';
import { X, Cloud, Save, AlertTriangle, Database, Link as LinkIcon, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { cloudinaryService } from '../services/cloudinary';
import { apiService } from '../services/api';

interface SettingsModalProps {
  onClose: () => void;
  onUpdate: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onUpdate }) => {
  // Initialize state with EFFECTIVE config (defaults included)
  const [cloudName, setCloudName] = useState(() => cloudinaryService.getConfig().cloudName);
  const [preset, setPreset] = useState(() => cloudinaryService.getConfig().uploadPreset);
  const [showPreset, setShowPreset] = useState(false);
  
  const [binId, setBinId] = useState(() => apiService.getEffectiveConfig().binId);
  const [apiKey, setApiKey] = useState(() => apiService.getEffectiveConfig().apiKey);
  const [showKey, setShowKey] = useState(false);

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'sync'>('media');

  const handleSave = () => {
    // Save to local storage (overrides defaults if changed, or persists current)
    cloudinaryService.setConfig(cloudName.trim(), preset.trim());

    localStorage.setItem('urban_jsonbin_id', binId.trim());
    localStorage.setItem('urban_jsonbin_key', apiKey.trim());

    setSaved(true);
    onUpdate();

    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#151B21] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Header with Directive Badge */}
        <div className="p-6 pb-2">
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} /> AUTO-CONFIGURED
                </span>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 mx-6">
          <button 
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'media' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Media
          </button>
          <button 
            onClick={() => setActiveTab('sync')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'sync' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Sync
          </button>
        </div>

        <div className="p-6 pt-4 overflow-y-auto custom-scrollbar">
          
          {/* MEDIA TAB */}
          {activeTab === 'media' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600/20 p-2.5 rounded-xl text-indigo-400">
                  <Cloud size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Cloudinary</h2>
                  <p className="text-xs text-slate-400">Media storage credentials</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Cloud Name</label>
                  <input
                    type="text"
                    value={cloudName}
                    onChange={(e) => setCloudName(e.target.value)}
                    className="w-full bg-[#0B0E11] border border-white/10 rounded-lg px-4 py-3 text-emerald-400 font-bold focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Upload Preset</label>
                  <div className="relative">
                    <input
                      type={showPreset ? "text" : "password"}
                      value={preset}
                      onChange={(e) => setPreset(e.target.value)}
                      className="w-full bg-[#0B0E11] border border-white/10 rounded-lg px-4 py-3 text-emerald-400 font-bold focus:border-indigo-500 outline-none transition-colors font-mono text-sm pr-10"
                    />
                    <button 
                      onClick={() => setShowPreset(!showPreset)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPreset ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SYNC TAB */}
          {activeTab === 'sync' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-600/20 p-2.5 rounded-xl text-emerald-400">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">JSONBin.io</h2>
                  <p className="text-xs text-slate-400">Database synchronization</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Bin ID</label>
                  <input
                    type="text"
                    value={binId}
                    onChange={(e) => setBinId(e.target.value)}
                    className="w-full bg-[#0B0E11] border border-white/10 rounded-lg px-4 py-3 text-emerald-400 font-bold focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Master Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-[#0B0E11] border border-white/10 rounded-lg px-4 py-3 text-emerald-400 font-bold focus:border-indigo-500 outline-none transition-colors font-mono text-sm pr-10"
                    />
                     <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleSave}
            className={`w-full mt-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              saved 
              ? 'bg-emerald-500 text-white' 
              : 'bg-white text-black hover:bg-slate-200'
            }`}
          >
            {saved ? <span className="flex items-center gap-2"><Save size={18} /> Saved!</span> : 'Update Config'}
          </button>
        </div>
      </div>
    </div>
  );
};