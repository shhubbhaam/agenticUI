// bff/server.ts — entry point. All secrets come from bff/.env (see bff/.env.example).
// `npm start` runs `tsx --env-file=.env server.ts` (Node >= 22 loads bff/.env natively).
import { createApp } from './src/app.ts';
import { createLearnHouse, type LearnHouse } from './src/learnhouse.ts';
import { createGeminiAgent } from './src/agent.ts';
import { parseDevUsers, withDevLogin } from './src/devLogin.ts';
import { createMemoryInbox, openSqliteInbox, type Inbox } from './src/inbox.ts';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const env = process.env;
let lh: LearnHouse = createLearnHouse({ baseUrl: env.LH_BASE_URL, orgToken: env.LH_API_TOKEN, orgSlug: env.LH_ORG_SLUG, orgUuid: env.LH_ORG_UUID?.trim() || undefined });
const devLogin = env.LH_DEV_LOGIN === 'true';
if (devLogin) {
  lh = withDevLogin(lh, { users: parseDevUsers(env.LH_DEV_USERS), password: env.LH_DEV_PASSWORD });
  console.warn('WARNING: DEV LOGIN ENABLED. Test emails map to LearnHouse user ids in bff/.env. Not for production.');
}
const allowedCourses = new Set((env.LH_ALLOWED_COURSES ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const agent = env.GEMINI_API_KEY ? createGeminiAgent({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite' }) : null;

// Startup check prints presence only — never any part of a secret.
console.log(`LearnHouse: ${env.LH_BASE_URL} org=${env.LH_ORG_SLUG} courses=${allowedCourses.size} token=${env.LH_API_TOKEN ? 'set' : 'MISSING'} media=${env.LH_ORG_UUID ? 'on' : 'off (set LH_ORG_UUID)'} agent=${agent ? env.GEMINI_MODEL || 'gemini-3.5-flash-lite' : 'fallback-only (no GEMINI_API_KEY)'}`);

const PORT = Number(env.PORT ?? 3000);
// M5 durable inbox: dedupes offline events across BFF restarts. Falls back to memory (with a warning)
// on a Node without node:sqlite (< 22.5).
const inboxPath = resolve(env.BFF_INBOX_PATH || 'data/inbox.db');
let inbox: Inbox;
try {
  mkdirSync(dirname(inboxPath), { recursive: true });
  inbox = await openSqliteInbox(inboxPath);
  console.log(`Inbox: ${inboxPath}`);
} catch (e) {
  inbox = createMemoryInbox();
  console.warn(`WARNING: durable inbox unavailable (${(e as Error).message}); using memory. Needs Node >= 22.5.`);
}

createApp({ lh, agent, allowedCourses, inbox, org: env.LH_ORG_SLUG ? { slug: env.LH_ORG_SLUG } : undefined, lhOrigin: env.LH_BASE_URL ? new URL(env.LH_BASE_URL).origin : undefined }).listen(PORT, () => console.log(`BFF listening on http://localhost:${PORT}`));
