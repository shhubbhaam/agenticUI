// Pure derivation of the You tab's "Your chapter collection" crest grid.
// Zero React Native / network imports.
//
// One crest per chapter of the active course (sorted by `order`). The label is
// the chapter's real API name; completed = the chapter is fully complete
// (deriveChapterStatus), otherwise it renders locked. Icon/tone are decorative
// only (see crestDecor.ts).
//
// EMPTY STATE: with no course / no chapters we never invent chapter names. We
// return PLACEHOLDER_CREST_COUNT locked crests with `label: null` (the Figma
// empty look: locked crests, no names).
import type { CourseProgress } from '../learning/types';
import { deriveChapterStatus } from '../learning/deriveProgress';
import { crestDecor, type CrestIconKey, type CrestTone } from './crestDecor';

export type { CrestIconKey, CrestTone };

export const PLACEHOLDER_CREST_COUNT = 8;

export interface ChapterCrest {
  key: string;
  // null = placeholder crest with no name.
  label: string | null;
  icon: CrestIconKey;
  tone: CrestTone;
  completed: boolean;
}

export function deriveChapterCrests(course: CourseProgress | null): ChapterCrest[] {
  const chapters = course ? [...course.chapters].sort((a, b) => a.order - b.order) : [];
  if (chapters.length === 0) {
    return Array.from({ length: PLACEHOLDER_CREST_COUNT }, (_, index) => ({
      key: `placeholder-${index}`,
      label: null,
      ...crestDecor(index),
      completed: false,
    }));
  }
  return chapters.map((chapter, index) => ({
    key: chapter.id,
    label: chapter.name,
    ...crestDecor(index),
    completed: deriveChapterStatus(chapter, chapters) === 'completed',
  }));
}
