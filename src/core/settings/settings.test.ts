import {
  DEFAULT_SETTINGS,
  budgetSubtitle,
  formatsSubtitle,
  LARGER_TEXT_SCALE,
  formatReminderTime,
  isValidReminderTime,
  normalizeSettings,
  reminderSubtitle,
  scaleFontSize,
  textScaleFor,
} from './settings';

describe('normalizeSettings', () => {
  it('returns the defaults for null / empty input', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('matches the Figma defaults (Wi-Fi on, reduce motion on, larger text + transcripts off, 7:30 PM)', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      downloadOnWifi: true,
      reminderTime: '19:30',
      largerText: false,
      reduceMotion: true,
      transcriptDefaults: false,
    });
  });

  it('keeps valid values', () => {
    const next = { downloadOnWifi: false, reminderTime: '08:05', largerText: true, reduceMotion: false, transcriptDefaults: true };
    expect(normalizeSettings(next)).toEqual(next);
  });

  it('falls back to defaults for wrongly typed values and malformed times', () => {
    expect(
      normalizeSettings({ downloadOnWifi: 'yes', reminderTime: '25:00', largerText: 1, reduceMotion: null, transcriptDefaults: undefined })
    ).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ reminderTime: '7:30 PM' }).reminderTime).toBe('19:30');
  });

  it('drops unknown keys', () => {
    expect(Object.keys(normalizeSettings({ extra: true } as never)).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });
});

describe('reminder time', () => {
  it('validates HH:MM', () => {
    expect(isValidReminderTime('00:00')).toBe(true);
    expect(isValidReminderTime('23:59')).toBe(true);
    expect(isValidReminderTime('24:00')).toBe(false);
    expect(isValidReminderTime('7:30')).toBe(false);
    expect(isValidReminderTime(1930)).toBe(false);
  });

  it('formats 12-hour display copy', () => {
    expect(formatReminderTime('19:30')).toBe('7:30 PM');
    expect(formatReminderTime('00:05')).toBe('12:05 AM');
    expect(formatReminderTime('12:00')).toBe('12:00 PM');
    expect(formatReminderTime('garbage')).toBe('7:30 PM');
    expect(reminderSubtitle('19:30')).toBe('7:30 PM · A gentle nudge');
  });
});

describe('onboarding-derived subtitles', () => {
  it('formats the daily budget, defaulting to 15 minutes', () => {
    expect(budgetSubtitle(15)).toBe('15 minutes · Change anytime');
    expect(budgetSubtitle(30)).toBe('30 minutes · Change anytime');
    expect(budgetSubtitle(null)).toBe('15 minutes · Change anytime');
  });

  it('joins formats naturally, defaulting to the Figma copy', () => {
    expect(formatsSubtitle(['reading', 'listening', 'doing'])).toBe('Reading, listening and doing');
    expect(formatsSubtitle(['doing', 'watching'])).toBe('Doing and watching');
    expect(formatsSubtitle(['listening'])).toBe('Listening');
    expect(formatsSubtitle([])).toBe('Reading, listening and doing');
  });
});

describe('text scale', () => {
  it('is 1 by default and 1.25 when larger text is on', () => {
    expect(textScaleFor({ largerText: false })).toBe(1);
    expect(textScaleFor({ largerText: true })).toBe(LARGER_TEXT_SCALE);
  });

  it('scales font sizes', () => {
    expect(scaleFontSize(14, 1)).toBe(14);
    expect(scaleFontSize(14, LARGER_TEXT_SCALE)).toBe(17.5);
  });
});
