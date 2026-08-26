import React from 'react';
import { User } from '../../types';
import { Badge } from './Badge';
import { Sparkles, UserCheck, Shield, FolderGit2, Headphones, Trophy, LogIn } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  onOpenProfileModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenProfileModal,
  activeTab,
  setActiveTab,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Logo */}
        <div
          onClick={() => setActiveTab('projects')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-zinc-100 tracking-tight">DubCraft</span>
              <span className="text-xs font-semibold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                Studio
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 -mt-0.5 hidden sm:block">Revisão & Dublagem Profissional</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'projects'
                ? 'bg-zinc-800 text-amber-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" /> Projetos
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'bg-zinc-800 text-amber-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" /> Revisão
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ranking'
                ? 'bg-zinc-800 text-amber-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Ranking
          </button>
          
          {/* Admin Panel button - ONLY visible for Admin */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-purple-900/60 text-purple-200 border border-purple-600/60 shadow'
                  : 'bg-purple-950/30 text-purple-400 border border-purple-800/40 hover:bg-purple-900/40'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" /> Painel Admin
            </button>
          )}
        </nav>

        {/* User Account / Login Button */}
        {currentUser ? (
          <button
            onClick={onOpenProfileModal}
            className="flex items-center gap-2 p-1.5 bg-zinc-950 hover:bg-zinc-800 rounded-xl border border-zinc-800/80 transition-all min-h-[44px] min-w-[44px]"
            title="Minha Conta & Perfil"
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-amber-500/40"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                {currentUser.name}
                {currentUser.isTrusted && <UserCheck className="w-3 h-3 text-emerald-400" />}
              </div>
              <div className="flex items-center gap-1">
                <Badge role={currentUser.role} isTrusted={currentUser.isTrusted} size="sm" />
                <span className="text-[10px] font-bold text-amber-400">★ {currentUser.reputation}</span>
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={onOpenProfileModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 min-h-[44px]"
          >
            <LogIn className="w-4 h-4" /> Entrar
          </button>
        )}
      </div>
    </header>
  );
};
