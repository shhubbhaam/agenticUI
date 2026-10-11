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
      try {
        const data = await call('POST', '/auth/login', { form: { username: email, password }, auth: 'none' });
        const user = data?.user ?? data;
        const id = user?.id ?? user?.user_id;
        if (id === undefined || id === null) return null;
        return { learnerId: String(id), displayName: user.first_name || user.username || 'Learner' };
      } catch (e) {
        if (e.status === 401 || e.status === 403 || e.status === 400) return null;
        throw e;
      }
    },
    getCourseMeta: (courseUuid) => call('GET', `/courses/${encodeURIComponent(courseUuid)}/meta?slim=true`),
    getTrail: (learnerId, courseUuid) =>
      call('GET', `/admin/${orgSlug}/trails/${encodeURIComponent(learnerId)}/courses/${encodeURIComponent(courseUuid)}`),
    completeActivity: (learnerId, activityUuid) =>
      call('POST', `/admin/${orgSlug}/trails/${encodeURIComponent(learnerId)}/activities/${encodeURIComponent(activityUuid)}/complete`),
  };
}
module.exports = { createLearnHouse };
