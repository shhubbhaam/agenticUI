import { normalizeSettings, type AppSettings } from '../../core/settings/settings';
import { getDatabase } from './database';

interface SettingsRow {
  username: string;
  download_on_wifi: number;
  reminder_time: string;
  larger_text: number;
  reduce_motion: number;
  transcript_defaults: number;
  updated_at: string;
}

// Returns null when this user has never saved settings (caller uses defaults).
export async function getSettings(username: string): Promise<AppSettings | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingsRow>('SELECT * FROM settings WHERE username = ?', [username]);
  if (!row) return null;
  // Rows are re-validated on read so a corrupt value can never leak into the app.
  return normalizeSettings({
    downloadOnWifi: row.download_on_wifi === 1,
    reminderTime: row.reminder_time,
    largerText: row.larger_text === 1,
    reduceMotion: row.reduce_motion === 1,
    transcriptDefaults: row.transcript_defaults === 1,
  });
}

// Upserts the full settings object. Rejects (so the UI can show the error
// state) if the database is unavailable or the write fails.
export async function saveSettings(username: string, settings: AppSettings): Promise<void> {
  const valid = normalizeSettings(settings);
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings
       (username, download_on_wifi, reminder_time, larger_text, reduce_motion, transcript_defaults, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET
       download_on_wifi = excluded.download_on_wifi,
       reminder_time = excluded.reminder_time,
       larger_text = excluded.larger_text,
       reduce_motion = excluded.reduce_motion,
       transcript_defaults = excluded.transcript_defaults,
       updated_at = excluded.updated_at`,
    [
      username,
      valid.downloadOnWifi ? 1 : 0,
      valid.reminderTime,
      valid.largerText ? 1 : 0,
      valid.reduceMotion ? 1 : 0,
      valid.transcriptDefaults ? 1 : 0,
      new Date().toISOString(),
    ]
  );
}
