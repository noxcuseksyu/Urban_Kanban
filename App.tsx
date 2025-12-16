import React, { useState, useEffect, useRef } from 'react';
import { Column } from './components/Column';
import { Task, ColumnId, User } from './types';
import { Layout, Plus, RefreshCw, Server, LogOut, Wifi, WifiOff, Database, Settings } from 'lucide-react';
import { InstallBanner } from './components/InstallBanner';
import { LoginScreen } from './components/LoginScreen';
import { apiService } from './services/api';
import { SettingsModal } from './components/SettingsModal';
import { cloudinaryService } from './services/cloudinary';

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

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Изучить Канбан',
    description: 'Почитать про методологию, основные принципы и как это повышает эффективность.',
    columnId: 'todo',
    color: '#6366f1', // Indigo
    createdAt: Date.now(),
    attachments: [],
    editors: [1]
  },
  {
    id: '2',
    title: 'Попробовать React',
    description: 'Создать простое приложение на React + TypeScript. 🚀',
    columnId: 'doing',
    color: '#3b82f6', // Blue
    createdAt: Date.now() - 100000,
    attachments: [],
    editors: [2, 3]
  }
];

const ACCENT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
];

const getRandomColor = () => ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [dataSize, setDataSize] = useState<number>(0); // in KB
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Used to force re-fetch
  
  // Ref to prevent overwrite loops
  const tasksRef = useRef(tasks);
  
  // Restore session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('urban_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('urban_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('urban_user');
    setCurrentUser(null);
  };
  
  // Keep ref updated
  useEffect(() => {
    tasksRef.current = tasks;
    
    // Calculate size
    const jsonString = JSON.stringify(tasks);
    const bytes = new TextEncoder().encode(jsonString).length;
    setDataSize(bytes / 1024);

  }, [tasks]);

  // Initial Load from API or LocalStorage
  useEffect(() => {
    if (!currentUser) return; // Only load if logged in

    const loadTasks = async () => {
      setLoading(true);
      try {
        const hasCloud = apiService.hasUrl();
        const serverTasks = await apiService.getTasks();
        
        // LOGIC: Protecting Local Data
        // If server returns empty array (new bin) BUT we have local data (from previous offline use)
        // We should upload local data to server instead of wiping local data.
        const localBackup = localStorage.getItem('kanban-tasks');
        const localTasks = localBackup ? JSON.parse(localBackup) : [];

        if (hasCloud && serverTasks.length === 0 && localTasks.length > 0) {
           console.log("Empty cloud detected. Syncing local tasks to cloud...");
           setTasks(localTasks);
           await apiService.saveTasks(localTasks); // Upload local to new bin
        } else if (serverTasks.length === 0 && !hasCloud) {
           // No cloud, empty server result -> Load initial or local
           setTasks(localTasks.length > 0 ? localTasks : INITIAL_TASKS);
        } else {
           // Normal case: Use server data (or empty if truly empty and no local conflict)
           setTasks(serverTasks);
        }

        setIsOnline(hasCloud);
      } catch (e) {
        console.error("Error loading tasks", e);
        // Fallback to local
        const localBackup = localStorage.getItem('kanban-tasks');
        if (localBackup) {
           setTasks(JSON.parse(localBackup));
        } else {
           setTasks(INITIAL_TASKS);
        }
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [currentUser, refreshTrigger]);

  // POLLING SYNC: Heartbeat every 5 seconds
  useEffect(() => {
    if (!currentUser || !apiService.hasUrl()) return;

    const intervalId = setInterval(async () => {
      // Don't sync if we are currently saving (isSyncing) to avoid race conditions
      if (isSyncing) return;

      try {
        const serverTasks = await apiService.getTasks();
        
        // Simple Deep Compare to avoid re-renders if data is same
        // In a real app, use a more efficient diff or CRDTs
        if (JSON.stringify(serverTasks) !== JSON.stringify(tasksRef.current)) {
           // Only update if server has MORE or DIFFERENT data (basic conflict avoidance)
           // In a real app, this needs smarter merging.
           // For now, server wins if different.
           if (serverTasks.length > 0) {
              setTasks(serverTasks);
           }
        }
        setIsOnline(true);
      } catch (e) {
        console.warn("Polling failed", e);
        setIsOnline(false);
      }
    }, 5000); // 5 seconds heartbeat

    return () => clearInterval(intervalId);
  }, [currentUser, isSyncing, refreshTrigger]);

  // Save to API/Local whenever tasks change
  useEffect(() => {
    if (!loading && currentUser) {
      setIsSyncing(true);
      const timer = setTimeout(async () => {
        try {
           await apiService.saveTasks(tasks);
           setIsOnline(true);
        } catch (e) {
           setIsOnline(false);
        } finally {
           setIsSyncing(false);
        }
      }, 1000); // Debounce save
      return () => clearTimeout(timer);
    }
  }, [tasks, loading, currentUser]);

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
      editors: [currentUser.id] // Creator is the first editor
    };
    setTasks(prev => [...prev, newTask]);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const updateTask = (updatedTask: Task) => {
    if (!currentUser) return;

    setTasks(prev => prev.map(t => {
      if (t.id === updatedTask.id) {
        // Add current user to editors list if not already there
        const currentEditors = t.editors || [];
        const newEditors = currentEditors.includes(currentUser.id) 
          ? currentEditors 
          : [...currentEditors, currentUser.id];
        
        return { ...updatedTask, editors: newEditors };
      }
      return t;
    }));
  };

  const handleManualSync = async () => {
    setLoading(true);
    try {
      const serverTasks = await apiService.getTasks();
      if (serverTasks.length > 0) {
         setTasks(serverTasks);
      }
      setIsOnline(true);
    } catch (e) {
      console.error("Manual sync failed");
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  };

  // RENDER LOGIN SCREEN IF NOT AUTHENTICATED
  if (!currentUser) {
    return <LoginScreen users={USERS} onLogin={handleLogin} />;
  }

  // Size status color logic
  const getSizeColor = () => {
    if (dataSize < 80) return "text-slate-500";
    if (dataSize < 100) return "text-amber-500";
    return "text-red-500 animate-pulse";
  };

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30 animate-fade-in">
      <div className="flex flex-col h-screen">
        
        {/* Navbar */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-[#0B0E11]/30">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-lg shadow-lg shadow-indigo-900/50">
              <Layout size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Urban Kanban <span className="text-indigo-400 font-normal ml-2 text-xs uppercase tracking-widest border border-indigo-500/30 px-2 py-0.5 rounded-full">Pro</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
             
             {/* Storage Indicator */}
             <div className={`hidden md:flex items-center gap-2 text-xs font-mono border border-white/5 px-2 py-1 rounded bg-black/20 ${getSizeColor()}`} title="Current JSON payload size">
                <Database size={12} />
                <span>{dataSize.toFixed(1)} KB</span>
             </div>

             <div className="flex items-center gap-2 text-xs text-slate-500">
                {isSyncing ? (
                  <span className="flex items-center gap-1 text-indigo-400"><RefreshCw size={12} className="animate-spin"/> Saving...</span>
                ) : isOnline ? (
                   <span className="flex items-center gap-1 text-emerald-500"><Wifi size={12}/> Online</span>
                ) : (
                   <span className="flex items-center gap-1 text-slate-500"><WifiOff size={12}/> Offline</span>
                )}
             </div>

             {/* Settings Button */}
             <button 
                onClick={() => setShowSettings(true)}
                className="text-slate-400 hover:text-white transition-colors"
                title="Cloud Settings"
             >
                <Settings size={20} />
             </button>

             <button onClick={handleManualSync} className="hidden md:flex bg-white/5 border border-white/10 text-white p-2 rounded-lg hover:bg-white/10 transition-colors" title="Force Sync">
               <RefreshCw size={16} />
             </button>
             <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2" title="Logout">
               <span className="text-xs font-bold hidden md:inline">{currentUser.name}</span>
               <LogOut size={20} />
             </button>
             <div className="w-8 h-8 rounded-full border-2 border-[#0B0E11] shadow-lg overflow-hidden">
                <img src={currentUser.image} alt="Avatar" className="w-full h-full object-cover" />
             </div>
          </div>
        </header>

        {/* Hero / Dashboard Area */}
        <main className="flex-1 overflow-hidden flex flex-col p-6 md:p-8 max-w-[1920px] mx-auto w-full relative">
          
          {loading && (
             <div className="absolute inset-0 bg-[#0B0E11]/80 backdrop-blur-sm z-40 flex items-center justify-center">
                <div className="animate-spin text-indigo-500"><RefreshCw size={40} /></div>
             </div>
          )}

          <div className="mb-6 flex justify-between items-end">
            <div className="flex gap-4">
               <button onClick={() => addTask('todo', {})} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95">
                 <Plus size={18}/> New Task
               </button>
            </div>
            
            {/* API Warning if Empty */}
            {!apiService.hasUrl() && (
              <div className="hidden md:block text-xs text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                ⚠️ Cloud sync disabled. Configure API_URL in code.
              </div>
            )}
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto pb-20">
            <div className="flex flex-col md:flex-row gap-6 h-full min-h-[400px]">
              <Column 
                id="todo" 
                title="To Do" 
                tasks={tasks.filter(t => t.columnId === 'todo')} 
                users={USERS}
                onTaskMove={moveTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
              />
              <Column 
                id="doing" 
                title="In Progress" 
                tasks={tasks.filter(t => t.columnId === 'doing')} 
                users={USERS}
                onTaskMove={moveTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
              />
              <Column 
                id="done" 
                title="Completed" 
                tasks={tasks.filter(t => t.columnId === 'done')} 
                users={USERS}
                onTaskMove={moveTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
              />
            </div>
          </div>
        </main>
        
        {/* Footer Copyright */}
        <footer className="px-8 py-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500/50">
           <p className="font-mono">2026 © No Xcuse Production</p>
           <p>Urban Kanban v0.1.1</p>
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