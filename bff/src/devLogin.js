// bff/src/devLogin.js — DEV-ONLY login, used when LearnHouse /auth/login is not available.
// Maps test emails to LearnHouse user ids SERVER-SIDE (bff/.env), so the app still never
// sends or stores a userId and every request still goes through a session.
// Refuses to start when NODE_ENV=production. Remove once real login works (W4).
const crypto = require('node:crypto');

function parseDevUsers(spec) {
  // "asha@test.local:101,ravi@test.local:202"
  return new Map((spec ?? '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.lastIndexOf(':');
    return [p.slice(0, i).toLowerCase(), p.slice(i + 1)];
  }).filter(([e, id]) => e && /^[A-Za-z0-9_-]+$/.test(id)));
}

function withDevLogin(lh, { users, password, env = process.env.NODE_ENV }) {
  if (env === 'production') throw new Error('LH_DEV_LOGIN must not be enabled in production');
  if (!password || password.length < 8) throw new Error('LH_DEV_PASSWORD (8+ chars) is required with LH_DEV_LOGIN');
  if (users.size === 0) throw new Error('LH_DEV_USERS is empty, e.g. you@test.local:123');
  const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  return {
    ...lh,
    async login(email, pw) {
      const id = users.get(String(email).toLowerCase());
      if (!id || !same(String(pw), password)) return null;
      return { learnerId: id, displayName: String(email).split('@')[0] };
    },
  };
}
module.exports = { parseDevUsers, withDevLogin };
