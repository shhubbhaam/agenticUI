// bff/server.js — entry point. All secrets come from bff/.env (see bff/.env.example).
// Node >= 22 loads bff/.env natively: `node --env-file=.env server.js` (see npm start).
const { createApp } = require('./src/app');
const { createLearnHouse } = require('./src/learnhouse');
const { createGeminiAgent } = require('./src/agent');

const env = process.env;
const lh = createLearnHouse({ baseUrl: env.LH_BASE_URL, orgToken: env.LH_API_TOKEN, orgSlug: env.LH_ORG_SLUG });
const allowedCourses = new Set((env.LH_ALLOWED_COURSES ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const agent = env.GEMINI_API_KEY ? createGeminiAgent({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite' }) : null;

// Startup check prints presence only — never any part of a secret.
console.log(`LearnHouse: ${env.LH_BASE_URL} org=${env.LH_ORG_SLUG} courses=${allowedCourses.size} token=${env.LH_API_TOKEN ? 'set' : 'MISSING'} agent=${agent ? 'gemini' : 'fallback-only'}`);

const PORT = Number(env.PORT ?? 3000);
createApp({ lh, agent, allowedCourses }).listen(PORT, () => console.log(`BFF listening on http://localhost:${PORT}`));
