# Architecture Decision Records — P10-G37

Project 10 · Group 37 · Shubham Yadav · Repository: https://github.com/shhubbhaam/agenticUI

**About the dates.** This log was written on **21 Nov 2026**. Each decision date below comes from the commit or
document that first shows the decision; none is backdated. Records are never deleted: a replaced decision is
marked *Superseded* and points to its successor.

| ID | Title | Status |
|---|---|---|
| ADR-001 | LearnHouse (team fork) is the LMS and source of truth | Accepted |
| ADR-002 | A thin BFF holds all secrets, sessions and policy | Accepted |
| ADR-003 | Agent selects from a trusted catalogue; one shared Zod contract | Accepted |
| ADR-004 | Methodology record (9 Oct reaffirmation) | Accepted |
| ADR-005 | SQLite outbox + durable BFF inbox; conflict rules by data type | Accepted (supersedes in-memory idempotency map) |
| ADR-006 | Dependency-free BFF on `node:http` and `node:sqlite` | Accepted |
| ADR-007 | Checkpoints as a BFF extension with server grading | Accepted |
| ADR-008 | AI coach over SSE (AG-UI-style subset) with bound approvals | Accepted |
| ADR-009 | M3 web modules built inside the LearnHouse fork | Accepted (approved scope change) |
| ADR-010 | Compile-time mobile feature switches | Accepted |
| ADR-011 | Text size follows Android's system setting | Accepted |
| ADR-012 | Video: YouTube player plus hosted uploads | Accepted |
| ADR-013 | Gemini only behind the BFF, enum-restricted structured output | Accepted |

---

## ADR-001 — LearnHouse (team fork) is the LMS and source of truth

**Date, status, scope.** Late Sept 2026 (W1 review; adapter code from 19 Sept, commit `0f62868`). Accepted.
All milestones; M5 read-back.

**Context and drivers.** The project needs courses, learners, enrolment and progress, but the course reviewers
said not to build a new LMS. The team already runs a LearnHouse fork at `learn.praxisacademy.ai`.

**Options.** (a) Build a small LMS/mock backend. (b) Use LearnHouse through its API (chosen). (c) Use LearnHouse's
own web UI only.

**Decision and rationale.** (b): LearnHouse owns courses, activities, enrolment, completion and grades; the app
and BFF read and write through its API and always read back. Judgement, not measurement: this avoids a second
course database and matches reviewer advice.

**Consequences.** Real routes must be pinned and verified (the public OpenAPI is disabled, so the deployed commit
is still unpinned). Missing features (checkpoints, event inbox, agent sessions) need small extension records
(ADR-005, 007, 008).

**Evidence.** `bff/src/learnhouse.ts`, `bff/test/learnhouse.test.ts`; live run `docs/evidence/live-run-2026-10-24.md`.

**Revisit trigger.** LearnHouse lacks a required write (e.g. per-checkpoint progress) or changes routes between releases.

---

## ADR-002 — A thin BFF holds all secrets, sessions and policy

**Date, status, scope.** 11 Oct 2026 (`docs/W3-plan-and-evidence.md`). Accepted. M1, M5, M7, security.

**Context.** The W2 review found a Gemini key literal in the app and the LearnHouse organisation token being used
from the mobile bundle, with learner ids taken from URLs.

**Options.** (a) Keep calls in the app with environment variables. (b) A thin backend-for-frontend (chosen).
(c) LearnHouse learner tokens only, no backend.

**Decision.** (b): the BFF checks the login against LearnHouse, issues an opaque expiring session, derives the
learner from it on every `/api/me/*` route, checks the course allow-list and enrolment, and is the only holder of
`LH_API_TOKEN` and `GEMINI_API_KEY`. (c) was rejected because the progress write route used needs the org token.

**Consequences.** One more process to run; sessions are in memory, so a BFF restart signs learners out. The
historically committed key must be revoked by the author (not verifiable from the repo).

**Evidence.** `bff/src/app.ts`, `bff/src/sessions.ts`, `bff/test/bff.test.ts` (21 tests), `docs/evidence/secret-scan.txt`.

**Revisit trigger.** A second client needs sessions shared across BFF instances, or LearnHouse exposes learner-scoped progress writes.

---

## ADR-003 — Agent selects from a trusted catalogue; one shared Zod contract

**Date, status, scope.** Proposal (W0), strict versioned contract 11 Oct 2026, server-side use of the same schema
14 Nov 2026 (`9fd4608`). Accepted. M1, M7.

**Context.** Agent output must never execute; the W3 review found the BFF and app validating differently.

**Options.** (a) Rule-based layout only. (b) Agent-generated UI code. (c) Agent chooses catalogue components and
props; both sides validate with one schema (chosen).

**Decision.** (c): four components, three typed actions, fixed slots, versioned envelope with learner/course/expiry,
UTF-8 byte cap, per-slot fallback, error boundary per slot; the BFF runs the app's own `parseHomeLayout` and drops
slots the app would reject. (a) is kept as the fallback when the model fails.

