import { openDatabaseAsync } from 'expo-sqlite';
import { getProfile, saveProfile, saveOnboardingAnswers } from './localProfileDb';
import type { OnboardingAnswers } from '../../core/onboarding/types';

const answers: OnboardingAnswers = {
  role: 'marketing',
  experience: 'part-of-week',
  goal: 'save-time',
  budgetMinutes: 15,
  formats: ['reading', 'doing'],
  diagnostic: { 1: 'a', 2: 'b', 3: 'c' },
};

describe('localProfileDb', () => {
  it('returns null for an unknown username', async () => {
    await expect(getProfile('nobody@example.com')).resolves.toBeNull();
  });

  it('creates a profile with no credentials of any kind', async () => {
    await saveProfile('a@example.com');
    const profile = await getProfile('a@example.com');

    expect(profile).not.toBeNull();
    expect(Object.keys(profile!).sort()).toEqual(['answers', 'completed', 'updatedAt', 'username']);
    expect(profile?.answers).toBeNull();
    expect(profile?.completed).toBe(false);
  });

  it('saves and round-trips onboarding answers', async () => {
    await saveProfile('b@example.com');
    await saveOnboardingAnswers('b@example.com', answers, true);
    const profile = await getProfile('b@example.com');

    expect(profile?.answers).toEqual(answers);
    expect(profile?.completed).toBe(true);
  });

  it('keeps the answers when the profile is saved again on a later sign-in', async () => {
    await saveProfile('d@example.com');
    await saveOnboardingAnswers('d@example.com', answers, true);
    await saveProfile('d@example.com');
    const profile = await getProfile('d@example.com');

    expect(profile?.answers).toEqual(answers);
    expect(profile?.completed).toBe(true);
  });

  it('creates a profile when answers arrive first (e.g. Google sign-in)', async () => {
    await saveOnboardingAnswers('g@example.com', answers, true);
    const profile = await getProfile('g@example.com');

    expect(profile?.answers).toEqual(answers);
  });

  it('stores partial answers with null fields intact', async () => {
    const partial: OnboardingAnswers = {
      role: 'finance',
      experience: null,
      goal: null,
      budgetMinutes: null,
      formats: [],
      diagnostic: { 1: null, 2: null, 3: null },
    };
    await saveOnboardingAnswers('p@example.com', partial, false);
    const profile = await getProfile('p@example.com');

    expect(profile?.answers).toEqual(partial);
    expect(profile?.completed).toBe(false);
  });

  it('treats usernames case-insensitively', async () => {
    await saveProfile('Mixed@Example.com');
    const profile = await getProfile('mixed@example.COM');

    expect(profile).not.toBeNull();
  });
});

describe('localProfileDb on an install from an older build', () => {
  it('wipes password hashes that older builds stored', async () => {
    // Older schema, with a stored hash, created before the module first opens the database.
    const db = await openDatabaseAsync('getting-started-legacy-check.db');
    await db.execAsync(`CREATE TABLE profiles (username TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
      password_hash TEXT, password_salt TEXT, role TEXT, experience TEXT, goal TEXT, budget_minutes INTEGER,
      formats TEXT, diagnostic TEXT, completed INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);`);
    await db.runAsync("INSERT INTO profiles (username, password_hash, password_salt, updated_at) VALUES ('old@example.com', 'h', 's', 'x')");

    let fresh!: typeof import('./localProfileDb');
    jest.isolateModules(() => {
      jest.doMock('expo-sqlite', () => ({ openDatabaseAsync: async () => db }));
      fresh = require('./localProfileDb');
    });
    await fresh.getProfile('old@example.com');

    const row = await db.getFirstAsync<{ password_hash: string | null; password_salt: string | null }>(
      "SELECT password_hash, password_salt FROM profiles WHERE username = 'old@example.com'"
    );
    expect(row).toEqual({ password_hash: null, password_salt: null });
  });
});
