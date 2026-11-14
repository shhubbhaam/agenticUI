// bff/src/coachStore.ts — M6: the coach's durable records (same SQLite file as the inbox).
//  - coach_proposals: every proposal the coach made, never edited (audit)
//  - coach_decisions: at most one decision per proposal, never edited (audit; one-time approval)
//  - coach_plan:      the learner's current approved next step, per course
// LearnHouse stays the source of truth for progress; these are BFF extension records keyed by
// LearnHouse ids. Tests use ':memory:'.
import type { CoachAction, Plan, Proposal } from '../../src/contracts/agentEvents.ts';

export type DecisionKind = 'approved' | 'declined' | 'expired' | 'cancelled';

/** authHash: hash of the BFF login session it was made in. Logging out (or a new login) voids it. */
export interface StoredProposal { proposal: Proposal; learnerId: string; courseUuid: string; authHash: string; createdAt: string }
export interface StoredDecision { proposalId: string; decisionId: string; decision: DecisionKind; decidedAt: string }

export interface CoachStore {
  addProposal(p: StoredProposal): void;
  getProposal(proposalId: string): StoredProposal | null;
  /** Records the decision only if the proposal has none yet. Returns the decision that stands. */
  decide(d: StoredDecision): StoredDecision;
  getDecision(proposalId: string): StoredDecision | null;
  /** Latest proposal of this learner with no decision and not expired. */
  pendingFor(learnerId: string, now: Date): StoredProposal | null;
  setPlan(learnerId: string, plan: Plan): void;
  getPlan(learnerId: string, courseUuid: string): Plan | null;
  close(): void;
}

export async function openCoachStore(path: string): Promise<CoachStore> {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path);
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS coach_proposals (
      proposal_id TEXT PRIMARY KEY, learner_id TEXT NOT NULL, course_uuid TEXT NOT NULL,
      session_id TEXT NOT NULL, proposal_json TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
      auth_hash TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS coach_proposals_learner ON coach_proposals (learner_id, created_at);
    CREATE TABLE IF NOT EXISTS coach_decisions (
      proposal_id TEXT PRIMARY KEY, decision_id TEXT NOT NULL, decision TEXT NOT NULL, decided_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS coach_plan (
      learner_id TEXT NOT NULL, course_uuid TEXT NOT NULL, plan_json TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY (learner_id, course_uuid)
    );
  `);
  const insP = db.prepare('INSERT OR IGNORE INTO coach_proposals (proposal_id, learner_id, course_uuid, session_id, proposal_json, expires_at, created_at, auth_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const getP = db.prepare('SELECT * FROM coach_proposals WHERE proposal_id = ?');
  const insD = db.prepare('INSERT OR IGNORE INTO coach_decisions VALUES (?, ?, ?, ?)');
  const getD = db.prepare('SELECT * FROM coach_decisions WHERE proposal_id = ?');
  const pending = db.prepare(`SELECT p.* FROM coach_proposals p LEFT JOIN coach_decisions d ON d.proposal_id = p.proposal_id
    WHERE p.learner_id = ? AND d.proposal_id IS NULL AND p.expires_at > ? ORDER BY p.created_at DESC LIMIT 1`);
  const setPl = db.prepare(`INSERT INTO coach_plan VALUES (?, ?, ?, ?)
    ON CONFLICT (learner_id, course_uuid) DO UPDATE SET plan_json = excluded.plan_json, updated_at = excluded.updated_at`);
  const getPl = db.prepare('SELECT plan_json FROM coach_plan WHERE learner_id = ? AND course_uuid = ?');

  type PRow = { proposal_id: string; learner_id: string; course_uuid: string; proposal_json: string; created_at: string; auth_hash: string };
  const toP = (r: PRow | undefined): StoredProposal | null =>
    r ? { proposal: JSON.parse(r.proposal_json) as Proposal, learnerId: r.learner_id, courseUuid: r.course_uuid, authHash: r.auth_hash, createdAt: r.created_at } : null;
  type DRow = { proposal_id: string; decision_id: string; decision: string; decided_at: string };
  const toD = (r: DRow | undefined): StoredDecision | null =>
    r ? { proposalId: r.proposal_id, decisionId: r.decision_id, decision: r.decision as DecisionKind, decidedAt: r.decided_at } : null;

  return {
    addProposal: (p) => { insP.run(p.proposal.proposalId, p.learnerId, p.courseUuid, p.proposal.sessionId, JSON.stringify(p.proposal), p.proposal.expiresAt, p.createdAt, p.authHash); },
    getProposal: (id) => toP(getP.get(id) as PRow | undefined),
    decide: (d) => { insD.run(d.proposalId, d.decisionId, d.decision, d.decidedAt); return toD(getD.get(d.proposalId) as DRow | undefined)!; },
    getDecision: (id) => toD(getD.get(id) as DRow | undefined),
    pendingFor: (l, now) => toP(pending.get(l, now.toISOString()) as PRow | undefined),
    setPlan: (l, plan) => { setPl.run(l, plan.courseUuid, JSON.stringify(plan), new Date().toISOString()); },
    getPlan: (l, c) => { const r = getPl.get(l, c) as { plan_json: string } | undefined; return r ? (JSON.parse(r.plan_json) as Plan) : null; },
    close: () => db.close(),
  };
}

export type { CoachAction };
