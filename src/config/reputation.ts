import { UserRole } from '../types';

export interface ReputationTier {
  role: UserRole;
  label: string;
  minReputation: number;
  voteWeight: number;
  badgeColor: string;
}

export const REPUTATION_TIERS: ReputationTier[] = [
  {
    role: 'user',
    label: 'Novo Colaborador',
    minReputation: 0,
    voteWeight: 1.0,
    badgeColor: 'bg-zinc-700 text-zinc-200 border-zinc-600',
  },
  {
    role: 'experienced',
    label: 'Colaborador Experiente',
    minReputation: 50,
    voteWeight: 1.5,
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
  },
  {
    role: 'trusted',
    label: 'Confiável (Trusted)',
    minReputation: 150,
    voteWeight: 2.0,
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  },
  {
    role: 'moderator',
    label: 'Moderador',
    minReputation: 300,
    voteWeight: 3.0,
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
  },
  {
    role: 'admin',
    label: 'Administrador',
    minReputation: 500,
    voteWeight: 5.0,
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
  },
];

export const REPUTATION_POINTS = {
  PROPOSAL_APPROVED: 10,
  TRANSCRIPTION_FIX: 10,
  TRANSLATION_APPROVED: 10,
  MINOR_FIX: 5,
  CONSENSUS_VOTE: 1,
  REJECTED_PENALTY: -5,
  SPAM_PENALTY: -20,
};

export const REPUTATION_SETTINGS = {
  // Required net score (weighted sum of upvotes minus downvotes) to pass proposal automatically or by consensus
  STANDARD_APPROVAL_REQUIRED_SCORE: 5.0,
  // Safety cap to prevent a single high-tier vote from completely bypassing community input
  MAX_SINGLE_VOTE_EFFECTIVE_WEIGHT: 5.0,
  // Trusted user fast-track auto approve settings
  TRUSTED_PROPOSAL_AUTO_APPROVE: false, // Default false as per prompt example config
  TRUSTED_REQUIRED_SCORE: 2.0,
  // Minimum votes count needed before auto-resolving
  MIN_VOTES_COUNT_FOR_CONSENSUS: 3,
};
