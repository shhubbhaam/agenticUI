// bff/src/agent.js — home-layout generation, SERVER-SIDE (W2 review P0: Gemini key was in the app).
// Gemini ONLY chooses which catalogue component goes in each slot, from learner telemetry.
// Every title, subtitle and action is built here from LearnHouse course data (buildSlots),
// so the model never writes learner-facing text and can never target an activity.
const ICONS = ['zap', 'book', 'clock', 'star'];
// Same bounds as src/contracts/homeLayout.ts.
const LIMITS = { category: 40, stage: 40, title: 60, subtitle: 140, readTime: 24, buttonLabel: 24, eyebrow: 24 };

// Catalogue the model may choose from (mirrors src/contracts/homeLayout.ts and your W2 REGISTRY).
const CATALOGUE = {
  HomeCard: { slot: 'mainCard', purpose: 'Hero card that continues the learner into their next activity.', whenToUse: 'Learner is progressing well and ready for new material.' },
  PracticeCard: { slot: 'mainCard', purpose: 'Short focused practice to reinforce before moving on.', whenToUse: 'Learner is struggling, stalled, or returning after a break.' },
  NextStepCard: { slot: 'nextStepSection', purpose: 'Small teaser for what comes next.', whenToUse: 'Learner benefits from seeing what follows.' },
  RevisitSection: { slot: 'nextStepSection', purpose: 'List of 1-3 earlier activities worth reviewing.', whenToUse: 'Learner has completed activities that are worth revisiting.' },
};
const namesFor = (slot) => Object.keys(CATALOGUE).filter((n) => CATALOGUE[n].slot === slot);
const DEFAULT_DECISION = { mainCard: 'HomeCard', nextStepSection: 'NextStepCard' };

// ---- Content from LearnHouse ---------------------------------------------
const clip = (s, max, fallback) => { const t = String(s ?? '').trim(); return (t || fallback).slice(0, max); };
const TYPE_LABELS = { TYPE_VIDEO: 'Video', TYPE_DOCUMENT: 'Document', TYPE_DYNAMIC: 'Reading', TYPE_ASSIGNMENT: 'Assignment', TYPE_CUSTOM: 'Activity' };
const TYPE_ICONS = { TYPE_VIDEO: 'star', TYPE_DOCUMENT: 'book', TYPE_DYNAMIC: 'book', TYPE_ASSIGNMENT: 'zap' };
const typeLabel = (t) => TYPE_LABELS[t] ?? 'Activity';

/**
 * Build the slots for a decision using only course data.
 * course: { name }  choices: unfinished activities in course order  completed: last completed (course order)
 * Each activity: { activityUuid, name, chapterName, activityType, index } (index = 1-based position in course)
 */
function buildSlots(decision, { course = {}, choices = [], completed = [], totalCount = 0 }) {
  let main = CATALOGUE[decision?.mainCard]?.slot === 'mainCard' ? decision.mainCard : DEFAULT_DECISION.mainCard;
  let next = CATALOGUE[decision?.nextStepSection]?.slot === 'nextStepSection' ? decision.nextStepSection : DEFAULT_DECISION.nextStepSection;
  if (next === 'RevisitSection' && completed.length === 0) next = 'NextStepCard';
  if (main === 'HomeCard' && choices.length === 0) main = 'PracticeCard'; // nothing left to continue

  const current = choices[0];
  const lastDone = completed[completed.length - 1];
  const courseName = clip(course.name, 40, 'Your course');

  let mainCard = null;
  if (main === 'HomeCard' && current) {
    mainCard = { component: 'HomeCard', props: {
      category: courseName,
      stage: clip(current.chapterName, 40, `Activity ${current.index}`),
      title: clip(current.name, 60, 'Next activity'),
      subtitle: clip(`Activity ${current.index} of ${totalCount}${current.chapterName ? ` in ${current.chapterName}` : ''}`, 140, 'Your next activity'),
      readTime: typeLabel(current.activityType),
      buttonLabel: 'Mark complete',
      action: { type: 'complete-activity', activityUuid: current.activityUuid } } };
  } else if (main === 'PracticeCard') {
    const target = lastDone ?? current; // reinforce what was just done; else the upcoming one
    if (target) {
      mainCard = { component: 'PracticeCard', props: {
        eyebrow: 'Practice',
        title: clip(target.name, 60, 'Practice'),
        subtitle: clip(target.chapterName ? `From ${target.chapterName}` : courseName, 140, 'Quick practice'),
        buttonLabel: 'Start practice',
        buttonIconString: 'zap',
        action: { type: 'open-practice' } } };
    }
  }

  let nextStepSection;
  if (next === 'RevisitSection') {
    nextStepSection = { component: 'RevisitSection', props: {
      title: 'Revisit',
      items: completed.slice(-3).reverse().map((a, n) => ({
        id: clip(String(a.activityUuid).replace(/[^A-Za-z0-9_-]/g, '-'), 64, `item-${n + 1}`),
        title: clip(a.name, 60, 'Activity'),
        subtitle: clip(a.chapterName, 140, courseName),
        iconString: TYPE_ICONS[a.activityType] ?? 'book',
        action: { type: 'open-path' } })) } };
  } else {
    const upcoming = choices[1];
    nextStepSection = { component: 'NextStepCard', props: upcoming
      ? { title: clip(upcoming.name, 60, 'Up next'), subtitle: clip(upcoming.chapterName ? `Up next in ${upcoming.chapterName}` : 'Up next', 140, 'Up next'), action: { type: 'open-path' } }
      : { title: 'See your full path', subtitle: clip(`${choices.length} of ${totalCount} activities left`, 140, 'Your path'), action: { type: 'open-path' } } };
  }
  return { mainCard, nextStepSection };
}

