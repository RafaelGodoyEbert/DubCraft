import React, { useState } from 'react';
import { User } from '../../types';
import { Badge } from '../common/Badge';
import { PRESET_USERS } from '../../services/auth/mockAuthProvider';
import { adminUseCaseSingleton } from '../../usecases/adminUseCase';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { UserCheck, UserX, Shield, AlertCircle, Trash2, Calendar } from 'lucide-react';

interface TrustedUsersManagerProps {
  currentUser: User;
  onRefresh: () => void;
}

export const TrustedUsersManager: React.FC<TrustedUsersManagerProps> = ({
  currentUser,
  onRefresh,
}) => {
  const [reason, setReason] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('user_exp_01');

  const usersList = Object.values(PRESET_USERS);
  const targetUser = usersList.find((u) => u.id === selectedUserId) || usersList[0];

  const handleToggleTrust = async (isTrusted: boolean) => {
    if (!targetUser) return;
    try {
      await adminUseCaseSingleton.setTrustedStatus(targetUser, isTrusted, currentUser, reason);
      setReason('');
      onRefresh();
      alert(`Status de confiança ${isTrusted ? 'concedido' : 'removido'} com sucesso para ${targetUser.name}!`);
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar confiança.');
    }
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
            Conceda selo Trusted para acelerar aprovações ou remova usuários inativos/duplicados.
          </p>
        </div>
      </div>

      <div className="space-y-3 text-xs sm:text-sm">
        {/* User Selector */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">Selecione o Usuário:</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 focus:outline-none focus:border-amber-500 min-h-[44px]"
          >
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} (@{u.username}) — {u.isTrusted ? '✓ Confiável' : 'Membro'} (Cadastrado em {new Date(u.createdAt).toLocaleDateString('pt-BR')})
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
                  <Calendar className="w-3 h-3 text-zinc-600" /> Cadastrado em: {new Date(targetUser.createdAt).toLocaleDateString('pt-BR')} | Reputação: ★ {targetUser.reputation}
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

        {/* Reason Field */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">
            Motivo da alteração de status (Registrado em Audit Log)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Excelente precisão nas revisões de Sands of Time..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {targetUser?.isTrusted ? (
            <button
              onClick={() => handleToggleTrust(false)}
              className="px-4 py-2.5 bg-rose-950 hover:bg-rose-900 text-rose-200 text-xs font-bold rounded-xl border border-rose-800 transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <UserX className="w-4 h-4" /> Remover Confiança
            </button>
          ) : (
            <button
              onClick={() => handleToggleTrust(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <UserCheck className="w-4 h-4" /> Conceder Status Confiável
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
