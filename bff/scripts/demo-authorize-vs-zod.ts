// Viva demo: slots that PASS the BFF's authorizeSlots but FAIL the app's Zod contract.
// Run: npx tsx scripts/demo-authorize-vs-zod.ts   (no network, no .env needed)
import { authorizeSlots } from '../src/agent.ts';
import { parseHomeLayout } from '../../src/contracts/homeLayout.ts';

const allowed = new Set(['activity_ok']);
const ctx = { learnerId: '51', courseUuid: 'course_demo' };
const envelope = (slots: unknown) => ({
  version: 1, layoutId: 'L1', learnerId: '51', courseUuid: 'course_demo',
  issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 600_000).toISOString(), slots,
});
const validNext: any = { component: 'NextStepCard', props: { title: 'Up next', subtitle: 'Lab Activity 2', action: { type: 'open-path' } } };

const cases: Array<[string, any]> = [
  ['1 Unknown component name', { component: 'EvilCard', props: { title: 'Hi', action: { type: 'open-path' } } }],
  ['2 Extra prop (html/script)', { component: 'NextStepCard', props: { title: 'Up next', subtitle: 'x', action: { type: 'open-path' }, html: '<script>alert(1)</script>' } }],
  ['3 Missing required prop', { component: 'NextStepCard', props: { title: 'Up next', action: { type: 'open-path' } } }],
  ['4 Empty string', { component: 'NextStepCard', props: { title: '', subtitle: 'x', action: { type: 'open-path' } } }],
  ['5 Wrong type (number title)', { component: 'NextStepCard', props: { title: 42, subtitle: 'x', action: { type: 'open-path' } } }],
  ['6 Extra key inside action', { component: 'NextStepCard', props: { title: 'Up next', subtitle: 'x', action: { type: 'open-path', url: 'https://evil.example' } } }],
];

for (const [name, slot] of cases) {
  const auth = authorizeSlots({ mainCard: null, nextStepSection: structuredClone(slot) }, allowed);
  const passedAuth = auth.nextStepSection !== null;
  const z = parseHomeLayout(envelope({ mainCard: null, nextStepSection: auth.nextStepSection }), ctx);
  const zSlot = z.ok ? z.slots.nextStepSection : { ok: false, reason: z.reason };
  console.log(`${name.padEnd(30)} authorizeSlots: ${passedAuth ? 'PASS' : 'blocked'}   Zod: ${zSlot.ok ? 'PASS' : 'REJECT (' + (zSlot as any).reason + ')'}`);
}

console.log('\nPer-slot fallback: bad mainCard + valid nextStep in ONE layout');
const mixed = authorizeSlots({ mainCard: cases[0][1], nextStepSection: structuredClone(validNext) } as any, allowed);
const r = parseHomeLayout(envelope(mixed), ctx);
if (r.ok) console.log(`  mainCard: ${r.slots.mainCard.ok ? 'render' : 'fallback (' + (r.slots.mainCard as any).reason + ')'}   nextStepSection: ${r.slots.nextStepSection.ok ? 'render' : 'fallback'}`);

console.log('\nEnvelope checks authorizeSlots never does:');
const good = authorizeSlots({ mainCard: null, nextStepSection: structuredClone(validNext) }, allowed);
console.log('  other learner :', parseHomeLayout({ ...envelope(good), learnerId: '99' }, ctx));
console.log('  expired       :', parseHomeLayout({ ...envelope(good), expiresAt: new Date(Date.now() - 1000).toISOString() }, ctx));
console.log('  version 2     :', parseHomeLayout({ ...envelope(good), version: 2 }, ctx));
