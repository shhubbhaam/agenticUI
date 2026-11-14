// bff/src/learnhouse.ts — thin LearnHouse adapter. The org API token never leaves this process.
// Endpoints follow docs.learnhouse.app/reference/headless; verify them against the
// pinned LearnHouse release you run (see docs/W3-plan-and-evidence.md, "Pinning").
import { httpError, type FetchLike } from './util.ts';
import { PUBLIC_PDF_HOSTS } from './slides.ts';
import type { Learner } from './sessions.ts';

// ---- LearnHouse response shapes (only the fields the BFF reads) ----------
export interface LhActivity {
  activity_uuid: string;
  name?: string;
  published?: boolean;
  activity_type?: string;
}
/** GET /activities/{uuid}: the activity with its content (e.g. a YouTube link in content.uri). */
export interface LhActivityFull extends LhActivity {
  activity_sub_type?: string;
  content?: { uri?: unknown; type?: unknown; filename?: unknown } | null;
  details?: unknown;
}
export interface CourseMeta {
  course_uuid?: string;
  name?: string;
  chapters?: Array<{ chapter_uuid?: string; name?: string; extra_metadata?: { stage_label?: unknown } | null; activities?: LhActivity[] }>;
}
export interface Trail {
  user_id?: number;
  courses?: Array<{
    course_uuid: string;
    chapters?: Array<{ chapter_uuid?: string; order?: number; activities?: Array<{ activity_uuid: string; completed?: boolean; published?: boolean; completed_at?: string | null }> }>;
  }>;
}
interface LhUser { id?: string | number; user_id?: string | number; first_name?: string; username?: string }

/** The learner's LearnHouse identity, as /users/session returns it (only the fields the app shows). */
export interface LearnerProfile {
  user: { id: number; user_uuid: string; username: string; first_name: string; last_name: string; email: string; avatar_image: string | null };
  roles: Array<{ role: { name: string }; org: { id: number; org_uuid: string; slug: string; name: string } }>;
}
interface LhLoginResponse extends LhUser {
  user?: LhUser;
  tokens?: { access_token?: string };
  access_token?: string;
  token?: string;
}

/** Everything the BFF needs from LearnHouse. The fake in test/ implements the same interface. */
export interface LearnHouse {
  login(email: string, password: string): Promise<Learner | null>;
  /** Exchange a Google access token (obtained by the app's Google SDK) for a learner. */
  loginWithGoogle?(email: string, googleAccessToken: string): Promise<Learner | null>;
  getCourseMeta(courseUuid: string): Promise<CourseMeta>;
  getTrail(learnerId: string, courseUuid: string): Promise<Trail>;
  /** Progress across every course the learner is in (the BFF filters it to allowed courses). */
  getAllTrails?(learnerId: string): Promise<Trail>;
  completeActivity(learnerId: string, activityUuid: string): Promise<unknown>;
  /** One activity with its content. Org token; the BFF checks course + enrollment first. */
  getActivity?(activityUuid: string): Promise<LhActivityFull>;
  /** An uploaded activity video as a stream (Range passed through). The BFF checks access first. */
  openActivityVideo?(ref: MediaRef, range: string | undefined, signal: AbortSignal): Promise<MediaResponse>;
  /** A slide deck PDF stored in LearnHouse (document activity, or an article's PDF block). Org token. */
  openActivityDocument?(ref: DocumentRef, signal: AbortSignal): Promise<MediaResponse>;
  /** A public PDF (Google Drive / Docs export). Only PUBLIC_PDF_HOSTS; no credentials are sent. */
  openPublicPdf?(url: string, signal: AbortSignal): Promise<MediaResponse>;
  /** Calls LearnHouse only accepts as the learner, made with their own LearnHouse token. */
  asLearner?(lhToken: string): LearnerApi;
}

export interface DocumentRef { courseUuid: string; activityUuid: string; filename: string; blockUuid?: string }

/** LearnHouse calls made AS the learner. Paths are built here from validated ids only. */
export interface LearnerApi {
  getAssignmentForActivity(activityUuid: string): Promise<unknown>;
  getAssignmentTasks(assignmentUuid: string): Promise<unknown>;
  getMyTaskSubmissions(assignmentUuid: string): Promise<unknown>;
  saveTaskSubmission(assignmentUuid: string, taskUuid: string, body: unknown): Promise<unknown>;
  submitAssignment(assignmentUuid: string): Promise<unknown>;
  getGrade(assignmentUuid: string, learnerId: string): Promise<unknown>;
  retryAssignment(assignmentUuid: string): Promise<unknown>;
}

export interface MediaRef { courseUuid: string; activityUuid: string; filename: string }
export interface MediaResponse {
  status: number;
  header(name: string): string | null;
  body: ReadableStream<Uint8Array> | null;
}

