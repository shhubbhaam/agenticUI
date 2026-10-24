// bff/src/app.ts — authenticated BFF (W3 FB001). Zero runtime dependencies (node:http).
// Every /me route derives learner + org from the session. Course access is checked
// against a server-side allow-list; activity access against the course's published content.
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createSessionStore, type Session, type SessionStore } from './sessions.ts';
import { buildSlots, fallbackSlots, authorizeSlots, type Agent, type Decision, type BuildContext } from './agent.ts';
import type { LearnHouse, LearnerProfile, Trail } from './learnhouse.ts';
import { causeCode, type HttpError, type Logger } from './util.ts';

const UUID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_BODY = 8 * 1024;

// ---- tiny router: route('GET', '/api/me/courses/:courseUuid/meta', ...handlers) ----
export interface Req extends IncomingMessage {
  params: Record<string, string>;
  body: Record<string, unknown>;
  learner: Session;
}
export interface Res extends ServerResponse {
  status(code: number): Res;
  json(obj: unknown): Res;
}
type Next = () => Promise<void>;
type Handler = (req: Req, res: Res, next: Next) => unknown;
interface Route { method: string; path: string; re: RegExp; keys: string[]; handlers: Handler[] }

function compile(pattern: string) {
  const keys: string[] = [];
  const re = new RegExp('^' + pattern.replace(/:([A-Za-z]+)/g, (_, k: string) => { keys.push(k); return '([^/]+)'; }) + '$');
  return { re, keys };
}
function decorate(raw: ServerResponse): Res {
  const res = raw as Res;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { const b = JSON.stringify(obj); res.setHeader('Content-Type', 'application/json'); res.end(b); return res; };
  return res;
}
const withStatus = (message: string, status: number) => Object.assign(new Error(message), { status });
async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const c of req as AsyncIterable<Buffer>) { size += c.length; if (size > MAX_BODY) throw withStatus('too large', 413); chunks.push(c); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw withStatus('bad json', 400); }
}
const statusOf = (e: unknown) => (e as HttpError | null)?.status;

export interface AppOptions {
  lh: LearnHouse;
  agent?: Agent | null;
  allowedCourses: Set<string>;
  sessions?: SessionStore;
  layoutTtlMs?: number;
  logger?: Logger;
  /** The LearnHouse org this BFF serves (LH_ORG_SLUG). /api/me only returns roles in this org. */
  org?: { slug: string; name?: string };
}
export interface App {
  handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
  listen(...args: Parameters<Server['listen']>): Server;
  server(): Server;
}
interface CompletionResult { activityUuid: string; idempotencyKey: string; status: 'applied' | 'received' }

