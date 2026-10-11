// bff/src/app.js — authenticated BFF (W3 FB001). Zero dependencies (node:http).
// Every /me route derives learner + org from the session. Course access is checked
// against a server-side allow-list; activity access against the course's published content.
const http = require('node:http');
const crypto = require('node:crypto');
const { createSessionStore } = require('./sessions');
const { fallbackSlots, authorizeSlots } = require('./agent');

const UUID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_BODY = 8 * 1024;

// ---- tiny router: route('GET', '/api/me/courses/:courseUuid/meta', ...handlers) ----
function compile(pattern) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  return { re, keys };
}
function decorate(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { const b = JSON.stringify(obj); res.setHeader('Content-Type', 'application/json'); res.end(b); return res; };
  return res;
}
async function readJson(req) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > MAX_BODY) { const e = new Error('too large'); e.status = 413; throw e; } chunks.push(c); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { const e = new Error('bad json'); e.status = 400; throw e; }
}

function createApp({ lh, agent = null, allowedCourses, sessions = createSessionStore(), layoutTtlMs = 10 * 60 * 1000, logger = console }) {
  const routes = [];
  const app = {};
  for (const m of ['get', 'post']) app[m] = (path, ...handlers) => routes.push({ method: m.toUpperCase(), path, ...compile(path), handlers });
  const idempotency = new Map(); // `${learnerId}:${key}` -> result   (W5: move to SQLite)


  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || email.length > 254 || password.length > 256) {
      return res.status(400).json({ error: 'invalid_request' });
    }
    try {
      const learner = await lh.login(email, password);
      if (!learner) return res.status(401).json({ error: 'invalid_credentials' });
      const { token, expiresAt } = sessions.create(learner);
      res.json({ token, expiresAt, learner: { id: learner.learnerId, displayName: learner.displayName } });
    } catch {
      res.status(502).json({ error: 'upstream_unavailable' });
    }
  });

  // ---- auth gate for everything under /api/me ----
  const requireSession = (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const session = m && sessions.get(m[1]);
    if (!session) return res.status(401).json({ error: 'unauthenticated' });
    req.learner = session;
    next();
  };
  const requireCourse = (req, res, next) => {
    const { courseUuid } = req.params;
    if (!UUID_RE.test(courseUuid) || !allowedCourses.has(courseUuid)) return res.status(403).json({ error: 'course_forbidden' });
    next();
  };
  const upstreamError = (res, e) => {
    // Sanitized: method, LearnHouse path and status (or network code). Never headers, tokens or bodies.
    logger.warn?.(`[upstream] ${e.message}${e.cause?.code ? ` (${e.cause.code})` : ''}`);
    res.status(e.status === 404 ? 404 : 502).json({ error: e.status === 404 ? 'not_found' : 'upstream_error', upstreamStatus: e.status ?? null });
  };

  app.post('/api/auth/logout', requireSession, (req, res) => {
    sessions.destroy(/^Bearer (.+)$/.exec(req.headers.authorization)[1]);
    res.statusCode = 204; res.end();
  });

  app.get('/api/me/courses/:courseUuid/meta', requireSession, requireCourse, async (req, res) => {
    try { res.json(await lh.getCourseMeta(req.params.courseUuid)); } catch (e) { upstreamError(res, e); }
  });

  app.get('/api/me/courses/:courseUuid/trail', requireSession, requireCourse, async (req, res) => {
    try {
      const trail = await trailOrNull(req.learner.learnerId, req.params.courseUuid);
      if (!trail) return res.status(404).json({ error: 'not_enrolled' });
      res.json(trail);
    } catch (e) { upstreamError(res, e); }
  });

  // LearnHouse answers 400/404/422 for a learner with no trail (not enrolled / never started).
  // Treat that as "no progress yet" instead of a server failure.
  async function trailOrNull(learnerId, courseUuid) {
    try { return await lh.getTrail(learnerId, courseUuid); }
    catch (e) { if ([400, 404, 422].includes(e.status)) return null; throw e; }
  }

  // Published activities of an allowed course, in order.
  async function publishedActivities(courseUuid) {
    const meta = await lh.getCourseMeta(courseUuid);
    return (meta?.chapters ?? []).flatMap((ch) => ch.activities ?? []).filter((a) => a.published !== false);
  }
  async function isCompleted(learnerId, courseUuid, activityUuid) {
    const trail = await trailOrNull(learnerId, courseUuid);
    const course = trail?.courses?.find((c) => c.course_uuid === courseUuid);
    return !!course?.chapters?.some((ch) => ch.activities?.some((a) => a.activity_uuid === activityUuid && a.completed));
  }

  // Completion write + read-back. received = accepted; applied = LearnHouse trail confirms it.
  app.post('/api/me/courses/:courseUuid/activities/:activityUuid/complete', requireSession, requireCourse, async (req, res) => {
    const { courseUuid, activityUuid } = req.params;
    const key = req.headers['idempotency-key'];
    if (!key || !UUID_RE.test(key)) return res.status(400).json({ error: 'idempotency_key_required' });
    if (!UUID_RE.test(activityUuid)) return res.status(400).json({ error: 'invalid_activity' });
    const learnerId = req.learner.learnerId;
    const cacheKey = `${learnerId}:${key}`;
    const prior = idempotency.get(cacheKey);
    if (prior) {
      if (prior.activityUuid !== activityUuid) return res.status(409).json({ error: 'idempotency_key_reused' });
      if (prior.status === 'applied') return res.json({ ...prior, replayed: true });
    }
    try {
      const activities = await publishedActivities(courseUuid);
      if (!activities.some((a) => a.activity_uuid === activityUuid)) return res.status(403).json({ error: 'activity_forbidden' });

      let writeError = null;
      if (!(await isCompleted(learnerId, courseUuid, activityUuid))) {
        try { await lh.completeActivity(learnerId, activityUuid); } catch (e) { writeError = e; }
      }
      // Reconcile: a lost/timeout response may still have been applied upstream.
      const applied = await isCompleted(learnerId, courseUuid, activityUuid).catch(() => false);
      const result = { activityUuid, idempotencyKey: key, status: applied ? 'applied' : 'received' };
      idempotency.set(cacheKey, result);
      if (!applied && writeError) {
        logger.warn?.(`[upstream] ${writeError.message}${writeError.cause?.code ? ` (${writeError.cause.code})` : ''}`);
        return res.status(502).json({ ...result, error: 'upstream_write_failed', upstreamStatus: writeError.status ?? null });
      }
      res.status(applied ? 200 : 202).json(result);
    } catch (e) { upstreamError(res, e); }
  });

  // Agent layout: built here, authorized here, wrapped in the versioned envelope.
  app.get('/api/me/courses/:courseUuid/home-layout', requireSession, requireCourse, async (req, res) => {
    const { courseUuid } = req.params;
    const learnerId = req.learner.learnerId;
    try {
      const [activities, trail] = await Promise.all([publishedActivities(courseUuid), trailOrNull(learnerId, courseUuid)]);
      const done = new Set((trail?.courses?.find((c) => c.course_uuid === courseUuid)?.chapters ?? [])
        .flatMap((ch) => ch.activities ?? []).filter((a) => a.completed).map((a) => a.activity_uuid));
      const choices = activities.filter((a) => !done.has(a.activity_uuid)).slice(0, 5)
        .map((a, i) => ({ activityUuid: a.activity_uuid, name: String(a.name ?? 'Activity'), position: i + 1 }));
      const completedList = activities.filter((a) => done.has(a.activity_uuid)).slice(-3)
        .map((a, i) => ({ activityUuid: a.activity_uuid, name: String(a.name ?? 'Activity'), position: i + 1 }));
      // Authorized targets: this learner's unfinished + completed published activities in this course.
      const allowed = new Set([...choices, ...completedList].map((c) => c.activityUuid));

      let slots = null; let source = 'fallback';
      if (agent) {
        try {
          const generated = await agent.generate({ choices, completed: completedList, signals: { completedCount: done.size, remainingCount: activities.length - done.size, totalCount: activities.length } });
          if (generated) { slots = authorizeSlots(generated, allowed); source = 'agent'; }
        } catch (e) {
          // Status/reason only, never model text: e.g. "Gemini HTTP 404" = wrong model name for this key.
          logger.warn?.(`[agent] fallback used: ${e.name === 'TimeoutError' ? 'timeout' : e.message}`);
        }
      }
      if (!slots || (!slots.mainCard && !slots.nextStepSection)) { slots = fallbackSlots(choices); source = 'fallback'; }
      logger.info?.(`[home-layout] source=${source} mainCard=${slots.mainCard?.component ?? 'none'} nextStep=${slots.nextStepSection?.component ?? 'none'}`);

      const now = Date.now();
      res.json({
        version: 1,
        layoutId: crypto.randomUUID().replace(/-/g, ''),
        learnerId, courseUuid,
        issuedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + layoutTtlMs).toISOString(),
        slots,
      });
    } catch (e) { upstreamError(res, e); }
  });

  // Sanitized request log: method, route pattern, status, ms. Never bodies, headers or tokens.
  async function handle(req, res) {
    decorate(res);
    const t = Date.now();
    const url = new URL(req.url, 'http://bff');
    let matched = null;
    for (const r of routes) {
      const m = r.method === req.method && r.re.exec(url.pathname);
      if (m) { matched = r; req.params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])); break; }
    }
    res.on('finish', () => logger.info?.(`${req.method} ${matched?.path ?? 'unmatched'} ${res.statusCode} ${Date.now() - t}ms`));
    if (!matched) return res.status(404).json({ error: 'not_found' });
    try {
      req.body = req.method === 'POST' ? await readJson(req) : {};
      let i = 0;
      const next = async () => { const h = matched.handlers[i++]; if (h) await h(req, res, next); };
      await next();
    } catch (e) {
      if (!res.headersSent) res.status(e.status === 413 || e.status === 400 ? e.status : 500).json({ error: e.status === 413 ? 'too_large' : e.status === 400 ? 'invalid_json' : 'internal' });
    }
  }
  return { handle, listen: (...a) => http.createServer(handle).listen(...a), server: () => http.createServer(handle) };
}
module.exports = { createApp };
