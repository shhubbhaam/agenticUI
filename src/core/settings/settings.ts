// Pure settings schema: defaults, validation and display copy. Zero RN /
// storage imports — persistence lives in data/local/localSettingsDb.ts.

// Every user-changeable preference on the Settings + Accessibility screens.
// Daily budget and format preferences are not duplicated here: they stay
// owned by the onboarding answers.
export interface AppSettings {
  // Settings: "Download on Wi-Fi" — fetch tomorrow's plan when on Wi-Fi.
  downloadOnWifi: boolean;
  // Settings: "Reminder" — local time of the daily nudge, 24h "HH:MM".
  reminderTime: string;
  // Accessibility: "Larger text" — scale lesson and interface text up.
  largerText: boolean;
  // Accessibility: "Reduce motion" — calm, simple transitions.
  reduceMotion: boolean;
  // Accessibility: "Transcript defaults" — open read-along with audio.
  transcriptDefaults: boolean;
}

export type BooleanSettingKey = {
  [K in keyof AppSettings]: AppSettings[K] extends boolean ? K : never;
}[keyof AppSettings];

export const DEFAULT_REMINDER_TIME = '19:30';

export const DEFAULT_SETTINGS: AppSettings = {
  downloadOnWifi: true,
  reminderTime: DEFAULT_REMINDER_TIME,
  largerText: false,
  reduceMotion: true,
  transcriptDefaults: false,
};

const REMINDER_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidReminderTime(value: unknown): value is string {
  return typeof value === 'string' && REMINDER_PATTERN.test(value);
}

// Merges any partial / untrusted input over the defaults. Unknown keys are
// dropped and wrongly-typed or malformed values fall back to the default, so
// a stale or hand-edited row can never produce an invalid AppSettings.
export function normalizeSettings(input: Partial<Record<keyof AppSettings, unknown>> | null | undefined): AppSettings {
  const source = input ?? {};
  const bool = (key: BooleanSettingKey): boolean =>
    typeof source[key] === 'boolean' ? (source[key] as boolean) : DEFAULT_SETTINGS[key];
  return {
    downloadOnWifi: bool('downloadOnWifi'),
    reminderTime: isValidReminderTime(source.reminderTime) ? source.reminderTime : DEFAULT_SETTINGS.reminderTime,
    largerText: bool('largerText'),
    reduceMotion: bool('reduceMotion'),
    transcriptDefaults: bool('transcriptDefaults'),
  };
}

// "19:30" -> "7:30 PM"
export function formatReminderTime(time: string): string {
  const valid = isValidReminderTime(time) ? time : DEFAULT_REMINDER_TIME;
  const [hh, mm] = valid.split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export function reminderSubtitle(time: string): string {
  return `${formatReminderTime(time)} · A gentle nudge`;
}

// Accessibility text scale. Larger text enlarges type by 25%.
export const LARGER_TEXT_SCALE = 1.25;

export function textScaleFor(settings: Pick<AppSettings, 'largerText'>): number {
  return settings.largerText ? LARGER_TEXT_SCALE : 1;
}

export function scaleFontSize(size: number, scale: number): number {
  return Math.round(size * scale * 100) / 100;
}
