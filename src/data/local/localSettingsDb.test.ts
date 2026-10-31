import { getSettings, saveSettings } from './localSettingsDb';
import { getDatabase } from './database';
import { getProfile, saveCredentials } from './localProfileDb';
import { DEFAULT_SETTINGS, type AppSettings } from '../../core/settings/settings';

const custom: AppSettings = {
  downloadOnWifi: false,
  reminderTime: '08:15',
  largerText: true,
  reduceMotion: false,
  transcriptDefaults: true,
};

describe('localSettingsDb', () => {
  it('returns null for a user with no saved settings', async () => {
    await expect(getSettings('nobody@example.com')).resolves.toBeNull();
  });

  it('round-trips every setting', async () => {
    await saveSettings('a@example.com', custom);
    await expect(getSettings('a@example.com')).resolves.toEqual(custom);
  });

  it('overwrites on a second save (upsert) without duplicating the row', async () => {
    await saveSettings('b@example.com', DEFAULT_SETTINGS);
    await saveSettings('b@example.com', custom);
    await expect(getSettings('b@example.com')).resolves.toEqual(custom);
    const db = await getDatabase();
    const rows = await db.getAllAsync('SELECT * FROM settings WHERE username = ?', ['b@example.com']);
    expect(rows).toHaveLength(1);
  });

  it('keys settings by username, case-insensitively, and keeps users separate', async () => {
    await saveSettings('Case@Example.com', custom);
    await expect(getSettings('case@example.com')).resolves.toEqual(custom);
    await expect(getSettings('other@example.com')).resolves.toBeNull();
  });

  it('lives in the same database as the profile table (one shared opener)', async () => {
    await saveCredentials('shared@example.com', 'password-shared');
    await saveSettings('shared@example.com', custom);
    expect((await getProfile('shared@example.com'))?.passwordHash).toBeTruthy();
    await expect(getSettings('shared@example.com')).resolves.toEqual(custom);
  });

  it('normalizes a corrupt stored row back to valid settings on read', async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO settings (username, download_on_wifi, reminder_time, larger_text, reduce_motion, transcript_defaults, updated_at)
       VALUES (?, 1, ?, 1, 0, 0, ?)`,
      ['corrupt@example.com', 'not-a-time', new Date().toISOString()]
    );
    const loaded = await getSettings('corrupt@example.com');
    expect(loaded?.reminderTime).toBe(DEFAULT_SETTINGS.reminderTime);
    expect(loaded?.largerText).toBe(true);
  });

  it('rejects when the database write fails', async () => {
    const db = await getDatabase();
    const spy = jest.spyOn(db, 'runAsync').mockRejectedValueOnce(new Error('disk full'));
    await expect(saveSettings('fail@example.com', custom)).rejects.toThrow('disk full');
    spy.mockRestore();
    await expect(getSettings('fail@example.com')).resolves.toBeNull();
  });
});