**Consequences.** Adding a component needs code, schema, registry entry and tests. A valid layout is not proven to
be a good one; no relevance evaluation was run.

**Evidence.** `src/contracts/homeLayout.ts`, contract suite, `bff/test/agent.test.ts`, `SlotBoundary.test.tsx`.

**Revisit trigger.** The catalogue grows beyond what can be described in one prompt, or a reviewer requires official A2UI conformance.

---

## ADR-004 — Methodology record (9 October reaffirmation)

**Date, status, scope.** Methodology document dated **11 Oct 2026** — two days after the 9 Oct 2026, 23:59 IST
deadline. This record written 21 Nov 2026. Accepted. All milestones.

**Statement.** The approach was **reaffirmed**, not changed, in the W3 plan: hybrid catalogue-based agent UI over
LearnHouse through a thin BFF, with M1–M9 mapped to binary test groups T1.1–T9.2 and thresholds (cold start ≤ 3 s,
web bundle ≤ 500 KB gzip, reconnect-to-synced ≤ 5 s, resume drift ≤ 1 s). The 13 scenarios were mapped later
(`docs/W5-status-and-evidence.md` §3).

**Later changes (not part of the 9 Oct record).**

| Old | Evidence prompting change | Alternatives | Selected | Impact |
|---|---|---|---|---|
| M3 as Module-Federation shell + 3 remotes | Single member; web work already happening in the LearnHouse fork | Separate React shell; headless examples | Web features in the LearnHouse fork (ADR-009) | T3.2/T3.3 (independent deploy, failure isolation) not demonstrated |
| Checkpoints in the app | LearnHouse has no checkpoints; answers on the device are insecure | App-only; LearnHouse plugin | BFF extension (ADR-007) | T4.1 tested on the BFF |
| First durable offline event in W3 | Not delivered in W3 | — | Delivered 14 Nov (ADR-005) | M5 later than planned |

**Approval.** The M3 change was agreed with the reviewer in discussion on `[date — fill in]`; this agreement is
not recorded elsewhere in the repository.

---

## ADR-005 — SQLite outbox + durable BFF inbox; conflict rules by data type

**Date, status, scope.** 14 Nov 2026 (`ad16a12`). Accepted; supersedes the W3 in-memory `Idempotency-Key` map. M5.

**Context.** The W3 review showed that concurrent duplicate requests could each write upstream, that the map was
lost on restart, and that "received" was shown as "saved".

**Options.** (a) Keep online-only writes with retries. (b) AsyncStorage queue. (c) SQLite outbox on the device
and a SQLite inbox on the BFF (chosen).

**Decision.** Each event gets an id once and keeps it through retries, plus device id, per-device sequence and
schema version. The BFF stores id + payload hash; same id/same payload returns the stored result, same id/new
payload is rejected. Results are `applied` (read-back confirmed), `received` (retry later) or `rejected` (kept
visible). Completion is monotonic; quiz hand-ins are append-only attempts with stage markers so a resend never
submits twice.

**Consequences.** Preference conflicts (S9) are not covered. The device must keep rejected rows until the learner sees them.

**Evidence.** `src/data/local/outbox.ts`, `src/data/sync/syncEngine.ts`, `bff/src/inbox.ts`, `bff/test/events.test.ts` (13); device run 14 Nov 2026.

**Revisit trigger.** A second client type writes the same records offline, or a multi-instance BFF is needed.

---

## ADR-006 — Dependency-free BFF on `node:http` and `node:sqlite`

**Date, status, scope.** 11 Oct 2026. Accepted. BFF.

**Context.** The development sandbox could not install npm packages; Express/axios/dotenv were in use.

**Options.** (a) Keep Express and install locally only. (b) Node built-ins: `node:http`, native `--env-file`,
`node:sqlite`, `node:test` (chosen).

**Decision.** (b), with a small hand-written router. **Consequences.** No middleware ecosystem; edge cases (malformed URI)
must be handled by hand. **Evidence.** `bff/src/app.ts`; 121/121 tests on Node 22.23.5 (21 Nov 2026).

**Revisit trigger.** Routing or validation code starts growing faster than features.

---

## ADR-007 — Checkpoints as a BFF extension with server grading

**Date, status, scope.** First attempt in the app 6 Nov (`3ca95ca`); moved to the BFF 6 Nov (`a780226`) and
finished 14 Nov (`37f9cc3`). Accepted. M4.

**Options.** (a) Checkpoints and answers in the app. (b) A LearnHouse plugin. (c) BFF file + store (chosen).

**Decision.** `bff/checkpoints.json` (versioned, per activity or `*`); the app receives questions without answers;
the BFF grades, appends attempts, enforces order and refuses LearnHouse completion until all are passed.

**Consequences.** Checkpoint content is synthetic and shared by every video; authors cannot edit it in LearnHouse.

