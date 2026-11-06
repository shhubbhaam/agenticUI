import { useSettingsStore } from './useSettingsStore';
import { DEFAULT_SETTINGS } from '../core/settings/settings';
import { getSettings, saveSettings } from '../data/local/localSettingsDb';
import { getDatabase } from '../data/local/database';

const USER = 'store-user@example.com';

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  it('starts on the defaults with no notice', () => {
    const s = useSettingsStore.getState();
    expect(s.settings).toEqual(DEFAULT_SETTINGS);
    expect(s.notice).toBeNull();
    expect(s.username).toBeNull();
  });

  it('loads saved settings for a user, defaults for a new user', async () => {
    await saveSettings('loader@example.com', { ...DEFAULT_SETTINGS, largerText: true });
    await useSettingsStore.getState().load('loader@example.com');
    expect(useSettingsStore.getState().settings.largerText).toBe(true);
    await useSettingsStore.getState().load('brand-new@example.com');
    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when loading throws', async () => {
    const db = await getDatabase();
    const spy = jest.spyOn(db, 'getFirstAsync').mockRejectedValueOnce(new Error('locked'));
    await useSettingsStore.getState().load(USER);
    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    spy.mockRestore();
  });

  it('persists an update to SQLite and raises the saved notice', async () => {
    await useSettingsStore.getState().load(USER);
    await expect(useSettingsStore.getState().update({ reduceMotion: false })).resolves.toBe(true);
    expect(useSettingsStore.getState().settings.reduceMotion).toBe(false);
    expect(useSettingsStore.getState().notice).toBe('saved');
    expect((await getSettings(USER))?.reduceMotion).toBe(false);
  });

  it('keeps the previous preference and raises the failed notice when the write fails', async () => {
    await useSettingsStore.getState().load(USER);
    const before = useSettingsStore.getState().settings;
    const db = await getDatabase();
    const spy = jest.spyOn(db, 'runAsync').mockRejectedValueOnce(new Error('disk full'));
    await expect(useSettingsStore.getState().update({ largerText: true })).resolves.toBe(false);
    spy.mockRestore();
    expect(useSettingsStore.getState().settings).toEqual(before);
    expect(useSettingsStore.getState().notice).toBe('failed');
  });

  it('fails (without throwing) when nobody is signed in', async () => {
    await expect(useSettingsStore.getState().update({ largerText: true })).resolves.toBe(false);
    expect(useSettingsStore.getState().notice).toBe('failed');
    expect(useSettingsStore.getState().settings.largerText).toBe(false);
  });

  it('clears the notice on dismiss and on a later successful save replaces a failure', async () => {
    await useSettingsStore.getState().load(USER);
    useSettingsStore.setState({ notice: 'failed' });
    await useSettingsStore.getState().update({ downloadOnWifi: false });
    expect(useSettingsStore.getState().notice).toBe('saved');
    useSettingsStore.getState().dismissNotice();
    expect(useSettingsStore.getState().notice).toBeNull();
  });
});
