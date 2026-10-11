// bff/src/agent.js — home-layout generation, SERVER-SIDE (W2 review P0: Gemini key was in the app).
// The model may only choose from activities the BFF has already authorized for this learner,
// enforced by an enum in the response schema AND re-checked after generation (authorizeSlots).
const ICONS = ['zap', 'book', 'clock', 'star'];
// Same bounds as src/contracts/homeLayout.ts, so a long model title is trimmed instead of rejected.
const LIMITS = { category: 40, stage: 40, title: 60, subtitle: 140, readTime: 24, buttonLabel: 24, eyebrow: 24 };

/** Deterministic layout from LearnHouse data. Used when no model is configured or it fails/times out. */
function fallbackSlots(choices) {
  const next = choices[0];
  return {
    mainCard: next
      ? { component: 'HomeCard', props: {
          category: 'Your course', stage: `Activity ${next.position}`, title: next.name.slice(0, 60),
          subtitle: 'Pick up where you left off.', readTime: '~5 min', buttonLabel: 'Mark complete',
          action: { type: 'complete-activity', activityUuid: next.activityUuid } } }
      : null,
    nextStepSection: { component: 'NextStepCard', props: {
      title: 'See your full path', subtitle: 'Every stage and what is left.', action: { type: 'open-path' } } },
  };
}

// Catalogue the model may choose from (mirrors src/contracts/homeLayout.ts and your W2 REGISTRY).
const CATALOGUE = {
  HomeCard: { slot: 'mainCard', purpose: 'Hero card that continues the learner into their next activity.', whenToUse: 'Learner is progressing well and ready for new material.' },
  PracticeCard: { slot: 'mainCard', purpose: 'Short focused practice to reinforce before moving on.', whenToUse: 'Learner is struggling, stalled, or returning after a break.' },
  NextStepCard: { slot: 'nextStepSection', purpose: 'Small teaser for what comes next.', whenToUse: 'Learner benefits from seeing what follows.' },
  RevisitSection: { slot: 'nextStepSection', purpose: 'List of 1-3 earlier activities worth reviewing.', whenToUse: 'Learner has completed activities that are worth revisiting.' },
};
const namesFor = (slot) => Object.keys(CATALOGUE).filter((n) => CATALOGUE[n].slot === slot);

