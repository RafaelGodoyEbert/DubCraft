export type UserRole = 'user' | 'experienced' | 'trusted' | 'moderator' | 'admin';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  emailVerified?: boolean;
  avatarUrl: string;
  role: UserRole;
  reputation: number;
  isTrusted: boolean;
  isDemo?: boolean;
  trustedGrantedBy?: string;
  trustedGrantedAt?: string;
  trustedReason?: string;
  createdAt: string;
}

export type ProjectStatus = 'active' | 'completed' | 'paused';

export interface ReputationEvent {
  id: string;
  userId: string;
  amount: number;
  type: 
    | 'proposal_approved'
    | 'transcription_fix'
    | 'translation_approved'
    | 'minor_fix'
    | 'consensus_vote'
    | 'spam_penalty'
    | 'rejected_penalty'
    | 'manual_admin_adjustment';
  description: string;
  relatedEntityId?: string; // e.g. proposalId
  createdAt: string;
}

export interface Dialogue {
  id: string;
  projectId: string;
  subfolder?: string; // e.g. "lvl00_veblensk_city", "lvl01_trenches"
  cutsceneName: string; // e.g. "briefing.json"
  lineIndex: number;
  texto_original: string;
  traducao_ptbr: string;
  emocao: 'neutro' | 'raiva' | 'tristeza' | 'alegria' | 'susto' | 'gritando' | 'sussurrando' | string;
  tipo_voz: 'masculino_adulto' | 'feminino_adulto' | 'monstro' | 'crianca' | 'anciao' | string;
  notas_dublagem: string;
  status: 'cutscene' | 'in_game' | 'gameplay' | 'system' | string;
  ritmo: 'lento' | 'normal' | 'rapido' | string;
  comentarios: string;
  speed_factor: number;
  audioOriginalUrl?: string;
  audioDubladoUrl?: string;
  isReviewed: boolean;
  activeProposalId?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  status: ProjectStatus; // 'active' | 'completed' | 'paused'
  totalLines: number;
  reviewedLines: number;
  pendingProposalsCount: number;
  contributorsCount: number;
  cutscenesCount: number;
  githubRepo?: string; // e.g. "dubcraft/black-dublagem"
  githubBranch?: string; // default "main"
  githubPath?: string; // subfolder in repo if any
  fontFamily?: string;
  editorConfig?: Record<string, any>;
  huggingFaceDatasetUrl?: string;
  dubbedAudioBaseUrl?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface Proposal {
  id: string;
  dialogueId: string;
  projectId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorReputation: number;
  authorRole: UserRole;
  proposedTranslation?: string;
  proposedOriginalText?: string;
  proposedEmotion?: string;
  proposedVoiceType?: string;
  proposedPace?: string;
  proposedNotes?: string;
  proposedStatus?: 'ignorar' | 'dublado' | 'gameplay';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  score: number; // weighted score sum
  upvotesCount: number;
  downvotesCount: number;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface Vote {
  id: string;
  proposalId: string;
  userId: string;
  value: 1 | -1; // 1 = Approve, -1 = Reject
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 
    | 'PROPOSAL_APPROVE'
    | 'PROPOSAL_REJECT'
    | 'TRUST_GRANT'
    | 'TRUST_REVOKE'
    | 'REPUTATION_ADJUST'
    | 'PROJECT_EXPORT'
    | 'USER_DELETE'
    | 'ROLLBACK';
  details: string;
  targetId?: string;
  createdAt: string;
}

export interface ProjectContributor {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: UserRole;
  role?: UserRole;
  reputation: number;
  projectId?: string;
  approvedCount?: number;
  acceptedProposals?: number;
  totalProposals: number;
  totalVotes?: number;
}

export type ExportFormat = 'txt' | 'markdown' | 'json';
