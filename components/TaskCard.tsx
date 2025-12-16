import React, { useState, useRef, useEffect } from 'react';
import { Task, Attachment, User } from '../types';
import { Sparkles, Trash2, Settings2, Check, X, Mic, Image as ImageIcon, Video, Music, Paperclip, ChevronLeft, ChevronRight, Save, RotateCcw, CloudLightning } from 'lucide-react';
import { askLindaToImprove } from '../services/geminiService';
import { cloudinaryService } from '../services/cloudinary';

interface TaskCardProps {
  task: Task;
  users: User[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (task: Task) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

const ACCENT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
];

const QUICK_EMOJIS = ['🔥', '🚀', '✅', '⚠️', '👀', '🧠', '💀', '🎉'];

export const TaskCard: React.FC<TaskCardProps> = ({ task, users, onDragStart, onDelete, onUpdate, onMoveLeft, onMoveRight }) => {
  const [showToolbar, setShowToolbar] = useState(false);
  
  // Local state for immediate typing response
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localDesc, setLocalDesc] = useState(task.description);
  
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if there are unsaved changes
  const isDirty = localTitle !== task.title || localDesc !== task.description;

  useEffect(() => {
    // Sync if props update externally (and we are not dirty)
    // Or if we just saved
    setLocalTitle(task.title);
    setLocalDesc(task.description);
  }, [task.title, task.description]);

  const handleSave = () => {
    onUpdate({ 
      ...task, 
      title: localTitle, 
      description: localDesc 
    });
  };

  const handleCancel = () => {
    setLocalTitle(task.title);
    setLocalDesc(task.description);
  };

  const handleAskAi = async () => {
    setIsAiThinking(true);
    const improved = await askLindaToImprove(localTitle, localDesc);
    setLocalDesc(improved);
    onUpdate({ 
      ...task, 
      title: localTitle,
      description: improved 
    });
    setIsAiThinking(false);
  };

  // Helper to process file upload (Cloudinary OR Base64)
  const processFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      let url = '';
      let useCloud = cloudinaryService.isConfigured();

      if (useCloud) {
        try {
          url = await cloudinaryService.uploadFile(file);
        } catch (e) {
          console.error("Cloud upload failed, falling back to base64", e);
          useCloud = false;
        }
      }

      if (!useCloud) {
        // Fallback to Base64
        url = await new Promise((resolve) => {
           const reader = new FileReader();
           reader.onloadend = () => resolve(reader.result as string);
           reader.readAsDataURL(file);
        });
      }

      let type: 'image' | 'video' | 'audio' = 'image';
      if (file.type.startsWith('video/')) type = 'video';
      if (file.type.startsWith('audio/')) type = 'audio';

      const newAttachment: Attachment = {
        id: crypto.randomUUID(),
        type,
        url,
        name: file.name
      };

