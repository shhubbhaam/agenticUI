// Pure copy for the You tab's identity line ("Marketing Manager → AI Workflow
// Builder"), built from the onboarding answers. Zero RN / network imports.
import type { GoalId, RoleId } from '../onboarding/types';

export const ROLE_TITLES: Record<RoleId, string> = {
  leadership: 'Team Leader',
  sales: 'Sales Professional',
  marketing: 'Marketing Manager',
  finance: 'Finance Lead',
  hr: 'HR & Talent Partner',
  operations: 'Operations Manager',
  product: 'Product Manager',
  engineering: 'Engineer',
};

export const GOAL_TITLES: Record<GoalId, string> = {
  'save-time': 'Time-Saving AI User',
  'lead-rollout': 'AI Rollout Leader',
  'better-decisions': 'AI-Informed Decision Maker',
  'build-own': 'AI Workflow Builder',
};

export function deriveIdentityLine(role: RoleId | null, goal: GoalId | null, fallback: string): string {
  const from = role ? ROLE_TITLES[role] : null;
  const to = goal ? GOAL_TITLES[goal] : null;
  if (from && to) return `${from} → ${to}`;
  return from ?? to ?? fallback;
}

export function deriveInitial(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}
