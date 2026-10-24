import { activityTypeLabel, activityIcon } from './activityDisplay';

describe('activityTypeLabel', () => {
  it.each([
    ['video', 'Video'],
    ['document', 'Document'],
    ['article', 'Article'],
    ['assignment', 'Assignment'],
    ['other', 'Activity'],
  ] as const)('%s -> %s', (type, label) => {
    expect(activityTypeLabel(type)).toBe(label);
  });
});

describe('activityIcon', () => {
  it('returns check for a completed activity regardless of type', () => {
    expect(activityIcon({ type: 'video', completed: true })).toBe('check');
    expect(activityIcon({ type: 'assignment', completed: true })).toBe('check');
  });

  it.each([
    ['video', 'play'],
    ['document', 'file'],
    ['article', 'file'],
    ['assignment', 'edit'],
    ['other', 'file'],
  ] as const)('%s (incomplete) -> %s', (type, icon) => {
    expect(activityIcon({ type, completed: false })).toBe(icon);
  });
});
