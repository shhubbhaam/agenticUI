// bff/scripts/diagnose.js — step-by-step LearnHouse check. Prints status codes and error
// messages only; never prints tokens, passwords or full response bodies.
// Usage (from bff/):  node --env-file=.env scripts/diagnose.js you@example.com "YourPassword"
const [, , email, password] = process.argv;
const { LH_BASE_URL: base, LH_API_TOKEN: orgToken, LH_ORG_SLUG: org, LH_ALLOWED_COURSES } = process.env;
const course = (LH_ALLOWED_COURSES ?? '').split(',')[0]?.trim();

const SECRET = /token|password|secret|authorization|cookie/i;
const redact = (v) => Array.isArray(v) ? v.slice(0, 3).map(redact)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).slice(0, 12).map(([k, x]) => [k, SECRET.test(k) ? '[REDACTED]' : redact(x)]))
  : typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '…' : v;

async function step(label, path, { auth, form } = {}) {
  const headers = { Accept: 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  let body;
  if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form).toString(); }
  try {
    const res = await fetch(base + path, { method: form ? 'POST' : 'GET', headers, body, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    const loc = res.headers.get('location');
    console.log(`\n[${label}] ${form ? 'POST' : 'GET'} ${path.replace(/\/trails\/[^/]+/, '/trails/<id>')}\n  status: ${res.status}${loc ? `  redirect -> ${loc}` : ''}`);
    if (!res.ok) console.log('  error:', json ? JSON.stringify(redact(json)) : text.slice(0, 200));
    return { ok: res.ok, json };
  } catch (e) {
    console.log(`\n[${label}] ${path}\n  NETWORK ERROR: ${e.name} ${e.message} ${e.cause?.code ?? ''}`);
    return { ok: false };
  }
}

(async () => {
  console.log(`base=${base} org=${org} course=${course} orgToken=${orgToken ? 'set' : 'MISSING'}`);
  if (!email || !password) return console.log('Usage: node --env-file=.env scripts/diagnose.js EMAIL "PASSWORD"');

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
