import { deriveChapterCrests, CHAPTER_CREST_SLOTS } from './chapterCollection';
import { makeUniformCourse } from './fixtures';

describe('deriveChapterCrests', () => {
  it('returns 8 locked crests when there is no course', () => {
    const crests = deriveChapterCrests(null);
    expect(crests).toHaveLength(8);
    expect(crests.every((c) => !c.completed)).toBe(true);
    expect(crests.map((c) => c.label)).toEqual(CHAPTER_CREST_SLOTS.map((s) => s.label));
  });

  it('marks the first N crests completed in chapter order', () => {
    const crests = deriveChapterCrests(makeUniformCourse(8, 2, 3));
    expect(crests.map((c) => c.completed)).toEqual([true, true, true, false, false, false, false, false]);
  });

  it('keeps crests past the course chapter count locked', () => {
    const crests = deriveChapterCrests(makeUniformCourse(2, 1, 2));
    expect(crests.map((c) => c.completed)).toEqual([true, true, false, false, false, false, false, false]);
  });

  it('marks every crest completed when all 8 chapters are done', () => {
    expect(deriveChapterCrests(makeUniformCourse(8, 1, 8)).every((c) => c.completed)).toBe(true);
  });

  it('sorts chapters by order, not array position', () => {
    const course = makeUniformCourse(3, 1, 1);
    course.chapters = [...course.chapters].reverse();
    expect(deriveChapterCrests(course).map((c) => c.completed).slice(0, 3)).toEqual([true, false, false]);
  });

  it('cycles the stage tones indigo, teal, plum', () => {
    expect(deriveChapterCrests(null).map((c) => c.tone).slice(0, 4)).toEqual(['indigo', 'teal', 'plum', 'indigo']);
  });

  it('does not count a chapter with zero activities as completed', () => {
    const course = makeUniformCourse(1, 0, 0);
    expect(deriveChapterCrests(course)[0].completed).toBe(false);
  });
});
