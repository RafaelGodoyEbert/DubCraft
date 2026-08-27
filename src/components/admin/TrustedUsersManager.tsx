import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Badge } from '../common/Badge';
import { PRESET_USERS } from '../../services/auth/mockAuthProvider';
import { getCommunityUsers, syncCommunityUser, getAuthService } from '../../services/auth/authService';
import { adminUseCaseSingleton } from '../../usecases/adminUseCase';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { UserCheck, UserX, Shield, AlertCircle, Trash2, Calendar, Users, UserPlus, Mail } from 'lucide-react';

interface TrustedUsersManagerProps {
  currentUser: User;
  onRefresh: () => void;
}

export const TrustedUsersManager: React.FC<TrustedUsersManagerProps> = ({
  currentUser,
  onRefresh,
}) => {
  const [reason, setReason] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const isDemoMode = Boolean(currentUser.isDemo || currentUser.email === 'admin@dubcraft.io');

  const [usersList, setUsersList] = useState<User[]>(() => {
    return isDemoMode ? Object.values(PRESET_USERS) : getCommunityUsers(currentUser);
  });

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return usersList[0]?.id || '';
  });

  // Fetch users from Firebase Firestore / Cloud API automatically
  useEffect(() => {
    if (!isDemoMode) {
      try {
        const auth = getAuthService();
        if (auth && auth.fetchCommunityUsers) {
          auth.fetchCommunityUsers().then((cloudUsers) => {
            if (cloudUsers.length > 0) {
              const merged = getCommunityUsers(currentUser);
              setUsersList(merged);
            }
          });
        }
      } catch {}

      const cloudApiUrl = import.meta.env.VITE_CLOUD_API_URL;
      if (cloudApiUrl) {
        fetch(`${cloudApiUrl}/users`)
          .then((res) => (res.ok ? res.json() : []))
          .then((cloudUsers: User[]) => {
            if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
              cloudUsers.forEach((u) => syncCommunityUser(u));
              const merged = getCommunityUsers(currentUser);
              setUsersList(merged);
            }
          })
          .catch((err) => console.warn('[TrustedUsersManager] Falha ao sincronizar usuários da nuvem:', err));
      }
    }
  }, [currentUser, isDemoMode]);

  useEffect(() => {
    const list = isDemoMode ? Object.values(PRESET_USERS) : getCommunityUsers(currentUser);
    setUsersList(list);
    if (!list.some((u) => u.id === selectedUserId) && list.length > 0) {
      setSelectedUserId(list[0].id);
    }
  }, [currentUser, isDemoMode]);

  const targetUser = usersList.find((u) => u.id === selectedUserId) || usersList[0];

  const handleToggleTrust = async (isTrusted: boolean) => {
    if (!targetUser) return;
    try {
      await adminUseCaseSingleton.setTrustedStatus(targetUser, isTrusted, currentUser, reason);
      
      // Sync with cloud worker if present
      const cloudApiUrl = import.meta.env.VITE_CLOUD_API_URL;
      if (cloudApiUrl) {
        fetch(`${cloudApiUrl}/users/trust`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: targetUser.id, email: targetUser.email, isTrusted }),
        }).catch((e) => console.warn('[Cloud] Trust update error:', e));
      }

      setReason('');
      onRefresh();
      alert(`Status de confiança ${isTrusted ? 'concedido' : 'removido'} com sucesso para ${targetUser.name}!`);
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar confiança.');
    }
  };

  const [newEmailRole, setNewEmailRole] = useState<'user' | 'trusted'>('user');

  const handleAddUserByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('Informe um e-mail válido.');
      return;
    }

    const existing = usersList.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (existing) {
      setSelectedUserId(existing.id);
      alert(`O usuário com o e-mail "${cleanEmail}" já está na lista!`);
      return;
    }

    const isTrusted = newEmailRole === 'trusted';
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: cleanEmail.split('@')[0],
      username: cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_'),
      email: cleanEmail,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
      role: isTrusted ? 'trusted' : 'user',
      reputation: isTrusted ? 150 : 20,
      isTrusted: isTrusted,
      trustedGrantedBy: isTrusted ? currentUser.id : undefined,
      trustedGrantedAt: isTrusted ? new Date().toISOString() : undefined,
      trustedReason: isTrusted ? (reason || 'Promovido manualmente pelo Administrador') : undefined,
      createdAt: new Date().toISOString(),
    };

    syncCommunityUser(newUser);

    // Sync with cloud worker
    const cloudApiUrl = import.meta.env.VITE_CLOUD_API_URL;
    if (cloudApiUrl) {
      fetch(`${cloudApiUrl}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      }).catch((err) => console.warn('[Cloud] Erro ao sincronizar novo usuário:', err));
    }

    const updated = getCommunityUsers(currentUser);
    setUsersList(updated);
    setSelectedUserId(newUser.id);
    setNewEmail('');
    setReason('');
    onRefresh();
    alert(`Usuário com e-mail "${cleanEmail}" cadastrado como ${isTrusted ? 'Confiável (Trusted)' : 'Membro Comunitário'} com sucesso!`);
  };

  const handleDeleteUser = async () => {
    if (!targetUser) return;
    if (targetUser.id === currentUser.id) {
      alert('Você não pode excluir sua própria conta de administrador.');
      return;
    }

    if (confirm(`Deseja realmente remover o usuário "${targetUser.name}" (@${targetUser.username})? Isso liberará espaço e removerá registros inativos.`)) {
      try {
        await repositoryAdapterSingleton.createAuditLog({
          id: `audit_${Date.now()}`,
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'USER_DELETE',
          details: `Removeu o usuário inativo ${targetUser.name} (${targetUser.email}). Motivo: Limpeza administrativa.`,
          targetId: targetUser.id,
          createdAt: new Date().toISOString(),
        });
        alert(`Usuário ${targetUser.name} removido com sucesso.`);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir usuário.');
      }
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
        <Shield className="w-5 h-5 text-amber-400" />
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Gerenciamento & Limpeza de Colaboradores</h3>
          <p className="text-xs text-zinc-400">
            Conceda selo Trusted para acelerar aprovações ou adicione colaboradores por e-mail.
          </p>
        </div>
      </div>

      <div className="space-y-4 text-xs sm:text-sm">
        {/* User Selector */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">Colaborador Selecionado:</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 focus:outline-none focus:border-amber-500 min-h-[44px]"
          >
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.isDemo ? '[DEMO]' : ''} (@{u.username}) — {u.isTrusted ? '✓ Confiável' : 'Membro'} ({u.email || 'sem e-mail'})
              </option>
            ))}
          </select>
        </div>

        {/* Selected User Preview Card */}
        {targetUser && (
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src={targetUser.avatarUrl}
                alt={targetUser.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-amber-500/50"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-100">{targetUser.name}</span>
                  <Badge role={targetUser.role} isTrusted={targetUser.isTrusted} size="sm" />
                </div>
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-600" /> {targetUser.email || `@${targetUser.username}`} | Reputação: ★ {targetUser.reputation}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium transition-all flex items-center gap-1 min-h-[36px]"
                title="Excluir usuário inativo ou spam"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Inativo
              </button>
              <span className="text-xs font-semibold text-amber-400">
                {targetUser.isTrusted ? '✓ Trusted Granted' : 'Normal Member'}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons for Selected User */}
        <div className="flex items-center justify-end gap-2">
          {targetUser?.isTrusted ? (
            <button
              onClick={() => handleToggleTrust(false)}
              className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 text-xs font-bold rounded-xl border border-rose-800 transition-all flex items-center gap-1.5 min-h-[40px]"
            >
              <UserX className="w-4 h-4" /> Remover Confiança
            </button>
          ) : (
            <button
              onClick={() => handleToggleTrust(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 min-h-[40px]"
            >
              <UserCheck className="w-4 h-4" /> Conceder Status Confiável
            </button>
          )}
        </div>

        {/* Quick Add / Manage by Email Form */}
        {!isDemoMode && (
          <form onSubmit={handleAddUserByEmail} className="pt-3 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-amber-400" /> Cadastrar / Gerenciar Colaborador por E-mail:
              </p>
              <span className="text-[10px] text-zinc-500 italic">
                *Créditos no jogo são concedidos exclusivamente para quem tiver falas aprovadas.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ex: colaborador@exemplo.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 pl-9 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[40px]"
                />
              </div>
              <select
                value={newEmailRole}
                onChange={(e) => setNewEmailRole(e.target.value as 'user' | 'trusted')}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-500 min-h-[40px]"
              >
                <option value="user">Membro Normal (Votante)</option>
                <option value="trusted">Confiável (Trusted • Peso 2x)</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5 min-h-[40px] shrink-0"
              >
                <UserCheck className="w-3.5 h-3.5" /> Salvar Colaborador
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
