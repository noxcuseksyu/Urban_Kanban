import React, { useState, useEffect, useRef } from 'react';
import { Column } from './components/Column';
import { Task, ColumnId, User, UserPresence } from './types';
import { Plus, RefreshCw, Server, LogOut, Wifi, WifiOff, Database, Settings, Share2, Check, UploadCloud, Snowflake } from 'lucide-react';
import { InstallBanner } from './components/InstallBanner';
import { LoginScreen } from './components/LoginScreen';
import { apiService } from './services/api';
import { SettingsModal } from './components/SettingsModal';
import { SnowEffect } from './components/SnowEffect';

// USER DATA DEFINITION
const USERS: User[] = [
  {
    id: 1,
    name: 'Mike',
    role: 'Netrunner',
    image: 'https://i.ibb.co/xSdVH2gc/image.png', // Mike
    color: 'from-blue-600 to-indigo-600',
    delay: '0s'
  },
  {
    id: 2,
    name: 'Vika',
    role: 'Netrunner',
    image: 'https://i.ibb.co/wNF2mD6c/image.png', // Vika
    color: 'from-pink-500 to-rose-500',
    delay: '1s'
  },
  {
    id: 3,
    name: 'Artem',
    role: 'Netrunner',
    image: 'https://i.ibb.co/21c28Gnj/image.png', // Artem
    color: 'from-emerald-500 to-teal-900',
    delay: '0.5s'
  }
];

const FALLBACK_TASKS: Task[] = [
  {
    id: 'init-1',
    title: 'Waiting for Sync...',
    description: 'Connecting to Mike\'s Mainframe...',
    columnId: 'todo',
    color: '#6366f1',
    createdAt: Date.now(),
    attachments: [],
    editors: []
  }
];

const ACCENT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
];

