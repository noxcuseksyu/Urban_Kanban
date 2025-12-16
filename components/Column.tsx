import React from 'react';
import { Task, ColumnId, User } from '../types';
import { TaskCard } from './TaskCard';
import { Plus, BrainCircuit, MoreHorizontal } from 'lucide-react';
import { askLindaForIdeas } from '../services/geminiService';

interface ColumnProps {
  id: ColumnId;
  title: string;
  tasks: Task[];
  users: User[];
  onTaskMove: (taskId: string, targetColumn: ColumnId) => void;
  onAddTask: (columnId: ColumnId, task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (task: Task) => void;
}

export const Column: React.FC<ColumnProps> = ({ id, title, tasks, users, onTaskMove, onAddTask, onDeleteTask, onUpdateTask }) => {
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

  return (
    <div 
      className="flex-1 min-w-[320px] h-full flex flex-col rounded-xl bg-[#0F1318]/50 border border-white/5 p-4"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h2>
          <span className="text-xs text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={handleBrainstorm}
            disabled={isBrainstorming}
            className="p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-indigo-400 transition-colors"
            title="Generate ideas with AI"
          >
            <BrainCircuit size={16} className={isBrainstorming ? "animate-pulse" : ""} />
          </button>
          <button 
            onClick={() => onAddTask(id, {})}
            className="p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
          >
            <Plus size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {tasks.map(task => {
          const { onMoveLeft, onMoveRight } = getMoveHandlers(task.id);
          return (
            <TaskCard 
              key={task.id} 
              task={task} 
              users={users}
              onDragStart={handleDragStart} 
              onDelete={onDeleteTask}
              onUpdate={onUpdateTask}
              onMoveLeft={onMoveLeft}
              onMoveRight={onMoveRight}
            />
          );
        })}
        {tasks.length === 0 && (
          <div className="h-24 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center text-slate-600 text-xs gap-2">
            <span>No tasks yet</span>
            <button onClick={() => onAddTask(id, {})} className="text-indigo-500 hover:underline">Add one</button>
          </div>
        )}
      </div>
    </div>
  );
};