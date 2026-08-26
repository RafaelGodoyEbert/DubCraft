import {
  Proposal,
  Vote,
  User,
  Dialogue,
  ReputationEvent,
  AuditLog,
} from '../types';
import { repositoryAdapterSingleton } from '../repositories/storageAdapter';
import { calculateVoteWeight, checkProposalConsensus } from '../domain/reputation';
import { REPUTATION_POINTS } from '../config/reputation';
import { cloudSyncServiceSingleton } from '../services/cloudSyncService';

export class ProposalUseCase {
  private repo = repositoryAdapterSingleton;

  /**
   * Submits a new revision proposal for a dialogue line.
   */
  public async submitProposal(
    dialogue: Dialogue,
    author: User,
    data: {
      proposedTranslation?: string;
      proposedOriginalText?: string;
      proposedNotes?: string;
      reason?: string;
      proposedEmotion?: string;
      proposedVoiceType?: string;
      proposedPace?: string;
    }
  ): Promise<Proposal> {
    const hasTranslation = Boolean(data.proposedTranslation && data.proposedTranslation.trim());
    const hasOriginal = Boolean(data.proposedOriginalText && data.proposedOriginalText.trim());
    const hasReason = Boolean(data.reason && data.reason.trim());
    const hasNotes = Boolean(data.proposedNotes && data.proposedNotes.trim());

    if (!hasTranslation && !hasOriginal && !hasReason && !hasNotes) {
      throw new Error('A proposta deve conter ao menos uma sugestão de texto, justificativa de áudio ou notas de dublagem.');
    }

    const proposal: Proposal = {
      id: `prop_${Date.now()}`,
      dialogueId: dialogue.id,
      projectId: dialogue.projectId,
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatarUrl,
      authorReputation: author.reputation,
      authorRole: author.role,
      proposedTranslation: data.proposedTranslation ? data.proposedTranslation.trim() : undefined,
      proposedOriginalText: data.proposedOriginalText ? data.proposedOriginalText.trim() : undefined,
      proposedEmotion: data.proposedEmotion || dialogue.emocao,
      proposedVoiceType: data.proposedVoiceType || dialogue.tipo_voz,
      proposedPace: data.proposedPace || dialogue.ritmo,
      proposedNotes: data.proposedNotes ? data.proposedNotes.trim() : undefined,
      reason: data.reason ? data.reason.trim() : 'Melhoria no diálogo / tradução',
      status: 'pending',
      score: 0,
      upvotesCount: 0,
      downvotesCount: 0,
      createdAt: new Date().toISOString(),
    };

    await this.repo.createProposal(proposal as any);

    // Sync proposal to cloud backend if available
    cloudSyncServiceSingleton.submitProposal(proposal).catch(() => {});

    // Auto-vote 1 (approve) by author if allowed, or check fast track
    if (author.isTrusted) {
      // Author vote weight
      const weight = calculateVoteWeight(author);
      await this.voteProposal(proposal.id, author, 1);
    }

    return proposal;
  }