export function createApp({ lh, agent = null, allowedCourses, sessions = createSessionStore(), layoutTtlMs = 10 * 60 * 1000, logger = console, org }: AppOptions): App {
  const routes: Route[] = [];
  const route = (method: string) => (path: string, ...handlers: Handler[]) => { routes.push({ method, path, ...compile(path), handlers }); };
  const app = { get: route('GET'), post: route('POST') };
  const idempotency = new Map<string, CompletionResult>(); // `${learnerId}:${key}` -> result   (W5: move to SQLite)


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

  // Google sign-in: the app's Google SDK gets an access token; LearnHouse exchanges it for the learner.
  // The resulting LearnHouse token stays here; the app gets the same opaque BFF session as password login.
  app.post('/api/auth/google', async (req, res) => {
    const { email, accessToken } = req.body ?? {};
    if (typeof email !== 'string' || typeof accessToken !== 'string' || !email || !accessToken || email.length > 254 || accessToken.length > 4096) {
      return res.status(400).json({ error: 'invalid_request' });
    }
    if (!lh.loginWithGoogle) return res.status(501).json({ error: 'google_login_unavailable' });
    try {
      const learner = await lh.loginWithGoogle(email, accessToken);
      if (!learner) return res.status(401).json({ error: 'invalid_credentials' });
      const { token, expiresAt } = sessions.create(learner);
      res.json({ token, expiresAt, learner: { id: learner.learnerId, displayName: learner.displayName } });
    } catch {
      res.status(502).json({ error: 'upstream_unavailable' });
    }
  });

  // ---- auth gate for everything under /api/me ----
  const bearer = (req: IncomingMessage) => /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
  const requireSession: Handler = (req, res, next) => {
    const token = bearer(req);
    const session = token ? sessions.get(token) : null;
    if (!session) return res.status(401).json({ error: 'unauthenticated' });
    req.learner = session;
    return next();
  };
  const requireCourse: Handler = (req, res, next) => {
    const { courseUuid } = req.params;
    if (!UUID_RE.test(courseUuid) || !allowedCourses.has(courseUuid)) return res.status(403).json({ error: 'course_forbidden' });
    return next();
  };
  const upstreamError = (res: Res, e: unknown) => {
    // Sanitized: method, LearnHouse path and status (or network code). Never headers, tokens or bodies.
    const code = causeCode(e);
    logger.warn?.(`[upstream] ${(e as Error).message}${code ? ` (${code})` : ''}`);
    const status = statusOf(e);
    res.status(status === 404 ? 404 : 502).json({ error: status === 404 ? 'not_found' : 'upstream_error', upstreamStatus: status ?? null });
  };

  app.post('/api/auth/logout', requireSession, (req, res) => {
    sessions.destroy(bearer(req)!);
    res.statusCode = 204; res.end();
  });

  // The signed-in learner, in the shape of LearnHouse's /users/session (user + org roles), limited to
  // this BFF's org. Dev login has no LearnHouse session, so it gets a minimal synthesized one.
  app.get('/api/me', requireSession, (req, res) => {
    const s = req.learner;
    let profile: LearnerProfile = s.profile ?? {
      user: { id: Number(s.learnerId), user_uuid: `dev_${s.learnerId}`, username: s.email ?? s.displayName,
        first_name: s.displayName, last_name: '', email: s.email ?? '', avatar_image: null },
      roles: org ? [{ role: { name: 'learner' }, org: { id: 0, org_uuid: '', slug: org.slug, name: org.name ?? org.slug } }] : [],
    };
    if (org) profile = { ...profile, roles: profile.roles.filter((r) => r.org.slug === org.slug) };
    if (profile.roles.length === 0) return res.status(403).json({ error: 'not_org_member' });
    res.json(profile);
  });

  // Progress across the learner's courses, limited to the server allow-list.
  app.get('/api/me/trail', requireSession, async (req, res) => {
    if (!lh.getAllTrails) return res.status(501).json({ error: 'not_supported' });
    try {
      const all = await lh.getAllTrails(req.learner.learnerId);
      res.json({ courses: (all?.courses ?? []).filter((c) => allowedCourses.has(c.course_uuid)) });
    } catch (e) {
      if ([400, 404, 422].includes(statusOf(e) as number)) return res.json({ courses: [] }); // no progress yet
      upstreamError(res, e);
    }
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
  async function trailOrNull(learnerId: string, courseUuid: string): Promise<Trail | null> {
    try { return await lh.getTrail(learnerId, courseUuid); }
    catch (e) { if ([400, 404, 422].includes(statusOf(e) as number)) return null; throw e; }
  }

  // Published activities of an allowed course, in order.
  async function publishedActivities(courseUuid: string) {
    const meta = await lh.getCourseMeta(courseUuid);
    return (meta?.chapters ?? []).flatMap((ch) => ch.activities ?? []).filter((a) => a.published !== false);
  }
  async function isCompleted(learnerId: string, courseUuid: string, activityUuid: string) {
    const trail = await trailOrNull(learnerId, courseUuid);
    const course = trail?.courses?.find((c) => c.course_uuid === courseUuid);
    return !!course?.chapters?.some((ch) => ch.activities?.some((a) => a.activity_uuid === activityUuid && a.completed));
  }

  // Completion write + read-back. received = accepted; applied = LearnHouse trail confirms it.
  app.post('/api/me/courses/:courseUuid/activities/:activityUuid/complete', requireSession, requireCourse, async (req, res) => {
    const { courseUuid, activityUuid } = req.params;
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !UUID_RE.test(key)) return res.status(400).json({ error: 'idempotency_key_required' });
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

      let writeError: unknown = null;
      if (!(await isCompleted(learnerId, courseUuid, activityUuid))) {
        try { await lh.completeActivity(learnerId, activityUuid); } catch (e) { writeError = e; }
      }
      // Reconcile: a lost/timeout response may still have been applied upstream.
      const applied = await isCompleted(learnerId, courseUuid, activityUuid).catch(() => false);
      const result: CompletionResult = { activityUuid, idempotencyKey: key, status: applied ? 'applied' : 'received' };
      idempotency.set(cacheKey, result);
      if (!applied && writeError) {
        const code = causeCode(writeError);
        logger.warn?.(`[upstream] ${(writeError as Error).message}${code ? ` (${code})` : ''}`);
        return res.status(502).json({ ...result, error: 'upstream_write_failed', upstreamStatus: statusOf(writeError) ?? null });
      }
      res.status(applied ? 200 : 202).json(result);
    } catch (e) { upstreamError(res, e); }
  });

  // Agent layout: built here, authorized here, wrapped in the versioned envelope.
  app.get('/api/me/courses/:courseUuid/home-layout', requireSession, requireCourse, async (req, res) => {
    const { courseUuid } = req.params;
    const learnerId = req.learner.learnerId;
    try {
      const [meta, trail] = await Promise.all([lh.getCourseMeta(courseUuid), trailOrNull(learnerId, courseUuid)]);
      // Published activities in course order, with the chapter they belong to (all content comes from here).
      // Chapters with published activities. Stage label = the Path screen's rule (usePathData):
      // STAGE <trail chapter order + 1>, falling back to the chapter's position when the trail has no order.
      const chapters = (meta?.chapters ?? [])
        .map((ch) => ({ ch, acts: (ch.activities ?? []).filter((a) => a.published !== false) }))
        .filter((c) => c.acts.length > 0);
      const trailOrder = new Map((trail?.courses?.find((c) => c.course_uuid === courseUuid)?.chapters ?? [])
        .filter((c) => typeof c.order === 'number' && c.chapter_uuid).map((c) => [c.chapter_uuid as string, c.order as number]));
      const stageLabel = (ch: (typeof chapters)[number]['ch'], i: number) =>
        `STAGE ${(ch.chapter_uuid && trailOrder.has(ch.chapter_uuid) ? trailOrder.get(ch.chapter_uuid)! : i) + 1}`;
      const activities = chapters.flatMap(({ ch, acts }, ci) => acts
        .map((a) => ({ activityUuid: a.activity_uuid, name: String(a.name ?? ''), chapterName: String(ch.name ?? ''), stageLabel: stageLabel(ch, ci), activityType: a.activity_type })))
        .map((a, i) => ({ ...a, index: i + 1 }));
      const done = new Set((trail?.courses?.find((c) => c.course_uuid === courseUuid)?.chapters ?? [])
        .flatMap((ch) => ch.activities ?? []).filter((a) => a.completed).map((a) => a.activity_uuid));
      const choices = activities.filter((a) => !done.has(a.activityUuid));
      const completedList = activities.filter((a) => done.has(a.activityUuid)).slice(-3);
      const ctx: BuildContext = { course: { name: meta?.name }, choices, completed: completedList, totalCount: activities.length };
      // Telemetry is the ONLY thing the model sees. Add more signals here (last active, streak, quiz scores...).
      const signals = {
        completedCount: done.size, remainingCount: choices.length, totalCount: activities.length,
        progressPercent: activities.length ? Math.round((100 * (activities.length - choices.length)) / activities.length) : 0,
      };
      // Authorized targets: this learner's unfinished + completed published activities in this course.
      const allowed = new Set([...choices, ...completedList].map((c) => c.activityUuid));

      let decision: Decision | null = null; let source = 'fallback';
      if (agent) {
        try { decision = await agent.decide({ signals }); source = 'agent'; }
        catch (e) {
          // Status/reason only, never model text: e.g. "Gemini HTTP 404" = wrong model name for this key.
          logger.warn?.(`[agent] fallback used: ${(e as Error).name === 'TimeoutError' ? 'timeout' : (e as Error).message}`);
        }
      }
      let slots = authorizeSlots(decision ? buildSlots(decision, ctx) : fallbackSlots(ctx), allowed);
      if (!slots.mainCard && !slots.nextStepSection) { slots = authorizeSlots(fallbackSlots(ctx), allowed); source = 'fallback'; }
      logger.info?.(`[home-layout] source=${source} mainCard=${slots.mainCard?.component ?? 'none'} nextStep=${slots.nextStepSection?.component ?? 'none'}`);

      const now = Date.now();
      res.json({
        version: 1,
        layoutId: randomUUID().replace(/-/g, ''),
        learnerId, courseUuid,
        issuedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + layoutTtlMs).toISOString(),
        slots,
      });
    } catch (e) { upstreamError(res, e); }
  });

  // Sanitized request log: method, route pattern, status, ms. Never bodies, headers or tokens.
  async function handle(rawReq: IncomingMessage, rawRes: ServerResponse) {
    const req = rawReq as Req;
    const res = decorate(rawRes);
    const t = Date.now();
    const url = new URL(req.url ?? '/', 'http://bff');
    let matched: Route | null = null;
    for (const r of routes) {
      const m = r.method === req.method && r.re.exec(url.pathname);
      if (m) { matched = r; req.params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])); break; }
    }
    res.on('finish', () => logger.info?.(`${req.method} ${matched?.path ?? 'unmatched'} ${res.statusCode} ${Date.now() - t}ms`));
    if (!matched) { res.status(404).json({ error: 'not_found' }); return; }
    const handlers = matched.handlers;
    try {
      req.body = req.method === 'POST' ? await readJson(req) : {};
      let i = 0;
      const next: Next = async () => { const h = handlers[i++]; if (h) await h(req, res, next); };
      await next();
    } catch (e) {
      const status = statusOf(e);
      if (!res.headersSent) res.status(status === 413 || status === 400 ? status : 500).json({ error: status === 413 ? 'too_large' : status === 400 ? 'invalid_json' : 'internal' });
    }
  }
  return { handle, listen: (...a) => createServer(handle).listen(...a), server: () => createServer(handle) };
}
