// bff/src/app.ts — authenticated BFF (W3 FB001). Zero runtime dependencies (node:http).
// Every /me route derives learner + org from the session. Course access is checked
// against a server-side allow-list; activity access against the course's published content.
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';
import { createSessionStore, type Session, type SessionStore } from './sessions.ts';
import { buildSlots, fallbackSlots, authorizeSlots, type Agent, type Decision, type BuildContext } from './agent.ts';
import type { LearnHouse, LearnerProfile, Trail } from './learnhouse.ts';
import { causeCode, type HttpError, type Logger } from './util.ts';
import { createMemoryInbox, type Inbox, type EventType, type InboxStatus } from './inbox.ts';
import { LessonVideoResponseSchema, youTubeIdFrom, type LessonVideo } from '../../src/contracts/lessonVideo.ts';
import type { LhActivityFull, LearnerApi } from './learnhouse.ts';
import { resolveDeck, deckVersion, type DeckLocator } from './slides.ts';
import { assignmentUuidFrom, quizFrom, savedTasksFrom, taskSubmissionBody, unknownAnswer, gradeFrom, retriesLeftFrom } from './assignments.ts';
import { SlideDeckResponseSchema } from '../../src/contracts/slides.ts';
import { AssignmentEventPayloadSchema, EVENT_SCHEMA_VERSION } from '../../src/contracts/events.ts';
import { parseHomeLayout, SLOT_NAMES } from '../../src/contracts/homeLayout.ts';
import { AssignmentQuizSchema, AssignmentGradeSchema, SavedAnswersResponseSchema, SubmitRequestSchema, RetryResponseSchema, type AssignmentQuiz } from '../../src/contracts/assignment.ts';

/** LearnHouse's player options arrive as an object or a JSON string; keep sane whole seconds only. */
function playerWindow(details: unknown): { startSec?: number; endSec?: number } {
  let d: unknown = details;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return {}; } }
  const o = (d ?? {}) as { startTime?: unknown; endTime?: unknown };
  const sec = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 86400 ? Math.floor(v) : undefined);
  const startSec = sec(o.startTime), endSec = sec(o.endTime);
  return { ...(startSec ? { startSec } : {}), ...(endSec && endSec > (startSec ?? 0) ? { endSec } : {}) };
}

const VIDEO_MIME = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' } as const;
/** An uploaded video's file name, only if it is a plain file name with a known video extension (no paths). */
export function hostedVideoFile(a: LhActivityFull): { filename: string; mimeType: (typeof VIDEO_MIME)[keyof typeof VIDEO_MIME] } | null {
  const f = (a.content as { filename?: unknown } | undefined)?.filename;
  if (typeof f !== 'string' || !/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$/.test(f)) return null;
  const ext = f.split('.').pop()!.toLowerCase() as keyof typeof VIDEO_MIME;
  return Object.hasOwn(VIDEO_MIME, ext) ? { filename: f, mimeType: VIDEO_MIME[ext] } : null;
}

/** Map a LearnHouse activity to what the app may play. Only an 11-character YouTube id, or a MIME
 *  type for an uploaded file, leaves the BFF; never a LearnHouse URL or file name. */
export function toLessonVideo(a: LhActivityFull, { mediaEnabled = false }: { mediaEnabled?: boolean } = {}): LessonVideo {
  if (a.activity_type !== 'TYPE_VIDEO') return { kind: 'unsupported', reason: 'not_a_video' };
  if (a.activity_sub_type === 'SUBTYPE_VIDEO_HOSTED') {
    const file = mediaEnabled ? hostedVideoFile(a) : null;
    return file ? { kind: 'hosted', available: true, mimeType: file.mimeType } : { kind: 'hosted', available: false };
  }
  const type = typeof a.content?.type === 'string' ? a.content.type.toLowerCase() : '';
  if (type === 'vimeo') return { kind: 'unsupported', reason: 'vimeo' };
  const videoId = youTubeIdFrom(a.content?.uri);
  return videoId ? { kind: 'youtube', videoId, ...playerWindow(a.details) } : { kind: 'unsupported', reason: 'unrecognized_url' };
}

const UUID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_BODY = 64 * 1024; // an assignment hand-in carries every chosen option id

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

/**
 * A fixed reason code for an agent failure. Never the error message: a JSON.parse SyntaxError quotes
 * the model's output, which may echo learner data (W3 review). Codes only, safe to log.
 */
export function agentFailureCode(e: unknown): string {
  const err = e as { name?: unknown; status?: unknown; message?: unknown } | null;
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'timeout';
  if (typeof err?.status === 'number') return `gemini_http_${err.status}`;
  if (err?.name === 'SyntaxError') return 'malformed_json';
  if (err?.message === 'decision outside catalogue') return 'outside_catalogue';
  return 'agent_error';
}