**Evidence.** `bff/test/checkpoints.test.ts` (10), `src/screens/lesson/lesson.test.tsx`.

**Revisit trigger.** Authors need per-lesson checkpoints managed in the LMS.

---

## ADR-008 — AI coach over SSE (AG-UI-style subset) with bound approvals

**Date, status, scope.** 14 Nov 2026 (`3c032e8`); redirect after approval 15 Nov (`1571c7f` + uncommitted
`CoachScreen.tsx`). Accepted. M6, S4, S5, S10, S13.

**Options.** (a) WebSocket. (b) Official AG-UI SDK. (c) SSE with a documented AG-UI-style event subset (chosen).

**Decision.** SSE over `expo/fetch`; event ids = sequence; `Last-Event-ID` resume; 5-min / 500-event replay window
with a snapshot outside it; 15 s heartbeat; client back-off and 45 s stall watchdog. Gemini chooses only among
server-offered options. A proposal has a SHA-256 hash, a 10-min expiry, one decision, and is bound to the learner
and login session; the target is re-checked when the decision runs. The coach is isolated from the Home layout.

**Consequences.** Not full AG-UI conformance; sessions are lost on BFF restart; web streaming not built.

**Evidence.** `bff/src/coach.ts`, `bff/test/coach.test.ts` (13), `src/core/coach/*.test.ts`.

**Revisit trigger.** A second client needs the stream, or approvals must survive a BFF restart.

---

## ADR-009 — M3 web modules built inside the LearnHouse fork

**Date, status, scope.** Work from 12 Oct 2026 (fork `4adc2055`) to 21 Nov 2026 (`6a301103`); agreement with
reviewer `[date — fill in]`. Accepted as an approved scope change. M3.

**Options.** (a) Module-Federation shell with three remote modules over the BFF. (b) Features in the LearnHouse
web app (chosen).

**Decision.** Three modules — community image upload, Help & Support tickets, weighted course grading — reuse
LearnHouse auth, routing, RBAC, design system and i18n.

**Consequences.** Not independently built or deployed; no module-failure isolation test; they do not consume the
BFF contracts (M1 web consumer missing). Their 131 API and 37 web tests were not run for the final report.
LearnHouse is AGPL-3.0, so the deployed fork's source must be offered to its users.

**Evidence.** https://github.com/shhubbhaam/learnhouse commits `4adc2055`, `d39e16c7`, `1108064b`, `04829b8f`, `6a301103`.

**Revisit trigger.** Evaluators require T3.2/T3.3 evidence as originally specified.

---

## ADR-010 — Compile-time mobile feature switches

**Date, status, scope.** 14 Nov 2026 (`9fd4608`). Accepted. M2.

**Options.** (a) Runtime-loaded mobile modules (excluded by W0 advice). (b) Separate apps. (c) Compile-time
switches per module (chosen).

**Decision.** `src/config/features.ts` turns `player`, `assessment`, `agentUi` off independently; their routes open
a "turned off" screen; Home falls back to progress cards. **Evidence.** `src/navigation/activityRoute.test.ts`.

**Revisit trigger.** A module must be updated without an app release.

---

## ADR-011 — Text size follows Android's system setting

**Date, status, scope.** 15 Nov 2026 (`114f77e`). Accepted. M8.

**Options.** (a) In-app "Larger text" multiplier. (b) Follow the OS font scale (chosen), keep the in-app switch untouched for now.

**Decision.** Font scaling is never disabled; fixed-height containers became `minHeight`; only text in fixed grids
or bars (streak calendar, tab labels, player times, study-time tiles) is capped at 1.3–1.5×.

**Consequences.** The existing in-app "Larger text" switch has no effect yet. **Evidence.** `src/ui/fontScaling.test.tsx`;
200% run observed once, not recorded.

**Revisit trigger.** TalkBack or 200% recordings show clipped content.

---

## ADR-012 — Video: YouTube player plus hosted uploads

**Date, status, scope.** 31 Oct 2026 (`730f7cf`). Accepted. M4.

**Decision.** Course videos play through the YouTube player (supervisor's direction); at least one video uploaded
to LearnHouse plays through `expo-video` via the BFF file route. **Consequences.** Captions rely on YouTube's own;
uploaded videos have none.

---

## ADR-013 — Gemini only behind the BFF, enum-restricted structured output

**Date, status, scope.** 11 Oct 2026; coach model 14 Nov 2026. Accepted. M6, M7, S12.

**Decision.** Calls go only from the BFF with a response schema whose ids are an enum of server-authorised
activities or options; output is validated again; template/deterministic fallback on any failure; only the chosen
id is logged, never model text; the model gets no name, e-mail or raw answers.

**Evidence.** `bff/src/agent.ts`, `bff/src/coachModel.ts`, `bff/test/coach.test.ts` (model output outside the options; no model text in logs).

**Revisit trigger.** Model latency (9.4 s observed once on 24 Oct) becomes the main UX problem, or another provider is required.