function createGeminiAgent({ apiKey, model, timeoutMs = 8000, fetchImpl = fetch, logger = console }) {
  async function gemini(prompt, schema, temperature) {
    const res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { method: 'POST', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature, maxOutputTokens: 800 } }) });
    if (!res.ok) { const e = new Error(`Gemini HTTP ${res.status}`); e.status = res.status; throw e; }
    const data = await res.json();
    return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text); // never logged raw
  }

  const S = { type: 'STRING' };
  const actionSchema = (uuids) => ({
    type: 'OBJECT',
    properties: { type: { type: 'STRING', enum: ['complete-activity', 'open-path', 'open-practice'] },
                  ...(uuids.length ? { activityUuid: { type: 'STRING', enum: uuids } } : {}) },
    required: ['type'],
  });
  const propsSchema = (name, uuids, revisitUuids) => {
    const action = actionSchema(uuids);
    switch (name) {
      case 'HomeCard': return { type: 'OBJECT', properties: { category: S, stage: S, title: S, subtitle: S, readTime: S, buttonLabel: S, action }, required: ['category', 'stage', 'title', 'subtitle', 'readTime', 'buttonLabel', 'action'] };
      case 'PracticeCard': return { type: 'OBJECT', properties: { eyebrow: S, title: S, subtitle: S, buttonLabel: S, buttonIconString: { type: 'STRING', enum: ICONS }, action }, required: ['title', 'subtitle', 'action'] };
      case 'NextStepCard': return { type: 'OBJECT', properties: { title: S, subtitle: S, action }, required: ['title', 'subtitle', 'action'] };
      case 'RevisitSection': return { type: 'OBJECT', properties: { title: S, items: { type: 'ARRAY', items: { type: 'OBJECT',
        properties: { id: S, title: S, subtitle: S, iconString: { type: 'STRING', enum: ICONS }, action: actionSchema(revisitUuids) },
        required: ['id', 'title', 'subtitle', 'iconString', 'action'] } } }, required: ['items'] };
    }
  };
  const describe = (slot) => namesFor(slot).map((n) => `  - ${n}: ${CATALOGUE[n].purpose} Use when: ${CATALOGUE[n].whenToUse}`).join('\n');

  return {
    async generate({ choices, completed = [], signals }) {
      if (choices.length === 0 && completed.length === 0) return null;
      const lines = [
        'Unfinished activities the learner may do now (in course order):',
        ...(choices.length ? choices.map((c) => `- ${c.activityUuid}: ${c.name}`) : ['- (none)']),
        'Completed activities (can be revisited):',
        ...(completed.length ? completed.map((c) => `- ${c.activityUuid}: ${c.name}`) : ['- (none)']),
        `Learner signals: ${JSON.stringify(signals)}`,
      ].join('\n');

      // STEP 1 — DECIDE which component goes in each slot.
      const decision = await gemini(
        `You are the decision engine for the home screen of an AI-learning app.\n${lines}\n\nmainCard options:\n${describe('mainCard')}\n\nnextStepSection options:\n${describe('nextStepSection')}\n\nPick one per slot and give a one-sentence reason citing the signals.`,
        { type: 'OBJECT', properties: { reason: S, mainCard: { type: 'STRING', enum: namesFor('mainCard') }, nextStepSection: { type: 'STRING', enum: namesFor('nextStepSection') } }, required: ['reason', 'mainCard', 'nextStepSection'] },
        0.2);
      if (!CATALOGUE[decision?.mainCard] || !CATALOGUE[decision?.nextStepSection]) throw new Error('decision outside catalogue');
      if (decision.nextStepSection === 'RevisitSection' && completed.length === 0) decision.nextStepSection = 'NextStepCard';
      logger.info?.(`[agent] decision: ${decision.mainCard} + ${decision.nextStepSection}`); // names only, no content

      // STEP 2 — FILL props for the chosen components only.
      const uuids = choices.map((c) => c.activityUuid);
      const revisitUuids = completed.map((c) => c.activityUuid);
      const slotSchema = (name) => ({ type: 'OBJECT', properties: { component: { type: 'STRING', enum: [name] }, props: propsSchema(name, uuids, revisitUuids) }, required: ['component', 'props'] });
      return gemini(
        `You write the home screen content for an AI-learning app.\n${lines}\n\nLayout chosen: mainCard=${decision.mainCard}, nextStepSection=${decision.nextStepSection}. Reason: ${decision.reason}\nRules: titles under 60 chars, subtitles one short sentence. Use action complete-activity with an unfinished activityUuid to continue, open-practice for practice, open-path to view the path. RevisitSection items use complete-activity with a completed activityUuid only if relevant, otherwise open-path.`,
        { type: 'OBJECT', properties: { mainCard: slotSchema(decision.mainCard), nextStepSection: slotSchema(decision.nextStepSection) }, required: ['mainCard', 'nextStepSection'] },
        0.6);
    },
  };
}

/** Server-side authorization of every action target in a generated layout. Bad slot -> null. */
function authorizeSlots(slots, allowedUuids) {
  const okAction = (a) => a && (a.type === 'open-path' || a.type === 'open-practice' ||
    (a.type === 'complete-activity' && allowedUuids.has(a.activityUuid)));
  const check = (slot) => {
    if (!slot || typeof slot !== 'object' || !slot.props) return null;
    // RevisitSection carries actions per item; every other card has one card-level action.
    if (slot.component !== 'RevisitSection' && !okAction(slot.props.action)) return null;
    if (slot.component === 'RevisitSection' && 'action' in slot.props) return null;
    for (const [k, max] of Object.entries(LIMITS)) {
      if (typeof slot.props[k] === 'string') slot.props[k] = slot.props[k].slice(0, max);
    }
    if (Array.isArray(slot.props.items)) {
      if (!slot.props.items.every((i) => okAction(i?.action))) return null;
      // Bound the list and make ids contract-safe (model may write "Prompt Basics!").
      slot.props.items = slot.props.items.slice(0, 3).map((i, n) => ({
        ...i,
        id: (String(i.id ?? '').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 64)) || `item-${n + 1}`,
        title: String(i.title ?? '').slice(0, 60),
        subtitle: String(i.subtitle ?? '').slice(0, 140),
      }));
      if (slot.props.items.length === 0) return null;
    }
    if (typeof slot.props.title === 'string') slot.props.title = slot.props.title.slice(0, 60);
    return slot;
  };
  return { mainCard: check(slots?.mainCard), nextStepSection: check(slots?.nextStepSection) };
}
module.exports = { createGeminiAgent, fallbackSlots, authorizeSlots, ICONS, CATALOGUE };
