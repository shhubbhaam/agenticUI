import { latestSavedWork, savedLabel, streakCaption } from './rhythm';
import { makeActivity, makeChapter, makeCourse } from './fixtures';

const NOW = new Date('2026-10-28T12:00:00');

describe('savedLabel', () => {
  it('says today for the same day and a short date otherwise', () => {
    expect(savedLabel(new Date('2026-10-28T08:00:00'), NOW)).toBe('Saved today');
    expect(savedLabel(new Date('2026-10-03T08:00:00'), NOW)).toBe('Saved Oct 3');
  });
});

describe('latestSavedWork', () => {
  it('is null without a course or without completed assignments', () => {
    expect(latestSavedWork(null, NOW)).toBeNull();
    expect(latestSavedWork(makeCourse([makeChapter(0, [makeActivity('1', 'video', true), makeActivity('2', 'assignment', false)])]), NOW)).toBeNull();
  });
  it('picks the most recently completed assignment', () => {
    const course = makeCourse([
      makeChapter(0, [
        { ...makeActivity('1', 'assignment', true, new Date('2026-10-01T10:00:00')), name: 'Older brief' },
        { ...makeActivity('2', 'assignment', true, new Date('2026-10-28T09:00:00')), name: 'Cost-per-report brief' },
      ]),
    ]);
    expect(latestSavedWork(course, NOW)).toEqual({ title: 'Cost-per-report brief', subtitle: 'Application · Saved today' });
  });
});

describe('streakCaption', () => {
  it('words the streak', () => {
    expect(streakCaption(0, false)).toBe('Start your streak today');
    expect(streakCaption(13, true)).toBe('13 days · Streak kept today');
    expect(streakCaption(1, false)).toBe('1 day · Keep it going today');
  });
});
