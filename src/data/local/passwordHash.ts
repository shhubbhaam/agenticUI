import * as Crypto from 'expo-crypto';

const SALT_BYTES = 16;

export interface HashedPassword {
  hash: string;
  salt: string;
}

// Single salted SHA-256, not a slow KDF: this local record is not an auth
// boundary (LearnHouse verifies logins server-side). The hash only keeps the
// raw password off-disk. See ARCHITECTURE_RULEBOOK.md Section 9.
export function deriveHash(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export async function hashPassword(password: string): Promise<HashedPassword> {
  const bytes = await Crypto.getRandomBytesAsync(SALT_BYTES);
  const salt = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return { hash: await deriveHash(password, salt), salt };
}
