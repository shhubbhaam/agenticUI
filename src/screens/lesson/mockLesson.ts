// DEMO DATA for the lesson player UI (M4 part 1). Replaced by real lesson data
// (checkpoints keyed to the LearnHouse activity) in part 2. Not shown as real content.
import type { PlayerCheckpoint } from './useCheckpointPlayer';

export type MockCheckpoint = PlayerCheckpoint;

export const MOCK_LESSON = {
  eyebrow: 'WATCH & NOTICE',
  posterEyebrow: 'A field note from an AI rollout',
  posterHeadline: 'Great demo.\nMissing handoff.',
  title: 'Watch a rollout go wrong',
  chapter: 'Working with Context',
  format: 'Video',
  durationSec: 245,
  online: 'uploaded' as 'uploaded' | 'youtube',
  checkpoints: [
    {
      id: 'cp1',
      atSec: 72,
      prompt: { title: 'Look for the missing owner.', body: 'As you watch, notice who is responsible for the step after the AI response.' },
      question: 'Who owned the step after the AI drafted the reply?',
      options: [
        { id: 'a', label: 'The support lead' },
        { id: 'b', label: 'Nobody was assigned' },
        { id: 'c', label: 'The AI vendor' },
      ],
      correctId: 'b',
      explanation: 'No one was named for the handoff, so the draft sat unsent.',
    },
    {
      id: 'cp2',
      atSec: 170,
      prompt: { title: 'Watch the fix.', body: 'Notice what the team adds to the workflow before the second rollout.' },
      question: 'What did the team add before rolling out again?',
      options: [
        { id: 'a', label: 'A bigger model' },
        { id: 'b', label: 'A named reviewer for every AI draft' },
        { id: 'c', label: 'More training data' },
      ],
      correctId: 'b',
      explanation: 'A named reviewer closes the handoff gap the first rollout had.',
    },
  ] satisfies MockCheckpoint[],
};

/** DEMO checkpoints placed early in any real video (until real ones exist per activity). */
export function demoCheckpointsFor(startSec = 0): MockCheckpoint[] {
  return MOCK_LESSON.checkpoints.map((c, i) => ({ ...c, atSec: startSec + (i === 0 ? 20 : 45), question: `${c.question} (demo)` }));
}
