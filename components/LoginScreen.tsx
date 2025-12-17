import React, { useState } from 'react';
import { Lock, ArrowRight, X } from 'lucide-react';
import { User } from '../types';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleUserClick = (id: number) => {
    setSelectedUserId(id);
    setPassword('');
    setError(false);
  };

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (password === '123') {
      const user = users.find(u => u.id === selectedUserId);
      if (user) onLogin(user);
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambience (Overlay on top of global body gradient) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 text-center mb-12 flex flex-col items-center">
        {/* Logo Added Here */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
          <img 
            src="https://i.ibb.co/7NpZ5my4/Urban-Kanban-Icon-Dark-256x256.png" 
            alt="Urban Kanban Logo" 
            className="w-24 h-24 md:w-32 md:h-32 relative drop-shadow-2xl animate-fade-in" 
          />
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2 drop-shadow-2xl">
          URBAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">KANBAN</span>
        </h1>
        <p className="text-slate-400 tracking-widest text-xs uppercase">Select your netrunner</p>
      </div>

      {/* Avatars Container */}
      {!selectedUserId ? (
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 z-10 items-center justify-center">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => handleUserClick(u.id)}
              className="group relative flex flex-col items-center focus:outline-none"
              style={{ animation: `float 6s ease-in-out infinite ${u.delay}` }}
            >
              {/* Glow Ring */}
              <div className={`absolute -inset-4 bg-gradient-to-tr ${u.color} opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-500 rounded-full`} />
              
              {/* Image Container */}
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-white/10 to-transparent border border-white/10 backdrop-blur-md relative overflow-hidden transition-transform duration-300 group-hover:scale-110 shadow-2xl">
                <img 
                  src={u.image} 
                  alt={u.name} 
                  className="w-full h-full object-cover rounded-full transition-all duration-500"
                />
              </div>
              
              {/* Name Tag */}
              <div className="mt-4 text-center opacity-80 group-hover:opacity-100 transition-opacity">
                <h3 className="text-white font-bold text-lg">{u.name}</h3>
                <p className="text-xs text-indigo-400 font-mono">{u.role}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Password Modal */
        <div className="z-20 animate-fade-in w-full max-w-sm px-4">
          <div className="bg-[#151B21]/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative">
            <button 
              onClick={() => setSelectedUserId(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                 <img src={selectedUser?.image} alt={selectedUser?.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl text-white font-bold">Welcome back, {selectedUser?.name}</h3>
            </div>

            <form onSubmit={handleLogin} className="relative">
              <div className={`flex items-center bg-[#0B0E11]/50 border ${error ? 'border-red-500 animate-pulse' : 'border-white/10 focus-within:border-indigo-500'} rounded-xl px-4 py-3 transition-colors`}>
                <Lock size={18} className="text-slate-500 mr-3" />
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  placeholder="Password"
                  className="bg-transparent border-none outline-none text-white w-full placeholder:text-slate-600"
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-2 absolute -bottom-6">Incorrect password</p>}
              
              <button 
                type="submit" 
                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group"
              >
                Enter System 
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Animation Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
};