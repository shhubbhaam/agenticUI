import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { OnboardingAnswers } from '../../core/onboarding/types';

// The local profile holds onboarding answers per username. It never stores the password, or
// anything derived from it: LearnHouse (through the BFF) is the only place a login is checked.

const DATABASE_NAME = 'getting-started.db';

export interface LocalProfile {
  username: string;
  answers: OnboardingAnswers | null;
  completed: boolean;
  updatedAt: string;
}

interface ProfileRow {
  username: string;
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
        // Earlier builds stored a salted password hash here. Wipe it on installs that still have it.
        const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(profiles)');
        if (columns.some((c) => c.name === 'password_hash')) {
          await db.runAsync('UPDATE profiles SET password_hash = NULL, password_salt = NULL');
        }
        return db;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

/** Make sure a profile row exists for this user (e.g. right after sign-in). Stores no credentials. */
export async function saveProfile(username: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO profiles (username, updated_at) VALUES (?, ?)
     ON CONFLICT(username) DO UPDATE SET updated_at = excluded.updated_at`,
    [username, new Date().toISOString()]
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
    answers,
    completed: row.completed === 1,
    updatedAt: row.updated_at,
  };
}
