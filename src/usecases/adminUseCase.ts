import { User, AuditLog, ReputationEvent } from '../types';
import { repositoryAdapterSingleton } from '../repositories/storageAdapter';

export class AdminUseCase {
  private repo = repositoryAdapterSingleton;

  /**
   * Grants or revokes Trusted Contributor status for a user with audit log recording.
   */
  public async setTrustedStatus(
    targetUser: User,
    isTrusted: boolean,
    adminUser: User,
    reason?: string
  ): Promise<User> {
    if (adminUser.role !== 'admin' && adminUser.role !== 'moderator') {
      throw new Error('Apenas Administradores ou Moderadores podem alterar permissões de confiança.');
    }

    targetUser.isTrusted = isTrusted;
    targetUser.trustedGrantedBy = isTrusted ? adminUser.id : undefined;
    targetUser.trustedGrantedAt = isTrusted ? new Date().toISOString() : undefined;
    targetUser.trustedReason = reason || (isTrusted ? 'Concedido pelo administrador' : 'Removido pelo administrador');

    if (isTrusted && targetUser.role === 'user') {
      targetUser.role = 'trusted';
    } else if (!isTrusted && targetUser.role === 'trusted') {
      targetUser.role = 'experienced';
    }

    const action = isTrusted ? 'TRUST_GRANT' : 'TRUST_REVOKE';
    const audit: AuditLog = {
      id: `audit_${Date.now()}`,
      userId: adminUser.id,
      userName: adminUser.name,
      action,
      details: `${isTrusted ? 'Concedeu' : 'Removeu'} status de Usuário Confiável para ${targetUser.name}. Motivo: ${
        targetUser.trustedReason
      }`,
      targetId: targetUser.id,
      createdAt: new Date().toISOString(),
    };

    await this.repo.createAuditLog(audit);
    return targetUser;
  }

  /**
   * Manually adjusts a user's reputation score with an immutable audit event.
   */
  public async adjustReputation(
    targetUser: User,
    amount: number,
    adminUser: User,
    reason: string
  ): Promise<User> {
    if (adminUser.role !== 'admin') {
      throw new Error('Apenas administradores podem ajustar a reputação manualmente.');
    }

    targetUser.reputation = Math.max(0, targetUser.reputation + amount);

    const repEvent: ReputationEvent = {
      id: `rep_${Date.now()}`,
      userId: targetUser.id,
      amount,
      type: 'manual_admin_adjustment',
      description: `Ajuste manual por ${adminUser.name}: ${reason}`,
      createdAt: new Date().toISOString(),
    };

    await this.repo.addReputationEvent(repEvent);

    const audit: AuditLog = {
      id: `audit_${Date.now()}`,
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'REPUTATION_ADJUST',
      details: `Ajustou a reputação de ${targetUser.name} em ${amount > 0 ? '+' : ''}${amount} pontos. Motivo: ${reason}`,
      targetId: targetUser.id,
      createdAt: new Date().toISOString(),
    };

    await this.repo.createAuditLog(audit);
    return targetUser;
  }
}

export const adminUseCaseSingleton = new AdminUseCase();
