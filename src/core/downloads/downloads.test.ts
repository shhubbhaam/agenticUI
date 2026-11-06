import {
  downloadsRowSubtitle,
  downloadsSummary,
  itemSubtitle,
  totalSizeMb,
  type DownloadedLesson,
} from './downloads';

const items: DownloadedLesson[] = [
  { id: 'a', title: 'A', kind: 'article', sizeMb: 6 },
  { id: 'b', title: 'B', kind: 'slides', sizeMb: 8 },
  { id: 'c', title: 'C', kind: 'worksheet', sizeMb: 4 },
];

describe('downloads copy', () => {
  it('totals sizes', () => {
    expect(totalSizeMb(items)).toBe(18);
    expect(totalSizeMb([])).toBe(0);
  });

  it('builds the Settings row subtitle', () => {
    expect(downloadsRowSubtitle(items)).toBe('18 MB · 3 lessons');
    expect(downloadsRowSubtitle(items.slice(0, 1))).toBe('6 MB · 1 lesson');
    expect(downloadsRowSubtitle([])).toBe('Nothing downloaded yet');
  });

  it('builds the summary alert', () => {
    expect(downloadsSummary(items)).toBe('3 lessons available offline · 18 MB used');
    expect(downloadsSummary([])).toBe('No lessons are available offline yet.');
  });

  it('labels each kind', () => {
    expect(itemSubtitle(items[0])).toBe('Article · Downloaded');
    expect(itemSubtitle(items[1])).toBe('Slides · Downloaded');
    expect(itemSubtitle(items[2])).toBe('Worksheet · Downloaded');
  });
});
