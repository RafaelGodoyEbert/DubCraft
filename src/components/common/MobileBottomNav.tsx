import React from 'react';
import { Folder, Headphones, Trophy, Shield } from 'lucide-react';
import { User } from '../../types';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/98 backdrop-blur-lg border-t border-zinc-800 md:hidden pb-safe">
      <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} h-14`}>
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center justify-center min-h-[48px] ${
            activeTab === 'projects' ? 'text-amber-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Folder className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Projetos</span>
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`flex flex-col items-center justify-center min-h-[48px] ${
            activeTab === 'review' ? 'text-amber-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Headphones className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Revisão</span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex flex-col items-center justify-center min-h-[48px] ${
            activeTab === 'ranking' ? 'text-amber-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Trophy className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Ranking</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center justify-center min-h-[48px] ${
              activeTab === 'admin' ? 'text-purple-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Admin</span>
          </button>
        )}
      </div>
    </div>
  );
};
