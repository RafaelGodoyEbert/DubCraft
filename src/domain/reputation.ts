import { User, UserRole } from '../types';
import { REPUTATION_TIERS, REPUTATION_SETTINGS, ReputationTier } from '../config/reputation';

/**
 * Determines the tier information for a given user based on role or reputation.
 */
export function getUserTier(user: User): ReputationTier {
  if (user.role === 'admin') {
    return REPUTATION_TIERS.find((t) => t.role === 'admin') || REPUTATION_TIERS[4];
  }
  if (user.role === 'moderator') {
    return REPUTATION_TIERS.find((t) => t.role === 'moderator') || REPUTATION_TIERS[3];
  }
  if (user.isTrusted || user.role === 'trusted') {
    return REPUTATION_TIERS.find((t) => t.role === 'trusted') || REPUTATION_TIERS[2];
  }

  // Fallback to reputation score matching
  const sorted = [...REPUTATION_TIERS].sort((a, b) => b.minReputation - a.minReputation);
  for (const tier of sorted) {
    if (user.reputation >= tier.minReputation) {
      return tier;
    }
  }

  return REPUTATION_TIERS[0];
}

/**
 * Computes the effective vote weight for a user.
 */
export function calculateVoteWeight(user: User): number {
  const tier = getUserTier(user);
  let weight = tier.voteWeight;

  if (user.isTrusted) {
    weight = Math.max(weight, REPUTATION_SETTINGS.TRUSTED_REQUIRED_SCORE);
  }

  // Enforce safety cap
  return Math.min(weight, REPUTATION_SETTINGS.MAX_SINGLE_VOTE_EFFECTIVE_WEIGHT);
}

/**
 * Checks whether a proposal has reached enough score to be automatically or consensus approved.
 */
export function checkProposalConsensus(score: number, voteCount: number, isAuthorTrusted: boolean): boolean {
  if (isAuthorTrusted && REPUTATION_SETTINGS.TRUSTED_PROPOSAL_AUTO_APPROVE) {
    return score >= REPUTATION_SETTINGS.TRUSTED_REQUIRED_SCORE;
  }

  return (
    score >= REPUTATION_SETTINGS.STANDARD_APPROVAL_REQUIRED_SCORE &&
    voteCount >= REPUTATION_SETTINGS.MIN_VOTES_COUNT_FOR_CONSENSUS
  );
}
