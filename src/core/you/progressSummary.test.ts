import { chaptersHeadline, deriveProgressSummary, progressPercent } from './progressSummary';
import { makeUniformCourse } from './fixtures';

describe('progressPercent', () => {
  it('rounds and clamps', () => {
    expect(progressPercent(26, 62)).toBe(42);
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(5, 4)).toBe(100);
  });
});

describe('chaptersHeadline', () => {
  it('words the completed chapter count', () => {
    expect(chaptersHeadline(0)).toBe('Your first chapter awaits.');
    expect(chaptersHeadline(1)).toBe('One chapter. A real difference.');
    expect(chaptersHeadline(3)).toBe('Three chapters. A real difference.');
    expect(chaptersHeadline(12)).toBe('Twelve chapters. A real difference.');
    expect(chaptersHeadline(13)).toBe('13 chapters. A real difference.');
  });
});

describe('deriveProgressSummary', () => {
  it('summarises a null course as zero progress', () => {
    expect(deriveProgressSummary(null)).toEqual({
      percent: 0, completedLessons: 0, totalLessons: 0, completedChapters: 0, allComplete: false,
      headline: 'Your first chapter awaits.', caption: '0 of 0 lessons completed',
    });
  });

  it('derives totals, percent, chapters and caption from the course', () => {
    const summary = deriveProgressSummary(makeUniformCourse(4, 2, 3));
    expect(summary.completedChapters).toBe(3);
    expect(summary.completedLessons).toBe(6);
    expect(summary.totalLessons).toBe(8);
    expect(summary.percent).toBe(75);
    expect(summary.headline).toBe('Three chapters. A real difference.');
    expect(summary.caption).toBe('6 of 8 lessons completed');
    expect(summary.allComplete).toBe(false);
  });

  it('flags a fully complete course', () => {
    const summary = deriveProgressSummary(makeUniformCourse(3, 2, 3));
    expect(summary.allComplete).toBe(true);
    expect(summary.percent).toBe(100);
  });
});