const getRandomColor = () => ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('urban_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [dataSize, setDataSize] = useState<number>(0); 
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSnowing, setIsSnowing] = useState(() => localStorage.getItem('urban_snow') === 'true');
  
  // PRESENCE STATE
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [onlinePresence, setOnlinePresence] = useState<Record<string, UserPresence>>({});

  // Ref to prevent overwrite loops
  const tasksRef = useRef(tasks);
  const lastSaveTimeRef = useRef(0);
  
  const handleLogin = (user: User) => {
    localStorage.setItem('urban_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('urban_user');
    setCurrentUser(null);
  };

  const handleShare = () => {
    navigator.clipboard.writeText('https://urban-kanban-678150491980.us-west1.run.app');
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const toggleSnow = () => {
    const newState = !isSnowing;
    setIsSnowing(newState);
    localStorage.setItem('urban_snow', String(newState));
  };
  
  // Keep ref updated
  useEffect(() => {
    tasksRef.current = tasks;
    const jsonString = JSON.stringify(tasks);
    const bytes = new TextEncoder().encode(jsonString).length;
    setDataSize(bytes / 1024);
  }, [tasks]);

  // INITIAL LOAD & SYNC LOGIC
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch Full State
        let serverData = { tasks: [] as Task[], presence: {} as Record<string, UserPresence> };
        try {
          serverData = await apiService.getBoardData();
          setIsOnline(true);
        } catch (e) {
          console.warn("Server unreachable", e);
          setIsOnline(false);
        }

        // Local Backup
        const localBackup = localStorage.getItem('kanban-tasks');
        const localTasks = localBackup ? JSON.parse(localBackup) : [];

        // Heuristic Merge for Mike (Priority to local if has media & server is empty)
        const localHasMedia = localTasks.some((t: Task) => t.attachments && t.attachments.length > 0);
        const serverHasMedia = serverData.tasks.some((t: Task) => t.attachments && t.attachments.length > 0);

        if (localHasMedia && !serverHasMedia && isOnline) {
          console.log("🚀 MASTER OVERRIDE: Pushing local data...");
          setTasks(localTasks);
          // Sync immediately with initial presence
          await apiService.saveBoardState(localTasks, {
            userId: currentUser.id,
            lastSeen: Date.now(),
            viewingTaskId: null
          });
        } else if (serverData.tasks.length > 0) {
          console.log("☁️ Cloud wins");
          setTasks(serverData.tasks);
          setOnlinePresence(serverData.presence);
        } else if (localTasks.length > 0) {
          setTasks(localTasks);
        } else {
          setTasks([]); 
        }
      } catch (e) {
        console.error("Critical load error", e);
        setTasks(FALLBACK_TASKS);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser, refreshTrigger]);

  // POLLING SYNC & HEARTBEAT (Every 4s)
  useEffect(() => {
    if (!currentUser) return;

    const intervalId = setInterval(async () => {
      // Skip if we are currently saving to avoid race condition on PUT
      if (isSyncing) return;

      try {
        // 1. Fetch Latest
        const serverData = await apiService.getBoardData();
        
        // 2. Update Tasks if changed (Collaboration)
        if (JSON.stringify(serverData.tasks) !== JSON.stringify(tasksRef.current)) {
           // Grace Period: Don't overwrite if we saved recently (prevent race condition)
           if (Date.now() - lastSaveTimeRef.current < 5000) {
             console.log("Skipping sync: Recently saved");
             return;
           }

           if (serverData.tasks.length > 0) {
              setTasks(serverData.tasks);
           }
        }

        // 3. Update Presence State (for UI)
        setOnlinePresence(serverData.presence);
        
        setIsOnline(true);
      } catch (e) {
        setIsOnline(false);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [currentUser, isSyncing]);

  // SAVE EFFECT (Tasks + Presence)
  // Triggered when Tasks change OR when activeTaskId changes
  useEffect(() => {
    if (!loading && currentUser) {
      setIsSyncing(true);
      const timer = setTimeout(async () => {
        try {
           const myPresence: UserPresence = {
             userId: currentUser.id,
             lastSeen: Date.now(),
             viewingTaskId: activeTaskId
           };
           await apiService.saveBoardState(tasks, myPresence);
           lastSaveTimeRef.current = Date.now(); // Mark save time
           setIsOnline(true);
        } catch (e) {
           setIsOnline(false);
        } finally {
           setIsSyncing(false);
        }
      }, 1000); // Debounce
      return () => clearTimeout(timer);
    }
  }, [tasks, activeTaskId, loading, currentUser]);

  const moveTask = (taskId: string, targetColumn: ColumnId) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, columnId: targetColumn } : t
    ));
  };

  const addTask = (columnId: ColumnId, partialTask: Partial<Task>) => {
    if (!currentUser) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: partialTask.title || 'Новая задача',
      description: partialTask.description || 'Напиши что-нибудь...',
      columnId,
      color: partialTask.color || getRandomColor(),
      createdAt: Date.now(),
      attachments: [],
      editors: [currentUser.id],
      cardStyle: 'minimal' // Default style
    };
    setTasks(prev => [...prev, newTask]);
    setActiveTaskId(newTask.id); // Auto-focus new task
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const updateTask = (updatedTask: Task) => {
    if (!currentUser) return;

    setTasks(prev => prev.map(t => {
      if (t.id === updatedTask.id) {
        const currentEditors = t.editors || [];
        const newEditors = currentEditors.includes(currentUser.id) 
          ? currentEditors 
          : [...currentEditors, currentUser.id];
        
        return { ...updatedTask, editors: newEditors };
      }
      return t;
    }));
  };

  const handleForcePush = async () => {
     if(!window.confirm("Overwrite Server with THIS view?")) return;
     setLoading(true);
     try {
        await apiService.saveBoardState(tasks, {
            userId: currentUser.id,
            lastSeen: Date.now(),
            viewingTaskId: activeTaskId
        });
        lastSaveTimeRef.current = Date.now();
        alert("Server Forced Updated!");
     } catch(e) {
        alert("Error pushing");
     } finally {
        setLoading(false);
     }
  };

  const handleManualSync = async () => {
    setLoading(true);
    try {
      const data = await apiService.getBoardData();
      if (data.tasks.length > 0) {
         setTasks(data.tasks);
         setOnlinePresence(data.presence);
      }
      setIsOnline(true);
    } catch (e) {
      console.error("Manual sync failed");
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <LoginScreen users={USERS} onLogin={handleLogin} />;
  }

  const getSizeColor = () => {
    if (dataSize < 80) return "text-slate-500";
    if (dataSize < 100) return "text-amber-500";
    return "text-red-500 animate-pulse";
  };

  // Filter online users (seen in last 30s)
  const activeUsersList = USERS.filter(u => {
    if (u.id === currentUser.id) return true; // Always show self
    const presence = onlinePresence[u.id];
    return presence && (Date.now() - presence.lastSeen < 30000);
  });

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30 animate-fade-in">
      {isSnowing && <SnowEffect />}
      <div className="flex flex-col h-screen relative z-10">
        
        {/* Navbar */}
        <header className="px-3 py-2 md:px-6 md:py-4 flex items-center justify-between border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-[#050505]/70">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-20 blur-sm group-hover:opacity-40 transition duration-500"></div>
               <img src="https://i.ibb.co/QFxZxhCT/Urban-Kanban-Icon-Dark-128x128.png" alt="Logo" className="w-7 h-7 md:w-9 md:h-9 relative rounded-lg shadow-2xl object-cover" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold text-white tracking-tight">
                Urban Kanban <span className="hidden md:inline text-indigo-400 font-normal ml-2 text-xs uppercase tracking-widest border border-indigo-500/30 px-2 py-0.5 rounded-full">Pro</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             
             {/* ONLINE USERS INDICATOR */}
             <div className="flex -space-x-2 mr-2">
                {activeUsersList.map(u => (
                  <div key={u.id} className="relative group/user" title={`${u.name} is online`}>
                    <img 
                      src={u.image} 
                      className={`w-6 h-6 rounded-full border-2 border-[#0B0E11] object-cover ${u.id === currentUser.id ? 'opacity-50' : ''}`}
                    />
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#0B0E11] animate-pulse"></div>
                  </div>
                ))}
             </div>

             <div className={`hidden md:flex items-center gap-2 text-xs font-mono border border-white/5 px-2 py-1 rounded bg-black/20 ${getSizeColor()}`} title="Current JSON payload size">
                <Database size={12} />
                <span>{dataSize.toFixed(1)} KB</span>
             </div>

             <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-500">
                {isSyncing ? (
                  <span className="flex items-center gap-1 text-indigo-400"><RefreshCw size={10} className="animate-spin"/> Saving</span>
                ) : isOnline ? (
                   <span className="flex items-center gap-1 text-emerald-500"><Wifi size={10}/> Online</span>
                ) : (
                   <span className="flex items-center gap-1 text-slate-500"><WifiOff size={10}/> Offline</span>
                )}
             </div>

             <button 
                onClick={toggleSnow}
                className={`transition-colors p-1.5 rounded-lg border border-white/5 ${isSnowing ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                title="Toggle Snow Mode"
             >
                <Snowflake size={18} className={isSnowing ? 'animate-pulse' : ''} />
             </button>

            <button 
                onClick={handleShare}
                className={`text-slate-400 hover:text-white transition-colors flex items-center gap-2 ${linkCopied ? 'text-emerald-400' : ''}`}
                title="Copy Link"
             >
                {linkCopied ? <Check size={18} /> : <Share2 size={18} />}
             </button>

             <button onClick={handleForcePush} className="text-slate-600 hover:text-red-500 transition-colors" title="Force Overwrite Server">
                <UploadCloud size={18} />
             </button>

             <button 
                onClick={() => setShowSettings(true)}
                className="text-slate-400 hover:text-white transition-colors"
                title="Cloud Settings"
             >
                <Settings size={18} />
             </button>

             <button onClick={handleManualSync} className="hidden md:flex bg-white/5 border border-white/10 text-white p-2 rounded-lg hover:bg-white/10 transition-colors" title="Force Sync">
               <RefreshCw size={16} />
             </button>
             <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2" title="Logout">
               <span className="text-xs font-bold hidden md:inline">{currentUser.name}</span>
               <LogOut size={18} />
             </button>
             
          </div>
        </header>

        {/* Hero / Dashboard Area */}
        <main className="flex-1 overflow-hidden flex flex-col p-2 md:p-8 max-w-[1920px] mx-auto w-full relative">
          
          {loading && (
             <div className="absolute inset-0 bg-[#0B0E11]/80 backdrop-blur-sm z-40 flex items-center justify-center">
                <div className="animate-spin text-indigo-500"><RefreshCw size={40} /></div>
             </div>
          )}

          <div className="mb-4 md:mb-6 flex justify-between items-end">
            <div className="flex gap-4">
               <button onClick={() => addTask('todo', {})} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95 text-xs md:text-sm">
                 <Plus size={16}/> New Task
               </button>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto pb-20">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full min-h-[400px]">
              <Column 
                id="todo" 
                title="To Do" 
                tasks={tasks.filter(t => t.columnId === 'todo')} 
                users={USERS}
                currentUser={currentUser}
                presence={onlinePresence}
                onTaskMove={moveTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
                onTaskFocus={(id) => setActiveTaskId(id)}
              />
              <Column 
                id="doing" 
                title="In Progress" 
                tasks={tasks.filter(t => t.columnId === 'doing')} 
                users={USERS}
                currentUser={currentUser}
                presence={onlinePresence}
                onTaskMove={moveTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
                onTaskFocus={(id) => setActiveTaskId(id)}
              />
              <Column 
                id="done" 
                title="Completed" 
                tasks={tasks.filter(t => t.columnId === 'done')} 
                users={USERS}
                currentUser={currentUser}
                presence={onlinePresence}
                onTaskMove={moveTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
                onTaskFocus={(id) => setActiveTaskId(id)}
              />
            </div>
          </div>
        </main>
        
        {/* Footer Copyright */}
        <footer className="px-4 md:px-8 py-2 md:py-4 border-t border-white/5 flex justify-between items-center text-[10px] md:text-xs text-slate-500/50">
           <p className="font-mono">2026 © No Xcuse Production</p>
           <p>Urban Kanban v0.1.9 (Ghost Protocol)</p>
        </footer>

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal 
            onClose={() => setShowSettings(false)} 
            onUpdate={() => setRefreshTrigger(prev => prev + 1)} 
          />
        )}

        {/* PWA Install Banner */}
        <InstallBanner />
      </div>
    </div>
  );
};

export default App;