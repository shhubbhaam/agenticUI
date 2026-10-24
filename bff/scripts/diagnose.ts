// bff/scripts/diagnose.ts — step-by-step LearnHouse check. Prints status codes and error
// messages only; never prints tokens, passwords or full response bodies.
// Usage (from bff/):  npx tsx --env-file=.env scripts/diagnose.ts you@example.com "YourPassword" [activity_uuid]
const [, , email, password, activityArg] = process.argv;
const { LH_BASE_URL: base, LH_API_TOKEN: orgToken, LH_ORG_SLUG: org, LH_ALLOWED_COURSES } = process.env;
const course = (LH_ALLOWED_COURSES ?? '').split(',')[0]?.trim();

const SECRET = /token|password|secret|authorization|cookie/i;
const redact = (v: unknown): unknown => Array.isArray(v) ? v.slice(0, 3).map(redact)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).slice(0, 12).map(([k, x]) => [k, SECRET.test(k) ? '[REDACTED]' : redact(x)]))
  : typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '…' : v;

async function step(label: string, path: string, { auth, form }: { auth?: string; form?: Record<string, string> } = {}): Promise<{ ok: boolean; json?: any }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  let body: string | undefined;
  if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form).toString(); }
  try {
    const res = await fetch(base + path, { method: form ? 'POST' : 'GET', headers, body, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let json: any = null; try { json = JSON.parse(text); } catch {}
    const loc = res.headers.get('location');
    console.log(`\n[${label}] ${form ? 'POST' : 'GET'} ${path.replace(/\/trails\/[^/]+/, '/trails/<id>')}\n  status: ${res.status}${loc ? `  redirect -> ${loc}` : ''}`);
    if (!res.ok) console.log('  error:', json ? JSON.stringify(redact(json)) : text.slice(0, 200));
    return { ok: res.ok, json };
  } catch (err) {
    const e = err as Error & { cause?: { code?: string } };
    console.log(`\n[${label}] ${path}\n  NETWORK ERROR: ${e.name} ${e.message} ${e.cause?.code ?? ''}`);
    return { ok: false };
  }
}

// 6. Where activity CONTENT lives (needed for the lesson player, M4). Prints only the type, sub-type
//    and the NAMES of content/details fields (plus content.type, e.g. "youtube"): never values or URLs.
//    Uses the org token only, so it also runs when learner login fails (e.g. dev-login setups).
async function contentShapes() {
  const shape = (a: any) => a && ({
    activity_uuid: a.activity_uuid, activity_type: a.activity_type, activity_sub_type: a.activity_sub_type,
    published: a.published, content_keys: a.content && typeof a.content === 'object' ? Object.keys(a.content) : typeof a.content,
    content_type: typeof a.content?.type === 'string' ? a.content.type : undefined,
    details_keys: a.details && typeof a.details === 'object' ? Object.keys(a.details) : typeof a.details,
  });
  const full = await step('6a course meta WITHOUT slim (org token)', `/courses/${course}/meta`, { auth: orgToken });
  const acts: any[] = (full.json?.chapters ?? []).flatMap((ch: any) => ch.activities ?? []);
  console.log(`  activities: ${acts.length}; by type:`, JSON.stringify(acts.reduce((m: any, a: any) => ({ ...m, [`${a.activity_type}/${a.activity_sub_type}`]: (m[`${a.activity_type}/${a.activity_sub_type}`] ?? 0) + 1 }), {})));
  const target = acts.find((a) => a.activity_uuid === activityArg) ?? acts.find((a) => a.activity_type === 'TYPE_VIDEO') ?? acts[0];
  if (target) {
    console.log('  first video (or given) activity in meta:', JSON.stringify(shape(target)));
    const one = await step('6b single activity (org token)', `/activities/${target.activity_uuid}`, { auth: orgToken });
    if (one.ok) console.log('  GET /activities/{uuid}:', JSON.stringify(shape(one.json)));
  }
}

(async () => {
  console.log(`base=${base} org=${org} course=${course} orgToken=${orgToken ? 'set' : 'MISSING'}`);
  await contentShapes();
  if (!email || !password) return console.log('Usage: npx tsx --env-file=.env scripts/diagnose.ts EMAIL "PASSWORD"');

  const login = await step('1 login', '/auth/login', { form: { username: email, password } });
  const data = login.json ?? {};
  const user = data.user ?? data;
  const userId = user?.id ?? user?.user_id ?? data.user_id;
  const userToken = data?.tokens?.access_token ?? data?.access_token ?? data?.token;
  console.log(`  user id found: ${userId ?? 'NO'}   user token present: ${userToken ? 'yes' : 'no'}`);
  if (!login.ok) return;
  if (!userId) console.log('  login response keys:', Object.keys(data).join(', '));

  await step('2 course meta (org token)', `/courses/${course}/meta?slim=true`, { auth: orgToken });
  if (userToken) await step('3 course meta (user token)', `/courses/${course}/meta?slim=true`, { auth: userToken });
  if (userId) await step('4 trail (org token)', `/admin/${org}/trails/${userId}/courses/${course}`, { auth: orgToken });
  if (userToken) await step('5 my orgs (user token) — to confirm the org slug', '/orgs/user/page/1/limit/10', { auth: userToken });
  console.log('\nPaste everything above into the chat.');
})();

export {};
