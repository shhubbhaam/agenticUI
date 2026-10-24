// Cross-check: the envelope the BFF actually emits validates against the client contract.
// Evidence for docs/evidence/bff-contract-integration.txt.
// Usage (from bff/):  npx tsx scripts/check-contract.ts      (also: npm run check:contract from the repo root)
import type { AddressInfo } from 'node:net';
import { parseHomeLayout } from '../../src/contracts/homeLayout.ts';
import { createApp } from '../src/app.ts';
import { createFakeLearnHouse } from '../test/fakeLearnHouse.ts';

const fake = createFakeLearnHouse();
const server = createApp({ lh: fake.lh, allowedCourses: new Set(['course_demo']), logger: { info() {} } }).server();
server.listen(0, async () => {
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const login = (await (await fetch(`${base}/auth/login`, { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as { token: string; learner: { id: string } };
  const raw = await (await fetch(`${base}/me/courses/course_demo/home-layout`, { headers: { Authorization: `Bearer ${login.token}` } })).json();
  const ok = parseHomeLayout(raw, { learnerId: login.learner.id, courseUuid: 'course_demo' });
  const wrong = parseHomeLayout(raw, { learnerId: '202', courseUuid: 'course_demo' });
  console.log(JSON.stringify({ bffEnvelopeAccepted: ok.ok && ok.slots.mainCard.ok && ok.slots.nextStepSection.ok, sameEnvelopeOtherLearner: wrong }, null, 2));
  server.close();
});