      onUpdate({
        ...task,
        title: localTitle,
        description: localDesc,
        attachments: [...(task.attachments || []), newAttachment]
      });

    } catch (error) {
      alert("Ошибка загрузки файла");
    } finally {
      setIsUploading(false);
    }
  };

  // Paste Handler
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault(); 
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
             processFileUpload(blob);
          }
        }
      }
    }
  };

  // Voice Input Logic
  const toggleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Ваш браузер не поддерживает голосовой ввод. Попробуйте Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const newDesc = localDesc ? `${localDesc} ${transcript}` : transcript;
      setLocalDesc(newDesc);
      onUpdate({ 
        ...task, 
        title: localTitle,
        description: newDesc 
      }); 
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Check size only if NOT using cloud (Cloudinary handles big files, but let's keep it sane)
    if (!cloudinaryService.isConfigured() && file.size > 3 * 1024 * 1024) {
      alert("Файл слишком большой для локального хранения (3МБ). Настрой Cloudinary для больших файлов!");
      return;
    }
    processFileUpload(file);
  };

  const removeAttachment = (attId: string) => {
    onUpdate({
      ...task,
      attachments: (task.attachments || []).filter(a => a.id !== attId)
    });
  };

  const insertEmoji = (emoji: string) => {
    setLocalDesc(prev => prev + emoji);
  };

  const preventDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const editorAvatars = (task.editors || [])
    .map(editorId => users.find(u => u.id === editorId))
    .filter(Boolean);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onPaste={handlePaste}
      className={`
        card-3d perspective-1000
        relative p-4 rounded-xl mb-4 
        group bg-[#151B21] border 
        ${isDirty ? 'border-amber-500/50 shadow-amber-500/10' : 'border-[#2D3748] hover:border-indigo-500/50 hover:shadow-indigo-500/10'}
        animate-fade-in
        transition-all duration-300
        hover:shadow-2xl
      `}
      style={{ borderLeft: `4px solid ${task.color}` }}
    >
      {/* Header: Title & Edit Toggle */}
      <div className="flex justify-between items-start mb-2 gap-2">
        <input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onMouseDown={preventDrag}
          placeholder="Название задачи"
          className="bg-transparent font-semibold text-lg text-white w-full outline-none border-b border-transparent focus:border-indigo-500 transition-colors placeholder:text-slate-600"
        />
        <button 
          onClick={() => setShowToolbar(!showToolbar)}
          className={`
            text-slate-500 hover:text-white transition-colors p-1 rounded
            ${showToolbar ? 'text-indigo-400 bg-indigo-500/10' : 'opacity-0 group-hover:opacity-100'}
          `}
        >
          {showToolbar ? <X size={16} /> : <Settings2 size={16} />}
        </button>
      </div>
      
      {/* Description */}
      <textarea
        value={localDesc}
        onChange={(e) => setLocalDesc(e.target.value)}
        onMouseDown={preventDrag}
        placeholder="Описание (вставьте скриншот CTRL+V)..."
        rows={Math.max(2, localDesc.split('\n').length)}
        className="w-full bg-transparent text-sm text-slate-300 whitespace-pre-wrap leading-relaxed mb-3 outline-none border-b border-transparent focus:border-indigo-500 resize-none transition-colors placeholder:text-slate-600 block"
      />

      {/* Attachments Preview */}
      {task.attachments && task.attachments.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {task.attachments.map(att => (
            <div key={att.id} className="relative group/media rounded-lg overflow-hidden border border-white/10 bg-black/40">
               <button 
                 onClick={() => removeAttachment(att.id)}
                 className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity z-10"
               >
                 <X size={12} />
               </button>
              
              {att.type === 'image' && (
                <img src={att.url} alt={att.name} className="w-full h-auto max-h-[200px] object-cover" />
              )}
              {att.type === 'video' && (
                <video src={att.url} controls className="w-full max-h-[200px]" />
              )}
              {att.type === 'audio' && (
                <div className="p-2 flex items-center gap-2">
                  <Music size={16} className="text-indigo-400" />
                  <audio src={att.url} controls className="h-8 w-full" />
                </div>
              )}
              
              {/* Cloud Badge */}
              {att.url.includes('cloudinary') && (
                <div className="absolute bottom-1 right-1 bg-black/50 text-indigo-400 p-0.5 rounded text-[8px] border border-white/10 flex items-center gap-0.5">
                   <CloudLightning size={8} /> Cloud
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="mb-3 text-xs text-indigo-400 flex items-center gap-2 animate-pulse">
           <CloudLightning size={12} /> Uploading media...
        </div>
      )}

      {/* Toolbar (Expandable) */}
      {showToolbar && (
        <div className="mb-4 bg-[#0B0E11] p-3 rounded-lg border border-white/10 animate-fade-in">
           {/* Color Picker */}
           <div className="flex gap-1 mb-3 pb-2 border-b border-white/10 overflow-x-auto custom-scrollbar">
              {ACCENT_COLORS.map(c => (
                 <button
                   key={c}
                   onClick={() => onUpdate({ ...task, color: c })}
                   className={`w-5 h-5 rounded-full flex-shrink-0 transition-transform hover:scale-125 ${task.color === c ? 'ring-2 ring-white scale-110' : ''}`}
                   style={{ backgroundColor: c }}
                 />
              ))}
            </div>

            {/* Tools */}
            <div className="flex flex-wrap gap-2 items-center">
               <button 
                onClick={toggleVoiceInput}
                className={`p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}
                title="Голосовой ввод"
              >
                <Mic size={16} />
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                title="Прикрепить файл"
              >
                <Paperclip size={16} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*,audio/*"
                onChange={handleFileInputChange}
              />

              <button
                onClick={handleAskAi}
                disabled={isAiThinking}
                className="text-xs flex items-center gap-1.5 text-indigo-400 font-bold hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-full ml-auto"
              >
                <Sparkles size={14} className={isAiThinking ? "animate-spin" : ""} />
                {isAiThinking ? "Думаю..." : "AI Improve"}
              </button>
            </div>

            {/* Emojis */}
            <div className="flex gap-1 mt-3 justify-between">
              {QUICK_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => insertEmoji(emoji)} className="hover:bg-white/10 rounded px-1 text-sm transition-colors">
                  {emoji}
                </button>
              ))}
            </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex justify-between items-center pt-2 border-t border-white/5 min-h-[32px]">
         
         <div className="flex items-center gap-2">
            {isDirty ? (
              <div className="flex items-center gap-2 animate-fade-in">
                 <button 
                   onClick={handleSave} 
                   className="bg-emerald-500 hover:bg-emerald-400 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                 >
                   <Check size={12} /> Save
                 </button>
                 <button 
                   onClick={handleCancel}
                   className="bg-white/10 hover:bg-white/20 text-slate-300 px-2 py-0.5 rounded text-xs flex items-center gap-1 transition-all active:scale-95"
                 >
                   <RotateCcw size={12} /> Cancel
                 </button>
              </div>
            ) : (
              <>
                {editorAvatars.length > 0 && (
                  <div className="flex -space-x-2 mr-2">
                    {editorAvatars.map((user, idx) => (
                      <img 
                        key={`${task.id}-editor-${idx}`} 
                        src={user?.image} 
                        alt={user?.name}
                        title={`Edited by ${user?.name}`}
                        className="w-5 h-5 rounded-full border border-[#151B21] object-cover"
                      />
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                {task.attachments?.length ? (
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 flex items-center gap-1">
                    <Paperclip size={10} /> {task.attachments.length}
                  </span>
                ) : null}
              </>
            )}
         </div>

         {!isDirty && (
          <div className="flex items-center gap-1">
            {onMoveLeft && (
              <button 
                onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
                className="text-slate-600 hover:text-indigo-400 hover:bg-white/5 p-1 rounded transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            
            {onMoveRight && (
              <button 
                onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
                className="text-slate-600 hover:text-indigo-400 hover:bg-white/5 p-1 rounded transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            )}

            <div className="w-[1px] h-4 bg-white/10 mx-1"></div>

            <button 
              onClick={() => onDelete(task.id)}
              className="text-slate-600 hover:text-red-400 hover:bg-white/5 p-1 rounded transition-all hover:rotate-12"
            >
              <Trash2 size={16} />
            </button>
          </div>
         )}
      </div>
    </div>
  );
};