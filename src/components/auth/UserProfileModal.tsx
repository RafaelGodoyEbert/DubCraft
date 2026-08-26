import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { PRESET_USERS } from '../../services/auth/mockAuthProvider';
import { getAuthService } from '../../services/auth/authService';
import { UserCheck, Shield, Sparkles, Check } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserChanged: (newUser: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}) => {
  const [customName, setCustomName] = useState('');

  const handleSelectPreset = (role: UserRole) => {
    const auth = getAuthService();
    const newUser = auth.switchUserPersona(role);
    onUserChanged(newUser);
    onClose();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const auth = getAuthService();
    const newUser = auth.switchUserPersona('user', customName.trim());
    onUserChanged(newUser);
    setCustomName('');
    onClose();
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Alternar Perfil de Teste / Papel de Colaborador">
      <div className="space-y-4 text-xs sm:text-sm">
        <p className="text-zinc-400 text-xs leading-relaxed">
          Para testar o sistema desacoplado de autenticação, selecione uma persona abaixo. Cada uma possui diferentes níveis de reputação, peso de voto e permissões:
        </p>

        {/* Preset Personas List */}
        <div className="space-y-2">
          {Object.entries(PRESET_USERS).map(([key, preset]) => {
            const isCurrent = preset.id === currentUser.id;

            return (
              <div
                key={key}
                onClick={() => handleSelectPreset(preset.role)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-amber-950/30 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={preset.avatarUrl}
                    alt={preset.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-700"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-zinc-100">{preset.name}</span>
                      {preset.isTrusted && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Badge role={preset.role} isTrusted={preset.isTrusted} size="sm" />
                      <span className="text-[10px] text-amber-400 font-bold">
                        ★ {preset.reputation} pts
                      </span>
                    </div>
                  </div>
                </div>

                {isCurrent && (
                  <span className="p-1 bg-amber-500 text-zinc-950 rounded-full">
                    <Check className="w-4 h-4" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Create Custom Persona Form */}
        <form onSubmit={handleCreateCustom} className="pt-2 border-t border-zinc-800/80 space-y-2">
          <label className="block text-xs font-semibold text-zinc-300">
            Ou digite um nome para criar um novo usuário de teste:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex: Carlos Tradutor..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!customName.trim()}
              className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow disabled:opacity-50 min-h-[44px] shrink-0"
            >
              Criar & Entrar
            </button>
          </div>
        </form>
      </div>
    </Drawer>
  );
};
