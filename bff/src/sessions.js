// bff/src/sessions.js — opaque, expiring, in-memory sessions.
// The session is the ONLY source of learner identity for every /me route.
const crypto = require('node:crypto');

function createSessionStore({ ttlMs = 2 * 60 * 60 * 1000, now = () => Date.now() } = {}) {
  const sessions = new Map();
  return {
    create(learner) {
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = now() + ttlMs;
      sessions.set(token, { ...learner, expiresAt });
      return { token, expiresAt: new Date(expiresAt).toISOString() };
    },
    get(token) {
      const s = token && sessions.get(token);
      if (!s) return null;
      if (s.expiresAt <= now()) { sessions.delete(token); return null; }
      return s;
    },
    destroy(token) { sessions.delete(token); },
  };
}
module.exports = { createSessionStore };
