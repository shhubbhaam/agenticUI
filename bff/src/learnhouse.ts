// bff/src/learnhouse.ts — thin LearnHouse adapter. The org API token never leaves this process.
// Endpoints follow docs.learnhouse.app/reference/headless; verify them against the
// pinned LearnHouse release you run (see docs/W3-plan-and-evidence.md, "Pinning").
import { httpError, type FetchLike } from './util.ts';
import type { Learner } from './sessions.ts';

// ---- LearnHouse response shapes (only the fields the BFF reads) ----------
export interface LhActivity {
  activity_uuid: string;
  name?: string;
  published?: boolean;
  activity_type?: string;
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
    chapters?: Array<{ chapter_uuid?: string; order?: number; activities?: Array<{ activity_uuid: string; completed?: boolean }> }>;
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
}

export interface LearnHouseOptions {
  baseUrl?: string;
  orgToken?: string;
  orgSlug?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

interface CallOptions { body?: unknown; form?: Record<string, string>; auth?: 'org' | 'none' }

export function createLearnHouse({ baseUrl, orgToken, orgSlug, timeoutMs = 8000, fetchImpl = fetch }: LearnHouseOptions): LearnHouse {
  if (!baseUrl || !orgToken || !orgSlug) {
    throw new Error('LH_BASE_URL, LH_API_TOKEN and LH_ORG_SLUG must be set in bff/.env');
  }
  async function call<T>(method: string, path: string, { body, form, auth = 'org' }: CallOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (auth === 'org') headers.Authorization = `Bearer ${orgToken}`;
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

  // Turn a LearnHouse login/oauth response into a learner. The learner's own LearnHouse token is used
  // here once (to read their session) and never stored or returned to the app.
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
    return { learnerId: String(id), displayName, profile };
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
