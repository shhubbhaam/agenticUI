// bff/src/learnhouse.js — thin LearnHouse adapter. The org API token never leaves this process.
// Endpoints follow docs.learnhouse.app/reference/headless; verify them against the
// pinned LearnHouse release you run (see docs/W3-plan-and-evidence.md, "Pinning").
function createLearnHouse({ baseUrl, orgToken, orgSlug, timeoutMs = 8000, fetchImpl = fetch }) {
  if (!baseUrl || !orgToken || !orgSlug) {
    throw new Error('LH_BASE_URL, LH_API_TOKEN and LH_ORG_SLUG must be set in bff/.env');
  }
  async function call(method, path, { body, form, auth = 'org' } = {}) {
    const headers = { Accept: 'application/json' };
    if (auth === 'org') headers.Authorization = `Bearer ${orgToken}`;
    let payload;
    if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form).toString(); }
    else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetchImpl(`${baseUrl}${path}`, { method, headers, body: payload, signal: AbortSignal.timeout(timeoutMs) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { const err = new Error(`LearnHouse ${method} ${path} -> ${res.status}`); err.status = res.status; throw err; }
    return data;
  }
  return {
    // Authenticate the learner with LearnHouse itself; we keep only id + name, not their LH token.
    async login(email, password) {
      let data;
      try {
        data = await call('POST', '/auth/login', { form: { username: email, password }, auth: 'none' });
      } catch (e) {
        if (e.status === 401 || e.status === 403 || e.status === 400) return null;
        throw e;
      }
      // LearnHouse versions differ: the id may be at user.id, user.user_id or top-level.
      let user = data?.user ?? data;
      let id = user?.id ?? user?.user_id ?? data?.user_id;
      // Fallback: ask LearnHouse who this token belongs to (learner's own token, used once, never stored).
      const userToken = data?.tokens?.access_token ?? data?.access_token ?? data?.token;
      if ((id === undefined || id === null) && userToken) {
        const res = await fetchImpl(`${baseUrl}/users/profile`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${userToken}` }, signal: AbortSignal.timeout(timeoutMs) });
        if (res.ok) { user = await res.json(); id = user?.id ?? user?.user_id; }
      }
      if (id === undefined || id === null) {
        console.warn('[learnhouse] login ok but no user id found; keys:', Object.keys(data ?? {}).join(','));
        return null;
      }
      return { learnerId: String(id), displayName: user?.first_name || user?.username || 'Learner' };
    },
    getCourseMeta: (courseUuid) => call('GET', `/courses/${encodeURIComponent(courseUuid)}/meta?slim=true`),
    getTrail: (learnerId, courseUuid) =>
      call('GET', `/admin/${orgSlug}/trails/${encodeURIComponent(learnerId)}/courses/${encodeURIComponent(courseUuid)}`),
    completeActivity: (learnerId, activityUuid) =>
      call('POST', `/admin/${orgSlug}/trails/${encodeURIComponent(learnerId)}/activities/${encodeURIComponent(activityUuid)}/complete`),
  };
}
module.exports = { createLearnHouse };