/** Deterministic layout from LearnHouse data. Used when no model is configured or it fails/times out. */
const fallbackSlots = (ctx) => buildSlots(DEFAULT_DECISION, ctx);

// ---- Gemini: decision only -----------------------------------------------
function createGeminiAgent({ apiKey, model, timeoutMs = 8000, fetchImpl = fetch, logger = console }) {
  const S = { type: 'STRING' };
  const describe = (slot) => namesFor(slot).map((n) => `  - ${n}: ${CATALOGUE[n].purpose} Use when: ${CATALOGUE[n].whenToUse}`).join('\n');
  return {
    /** Returns { mainCard, nextStepSection, reason } with component NAMES only. Sees telemetry only. */
    async decide({ signals }) {
      const prompt = `You are the decision engine for the home screen of an AI-learning app.\nLearner telemetry: ${JSON.stringify(signals)}\n\nmainCard options:\n${describe('mainCard')}\n\nnextStepSection options:\n${describe('nextStepSection')}\n\nPick one component per slot based only on the telemetry, and give a one-sentence reason citing it.`;
      const res = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { method: 'POST', signal: AbortSignal.timeout(timeoutMs),
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 200,
              responseSchema: { type: 'OBJECT', properties: { reason: S, mainCard: { type: 'STRING', enum: namesFor('mainCard') }, nextStepSection: { type: 'STRING', enum: namesFor('nextStepSection') } }, required: ['reason', 'mainCard', 'nextStepSection'] } } }) });
      if (!res.ok) { const e = new Error(`Gemini HTTP ${res.status}`); e.status = res.status; throw e; }
      const data = await res.json();
      const decision = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text); // never logged raw
      if (CATALOGUE[decision?.mainCard]?.slot !== 'mainCard' || CATALOGUE[decision?.nextStepSection]?.slot !== 'nextStepSection') {
        throw new Error('decision outside catalogue');
      }
      logger.info?.(`[agent] decision: ${decision.mainCard} + ${decision.nextStepSection}`); // names only
      return { mainCard: decision.mainCard, nextStepSection: decision.nextStepSection };
    },
  };
}

/** Server-side authorization of every action target in a layout. Bad slot -> null. Defence in depth. */
function authorizeSlots(slots, allowedUuids) {
  const okAction = (a) => a && (a.type === 'open-path' || a.type === 'open-practice' ||
    (a.type === 'complete-activity' && allowedUuids.has(a.activityUuid)));
  const check = (slot) => {
    if (!slot || typeof slot !== 'object' || !slot.props) return null;
    if (slot.component !== 'RevisitSection' && !okAction(slot.props.action)) return null;
    if (slot.component === 'RevisitSection' && 'action' in slot.props) return null;
    for (const [k, max] of Object.entries(LIMITS)) {
      if (typeof slot.props[k] === 'string') slot.props[k] = slot.props[k].slice(0, max);
    }
    if (Array.isArray(slot.props.items)) {
      if (!slot.props.items.every((i) => okAction(i?.action))) return null;
      slot.props.items = slot.props.items.slice(0, 3);
      if (slot.props.items.length === 0) return null;
    }
    return slot;
  };
  return { mainCard: check(slots?.mainCard), nextStepSection: check(slots?.nextStepSection) };
}
module.exports = { createGeminiAgent, buildSlots, fallbackSlots, authorizeSlots, ICONS, CATALOGUE };
