// bff/src/devLogin.ts — DEV-ONLY login, used when LearnHouse /auth/login is not available.
// Maps test emails to LearnHouse user ids SERVER-SIDE (bff/.env), so the app still never
// sends or stores a userId and every request still goes through a session.
// Refuses to start when NODE_ENV=production. Remove once real login works (W4).
import { timingSafeEqual } from 'node:crypto';
import type { LearnHouse } from './learnhouse.ts';

export function parseDevUsers(spec: string | undefined): Map<string, string> {
  // "asha@test.local:101,ravi@test.local:202"
  return new Map((spec ?? '').split(',').map((p) => p.trim()).filter(Boolean).map((p): [string, string] => {
    const i = p.lastIndexOf(':');
    return [p.slice(0, i).toLowerCase(), p.slice(i + 1)];
  }).filter(([e, id]) => e && /^[A-Za-z0-9_-]+$/.test(id)));
}

export function withDevLogin<T extends object>(
  lh: T,
  { users, password, env = process.env.NODE_ENV }: { users: Map<string, string>; password: string | undefined; env?: string },
): T & Pick<LearnHouse, 'login'> {
  if (env === 'production') throw new Error('LH_DEV_LOGIN must not be enabled in production');
  if (!password || password.length < 8) throw new Error('LH_DEV_PASSWORD (8+ chars) is required with LH_DEV_LOGIN');
  if (users.size === 0) throw new Error('LH_DEV_USERS is empty, e.g. you@test.local:123');
  const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
  return {
    ...lh,
    async login(email: string, pw: string) {
      const id = users.get(String(email).toLowerCase());
      if (!id || !same(String(pw), password)) return null;
      return { learnerId: id, displayName: String(email).split('@')[0] };
    },
  };
}
