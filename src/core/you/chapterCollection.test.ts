import { deriveChapterCrests, PLACEHOLDER_CREST_COUNT } from './chapterCollection';
import { CREST_ICONS, crestDecor } from './crestDecor';
import { makeActivity, makeChapter, makeCourse, makeUniformCourse } from './fixtures';

describe('deriveChapterCrests', () => {
  it('returns unnamed locked placeholders when there is no course', () => {
    const crests = deriveChapterCrests(null);
    expect(crests).toHaveLength(PLACEHOLDER_CREST_COUNT);
    expect(crests.every((c) => !c.completed && c.label === null)).toBe(true);
    expect(new Set(crests.map((c) => c.key)).size).toBe(PLACEHOLDER_CREST_COUNT);
  });

  it('returns placeholders for a course with no chapters', () => {
    expect(deriveChapterCrests(makeCourse([])).every((c) => c.label === null)).toBe(true);
  });

  it.each([1, 3, 8, 13])('returns exactly one crest per chapter (%i)', (n) => {
    expect(deriveChapterCrests(makeUniformCourse(n, 2, 0))).toHaveLength(n);
  });

  it('uses the real API chapter names, sorted by order', () => {
    const course = makeCourse([
      makeChapter(2, [makeActivity('1', 'video', false)], { name: 'Third' }),
      makeChapter(0, [makeActivity('2', 'video', true)], { name: 'First' }),
      makeChapter(1, [makeActivity('3', 'video', false)], { name: 'Second' }),
    ]);
    const crests = deriveChapterCrests(course);
    expect(crests.map((c) => c.label)).toEqual(['First', 'Second', 'Third']);
    expect(crests.map((c) => c.completed)).toEqual([true, false, false]);
  });

  it('marks only fully completed chapters', () => {
    const crests = deriveChapterCrests(makeUniformCourse(8, 2, 3));
    expect(crests.map((c) => c.completed)).toEqual([true, true, true, false, false, false, false, false]);
    expect(deriveChapterCrests(makeUniformCourse(5, 1, 5)).every((c) => c.completed)).toBe(true);
  });

  it('does not count a chapter with zero activities as completed', () => {
    expect(deriveChapterCrests(makeUniformCourse(1, 0, 0))[0].completed).toBe(false);
  });

  it('keeps the Figma look for early slots and cycles icons/tones beyond them', () => {
    const crests = deriveChapterCrests(makeUniformCourse(10, 1, 0));
    expect(crests.slice(0, 4).map((c) => c.tone)).toEqual(['indigo', 'teal', 'plum', 'indigo']);
    expect(crests.slice(0, 3).map((c) => c.icon)).toEqual(['blocks', 'brief', 'layers']);
    expect(crests[8].icon).toBe(CREST_ICONS[0]);
    expect(crests[9].tone).toBe(crestDecor(9).tone);
  });
});
