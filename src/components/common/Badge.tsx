import React from 'react';
import { UserRole } from '../../types';
import { REPUTATION_TIERS } from '../../config/reputation';

interface BadgeProps {
  role?: UserRole;
  isTrusted?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ role = 'user', isTrusted, label, size = 'md' }) => {
  const tier = REPUTATION_TIERS.find((t) => t.role === role) || REPUTATION_TIERS[0];
  const displayLabel = label || (isTrusted && role !== 'admin' ? 'Confiável (Trusted)' : tier.label);

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${tier.badgeColor} ${sizeClasses} whitespace-nowrap`}
    >
      {isTrusted && <span className="text-emerald-400 font-bold">✓</span>}
      {displayLabel}
    </span>
  );
};
