// bff/src/checkpointStore.ts — M4: every checkpoint answer a learner submits (append-only), keyed by
// learner + attempt id. "Passed" is derived: a correct attempt exists for that checkpoint in the
// CURRENT content version. LearnHouse has no checkpoints, so this is a BFF extension record that
// references LearnHouse ids (learner, video activity). Same SQLite file as the inbox.

export interface CheckpointAttempt {
  learnerId: string;
  attemptId: string;
  activityUuid: string;
  version: string;
  checkpointId: string;
  optionId: string;
  correct: boolean;
}

export interface CheckpointStore {
  /** The attempt already stored under this id, if any (a retried answer). */
  getAttempt(learnerId: string, attemptId: string): CheckpointAttempt | null;
  /** Append an attempt. Never updates or deletes. */
  addAttempt(a: CheckpointAttempt): void;
  /** Checkpoint ids with a correct attempt for this learner, video and content version. */
  passed(learnerId: string, activityUuid: string, version: string): string[];
  /** M6 coach: video activities this learner has answered any checkpoint in. */
  attemptedActivities(learnerId: string): string[];
  /** M6 coach: this learner's attempts on one video (any version filter applied by the caller). */
  attemptsFor(learnerId: string, activityUuid: string, version: string): Array<{ checkpointId: string; correct: boolean }>;
  close?(): void;
}

export function createMemoryCheckpointStore(): CheckpointStore {
  const rows = new Map<string, CheckpointAttempt>();
  const key = (l: string, a: string) => `${l}\u0000${a}`;
  return {
    getAttempt: (l, a) => { const r = rows.get(key(l, a)); return r ? { ...r } : null; },
    addAttempt: (a) => { if (!rows.has(key(a.learnerId, a.attemptId))) rows.set(key(a.learnerId, a.attemptId), { ...a }); },
    passed: (l, act, v) => [...new Set([...rows.values()]
      .filter((r) => r.learnerId === l && r.activityUuid === act && r.version === v && r.correct).map((r) => r.checkpointId))],
    attemptedActivities: (l) => [...new Set([...rows.values()].filter((r) => r.learnerId === l).map((r) => r.activityUuid))],
    attemptsFor: (l, act, v) => [...rows.values()].filter((r) => r.learnerId === l && r.activityUuid === act && r.version === v)
      .map((r) => ({ checkpointId: r.checkpointId, correct: r.correct })),
  };
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS checkpoint_attempts (
    learner_id TEXT NOT NULL,
    attempt_id TEXT NOT NULL,
    activity_uuid TEXT NOT NULL,
    version TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    correct INTEGER NOT NULL,
    answered_at TEXT NOT NULL,
    PRIMARY KEY (learner_id, attempt_id)
  );
  CREATE INDEX IF NOT EXISTS checkpoint_attempts_passed ON checkpoint_attempts (learner_id, activity_uuid, version, correct);
`;

interface Row { learner_id: string; attempt_id: string; activity_uuid: string; version: string; checkpoint_id: string; option_id: string; correct: number }

export async function openSqliteCheckpointStore(path: string): Promise<CheckpointStore> {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  const get = db.prepare('SELECT * FROM checkpoint_attempts WHERE learner_id = ? AND attempt_id = ?');
  const insert = db.prepare(`INSERT OR IGNORE INTO checkpoint_attempts
    (learner_id, attempt_id, activity_uuid, version, checkpoint_id, option_id, correct, answered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const passed = db.prepare(`SELECT DISTINCT checkpoint_id FROM checkpoint_attempts
    WHERE learner_id = ? AND activity_uuid = ? AND version = ? AND correct = 1`);
  const attempted = db.prepare('SELECT DISTINCT activity_uuid FROM checkpoint_attempts WHERE learner_id = ?');
  const attemptsOf = db.prepare(`SELECT checkpoint_id, correct FROM checkpoint_attempts
    WHERE learner_id = ? AND activity_uuid = ? AND version = ? ORDER BY answered_at`);
  return {
    getAttempt(l, a) {
      const r = get.get(l, a) as Row | undefined;
      return r ? { learnerId: r.learner_id, attemptId: r.attempt_id, activityUuid: r.activity_uuid, version: r.version,
        checkpointId: r.checkpoint_id, optionId: r.option_id, correct: r.correct === 1 } : null;
    },
    addAttempt(a) {
      insert.run(a.learnerId, a.attemptId, a.activityUuid, a.version, a.checkpointId, a.optionId, a.correct ? 1 : 0, new Date().toISOString());
    },
    passed: (l, act, v) => (passed.all(l, act, v) as Array<{ checkpoint_id: string }>).map((r) => r.checkpoint_id),
    attemptedActivities: (l) => (attempted.all(l) as Array<{ activity_uuid: string }>).map((r) => r.activity_uuid),
    attemptsFor: (l, act, v) => (attemptsOf.all(l, act, v) as Array<{ checkpoint_id: string; correct: number }>)
      .map((r) => ({ checkpointId: r.checkpoint_id, correct: r.correct === 1 })),
    close: () => db.close(),
  };
}