export interface LearnHouseOptions {
  baseUrl?: string;
  orgToken?: string;
  orgSlug?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  /** LH_ORG_UUID: needed for media paths (LearnHouse does not let API tokens read the org). Without it, no media. */
  orgUuid?: string;
  /** Raw fetch for media streams (FetchLike only exposes JSON). */
  mediaFetch?: typeof fetch;
}

interface CallOptions { body?: unknown; form?: Record<string, string>; auth?: 'org' | 'none'; /** A learner's LearnHouse token instead of the org token. */ bearer?: string }

export function createLearnHouse({ baseUrl, orgToken, orgSlug, timeoutMs = 8000, fetchImpl = fetch, orgUuid, mediaFetch = fetch }: LearnHouseOptions): LearnHouse {
  if (!baseUrl || !orgToken || !orgSlug) {
    throw new Error('LH_BASE_URL, LH_API_TOKEN and LH_ORG_SLUG must be set in bff/.env');
  }
  async function call<T>(method: string, path: string, { body, form, auth = 'org', bearer }: CallOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    else if (auth === 'org') headers.Authorization = `Bearer ${orgToken}`;
    let payload: string | undefined;
    if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form).toString(); }
    else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetchImpl(`${baseUrl}${path}`, { method, headers, body: payload, signal: AbortSignal.timeout(timeoutMs) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw httpError(`LearnHouse ${method} ${path} -> ${res.status}`, res.status);
    return data as T;
  }
  const get = async <T>(url: string, token: string): Promise<T | null> => {
    const res = await fetchImpl(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(timeoutMs) });
    return res.ok ? ((await res.json()) as T) : null;
  };
  const clean = (s: unknown) => (typeof s === 'string' ? s : '');

  /** Sanitize /users/session to the fields the app needs (drops LearnHouse's rights matrix etc.). */
  function toProfile(raw: unknown): LearnerProfile | undefined {
    const s = raw as { user?: Record<string, unknown>; roles?: Array<{ role?: { name?: unknown }; org?: Record<string, unknown> }> } | null;
    const u = s?.user;
    if (!u || typeof u.id !== 'number') return undefined;
    return {
      user: { id: u.id, user_uuid: clean(u.user_uuid), username: clean(u.username), first_name: clean(u.first_name),
        last_name: clean(u.last_name), email: clean(u.email), avatar_image: typeof u.avatar_image === 'string' ? u.avatar_image : null },
      roles: (s?.roles ?? []).filter((r) => r?.org && typeof r.org.id === 'number').map((r) => ({
        role: { name: clean(r.role?.name) },
        org: { id: r.org!.id as number, org_uuid: clean(r.org!.org_uuid), slug: clean(r.org!.slug), name: clean(r.org!.name) } })),
    };
  }

  // Turn a LearnHouse login/oauth response into a learner. The learner's own LearnHouse token reads
  // their session here and is kept server-side in the BFF session; it is never returned to the app.
  async function finishLogin(data: LhLoginResponse | null): Promise<Learner | null> {
    // LearnHouse versions differ: the id may be at user.id, user.user_id or top-level.
    let user: LhUser | null | undefined = data?.user ?? data;
    let id = user?.id ?? user?.user_id ?? data?.user_id;
    const userToken = data?.tokens?.access_token ?? data?.access_token ?? data?.token;
    const profile = userToken ? toProfile(await get(`${baseUrl}/users/session`, userToken).catch(() => null)) : undefined;
    if (profile) id = profile.user.id;
    // Fallback: ask LearnHouse who this token belongs to.
    if ((id === undefined || id === null) && userToken) {
      const p = await get<LhUser>(`${baseUrl}/users/profile`, userToken);
      if (p) { user = p; id = p.id ?? p.user_id; }
    }
    if (id === undefined || id === null) {
      console.warn('[learnhouse] login ok but no user id found; keys:', Object.keys(data ?? {}).join(','));
      return null;
    }
    const displayName = profile?.user.first_name || user?.first_name || user?.username || 'Learner';
    // The learner's token stays in the BFF session (assignment calls need it); never sent to the app.
    return { learnerId: String(id), displayName, profile, ...(userToken ? { lhToken: userToken } : {}) };
  }
  // A raw stream (PDF). The timeout covers the response HEADERS only; the body streams while read.
  async function openStream(url: string, headers: Record<string, string>, signal: AbortSignal): Promise<MediaResponse> {
    const ctrl = new AbortController();
    const stop = () => ctrl.abort();
    signal.addEventListener('abort', stop, { once: true });
    const timer = setTimeout(stop, timeoutMs);
    try {
      const res = await mediaFetch(url, { headers, signal: ctrl.signal, redirect: 'follow' });
      return { status: res.status, header: (n) => res.headers.get(n), body: res.body };
    } finally { clearTimeout(timer); }
  }
  const rejected = (e: unknown) => [400, 401, 403].includes((e as { status?: number }).status as number);

  return {
    // Authenticate the learner with LearnHouse itself.
    async login(email, password) {
      try {
        return await finishLogin(await call<LhLoginResponse | null>('POST', '/auth/login', { form: { username: email, password }, auth: 'none' }));
      } catch (e) { if (rejected(e)) return null; throw e; }
    },
    async loginWithGoogle(email, googleAccessToken) {
      try {
        return await finishLogin(await call<LhLoginResponse | null>('POST', '/auth/oauth', { body: { email, provider: 'google', access_token: googleAccessToken }, auth: 'none' }));
      } catch (e) { if (rejected(e)) return null; throw e; }
    },
    getActivity: (activityUuid) => call<LhActivityFull>('GET', `/activities/${encodeURIComponent(activityUuid)}`),
    // Uploaded files are served at {origin}/content/orgs/{org}/courses/{course}/activities/{activity}/video/{file}
    // (401 without auth, per scripts/diagnose.ts 6c). The timeout covers the response HEADERS only:
    // the body can stream for as long as the client keeps reading.
    async openPublicPdf(url: string, signal: AbortSignal): Promise<MediaResponse> {
      const u = new URL(url);
      if (u.protocol !== 'https:' || !PUBLIC_PDF_HOSTS.has(u.hostname)) throw httpError('host not allowed', 400);
      return openStream(url, {}, signal);
    },
    asLearner(lhToken: string): LearnerApi {
      const e = encodeURIComponent;
      const as = <T>(method: string, path: string, body?: unknown) => call<T>(method, path, { bearer: lhToken, body });
      const a = (uuid: string) => `/assignments/${e(uuid)}`;
      return {
        getAssignmentForActivity: (activityUuid) => as('GET', `/assignments/activity/${e(activityUuid)}`),
        getAssignmentTasks: (uuid) => as('GET', `${a(uuid)}/tasks`),
        getMyTaskSubmissions: (uuid) => as('GET', `${a(uuid)}/tasks/submissions/me`),
        saveTaskSubmission: (uuid, taskUuid, body) => as('PUT', `${a(uuid)}/tasks/${e(taskUuid)}/submissions`, body),
        submitAssignment: (uuid) => as('POST', `${a(uuid)}/submissions`),
        getGrade: (uuid, learnerId) => as('GET', `${a(uuid)}/submissions/${e(learnerId)}/grade`),
        retryAssignment: (uuid) => as('POST', `${a(uuid)}/submissions/me/retry`),
      };
    },
    ...(orgUuid ? {
      async openActivityDocument({ courseUuid, activityUuid, filename, blockUuid }: DocumentRef, signal: AbortSignal): Promise<MediaResponse> {
        const e = encodeURIComponent;
        const where = blockUuid ? `dynamic/blocks/pdfBlock/${e(blockUuid)}` : 'documentpdf';
        const url = `${new URL(baseUrl).origin}/content/orgs/${e(orgUuid)}/courses/${e(courseUuid)}/activities/${e(activityUuid)}/${where}/${e(filename)}`;
        return openStream(url, { Authorization: `Bearer ${orgToken}` }, signal);
      },
      async openActivityVideo({ courseUuid, activityUuid, filename }: MediaRef, range: string | undefined, signal: AbortSignal): Promise<MediaResponse> {
        const e = encodeURIComponent;
        const url = `${new URL(baseUrl).origin}/content/orgs/${e(orgUuid)}/courses/${e(courseUuid)}/activities/${e(activityUuid)}/video/${e(filename)}`;
        const ctrl = new AbortController();
        const stop = () => ctrl.abort();
        signal.addEventListener('abort', stop, { once: true });
        const timer = setTimeout(stop, timeoutMs);
        try {
          const res = await mediaFetch(url, { headers: { Authorization: `Bearer ${orgToken}`, ...(range ? { Range: range } : {}) }, signal: ctrl.signal });
          return { status: res.status, header: (n) => res.headers.get(n), body: res.body };
        } finally { clearTimeout(timer); }
      },
    } : {}),
    getAllTrails: (learnerId) => call<Trail>('GET', `/admin/${orgSlug}/trails/${encodeURIComponent(learnerId)}`),
    getCourseMeta: (courseUuid) => call<CourseMeta>('GET', `/courses/${encodeURIComponent(courseUuid)}/meta?slim=true`),
    getTrail: (learnerId, courseUuid) =>
      call<Trail>('GET', `/admin/${orgSlug}/trails/${encodeURIComponent(learnerId)}/courses/${encodeURIComponent(courseUuid)}`),
    // Completion lives under /progress (reads of the per-course breakdown stay under /trails).
    // docs.learnhouse.app/reference/headless: POST /admin/{org_slug}/progress/{user_id}/activities/{activity_uuid}/complete
    completeActivity: (learnerId, activityUuid) =>
      call<unknown>('POST', `/admin/${orgSlug}/progress/${encodeURIComponent(learnerId)}/activities/${encodeURIComponent(activityUuid)}/complete`),
  };
}
