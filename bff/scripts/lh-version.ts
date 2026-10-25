// bff/scripts/lh-version.ts — which LearnHouse is the BFF talking to?
// Fetches the server's OpenAPI description (public, no token sent), prints its title + version,
// and saves it to docs/evidence/ so the exact API this project ran against is pinned.
// Usage (from bff/):  npx tsx --env-file=.env scripts/lh-version.ts
import { writeFileSync } from 'node:fs';

const base = process.env.LH_BASE_URL;
if (!base) { console.log('LH_BASE_URL is not set in bff/.env'); process.exit(1); }
const apiBase = base.replace(/\/+$/, '');               // e.g. http://host/api/v1
const origin = new URL(apiBase).origin;                 // e.g. http://host
const candidates = [`${origin}/openapi.json`, `${apiBase}/openapi.json`, `${origin}/api/openapi.json`];

(async () => {
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) { console.log(`${url} -> ${res.status}`); continue; }
      const spec = (await res.json()) as { openapi?: string; info?: { title?: string; version?: string }; paths?: Record<string, unknown> };
      if (!spec?.paths) { console.log(`${url} -> not an OpenAPI document`); continue; }
      const paths = Object.keys(spec.paths);
      const date = new Date().toISOString().slice(0, 10);
      const out = `../docs/evidence/learnhouse-openapi-${date}.json`;
      writeFileSync(out, JSON.stringify(spec, null, 2));
      console.log(`\nLearnHouse API: ${spec.info?.title ?? '?'}  version ${spec.info?.version ?? '?'}  (OpenAPI ${spec.openapi ?? '?'})`);
      console.log(`Server: ${origin}   endpoints: ${paths.length}`);
      const has = (p: string) => (paths.includes(p) ? 'yes' : 'no');
      console.log(`  GET /api/v1/activities/{activity_uuid} ............ ${has('/api/v1/activities/{activity_uuid}')}`);
      console.log(`  POST /api/v1/activities/video ..................... ${has('/api/v1/activities/video')}`);
      console.log(`  POST /api/v1/admin/{org_slug}/progress/.../complete  ${has('/api/v1/admin/{org_slug}/progress/{user_id}/activities/{activity_uuid}/complete')}`);
      console.log(`  content (video/file) routes: ${paths.filter((p) => p.includes('/content')).slice(0, 6).join(', ') || 'none found'}`);
      console.log(`\nSaved: docs/evidence/learnhouse-openapi-${date}.json`);
      return;
    } catch (e) { console.log(`${url} -> ${(e as Error).name}`); }
  }
  console.log('\nNo OpenAPI document found. Open the LearnHouse website, log in as admin, and look for a version in the footer or admin settings.');
})();
