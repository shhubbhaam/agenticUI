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
    chapters?: Array<{ chapter_uuid?: string; activities?: Array<{ activity_uuid: string; completed?: boolean }> }>;
  }>;
}
interface LhUser { id?: string | number; user_id?: string | number; first_name?: string; username?: string }
interface LhLoginResponse extends LhUser {
  user?: LhUser;
  tokens?: { access_token?: string };
  access_token?: string;
  token?: string;
}

/** Everything the BFF needs from LearnHouse. The fake in test/ implements the same interface. */
export interface LearnHouse {
  login(email: string, password: string): Promise<Learner | null>;
  getCourseMeta(courseUuid: string): Promise<CourseMeta>;
  getTrail(learnerId: string, courseUuid: string): Promise<Trail>;
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
  return {
    // Authenticate the learner with LearnHouse itself; we keep only id + name, not their LH token.
    async login(email, password) {
      let data: LhLoginResponse | null;
      try {
        data = await call<LhLoginResponse | null>('POST', '/auth/login', { form: { username: email, password }, auth: 'none' });
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status === 401 || status === 403 || status === 400) return null;
        throw e;
      }
      // LearnHouse versions differ: the id may be at user.id, user.user_id or top-level.
      let user: LhUser | null | undefined = data?.user ?? data;
      let id = user?.id ?? user?.user_id ?? data?.user_id;
      // Fallback: ask LearnHouse who this token belongs to (learner's own token, used once, never stored).
      const userToken = data?.tokens?.access_token ?? data?.access_token ?? data?.token;
      if ((id === undefined || id === null) && userToken) {
        const res = await fetchImpl(`${baseUrl}/users/profile`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${userToken}` }, signal: AbortSignal.timeout(timeoutMs) });
        if (res.ok) { user = (await res.json()) as LhUser; id = user?.id ?? user?.user_id; }
      }
      if (id === undefined || id === null) {
        console.warn('[learnhouse] login ok but no user id found; keys:', Object.keys(data ?? {}).join(','));
        return null;
      }
      return { learnerId: String(id), displayName: user?.first_name || user?.username || 'Learner' };
    },
    getCourseMeta: (courseUuid) => call<CourseMeta>('GET', `/courses/${encodeURIComponent(courseUuid)}/meta?slim=true`),
    getTrail: (learnerId, courseUuid) =>
      call<Trail>('GET', `/admin/${orgSlug}/trails/${encodeURIComponent(learnerId)}/courses/${encodeURIComponent(courseUuid)}`),
    // Completion lives under /progress (reads of the per-course breakdown stay under /trails).
    // docs.learnhouse.app/reference/headless: POST /admin/{org_slug}/progress/{user_id}/activities/{activity_uuid}/complete
    completeActivity: (learnerId, activityUuid) =>
      call<unknown>('POST', `/admin/${orgSlug}/progress/${encodeURIComponent(learnerId)}/activities/${encodeURIComponent(activityUuid)}/complete`),
  };
}
