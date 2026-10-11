// bff/src/agent.js — home-layout generation, SERVER-SIDE (W2 review P0: Gemini key was in the app).
// The model may only choose from activities the BFF has already authorized for this learner,
// enforced by an enum in the response schema AND re-checked after generation (authorizeSlots).
const ICONS = ['zap', 'book', 'clock', 'star'];

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

function createGeminiAgent({ apiKey, model, timeoutMs = 8000, fetchImpl = fetch }) {
  return {
    async generate({ choices, signals }) {
      if (choices.length === 0) return null;
      const uuids = choices.map((c) => c.activityUuid);
      const action = {
        type: 'OBJECT',
        properties: { type: { type: 'STRING', enum: ['complete-activity', 'open-path', 'open-practice'] },
                      activityUuid: { type: 'STRING', enum: uuids } },
        required: ['type'],
      };
      const s = (max) => ({ type: 'STRING', maxLength: String(max) });
      const schema = {
        type: 'OBJECT',
        properties: {
          mainCard: { type: 'OBJECT', properties: {
            component: { type: 'STRING', enum: ['HomeCard'] },
            props: { type: 'OBJECT', properties: { category: s(40), stage: s(40), title: s(60), subtitle: s(140),
              readTime: s(24), buttonLabel: s(24), action }, required: ['category', 'stage', 'title', 'subtitle', 'readTime', 'buttonLabel', 'action'] } },
            required: ['component', 'props'] },
          nextStepSection: { type: 'OBJECT', properties: {
            component: { type: 'STRING', enum: ['NextStepCard'] },
            props: { type: 'OBJECT', properties: { title: s(60), subtitle: s(140), action }, required: ['title', 'subtitle', 'action'] } },
            required: ['component', 'props'] },
        },
        required: ['mainCard', 'nextStepSection'],
      };
      const prompt = [
        'You choose the home screen for a learner of an AI-learning app.',
        'Use ONLY these authorized, unfinished activities (in course order):',
        ...choices.map((c) => `- ${c.activityUuid}: ${c.name}`),
        `Minimal learner signals: ${JSON.stringify(signals)}`,
        'mainCard: the activity to do now (action complete-activity). nextStepSection: a teaser (open-path or the following activity).',
      ].join('\n');
      const res = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { method: 'POST', signal: AbortSignal.timeout(timeoutMs),
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.3, maxOutputTokens: 800 } }) });
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text); // never logged raw
    },
  };
}

/** Server-side authorization of every action target in a generated layout. Bad slot -> null. */
function authorizeSlots(slots, allowedUuids) {
  const okAction = (a) => a && (a.type === 'open-path' || a.type === 'open-practice' ||
    (a.type === 'complete-activity' && allowedUuids.has(a.activityUuid)));
  const check = (slot) => {
    if (!slot || typeof slot !== 'object' || !slot.props) return null;
    if (!okAction(slot.props.action)) return null;
    if (Array.isArray(slot.props.items) && !slot.props.items.every((i) => okAction(i.action))) return null;
    return slot;
  };
  return { mainCard: check(slots?.mainCard), nextStepSection: check(slots?.nextStepSection) };
}
module.exports = { createGeminiAgent, fallbackSlots, authorizeSlots, ICONS };
