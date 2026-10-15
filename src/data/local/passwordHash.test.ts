import { deriveHash, hashPassword } from './passwordHash';

describe('hashPassword', () => {
  it('never returns the plaintext password', async () => {
    const { hash, salt } = await hashPassword('correct horse battery');
    expect(hash).not.toContain('correct horse battery');
    expect(salt).not.toContain('correct horse battery');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses a fresh salt on every call, so the same password hashes differently', async () => {
    const first = await hashPassword('same-password');
    const second = await hashPassword('same-password');
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it('is reproducible from the returned salt', async () => {
    const { hash, salt } = await hashPassword('reproducible');
    await expect(deriveHash('reproducible', salt)).resolves.toBe(hash);
  });
});

describe('deriveHash', () => {
  it('changes when the salt changes', async () => {
    const a = await deriveHash('pw', 'aa');
    const b = await deriveHash('pw', 'bb');
    expect(a).not.toBe(b);
  });
});
