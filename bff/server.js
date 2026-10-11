// bff/server.js — entry point. All secrets come from bff/.env (see bff/.env.example).
// Node >= 22 loads bff/.env natively: `node --env-file=.env server.js` (see npm start).
const { createApp } = require('./src/app');
const { createLearnHouse } = require('./src/learnhouse');
const { createGeminiAgent } = require('./src/agent');

const env = process.env;
const { parseDevUsers, withDevLogin } = require('./src/devLogin');
let lh = createLearnHouse({ baseUrl: env.LH_BASE_URL, orgToken: env.LH_API_TOKEN, orgSlug: env.LH_ORG_SLUG });
const devLogin = env.LH_DEV_LOGIN === 'true';
if (devLogin) {
  lh = withDevLogin(lh, { users: parseDevUsers(env.LH_DEV_USERS), password: env.LH_DEV_PASSWORD });
  console.warn('WARNING: DEV LOGIN ENABLED. Test emails map to LearnHouse user ids in bff/.env. Not for production.');
}
const allowedCourses = new Set((env.LH_ALLOWED_COURSES ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const agent = env.GEMINI_API_KEY ? createGeminiAgent({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite' }) : null;

// Startup check prints presence only — never any part of a secret.
console.log(`LearnHouse: ${env.LH_BASE_URL} org=${env.LH_ORG_SLUG} courses=${allowedCourses.size} token=${env.LH_API_TOKEN ? 'set' : 'MISSING'} agent=${agent ? env.GEMINI_MODEL || 'gemini-3.5-flash-lite' : 'fallback-only (no GEMINI_API_KEY)'}`);

const PORT = Number(env.PORT ?? 3000);
createApp({ lh, agent, allowedCourses }).listen(PORT, () => console.log(`BFF listening on http://localhost:${PORT}`));
