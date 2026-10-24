// bff/src/sessions.ts — opaque, expiring, in-memory sessions.
// The session is the ONLY source of learner identity for every /me route.
import { randomBytes } from 'node:crypto';
import type { LearnerProfile } from './learnhouse.ts';

export interface Learner {
  learnerId: string;
  displayName: string;
  /** LearnHouse identity read at login (absent for dev login). Server-side only until GET /api/me. */
  profile?: LearnerProfile;
  email?: string;
}
export interface Session extends Learner {
  expiresAt: number;
}
export interface SessionStore {
  create(learner: Learner): { token: string; expiresAt: string };
  get(token: string | null | undefined): Session | null;
  destroy(token: string): void;
}

export function createSessionStore({
  ttlMs = 2 * 60 * 60 * 1000,
  now = () => Date.now(),
}: { ttlMs?: number; now?: () => number } = {}): SessionStore {
  const sessions = new Map<string, Session>();
  return {
    create(learner) {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = now() + ttlMs;
      sessions.set(token, { ...learner, expiresAt });
      return { token, expiresAt: new Date(expiresAt).toISOString() };
    },
    get(token) {
      const s = token ? sessions.get(token) : undefined;
      if (!s) return null;
      if (s.expiresAt <= now()) { sessions.delete(token!); return null; }
      return s;
    },
    destroy(token) { sessions.delete(token); },
  };
}
