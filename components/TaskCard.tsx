import React, { useState, useRef, useEffect } from 'react';
import { Task, Attachment, User } from '../types';
import { Trash2, Settings2, Check, X, Mic, Music, Paperclip, ChevronLeft, ChevronRight, RotateCcw, CloudLightning, PaintBucket, Loader2 } from 'lucide-react';
import { askLindaToImprove } from '../services/geminiService';
import { cloudinaryService } from '../services/cloudinary';

interface TaskCardProps {
  task: Task;
  index: number; // For staggered animation
  users: User[];
  viewers?: User[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (task: Task) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onFocus?: (id: string | null) => void;
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

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, index, users, viewers = [], 
  onDragStart, onDelete, onUpdate, onMoveLeft, onMoveRight, onFocus 
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  
  // Local state for immediate typing response
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localDesc, setLocalDesc] = useState(task.description);
  
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image Loading State map (key: attachment ID, value: loaded boolean)
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});

  // Determine if there are unsaved changes
  const isDirty = localTitle !== task.title || localDesc !== task.description;
  const isFilled = task.cardStyle === 'filled';

  // Signal focus when hovering or clicking
  const handleInteraction = () => {
    if (onFocus) onFocus(task.id);
  };
  
  useEffect(() => {
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

  const toggleCardStyle = () => {
     onUpdate({
        ...task,
        cardStyle: isFilled ? 'minimal' : 'filled'
     });
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

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  // Dynamic Styles Logic
  const cardBg = isFilled ? task.color : '#151B21';
  const textColor = isFilled ? 'text-white' : 'text-white'; 
  const borderColor = isFilled ? 'border-transparent' : isDirty ? 'border-amber-500/50' : 'border-[#2D3748]';
  const placeholderColor = isFilled ? 'placeholder:text-white/60' : 'placeholder:text-slate-600';
  const subTextColor = isFilled ? 'text-white/80' : 'text-slate-500';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onPaste={handlePaste}
      onMouseEnter={handleInteraction}
      onTouchStart={handleInteraction}
      className={`
        card-3d perspective-1000 animate-pop-in
        relative p-3 md:p-4 rounded-xl mb-3 md:mb-4 
        group border 
        ${borderColor}
        ${viewers.length > 0 ? 'ring-2 ring-indigo-500 shadow-indigo-500/20' : ''}
        transition-all duration-300
      `}
      style={{ 
        backgroundColor: cardBg,
        borderLeft: isFilled ? 'none' : `3px solid ${task.color}`,
        backgroundImage: isFilled ? 'linear-gradient(to bottom right, rgba(255,255,255,0.1), rgba(0,0,0,0.1))' : 'none',
        boxShadow: isFilled ? `0 10px 20px -5px ${task.color}40` : '',
        animationDelay: `${index * 70}ms` // STAGGERED ANIMATION
      }}
    >
      {/* Presence Indicators (Viewers) */}
      {viewers.length > 0 && (
         <div className="absolute -top-2 -right-2 flex -space-x-1 z-20">
            {viewers.map((v, i) => (
               <div key={`viewer-${i}`} className="relative">
                  <img 
                    src={v.image} 
                    className="w-5 h-5 rounded-full border border-indigo-500 object-cover shadow-lg shadow-indigo-500/50" 
                    title={`${v.name} is looking at this`}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-black"></div>
               </div>
            ))}
         </div>
      )}

      {/* Header: Title & Edit Toggle */}
      <div className="flex justify-between items-start mb-1 gap-2">
        <input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onFocus={handleInteraction}
          onMouseDown={preventDrag}
          placeholder="Название задачи"
          className={`bg-transparent font-semibold text-sm md:text-lg w-full outline-none border-b border-transparent focus:border-white/30 transition-colors leading-tight ${textColor} ${placeholderColor} drop-shadow-sm`}
        />
        <button 
          onClick={() => setShowToolbar(!showToolbar)}
          className={`
            transition-colors p-1 rounded icon-hover-spin
            ${showToolbar ? 'bg-black/20 text-white' : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white'}
          `}
        >
          {showToolbar ? <X size={14} /> : <Settings2 size={14} />}
        </button>
      </div>
      
      {/* Description */}
      <textarea
        value={localDesc}
        onChange={(e) => setLocalDesc(e.target.value)}
        onFocus={handleInteraction}
        onMouseDown={preventDrag}
        placeholder="Описание..."
        rows={Math.max(1, localDesc.split('\n').length)}
        className={`w-full bg-transparent text-[11px] md:text-sm whitespace-pre-wrap leading-relaxed mb-2 outline-none border-b border-transparent focus:border-white/30 resize-none transition-colors block ${isFilled ? 'text-white/90' : 'text-slate-300'} ${placeholderColor}`}
      />

      {/* Attachments Preview with Smooth Loading */}
      {task.attachments && task.attachments.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {task.attachments.map(att => (
            <div key={att.id} className="relative group/media rounded-lg overflow-hidden border border-white/10 bg-black/40 min-h-[100px] flex items-center justify-center">
               <button 
                 onClick={() => removeAttachment(att.id)}
                 className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity z-10 hover:scale-110"
               >
                 <X size={12} />
               </button>
              
              {att.type === 'image' && (
                <>
                  {!imagesLoaded[att.id] && (
                     <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm z-0">
                        <Loader2 size={20} className="text-indigo-500 animate-spin" />
                     </div>
                  )}
                  <img 
                    src={att.url} 
                    alt={att.name} 
                    className={`w-full h-auto max-h-[200px] object-cover relative z-1 ${imagesLoaded[att.id] ? 'img-loaded' : 'img-loading'}`} 
                    onLoad={() => setImagesLoaded(prev => ({ ...prev, [att.id]: true }))}
                  />
                </>
              )}
              {att.type === 'video' && (
                <video src={att.url} controls className="w-full max-h-[200px]" />
              )}
              {att.type === 'audio' && (
                <div className="p-2 flex items-center gap-2 w-full">
                  <Music size={16} className="text-indigo-400" />
                  <audio src={att.url} controls className="h-8 w-full" />
                </div>
              )}
              
              {/* Cloud Badge */}
              {att.url.includes('cloudinary') && (
                <div className="absolute bottom-1 right-1 bg-black/50 text-indigo-400 p-0.5 rounded text-[8px] border border-white/10 flex items-center gap-0.5 z-10">
                   <CloudLightning size={8} /> Cloud
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="mb-2 text-[10px] text-indigo-400 flex items-center gap-2 animate-pulse">
           <CloudLightning size={10} /> Uploading...
        </div>
      )}

      {/* Toolbar (Expandable) */}
      {showToolbar && (
        <div className="mb-3 bg-black/20 p-2 rounded-lg border border-white/10 animate-fade-in backdrop-blur-md">
           {/* Color Picker */}
           <div className="flex gap-1 mb-2 pb-2 border-b border-white/10 overflow-x-auto custom-scrollbar">
              {ACCENT_COLORS.map(c => (
                 <button
                   key={c}
                   onClick={() => onUpdate({ ...task, color: c })}
                   className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex-shrink-0 transition-transform hover:scale-125 ${task.color === c ? 'ring-2 ring-white scale-110' : ''}`}
                   style={{ backgroundColor: c }}
                 />
              ))}
            </div>

            {/* Tools with Vector Animations */}
            <div className="flex flex-wrap gap-2 items-center">
               <button 
                onClick={toggleVoiceInput}
                className={`p-1 rounded hover:bg-white/10 transition-colors icon-hover-pulse ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}
                title="Голосовой ввод"
              >
                <Mic size={14} />
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1 rounded hover:bg-white/10 text-slate-300 transition-colors icon-hover-wiggle"
                title="Прикрепить файл"
              >
                <Paperclip size={14} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*,audio/*"
                onChange={handleFileInputChange}
              />

              {/* Style Toggle (Paint Bucket) */}
              <button 
                onClick={toggleCardStyle}
                className={`p-1 rounded hover:bg-white/10 transition-colors icon-hover-spin ${isFilled ? 'text-indigo-400' : 'text-slate-300'}`}
                title="Залить цветом"
              >
                <PaintBucket size={14} />
              </button>

              <button
                onClick={handleAskAi}
                disabled={isAiThinking}
                className="text-[9px] md:text-xs flex items-center gap-1 text-indigo-400 font-bold hover:text-indigo-300 transition-colors bg-indigo-500/10 px-2 py-1 rounded-full ml-auto group-ai"
              >
                <span className={`text-sm ${isAiThinking ? "animate-spin block" : ""}`}>✨</span>
                {isAiThinking ? "Thinking..." : "AI Fix"}
              </button>
            </div>

            {/* Emojis */}
            <div className="flex gap-1 mt-2 justify-between">
              {QUICK_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => insertEmoji(emoji)} className="hover:bg-white/10 rounded px-0.5 text-sm transition-colors text-white hover:scale-125 duration-200">
                  {emoji}
                </button>
              ))}
            </div>
        </div>
      )}
      
      {/* Footer */}
      <div className={`flex justify-between items-center pt-2 border-t min-h-[24px] ${isFilled ? 'border-white/20' : 'border-white/5'}`}>
         
         <div className="flex items-center gap-1.5">
            {isDirty ? (
              <div className="flex items-center gap-2 animate-fade-in">
                 <button 
                   onClick={handleSave} 
                   className="bg-emerald-500 hover:bg-emerald-400 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                 >
                   <Check size={10} /> Save
                 </button>
                 <button 
                   onClick={handleCancel}
                   className="bg-white/10 hover:bg-white/20 text-slate-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-all active:scale-95"
                 >
                   <RotateCcw size={10} /> No
                 </button>
              </div>
            ) : (
              <>
                {editorAvatars.length > 0 && (
                  <div className="flex -space-x-1.5 mr-1">
                    {editorAvatars.map((user, idx) => (
                      <img 
                        key={`${task.id}-editor-${idx}`} 
                        src={user?.image} 
                        alt={user?.name}
                        title={`Edited by ${user?.name}`}
                        className="w-4 h-4 rounded-full border border-[#151B21] object-cover"
                      />
                    ))}
                  </div>
                )}

                <span className={`text-[9px] md:text-[10px] font-mono ${subTextColor}`}>
                  {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                </span>
                {task.attachments?.length ? (
                  <span className={`text-[9px] px-1 py-0 rounded flex items-center gap-1 ${isFilled ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'}`}>
                    <Paperclip size={8} /> {task.attachments.length}
                  </span>
                ) : null}
              </>
            )}
         </div>

         {!isDirty && (
          <div className="flex items-center gap-0.5">
            {onMoveLeft && (
              <button 
                onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
                className={`p-1 rounded transition-colors ${isFilled ? 'text-white/70 hover:bg-white/20 hover:text-white' : 'text-slate-600 hover:text-indigo-400 hover:bg-white/5'}`}
              >
                <ChevronLeft size={14} />
              </button>
            )}
            
            {onMoveRight && (
              <button 
                onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
                className={`p-1 rounded transition-colors ${isFilled ? 'text-white/70 hover:bg-white/20 hover:text-white' : 'text-slate-600 hover:text-indigo-400 hover:bg-white/5'}`}
              >
                <ChevronRight size={14} />
              </button>
            )}

            <div className={`w-[1px] h-3 mx-1 ${isFilled ? 'bg-white/20' : 'bg-white/10'}`}></div>

            <button 
              onClick={() => onDelete(task.id)}
              className={`p-1 rounded transition-all hover:rotate-12 ${isFilled ? 'text-white/70 hover:text-red-200 hover:bg-white/20' : 'text-slate-600 hover:text-red-400 hover:bg-white/5'}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
         )}
      </div>
    </div>
  );
};