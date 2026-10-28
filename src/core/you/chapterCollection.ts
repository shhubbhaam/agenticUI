// Pure derivation of the You tab's "Your chapter collection" crest grid.
// Zero React Native / network imports.
import type { CourseProgress } from '../learning/types';
import { deriveChapterStatus } from '../learning/deriveProgress';

export type CrestTone = 'indigo' | 'teal' | 'plum';

// Names of glyphs in src/ui/atoms/Icon.tsx (kept as plain strings so core/
// never imports from ui/).
export type CrestIconKey = 'blocks' | 'brief' | 'layers' | 'workflow' | 'agents' | 'shield' | 'chart' | 'capstone';

interface CrestSlot {
  key: string;
  label: string;
  icon: CrestIconKey;
}

// The 8 collectible crests from the Figma profile frames, in order. Slot i
// represents the course's i-th chapter (sorted by `order`).
export const CHAPTER_CREST_SLOTS: readonly CrestSlot[] = [
  { key: 'foundations', label: 'Foundations', icon: 'blocks' },
  { key: 'prompting', label: 'Prompting', icon: 'brief' },
  { key: 'context', label: 'Context', icon: 'layers' },
  { key: 'workflows', label: 'Workflows', icon: 'workflow' },
  { key: 'agents', label: 'Agents', icon: 'agents' },
  { key: 'privacy', label: 'Privacy', icon: 'shield' },
  { key: 'value', label: 'Value', icon: 'chart' },
  { key: 'capstone', label: 'Capstone', icon: 'capstone' },
];

const TONES: readonly CrestTone[] = ['indigo', 'teal', 'plum'];

export interface ChapterCrest extends CrestSlot {
  tone: CrestTone;
  completed: boolean;
}

export function deriveChapterCrests(course: CourseProgress | null): ChapterCrest[] {
  const chapters = course ? [...course.chapters].sort((a, b) => a.order - b.order) : [];
  return CHAPTER_CREST_SLOTS.map((slot, index) => {
    const chapter = chapters[index];
    return {
      ...slot,
      tone: TONES[index % TONES.length],
      completed: chapter !== undefined && deriveChapterStatus(chapter, chapters) === 'completed',
    };
  });
}
