import React, { useState, useEffect } from 'react';
import { X, Cloud, Save, AlertTriangle, Database, Link as LinkIcon } from 'lucide-react';
import { cloudinaryService } from '../services/cloudinary';

interface SettingsModalProps {
  onClose: () => void;
  onUpdate: () => void; // New prop to trigger App refresh
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onUpdate }) => {
  // Cloudinary State
  const [cloudName, setCloudName] = useState('');
  const [preset, setPreset] = useState('');
  
  // JSONBin State
  const [binId, setBinId] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'sync'>('media');

  useEffect(() => {
    // Load Cloudinary
    const cloudConfig = cloudinaryService.getConfig();
    setCloudName(cloudConfig.cloudName);
    setPreset(cloudConfig.uploadPreset);

    // Load JSONBin
    setBinId(localStorage.getItem('urban_jsonbin_id') || '');
    setApiKey(localStorage.getItem('urban_jsonbin_key') || '');
  }, []);

  const handleSave = () => {
    // Save Cloudinary
    cloudinaryService.setConfig(cloudName.trim(), preset.trim());

    // Save JSONBin
    localStorage.setItem('urban_jsonbin_id', binId.trim());
    localStorage.setItem('urban_jsonbin_key', apiKey.trim());

    setSaved(true);
    
    // Notify App to refresh connection status without reloading page
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

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button 
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'media' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Media (Cloudinary)
          </button>
          <button 
            onClick={() => setActiveTab('sync')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'sync' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Sync (JSONBin)
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* MEDIA TAB */}
          {activeTab === 'media' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-600/20 p-3 rounded-xl text-indigo-400">
                  <Cloud size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Media Storage</h2>
                  <p className="text-xs text-slate-400">Store images & videos in Cloudinary</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-[10px] text-amber-200/80 leading-relaxed">
                    1. Go to Cloudinary <strong>Settings &gt; Upload</strong>.
                    <br/>2. Add new <strong>Upload Preset</strong>.
                    <br/>3. Set <strong>Signing Mode</strong> to <strong>Unsigned</strong>.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Cloud Name</label>
                  <input
                    type="text"
                    value={cloudName}
                    onChange={(e) => setCloudName(e.target.value)}
                    placeholder="e.g. dy7j..."
                    className="w-full bg-[#0B0E11] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Upload Preset (Unsigned)</label>
                  <input
                    type="text"
                    value={preset}
                    onChange={(e) => setPreset(e.target.value)}
                    placeholder="e.g. urban_preset"
                    className="w-full bg-[#0B0E11] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* SYNC TAB */}
          {activeTab === 'sync' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-600/20 p-3 rounded-xl text-emerald-400">
                  <Database size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Data Sync</h2>
                  <p className="text-xs text-slate-400">Sync tasks across devices via JSONBin.io</p>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3">
                  <LinkIcon className="text-blue-500 shrink-0" size={18} />
                  <p className="text-[10px] text-blue-200/80 leading-relaxed">
                    Leave blank to use <strong>Local Storage</strong> only (Offline Mode).
                    <br/>To sync: Register at jsonbin.io, create a bin, and paste ID & Key here.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Bin ID</label>
                  <input
                    type="text"
                    value={binId}
                    onChange={(e) => setBinId(e.target.value)}
                    placeholder="e.g. 69400aa9..."
                    className="w-full bg-[#0B0E11] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">X-Master-Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="e.g. $2a$10$..."
                    className="w-full bg-[#0B0E11] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
                  />
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
            {saved ? <span className="flex items-center gap-2"><Save size={18} /> Saved!</span> : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};