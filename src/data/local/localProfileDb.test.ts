import { getProfile, saveCredentials, saveOnboardingAnswers } from './localProfileDb';
import { deriveHash } from './passwordHash';
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

  it('saves a salted hash of the password, never the plaintext', async () => {
    await saveCredentials('a@example.com', 'hunter2-password');
    const profile = await getProfile('a@example.com');

    expect(profile?.passwordSalt).toBeTruthy();
    expect(profile?.passwordHash).not.toBe('hunter2-password');
    await expect(deriveHash('hunter2-password', profile!.passwordSalt!)).resolves.toBe(
      profile!.passwordHash
    );
    expect(profile?.answers).toBeNull();
    expect(profile?.completed).toBe(false);
  });

  it('saves and round-trips onboarding answers', async () => {
    await saveCredentials('b@example.com', 'password-b');
    await saveOnboardingAnswers('b@example.com', answers, true);
    const profile = await getProfile('b@example.com');

    expect(profile?.answers).toEqual(answers);
    expect(profile?.completed).toBe(true);
  });

  it('keeps the credentials when answers are saved afterwards', async () => {
    await saveCredentials('c@example.com', 'password-c');
    const before = await getProfile('c@example.com');
    await saveOnboardingAnswers('c@example.com', answers, true);
    const after = await getProfile('c@example.com');

    expect(after?.passwordHash).toBe(before?.passwordHash);
    expect(after?.passwordSalt).toBe(before?.passwordSalt);
  });

  it('keeps the answers when credentials are saved again on a later sign-in', async () => {
    await saveCredentials('d@example.com', 'password-d');
    await saveOnboardingAnswers('d@example.com', answers, true);
    await saveCredentials('d@example.com', 'password-d');
    const profile = await getProfile('d@example.com');

    expect(profile?.answers).toEqual(answers);
    expect(profile?.completed).toBe(true);
  });

  it('creates a profile without credentials when answers arrive first (e.g. Google sign-in)', async () => {
    await saveOnboardingAnswers('g@example.com', answers, true);
    const profile = await getProfile('g@example.com');

    expect(profile?.passwordHash).toBeNull();
    expect(profile?.passwordSalt).toBeNull();
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
    await saveCredentials('Mixed@Example.com', 'password-m');
    const profile = await getProfile('mixed@example.COM');

    expect(profile).not.toBeNull();
  });
});
