
// EntityProfile updated: Column Profile
// + usage: Fixed type safety in getViewersForTask by explicitly casting presence values to UserPresence.

import React from 'react';
import { Task, ColumnId, User, UserPresence } from '../types';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';
import { askLindaForIdeas } from '../services/geminiService';

interface ColumnProps {
  id: ColumnId;
  title: string;
  tasks: Task[];
  users: User[];
  currentUser: User;
  presence: Record<string, UserPresence>;
  onTaskMove: (taskId: string, targetColumn: ColumnId) => void;
  onAddTask: (columnId: ColumnId, task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (task: Task) => void;
  onTaskFocus: (taskId: string | null) => void;
}

export const Column: React.FC<ColumnProps> = ({ 
  id, title, tasks, users, currentUser, presence, 
  onTaskMove, onAddTask, onDeleteTask, onUpdateTask, onTaskFocus 
}) => {
  const [isBrainstorming, setIsBrainstorming] = React.useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      onTaskMove(taskId, id);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleBrainstorm = async () => {
    setIsBrainstorming(true);
    const ideas = await askLindaForIdeas(id);
    ideas.forEach(idea => {
      onAddTask(id, { ...idea });
    });
    setIsBrainstorming(false);
  };

  // Determine navigation targets
  const getMoveHandlers = (taskId: string) => {
    let onMoveLeft: (() => void) | undefined;
    let onMoveRight: (() => void) | undefined;

    if (id === 'doing') {
      onMoveLeft = () => onTaskMove(taskId, 'todo');
      onMoveRight = () => onTaskMove(taskId, 'done');
    } else if (id === 'todo') {
      onMoveRight = () => onTaskMove(taskId, 'doing');
    } else if (id === 'done') {
      onMoveLeft = () => onTaskMove(taskId, 'doing');
    }

    return { onMoveLeft, onMoveRight };
  };

  // Calculate Active Viewers per task
  const getViewersForTask = (taskId: string) => {
    const viewerIds: number[] = [];
    // Fix: Explicitly cast presence values to UserPresence to resolve property 'unknown' errors
    (Object.values(presence) as UserPresence[]).forEach(p => {
       if (p.viewingTaskId === taskId && 
           Date.now() - p.lastSeen < 30000 &&
           p.userId !== currentUser.id) {
           viewerIds.push(p.userId);
       }
    });
    return viewerIds.map(id => users.find(u => u.id === id)).filter(Boolean) as User[];
  };

  return (
    <div 
      className="flex-1 min-w-full md:min-w-[320px] h-full flex flex-col rounded-xl bg-[#0F1318]/50 border border-white/5 p-2 md:p-4"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center mb-2 md:mb-4 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs md:text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h2>
          <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={handleBrainstorm}
            disabled={isBrainstorming}
            className="p-1 md:p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-indigo-400 transition-colors icon-hover-spin"
            title="Generate ideas with AI"
          >
             {/* AI Icon Replacement */}
             <span className={`text-lg leading-none ${isBrainstorming ? "animate-spin block" : ""}`}>✨</span>
          </button>
          <button 
            onClick={() => onAddTask(id, {})}
            className="p-1 md:p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-white transition-colors icon-hover-wiggle"
          >
            <Plus size={14} />
          </button>
          <button className="p-1 md:p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
        {tasks.map((task, index) => {
          const { onMoveLeft, onMoveRight } = getMoveHandlers(task.id);
          return (
            <TaskCard 
              key={task.id} 
              index={index} // Pass index for staggered animation
              task={task} 
              users={users}
              viewers={getViewersForTask(task.id)}
              onDragStart={handleDragStart} 
              onDelete={onDeleteTask}
              onUpdate={onUpdateTask}
              onMoveLeft={onMoveLeft}
              onMoveRight={onMoveRight}
              onFocus={onTaskFocus}
            />
          );
        })}
        {tasks.length === 0 && (
          <div className="h-16 md:h-24 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center text-slate-600 text-[10px] md:text-xs gap-1 md:gap-2">
            <span>No tasks yet</span>
            <button onClick={() => onAddTask(id, {})} className="text-indigo-500 hover:underline">Add one</button>
          </div>
        )}
      </div>
    </div>
  );
};
