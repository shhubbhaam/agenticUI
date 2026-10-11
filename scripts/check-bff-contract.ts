// Cross-check: the envelope the BFF actually emits validates against the client contract.
import { parseHomeLayout } from '../src/contracts/homeLayout';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createApp } = require('../bff/src/app');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createFakeLearnHouse } = require('../bff/test/fakeLearnHouse');

const fake = createFakeLearnHouse();
const server = createApp({ lh: fake.lh, allowedCourses: new Set(['course_demo']), logger: { info() {} } }).server();
server.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const login = await (await fetch(`${base}/auth/login`, { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json();
  const raw = await (await fetch(`${base}/me/courses/course_demo/home-layout`, { headers: { Authorization: `Bearer ${login.token}` } })).json();
  const ok = parseHomeLayout(raw, { learnerId: login.learner.id, courseUuid: 'course_demo' });
  const wrong = parseHomeLayout(raw, { learnerId: '202', courseUuid: 'course_demo' });
  console.log(JSON.stringify({ bffEnvelopeAccepted: ok.ok && ok.slots.mainCard.ok && ok.slots.nextStepSection.ok, sameEnvelopeOtherLearner: wrong }, null, 2));
  server.close();
});