  /**
   * Casts or updates a vote on a proposal.
   */
  public async voteProposal(
    proposalId: string,
    user: User,
    voteValue: 1 | -1
  ): Promise<{ proposal: Proposal; vote: Vote }> {
    const rawProposals = await this.repo.getProposalsByDialogue('');
    // Search across project proposals
    let proposal: Proposal | null = null;
    const allProposals = await this.repo.getProposalsByProject('');
    proposal = allProposals.find((p) => p.id === proposalId) || null;

    if (!proposal) {
      // Fallback lookup
      const projects = await this.repo.getProjects();
      for (const p of projects) {
        const props = await this.repo.getProposalsByProject(p.id);
        const match = props.find((item) => item.id === proposalId);
        if (match) {
          proposal = match;
          break;
        }
      }
    }

    if (!proposal) {
      throw new Error('Proposta não encontrada.');
    }

    if (proposal.authorId === user.id && user.role !== 'admin') {
      throw new Error('Você não pode votar na sua própria proposta.');
    }

    if (proposal.status !== 'pending') {
      throw new Error('Esta proposta já foi encerrada.');
    }

    const weight = calculateVoteWeight(user);

    const vote: Vote = {
      id: `vote_${user.id}_${proposalId}`,
      proposalId,
      userId: user.id,
      value: voteValue,
      weight,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.repo.saveVote(vote);

    // Recalculate total score for proposal
    const votes = await this.repo.getVotesByProposal(proposalId);
    let totalScore = 0;
    let upvotes = 0;
    let downvotes = 0;

    votes.forEach((v) => {
      totalScore += v.value * v.weight;
      if (v.value === 1) upvotes += 1;
      if (v.value === -1) downvotes += 1;
    });

    proposal.score = Math.round(totalScore * 10) / 10;
    proposal.upvotesCount = upvotes;
    proposal.downvotesCount = downvotes;

    await this.repo.updateProposal(proposal);

    // Sync vote to cloud backend if available
    cloudSyncServiceSingleton.submitVote(vote).catch(() => {});

    // Consensus Check
    const reachConsensus = checkProposalConsensus(
      proposal.score,
      votes.length,
      user.isTrusted || proposal.authorRole === 'trusted'
    );

    if (reachConsensus) {
      await this.approveProposal(proposal, user, 'Consenso automático alcançado por votação comunitária.');
    }

    return { proposal, vote };
  }

  /**
   * Approves a proposal, applying its changes to the dialogue line and granting reputation to author.
   */
  public async approveProposal(
    proposal: Proposal,
    approver: User,
    reason: string = 'Aprovado por revisão comunitária'
  ): Promise<Dialogue> {
    const dialogue = await this.repo.getDialogueById(proposal.dialogueId);
    if (!dialogue) {
      throw new Error('Diálogo associado não encontrado.');
    }

    // Apply translation & original text & fields
    if (proposal.proposedTranslation && proposal.proposedTranslation.trim()) {
      dialogue.traducao_ptbr = proposal.proposedTranslation.trim();
    }
    if (proposal.proposedOriginalText && proposal.proposedOriginalText.trim()) {
      dialogue.texto_original = proposal.proposedOriginalText.trim();
    }
    if (proposal.proposedEmotion) dialogue.emocao = proposal.proposedEmotion;
    if (proposal.proposedVoiceType) dialogue.tipo_voz = proposal.proposedVoiceType;
    if (proposal.proposedPace) dialogue.ritmo = proposal.proposedPace;
    if (proposal.proposedNotes) dialogue.notas_dublagem = proposal.proposedNotes;
    dialogue.isReviewed = true;
    dialogue.activeProposalId = proposal.id;
    dialogue.updatedAt = new Date().toISOString();

    await this.repo.updateDialogue(dialogue);

    // Update proposal status
    proposal.status = 'approved';
    proposal.resolvedAt = new Date().toISOString();
    proposal.resolvedBy = approver.name;
    await this.repo.updateProposal(proposal);

    // Record Reputation Event for Author
    const repEvent: ReputationEvent = {
      id: `rep_${Date.now()}`,
      userId: proposal.authorId,
      amount: REPUTATION_POINTS.PROPOSAL_APPROVED,
      type: 'proposal_approved',
      description: `Proposta aprovada para a fala #${dialogue.lineIndex + 1} em ${proposal.projectId}`,
      relatedEntityId: proposal.id,
      createdAt: new Date().toISOString(),
    };
    await this.repo.addReputationEvent(repEvent);

    // Create Audit Log
    const audit: AuditLog = {
      id: `audit_${Date.now()}`,
      userId: approver.id,
      userName: approver.name,
      action: 'PROPOSAL_APPROVE',
      details: `Aprovou a proposta de ${proposal.authorName}: "${proposal.proposedTranslation}" (${reason})`,
      targetId: proposal.id,
      createdAt: new Date().toISOString(),
    };
    await this.repo.createAuditLog(audit);

    // Update Project Reviewed Count
    const project = await this.repo.getProjectById(dialogue.projectId);
    if (project) {
      if (project.pendingProposalsCount > 0) {
        project.pendingProposalsCount -= 1;
      }
      const dialogues = await this.repo.getDialoguesByProject(dialogue.projectId);
      project.reviewedLines = dialogues.filter((d) => d.isReviewed).length;
      await this.repo.updateProject(project);
    }

    return dialogue;
  }

  /**
   * Rejects a proposal.
   */
  public async rejectProposal(
    proposal: Proposal,
    rejecter: User,
    reason: string = 'Rejeitado na revisão'
  ): Promise<Proposal> {
    proposal.status = 'rejected';
    proposal.resolvedAt = new Date().toISOString();
    proposal.resolvedBy = rejecter.name;
    await this.repo.updateProposal(proposal);

    // Penalty optional if spam
    const repEvent: ReputationEvent = {
      id: `rep_${Date.now()}`,
      userId: proposal.authorId,
      amount: REPUTATION_POINTS.REJECTED_PENALTY,
      type: 'rejected_penalty',
      description: `Proposta não aprovada na revisão: ${reason}`,
      relatedEntityId: proposal.id,
      createdAt: new Date().toISOString(),
    };
    await this.repo.addReputationEvent(repEvent);

    const audit: AuditLog = {
      id: `audit_${Date.now()}`,
      userId: rejecter.id,
      userName: rejecter.name,
      action: 'PROPOSAL_REJECT',
      details: `Rejeitou a proposta de ${proposal.authorName} (${reason})`,
      targetId: proposal.id,
      createdAt: new Date().toISOString(),
    };
    await this.repo.createAuditLog(audit);

    // Update project pending proposal count
    const project = await this.repo.getProjectById(proposal.projectId);
    if (project && project.pendingProposalsCount > 0) {
      project.pendingProposalsCount -= 1;
      await this.repo.updateProject(project);
    }

    return proposal;
  }
}

export const proposalUseCaseSingleton = new ProposalUseCase();
