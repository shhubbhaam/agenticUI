import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { OnboardingAnswers } from '../../core/onboarding/types';
import { hashPassword } from './passwordHash';

const DATABASE_NAME = 'getting-started.db';

export interface LocalProfile {
  username: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  answers: OnboardingAnswers | null;
  completed: boolean;
  updatedAt: string;
}

interface ProfileRow {
  username: string;
  password_hash: string | null;
  password_salt: string | null;
  role: OnboardingAnswers['role'];
  experience: OnboardingAnswers['experience'];
  goal: OnboardingAnswers['goal'];
  budget_minutes: OnboardingAnswers['budgetMinutes'];
  formats: string | null;
  diagnostic: string | null;
  completed: number;
  updated_at: string;
}

let databasePromise: Promise<SQLiteDatabase> | null = null;

function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS profiles (
            username TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            password_hash TEXT,
            password_salt TEXT,
            role TEXT,
            experience TEXT,
            goal TEXT,
            budget_minutes INTEGER,
            formats TEXT,
            diagnostic TEXT,
            completed INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
          );
        `);
        return db;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

export async function saveCredentials(username: string, password: string): Promise<void> {
  const { hash, salt } = await hashPassword(password);
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO profiles (username, password_hash, password_salt, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET
       password_hash = excluded.password_hash,
       password_salt = excluded.password_salt,
       updated_at = excluded.updated_at`,
    [username, hash, salt, new Date().toISOString()]
  );
}

export async function saveOnboardingAnswers(
  username: string,
  answers: OnboardingAnswers,
  completed: boolean
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO profiles
       (username, role, experience, goal, budget_minutes, formats, diagnostic, completed, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET
       role = excluded.role,
       experience = excluded.experience,
       goal = excluded.goal,
       budget_minutes = excluded.budget_minutes,
       formats = excluded.formats,
       diagnostic = excluded.diagnostic,
       completed = excluded.completed,
       updated_at = excluded.updated_at`,
    [
      username,
      answers.role,
      answers.experience,
      answers.goal,
      answers.budgetMinutes,
      JSON.stringify(answers.formats),
      JSON.stringify(answers.diagnostic),
      completed ? 1 : 0,
      new Date().toISOString(),
    ]
  );
}

export async function getProfile(username: string): Promise<LocalProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profiles WHERE username = ?', [
    username,
  ]);
  if (!row) return null;

  // formats/diagnostic stay NULL until answers are first saved.
  const answers: OnboardingAnswers | null =
    row.formats === null || row.diagnostic === null
      ? null
      : {
          role: row.role,
          experience: row.experience,
          goal: row.goal,
          budgetMinutes: row.budget_minutes,
          formats: JSON.parse(row.formats),
          diagnostic: JSON.parse(row.diagnostic),
        };

  return {
    username: row.username,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    answers,
    completed: row.completed === 1,
    updatedAt: row.updated_at,
  };
}