export interface AppOptions {
  lh: LearnHouse;
  agent?: Agent | null;
  allowedCourses: Set<string>;
  sessions?: SessionStore;
  layoutTtlMs?: number;
  logger?: Logger;
  /** The LearnHouse org this BFF serves (LH_ORG_SLUG). /api/me only returns roles in this org. */
  org?: { slug: string; name?: string };
  /** LearnHouse's origin (from LH_BASE_URL): a PDF link in course content is fetched only from here. */
  lhOrigin?: string;
  /** Durable event inbox (M5): dedupes completions across retries and BFF restarts. Defaults to memory. */
  inbox?: Inbox;
}
export interface App {
  handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
  listen(...args: Parameters<Server['listen']>): Server;
  server(): Server;
}
interface CompletionResult { activityUuid: string; idempotencyKey: string; status: 'applied' | 'received' }
interface Outcome { http: number; body: Record<string, unknown> }
/** One event's outcome in POST /api/me/events. */
export interface EventResult { eventId: string; status: InboxStatus; reason?: string }
const EVENT_TYPES = new Set<EventType>(['activity_completed', 'assignment_submitted']);
const MAX_EVENTS = 100;

export function createApp({ lh, agent = null, allowedCourses, sessions = createSessionStore(), layoutTtlMs = 10 * 60 * 1000, logger = console, org, lhOrigin, inbox = createMemoryInbox() }: AppOptions): App {
  const routes: Route[] = [];
  const route = (method: string) => (path: string, ...handlers: Handler[]) => { routes.push({ method, path, ...compile(path), handlers }); };
  const app = { get: route('GET'), post: route('POST') };
  // Idempotency lives in the inbox (M5), keyed by learner + key/event id; a key is bound to ONE
  // course + activity (scope). With the SQLite inbox it survives BFF restarts. `inflight` reserves the
  // key while its write runs, so concurrent retries share one upstream write.
  const inflight = new Map<string, { scope: string; outcome: Promise<Outcome> }>();
  const inflightEvents = new Map<string, Promise<EventResult>>();


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

  // An activity counts as published only when LearnHouse says so. A missing flag is NOT published
  // (W3 review); then the learner's trail, which carries `published` per activity, decides.
  const trailPublished = (trail: Trail | null, courseUuid: string) => new Set(
    (trail?.courses?.find((c) => c.course_uuid === courseUuid)?.chapters ?? [])
      .flatMap((ch) => ch.activities ?? []).filter((a) => a.published === true).map((a) => a.activity_uuid));
  const isPublished = (a: { activity_uuid: string; published?: boolean }, fromTrail: Set<string>) =>
    a.published === true || (a.published === undefined && fromTrail.has(a.activity_uuid));

  // Published activities of an allowed course, in order.
  async function publishedActivities(courseUuid: string, trail: Trail | null) {
    const meta = await lh.getCourseMeta(courseUuid);
    const fromTrail = trailPublished(trail, courseUuid);
    return (meta?.chapters ?? []).flatMap((ch) => ch.activities ?? []).filter((a) => isPublished(a, fromTrail));
  }

  // Enrolled = the course is among the learner's LearnHouse courses. The server allow-list alone is
  // not entitlement (W3 review), and LearnHouse's completion call would silently enroll anyone.
  async function isEnrolled(learnerId: string, courseUuid: string): Promise<boolean> {
    if (lh.getAllTrails) {
      try { return !!(await lh.getAllTrails(learnerId))?.courses?.some((c) => c.course_uuid === courseUuid); }
      catch (e) { if ([400, 404, 422].includes(statusOf(e) as number)) return false; throw e; }
    }
    return (await trailOrNull(learnerId, courseUuid)) !== null;
  }
  async function isCompleted(learnerId: string, courseUuid: string, activityUuid: string) {
    const trail = await trailOrNull(learnerId, courseUuid);
    const course = trail?.courses?.find((c) => c.course_uuid === courseUuid);
    return !!course?.chapters?.some((ch) => ch.activities?.some((a) => a.activity_uuid === activityUuid && a.completed));
  }

  type CompletionCore = { kind: 'forbidden'; error: 'not_enrolled' | 'activity_forbidden' } | { kind: 'done'; applied: boolean; writeError: unknown };
  // Enrollment + publication checks, the write, then read-back. Shared by the single completion route
  // and POST /api/me/events. Throws only when LearnHouse cannot be read at all.
  async function completeActivityOnce(learnerId: string, courseUuid: string, activityUuid: string): Promise<CompletionCore> {
    const trail = await trailOrNull(learnerId, courseUuid);
    if (!(await isEnrolled(learnerId, courseUuid))) return { kind: 'forbidden', error: 'not_enrolled' };
    const activities = await publishedActivities(courseUuid, trail);
    if (!activities.some((a) => a.activity_uuid === activityUuid)) return { kind: 'forbidden', error: 'activity_forbidden' };
    let writeError: unknown = null;
    if (!(await isCompleted(learnerId, courseUuid, activityUuid))) {
      try { await lh.completeActivity(learnerId, activityUuid); } catch (e) { writeError = e; }
    }
    // Reconcile: a lost/timeout response may still have been applied upstream.
    const applied = await isCompleted(learnerId, courseUuid, activityUuid).catch(() => false);
    if (!applied && writeError) {
      const code = causeCode(writeError);
      logger.warn?.(`[upstream] ${(writeError as Error).message}${code ? ` (${code})` : ''}`);
    }
    return { kind: 'done', applied, writeError };
  }

  // Completion write + read-back. received = accepted; applied = LearnHouse trail confirms it.
  app.post('/api/me/courses/:courseUuid/activities/:activityUuid/complete', requireSession, requireCourse, async (req, res) => {
    const { courseUuid, activityUuid } = req.params;
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !UUID_RE.test(key)) return res.status(400).json({ error: 'idempotency_key_required' });
    if (!UUID_RE.test(activityUuid)) return res.status(400).json({ error: 'invalid_activity' });
    const learnerId = req.learner.learnerId;
    const cacheKey = `${learnerId}:${key}`;
    const scope = `${courseUuid}/${activityUuid}`;

    const prior = inbox.get(learnerId, key);
    if (prior) {
      if (prior.type !== 'activity_completed' || `${prior.courseUuid}/${prior.activityUuid}` !== scope) return res.status(409).json({ error: 'idempotency_key_reused' });
      if (prior.status === 'applied') return res.json({ activityUuid, idempotencyKey: key, status: 'applied', replayed: true });
    }
    const running = inflight.get(cacheKey);
    if (running) {
      if (running.scope !== scope) return res.status(409).json({ error: 'idempotency_key_reused' });
      try { const o = await running.outcome; return res.status(o.http).json({ ...o.body, replayed: true }); }
      catch (e) { return upstreamError(res, e); }
    }

    const outcome = (async (): Promise<Outcome> => {
      const c = await completeActivityOnce(learnerId, courseUuid, activityUuid);
      if (c.kind === 'forbidden') return { http: 403, body: { error: c.error } };
      const result: CompletionResult = { activityUuid, idempotencyKey: key, status: c.applied ? 'applied' : 'received' };
      inbox.put({ learnerId, eventId: key, type: 'activity_completed', courseUuid, activityUuid, status: result.status });
      if (!c.applied && c.writeError) {
        return { http: 502, body: { ...result, error: 'upstream_write_failed', upstreamStatus: statusOf(c.writeError) ?? null } };
      }
      return { http: c.applied ? 200 : 202, body: { ...result } };
    })();
    inflight.set(cacheKey, { scope, outcome });
    try { const o = await outcome; res.status(o.http).json(o.body); }
    catch (e) { upstreamError(res, e); }
    finally { inflight.delete(cacheKey); }
  });

  // ---- M5: batched offline events ----
  // One event from the app's outbox. The event id is the idempotency key: it is created once on the
  // device and reused on every retry, so the inbox answers a repeat with what already happened.
  async function processEvent(session: Session, raw: unknown): Promise<EventResult> {
    const learnerId = session.learnerId;
    const e = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const eventId = typeof e.eventId === 'string' && UUID_RE.test(e.eventId) ? e.eventId : '';
    const { type, courseUuid, activityUuid } = e;
    if (!eventId || typeof type !== 'string' || !EVENT_TYPES.has(type as EventType)
      || typeof courseUuid !== 'string' || !UUID_RE.test(courseUuid)
      || typeof activityUuid !== 'string' || !UUID_RE.test(activityUuid)) {
      return { eventId, status: 'rejected', reason: 'invalid_event' };
    }
    // M1: only event shapes this BFF understands are applied. Missing = the original shape (v1).
    // Not stored, so a later BFF that supports the version can still apply the event.
    if (e.schemaVersion !== undefined && e.schemaVersion !== EVENT_SCHEMA_VERSION) {
      return { eventId, status: 'rejected', reason: 'unsupported_version' };
    }
    const deviceId = typeof e.deviceId === 'string' && UUID_RE.test(e.deviceId) ? e.deviceId : null;
    const seq = Number.isSafeInteger(e.seq) && (e.seq as number) >= 0 ? (e.seq as number) : null;
    const payloadHash = createHash('sha256').update(JSON.stringify(e.payload ?? null)).digest('hex').slice(0, 32);
    const record = { learnerId, eventId, type: type as EventType, courseUuid, activityUuid, payloadHash, deviceId, seq };
    const prior = inbox.get(learnerId, eventId);
    if (prior) {
      // Same id, different scope or payload: a different event reusing the id, never applied (W3 review).
      if (prior.type !== record.type || prior.courseUuid !== courseUuid || prior.activityUuid !== activityUuid
        || (prior.payloadHash && prior.payloadHash !== payloadHash)) {
        return { eventId, status: 'rejected', reason: 'event_id_reused' };
      }
      // applied and rejected are final; received is tried again.
      if (prior.status !== 'received') return { eventId, status: prior.status, ...(prior.reason ? { reason: prior.reason } : {}) };
    }
    const reject = (reason: string): EventResult => {
      inbox.put({ ...record, status: 'rejected', reason });
      return { eventId, status: 'rejected', reason };
    };
    if (!allowedCourses.has(courseUuid)) return reject('course_forbidden');

    const cacheKey = `${learnerId}:${eventId}`;
    const running = inflightEvents.get(cacheKey);
    if (running) return running;
    const p = (async (): Promise<EventResult> => {
      try {
        if (record.type === 'assignment_submitted') return await submitAssignmentEvent(session, record, e.payload, prior?.reason ?? null, reject);
        const c = await completeActivityOnce(learnerId, courseUuid, activityUuid);
        if (c.kind === 'forbidden') return reject(c.error);
        const status: InboxStatus = c.applied ? 'applied' : 'received';
        inbox.put({ ...record, status });
        return { eventId, status };
      } catch (err) {
        // LearnHouse unreachable: accepted but not applied. The app keeps the event and sends it again.
        // A quiz's progress marker (retried / submitting) is kept, so the resend resumes, never repeats.
        const code = causeCode(err);
        logger.warn?.(`[events] upstream ${(err as Error).message}${code ? ` (${code})` : ''}`);
        const stage = inbox.get(learnerId, eventId)?.reason;
        inbox.put({ ...record, status: 'received', reason: stage === 'retried' || stage === 'submitting' ? stage : null });
        const reason = statusOf(err) === 401 && record.type === 'assignment_submitted' ? 'learnhouse_session_expired' : 'upstream_unavailable';
        return { eventId, status: 'received', reason };
      }
    })();
    inflightEvents.set(cacheKey, p);
    try { return await p; } finally { inflightEvents.delete(cacheKey); }
  }

  // POST /api/me/events { events: [...] } -> { results: [{ eventId, status, reason? }] }, one per event,
  // in order. One bad event never fails the batch.
  app.post('/api/me/events', requireSession, async (req, res) => {
    const events = (req.body as { events?: unknown }).events;
    if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) return res.status(400).json({ error: 'invalid_request' });
    const results: EventResult[] = [];
    for (const ev of events) results.push(await processEvent(req.learner, ev));
    res.json({ results });
  });

  // The video for one activity, for the lesson player. Same gates as completion: session, allowed
  // course, enrolled, published activity of THIS course. The response is validated against the shared
  // contract before it is sent (the app parses it again).
  app.get('/api/me/courses/:courseUuid/activities/:activityUuid/video', requireSession, requireCourse, async (req, res) => {
    const { courseUuid, activityUuid } = req.params;
    if (!UUID_RE.test(activityUuid)) return res.status(400).json({ error: 'invalid_activity' });
    if (!lh.getActivity) return res.status(501).json({ error: 'not_supported' });
    const learnerId = req.learner.learnerId;
    try {
      if (!(await isEnrolled(learnerId, courseUuid))) return res.status(403).json({ error: 'not_enrolled' });
      const trail = await trailOrNull(learnerId, courseUuid);
      const inCourse = (await publishedActivities(courseUuid, trail)).find((a) => a.activity_uuid === activityUuid);
      if (!inCourse) return res.status(403).json({ error: 'activity_forbidden' });
      const activity = await lh.getActivity(activityUuid);
      const body = LessonVideoResponseSchema.safeParse({
        activityUuid,
        // First non-empty name: the activity's, else the course listing's, else a neutral label.
        title: [activity?.name, inCourse.name].map((n) => (typeof n === 'string' ? n.trim() : '')).find(Boolean)?.slice(0, 200) ?? 'Video',
        video: toLessonVideo(activity, { mediaEnabled: !!lh.openActivityVideo }),
      });
      if (!body.success) { logger.warn?.('[video] response failed the contract'); return res.status(502).json({ error: 'bad_upstream_content' }); }
      res.json(body.data);
    } catch (e) { upstreamError(res, e); }
  });

  // ---- Uploaded video file: streamed from LearnHouse through the BFF ----
  // Players and downloads send many Range requests; the access decision (enrolled, published in
  // THIS course, file name) is cached per learner+activity for a minute so seeking stays fast.
  const MEDIA_GRANT_TTL_MS = 60_000;
  const mediaGrants = new Map<string, { filename: string; mimeType: string; exp: number }>();
  async function mediaGrant(learnerId: string, courseUuid: string, activityUuid: string) {
    const key = `${learnerId}|${courseUuid}|${activityUuid}`;
    const hit = mediaGrants.get(key);
    if (hit && hit.exp > Date.now()) return hit;
    mediaGrants.delete(key);
    if (!(await isEnrolled(learnerId, courseUuid))) return { error: 'not_enrolled' as const };
    const trail = await trailOrNull(learnerId, courseUuid);
    if (!(await publishedActivities(courseUuid, trail)).some((a) => a.activity_uuid === activityUuid)) return { error: 'activity_forbidden' as const };
    const activity = await lh.getActivity!(activityUuid);
    const file = activity?.activity_type === 'TYPE_VIDEO' && activity.activity_sub_type === 'SUBTYPE_VIDEO_HOSTED' ? hostedVideoFile(activity) : null;
    if (!file) return { error: 'not_a_hosted_video' as const };
    const grant = { ...file, exp: Date.now() + MEDIA_GRANT_TTL_MS };
    if (mediaGrants.size > 5000) mediaGrants.clear(); // bounded
    mediaGrants.set(key, grant);
    return grant;
  }
  const RANGE_RE = /^bytes=(\d{0,15})-(\d{0,15})$/;
  const PASS_HEADERS = ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];

  app.get('/api/me/courses/:courseUuid/activities/:activityUuid/video/file', requireSession, requireCourse, async (req, res) => {
    const { courseUuid, activityUuid } = req.params;
    if (!UUID_RE.test(activityUuid)) return res.status(400).json({ error: 'invalid_activity' });
    if (!lh.openActivityVideo || !lh.getActivity) return res.status(501).json({ error: 'media_not_configured' });
    const range = req.headers.range;
    const rm = range === undefined ? null : RANGE_RE.exec(range);
    if (range !== undefined && (!rm || (rm[1] === '' && rm[2] === ''))) return res.status(416).json({ error: 'invalid_range' });
    try {
      const grant = await mediaGrant(req.learner.learnerId, courseUuid, activityUuid);
      if ('error' in grant) return res.status(grant.error === 'not_a_hosted_video' ? 404 : 403).json({ error: grant.error });
      const ctrl = new AbortController();
      res.on('close', () => { if (!res.writableFinished) ctrl.abort(); }); // player seeked away / app closed
      const up = await lh.openActivityVideo({ courseUuid, activityUuid, filename: grant.filename }, range, ctrl.signal);
      if (up.status !== 200 && up.status !== 206) {
        await up.body?.cancel().catch(() => {});
        logger.warn?.(`[media] LearnHouse answered ${up.status}`);
        if (up.status === 416) return res.status(416).json({ error: 'range_not_satisfiable' });
        if (up.status === 404) return res.status(404).json({ error: 'not_found' });
        return res.status(502).json({ error: up.status === 401 || up.status === 403 ? 'upstream_media_forbidden' : 'upstream_error', upstreamStatus: up.status });
      }
      res.statusCode = up.status;
      for (const h of PASS_HEADERS) { const v = up.header(h); if (v) res.setHeader(h, v); }
      res.setHeader('Content-Type', grant.mimeType); // our type, not whatever upstream says
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (!up.body) { res.end(); return; }
      await new Promise<void>((resolve) => {
        const src = Readable.fromWeb(up.body as import('node:stream/web').ReadableStream<Uint8Array>);
        src.on('error', () => { res.destroy(); resolve(); });
        res.on('close', () => { src.destroy(); resolve(); });
        src.pipe(res);
      });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError' && res.destroyed) return;
      if (!res.headersSent) upstreamError(res, e); else res.destroy();
    }
  });

  // ---- shared gate for activity routes: enrolled in this course + activity published in it ----
  type Gate = { error: 'not_enrolled' | 'activity_forbidden' } | { inCourse: { activity_uuid: string; name?: string } };
  async function gateActivity(learnerId: string, courseUuid: string, activityUuid: string): Promise<Gate> {
    if (!(await isEnrolled(learnerId, courseUuid))) return { error: 'not_enrolled' };
    const trail = await trailOrNull(learnerId, courseUuid);
    const inCourse = (await publishedActivities(courseUuid, trail)).find((a) => a.activity_uuid === activityUuid);
    return inCourse ? { inCourse } : { error: 'activity_forbidden' };
  }
  const firstName = (...names: unknown[]) =>
    names.map((n) => (typeof n === 'string' ? n.trim() : '')).find(Boolean)?.slice(0, 200);

  // ---- Slide decks: the BFF finds the PDF and streams it; the app never gets its address ----
  // The access decision + locator are cached per learner+activity for a minute (like media grants).
  const deckGrants = new Map<string, { loc: DeckLocator; exp: number }>();
  async function deckFor(learnerId: string, courseUuid: string, activityUuid: string) {
    const gate = await gateActivity(learnerId, courseUuid, activityUuid);
    if ('error' in gate) return { error: gate.error };
    const activity = await lh.getActivity!(activityUuid);
    const found = resolveDeck(activity, lhOrigin ?? '');
    // A deck stored in LearnHouse needs LH_ORG_UUID (media paths); without it the BFF cannot fetch it.
    const deck = 'problem' in found ? found
      : found.kind === 'lh' && !lh.openActivityDocument ? { problem: 'not_downloadable' as const }
      : found.kind === 'public' && !lh.openPublicPdf ? { problem: 'not_downloadable' as const }
      : found;
    return { activity, inCourse: gate.inCourse, deck };
  }

  app.get('/api/me/courses/:courseUuid/activities/:activityUuid/slides', requireSession, requireCourse, async (req, res) => {
    const { courseUuid, activityUuid } = req.params;
    if (!UUID_RE.test(activityUuid)) return res.status(400).json({ error: 'invalid_activity' });
    if (!lh.getActivity) return res.status(501).json({ error: 'not_supported' });
    try {
      const r = await deckFor(req.learner.learnerId, courseUuid, activityUuid);
      if ('error' in r) return res.status(403).json({ error: r.error });
      if (!('problem' in r.deck)) {
        if (deckGrants.size > 5000) deckGrants.clear(); // bounded
        deckGrants.set(`${req.learner.learnerId}|${courseUuid}|${activityUuid}`, { loc: r.deck, exp: Date.now() + 60_000 });
      }
      const body = SlideDeckResponseSchema.safeParse({
        activityUuid,
        title: firstName(r.activity?.name, r.inCourse.name) ?? 'Slides',
        deck: 'problem' in r.deck ? { kind: 'unavailable', reason: r.deck.problem } : { kind: 'pdf', version: deckVersion(activityUuid, r.deck) },
      });
      if (!body.success) { logger.warn?.('[slides] response failed the contract'); return res.status(502).json({ error: 'bad_upstream_content' }); }
      res.json(body.data);
    } catch (e) { upstreamError(res, e); }
  });

  const MAX_DECK_BYTES = 100 * 1024 * 1024;
  app.get('/api/me/courses/:courseUuid/activities/:activityUuid/slides/file', requireSession, requireCourse, async (req, res) => {
    const { courseUuid, activityUuid } = req.params;
    if (!UUID_RE.test(activityUuid)) return res.status(400).json({ error: 'invalid_activity' });
    if (!lh.getActivity) return res.status(501).json({ error: 'not_supported' });
    const learnerId = req.learner.learnerId;
    try {
      const key = `${learnerId}|${courseUuid}|${activityUuid}`;
      let loc = deckGrants.get(key)?.exp! > Date.now() ? deckGrants.get(key)!.loc : null;
      if (!loc) {
        const r = await deckFor(learnerId, courseUuid, activityUuid);
        if ('error' in r) return res.status(403).json({ error: r.error });
        if ('problem' in r.deck) return res.status(r.deck.problem === 'not_downloadable' ? 422 : 404).json({ error: r.deck.problem });
        loc = r.deck;
      }
      const ctrl = new AbortController();
      res.on('close', () => { if (!res.writableFinished) ctrl.abort(); });
      const up = loc.kind === 'lh'
        ? await lh.openActivityDocument!({ courseUuid, activityUuid, filename: loc.filename, ...(loc.blockUuid ? { blockUuid: loc.blockUuid } : {}) }, ctrl.signal)
        : await lh.openPublicPdf!(loc.url, ctrl.signal);
      if (up.status !== 200 || !up.body) {
        await up.body?.cancel().catch(() => {});
        logger.warn?.(`[slides] ${loc.kind === 'lh' ? 'LearnHouse' : 'public host'} answered ${up.status}`);
        // A public file that is private / needs sign-in is "not downloadable" (the app explains sharing).
        if (loc.kind === 'public') return res.status(422).json({ error: 'not_downloadable' });
        if (up.status === 404) return res.status(404).json({ error: 'not_found' });
        return res.status(502).json({ error: 'upstream_error', upstreamStatus: up.status });
      }
      // Only a real PDF is passed on: Drive's sign-in / virus-scan pages are HTML, not decks.
      const reader = up.body.getReader();
      let head = new Uint8Array(0);
      while (head.length < 5) {
        const { done, value } = await reader.read();
        if (done) break;
        const next = new Uint8Array(head.length + value.length); next.set(head); next.set(value, head.length); head = next;
      }
      if (Buffer.from(head.subarray(0, 5)).toString('latin1') !== '%PDF-') {
        await reader.cancel().catch(() => {});
        return res.status(422).json({ error: 'not_downloadable' });
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const len = Number(up.header('content-length'));
      if (Number.isFinite(len) && len > 0 && len <= MAX_DECK_BYTES) res.setHeader('Content-Length', String(len));
      let sent = 0;
      const write = (chunk: Uint8Array) => new Promise<void>((resolve) => { if (res.write(chunk)) resolve(); else res.once('drain', resolve); });
      for (let chunk: Uint8Array | undefined = head; chunk; ) {
        sent += chunk.length;
        if (sent > MAX_DECK_BYTES || res.destroyed) { await reader.cancel().catch(() => {}); res.destroy(); return; }
        await write(chunk);
        const r = await reader.read();
        chunk = r.done ? undefined : r.value;
      }
      res.end();
    } catch (e) {
      if ((e as Error)?.name === 'AbortError' && res.destroyed) return;
      if (!res.headersSent) upstreamError(res, e); else res.destroy();
    }
  });

  // ---- Assignment quizzes: made AS the learner, with their LearnHouse token held in the session ----
  // Routes are keyed by course + activity; the LearnHouse assignment uuid is looked up here each time,
  // so the app cannot point a call at another assignment.
  const asLearner = (req: Req): LearnerApi | null => (req.learner.lhToken && lh.asLearner ? lh.asLearner(req.learner.lhToken) : null);
  const learnerCallError = (res: Res, e: unknown) => {
    // LearnHouse rejected the learner's own token (expired): the app asks them to sign in again.
    if (statusOf(e) === 401) return res.status(401).json({ error: 'learnhouse_session_expired' });
    upstreamError(res, e);
  };
  async function assignmentFor(req: Req, res: Res): Promise<{ api: LearnerApi; uuid: string } | null> {
    const { courseUuid, activityUuid } = req.params;
    if (!UUID_RE.test(activityUuid)) { res.status(400).json({ error: 'invalid_activity' }); return null; }
    const api = asLearner(req);
    // Dev login has no LearnHouse token: assignments need a real LearnHouse sign-in.
    if (!api) { res.status(403).json({ error: 'learnhouse_login_required' }); return null; }
    const gate = await gateActivity(req.learner.learnerId, courseUuid, activityUuid);
    if ('error' in gate) { res.status(403).json({ error: gate.error }); return null; }
    const uuid = assignmentUuidFrom(await api.getAssignmentForActivity(activityUuid));
    if (!uuid) { res.status(404).json({ error: 'not_an_assignment' }); return null; }
    return { api, uuid };
  }
  async function quizOf(api: LearnerApi, uuid: string, activityUuid: string): Promise<AssignmentQuiz> {
    const [a, tasks] = await Promise.all([api.getAssignmentForActivity(activityUuid), api.getAssignmentTasks(uuid)]);
    return quizFrom(a, tasks);
  }
  const A = '/api/me/courses/:courseUuid/activities/:activityUuid/assignment';

  // ---- M5: a quiz hand-in from the offline outbox (POST /api/me/events, type assignment_submitted) ----
  // Every hand-in is its own event and its own attempt: attempts are appended, never merged.
  // payload = { answers, retry? }: `retry` = the learner pressed "Try again" offline after a graded
  // attempt, so a new attempt is opened first. The inbox's reason records how far this event got
  // ('retried', then 'submitting'), so a resend after a lost answer resumes instead of repeating:
  // it never opens a second retry, and a hand-in whose grade can be read counts as done.
  async function submitAssignmentEvent(
    session: Session,
    record: { learnerId: string; eventId: string; type: EventType; courseUuid: string; activityUuid: string; payloadHash: string; deviceId: string | null; seq: number | null },
    payload: unknown,
    stage: string | null,
    reject: (reason: string) => EventResult,
  ): Promise<EventResult> {
    const { learnerId, eventId, courseUuid, activityUuid } = record;
    const parsed = AssignmentEventPayloadSchema.safeParse(payload);
    if (!parsed.success) return reject('invalid_answers');
    const api = session.lhToken && lh.asLearner ? lh.asLearner(session.lhToken) : null;
    if (!api) return reject('learnhouse_login_required');
    const gate = await gateActivity(learnerId, courseUuid, activityUuid);
    if ('error' in gate) return reject(gate.error);
    // LearnHouse answers 404 for an activity that is not an assignment: final, never retried.
    const raw = await api.getAssignmentForActivity(activityUuid).catch((err) => { if (statusOf(err) === 404) return null; throw err; });
    const uuid = raw ? assignmentUuidFrom(raw) : null;
    if (!uuid) return reject('not_an_assignment');
    const applied = (): EventResult => { inbox.put({ ...record, status: 'applied', reason: null }); return { eventId, status: 'applied' }; };

    // Read-back: the hand-in may have landed before its answer was lost.
    if (stage === 'submitting' && (await api.getGrade(uuid, learnerId).then(Boolean, () => false))) return applied();

    const quiz = await quizOf(api, uuid, activityUuid);
    if (unknownAnswer(quiz, parsed.data.answers)) return reject('unknown_answer');
    if (parsed.data.retry && stage !== 'retried' && stage !== 'submitting') {
      try { await api.retryAssignment(uuid); }
      catch (err) { if ([400, 403, 409, 422].includes(statusOf(err) as number)) return reject('no_retries_left'); throw err; }
      inbox.put({ ...record, status: 'received', reason: 'retried' });
    }
    const saved = savedTasksFrom(await api.getMyTaskSubmissions(uuid).catch(() => null));
    for (const task of quiz.tasks) {
      await api.saveTaskSubmission(uuid, task.taskUuid, taskSubmissionBody(task, parsed.data.answers, saved.submissionUuids[task.taskUuid]));
    }
    inbox.put({ ...record, status: 'received', reason: 'submitting' });
    await api.submitAssignment(uuid);
    return applied();
  }

  app.get(A, requireSession, requireCourse, async (req, res) => {
    try {
      const found = await assignmentFor(req, res); if (!found) return;
      const body = AssignmentQuizSchema.safeParse(await quizOf(found.api, found.uuid, req.params.activityUuid));
      if (!body.success) { logger.warn?.('[assignment] quiz failed the contract'); return res.status(502).json({ error: 'bad_upstream_content' }); }
      res.json(body.data);
    } catch (e) { learnerCallError(res, e); }
  });

  app.get(`${A}/answers`, requireSession, requireCourse, async (req, res) => {
    try {
      const found = await assignmentFor(req, res); if (!found) return;
      const saved = savedTasksFrom(await found.api.getMyTaskSubmissions(found.uuid));
      const body = SavedAnswersResponseSchema.safeParse({ answers: saved.answers });
      res.json(body.success ? body.data : { answers: {} });
    } catch (e) {
      if ([400, 404, 422].includes(statusOf(e) as number)) return res.json({ answers: {} }); // nothing saved yet
      learnerCallError(res, e);
    }
  });

  // Save every task's answers, then hand in. Only questions/options of THIS quiz are accepted.
  app.post(`${A}/submit`, requireSession, requireCourse, async (req, res) => {
    const parsed = SubmitRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_answers' });
    try {
      const found = await assignmentFor(req, res); if (!found) return;
      const { api, uuid } = found;
      const quiz = await quizOf(api, uuid, req.params.activityUuid);
      if (unknownAnswer(quiz, parsed.data.answers)) return res.status(400).json({ error: 'unknown_answer' });
      const saved = savedTasksFrom(await api.getMyTaskSubmissions(uuid).catch(() => null));
      for (const task of quiz.tasks) {
        await api.saveTaskSubmission(uuid, task.taskUuid, taskSubmissionBody(task, parsed.data.answers, saved.submissionUuids[task.taskUuid]));
      }
      await api.submitAssignment(uuid);
      res.json({ submitted: true });
    } catch (e) { learnerCallError(res, e); }
  });

  app.get(`${A}/grade`, requireSession, requireCourse, async (req, res) => {
    try {
      const found = await assignmentFor(req, res); if (!found) return;
      const body = AssignmentGradeSchema.safeParse(gradeFrom(await found.api.getGrade(found.uuid, req.learner.learnerId)));
      if (!body.success) { logger.warn?.('[assignment] grade failed the contract'); return res.status(502).json({ error: 'bad_upstream_content' }); }
      res.json(body.data);
    } catch (e) { learnerCallError(res, e); }
  });

  app.post(`${A}/retry`, requireSession, requireCourse, async (req, res) => {
    try {
      const found = await assignmentFor(req, res); if (!found) return;
      res.json(RetryResponseSchema.parse({ retriesLeft: retriesLeftFrom(await found.api.retryAssignment(found.uuid)) }));
    } catch (e) { learnerCallError(res, e); }
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
      const fromTrail = trailPublished(trail, courseUuid);
      const chapters = (meta?.chapters ?? [])
        .map((ch) => ({ ch, acts: (ch.activities ?? []).filter((a) => isPublished(a, fromTrail)) }))
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
      // Authorized targets: this learner's unfinished + completed published activities in this course,
      // and none at all if they are not enrolled (the cards then only open the path).
      const enrolled = await isEnrolled(learnerId, courseUuid);
      const allowed = new Set(enrolled ? [...choices, ...completedList].map((c) => c.activityUuid) : []);

      let decision: Decision | null = null; let source = 'fallback';
      if (agent) {
        try { decision = await agent.decide({ signals }); source = 'agent'; }
        catch (e) {
          // Reason code only, never model text: e.g. gemini_http_404 = wrong model name for this key.
          logger.warn?.(`[agent] fallback used: ${agentFailureCode(e)}`);
        }
      }
      let slots = authorizeSlots(decision ? buildSlots(decision, ctx) : fallbackSlots(ctx), allowed);
      if (!slots.mainCard && !slots.nextStepSection) { slots = authorizeSlots(fallbackSlots(ctx), allowed); source = 'fallback'; }
      logger.info?.(`[home-layout] source=${source} mainCard=${slots.mainCard?.component ?? 'none'} nextStep=${slots.nextStepSection?.component ?? 'none'}`);

      const now = Date.now();
      const envelope = (s: typeof slots) => ({
        version: 1,
        layoutId: randomUUID().replace(/-/g, ''),
        learnerId, courseUuid,
        issuedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + layoutTtlMs).toISOString(),
        slots: s,
      });
      // M7: the BFF checks what it built with the SAME schema the app parses with
      // (src/contracts/homeLayout.ts), so it never sends a slot the client must reject. A slot that
      // fails is dropped (the app shows its progress-based card there); if the envelope itself fails
      // (e.g. over the byte cap), nothing agent-built is sent.
      const check = parseHomeLayout(envelope(slots), { learnerId, courseUuid, now: new Date(now) });
      if (!check.ok) {
        logger.warn?.(`[home-layout] contract rejected envelope: ${check.reason}`);
        slots = { mainCard: null, nextStepSection: null } as typeof slots;
      } else {
        for (const name of SLOT_NAMES) {
          const r = check.slots[name];
          if (!r.ok && r.reason === 'invalid') {
            logger.warn?.(`[home-layout] contract rejected slot ${name}`);
            slots = { ...slots, [name]: null };
          }
        }
      }
      res.json(envelope(slots));
    } catch (e) { upstreamError(res, e); }
  });

  // Sanitized request log: method, route pattern, status, ms. Never bodies, headers or tokens.
  async function handle(rawReq: IncomingMessage, rawRes: ServerResponse) {
    const req = rawReq as Req;
    const res = decorate(rawRes);
    const t = Date.now();
    const url = new URL(req.url ?? '/', 'http://bff');
    let matched: Route | null = null;
    let badParam = false;
    for (const r of routes) {
      const m = r.method === req.method && r.re.exec(url.pathname);
      if (m) {
        matched = r;
        // decodeURIComponent throws URIError on bad %-sequences (e.g. %E0%A4%A). That used to escape
        // handle() as an unhandled rejection and leave the request unanswered; answer 400 instead.
        try { req.params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])); }
        catch { badParam = true; }
        break;
      }
    }
    res.on('finish', () => logger.info?.(`${req.method} ${matched?.path ?? 'unmatched'} ${res.statusCode} ${Date.now() - t}ms`));
    if (!matched) { res.status(404).json({ error: 'not_found' }); return; }
    if (badParam) { res.status(400).json({ error: 'bad_request' }); return; }
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
