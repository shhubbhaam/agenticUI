# Week 3 — Plan, changes and evidence (P10-G37)

Owner: Shubham · Review addressed: P10-G37-W02-R01 · Date: 11 Oct 2026

This file answers W3 FB001 (P0), FB002 (P1) and FB003 (P1). Every "Observed" result below comes from an actual run, and the raw output is in `docs/evidence/`. Where something is **not done**, this file says so.

---

## 1. What changed this week

| Review item | Change | Files |
|---|---|---|
| P0 Secrets/logs | Gemini moved off the device. The app no longer depends on `@google/generative-ai` and has no `EXPO_PUBLIC_GEMINI_*`. The BFF calls Gemini with a server-only `GEMINI_API_KEY`. The login screen no longer logs email or password. The exploration script redacts token and password fields before printing. The BFF startup log prints *presence* only, not the 4-char token prefix it used to print. | `src/services/agentService.ts`, `bff/src/agent.js`, `src/screens/login/LoginScreen.tsx`, `scripts/test-learnhouse-api.mjs`, `bff/server.js` |
| P0 Fresh checkout | `src/core/api/learnhouse/config.ts` is now **tracked** and holds no secrets (BFF URL and default course only). This fixes TS2307. The `RevisitItemData` import in `PracticeScreen` fixes TS2304. Added `bff/.env.example`. `.gitignore` ignores `bff/.env`. | `config.ts`, `PracticeScreen.tsx`, `.gitignore`, `bff/.env.example` |
| P0 LearnHouse auth | The BFF was rewritten. Login is checked against LearnHouse `/auth/login`, and the BFF issues an opaque, expiring session. **All** `/api/me/*` routes take learner and org from the session. The old routes with `:userId`/`:orgSlug` in the URL, which anyone could forge, are **removed**. Course access uses a server allow-list (`LH_ALLOWED_COURSES`). Activity access is limited to the course's published activities. The app now opens on Login, and Home redirects to Login when there is no session. | `bff/src/app.js`, `bff/src/sessions.js`, `bff/src/learnhouse.js`, `src/core/auth/session.ts`, `src/navigation/MainStack.tsx` |
| P0 Action semantics | `actionId: string` is replaced by a **closed action union**: `complete-activity{activityUuid}` \| `open-path` \| `open-practice`. Every Home button now runs a real action through one exhaustive dispatcher. `complete-activity` writes progress through the BFF, which checks it again on the server. The BFF also drops any agent slot whose action targets an activity not allowed for that learner. | `src/contracts/homeLayout.ts`, `src/screens/home/actions.ts`, `bff/src/agent.js` (`authorizeSlots`) |
| P1 Contract/version | New **platform-neutral** contract with no React Native imports. It carries `version`, `layoutId`, `learnerId`, `courseUuid`, `issuedAt` and `expiresAt`. Envelope, wrapper, props and actions are all strict: unknown keys are rejected, not stripped. Strings have length limits, and the payload is capped at 16 KB before parsing. Context (learner, course, expiry) is checked separately from shape. | `src/contracts/homeLayout.ts` |
| P1 Fallback claim | The claim is renamed to what we observed: **per-slot fallback**. Each slot is validated on its own, and a bad slot shows a static "Open your learning path" card while the other slot still renders. Each slot also has a React error boundary (`SlotBoundary`). The fetch is cut off at 10 s with `AbortController`. If Gemini is missing or fails, the BFF serves a deterministic layout built from LearnHouse data. | `HomeScreen.tsx`, `SlotBoundary.tsx`, `agentService.ts`, `bff/src/agent.js` (`fallbackSlots`) |
| P1 Agent grounding | The model only sees the authorized, unfinished activities for the session learner (up to 5) plus two counts. `responseSchema` restricts `activityUuid` to those IDs, and `maxOutputTokens` is capped. The raw model text is never logged. | `bff/src/agent.js` |
| Completion write + read-back | `POST /api/me/courses/:c/activities/:a/complete` requires an `Idempotency-Key`. It writes to LearnHouse, then **reads the trail back**. It returns `applied` when the read-back confirms the write, or `received` when it doesn't. A lost upstream response is reconciled by that read-back. | `bff/src/app.js` |

**You must do this by hand: rotate the Gemini key.** The reviewer found a key literal in `agentService.ts:6` in the W2 SHA. Revoke it in Google AI Studio even if you think it's unused. It stays in git history: either rewrite history (`git filter-repo --replace-text`) or treat the key as burned and keep it revoked. These changes do not undo a commit that already happened.

---

## 2. Evidence (expected vs observed)

### 2a. BFF — `cd bff && npm test` (Node 22.22, `node:test`, fake LearnHouse double) → **13/13 pass**

| # | Case | Expected | Observed |
|---|---|---|---|
| 1 | Wrong password | 401, no token in body | pass |
| 2 | No session / forged token on `/me/*` | 401 | pass |
| 3 | Course not on allow-list | 403 `course_forbidden` | pass |
| 4 | Old forgeable URL `/admin/:org/trails/:userId/...` | 404 (route removed) | pass |
| 5 | Unpublished activity complete | 403, **0** upstream writes | pass |
| 6 | Learner A completes `act_1` → a second session for A reads it back; learner B unaffected | `applied`; A=true, B=false | pass |
| 7 | Retry with the same Idempotency-Key | 1 upstream effect, `replayed:true` | pass |
| 8 | Same key reused for a different activity | 409 | pass |
| 9 | Upstream applies the write but the response is lost (504) | read-back → `applied`, 200 | pass |
| 10 | Missing Idempotency-Key | 400 | pass |
| 11 | Home layout, no Gemini | v1 envelope bound to the session learner, deterministic `complete-activity act_1` | pass |
| 12 | Agent proposes an unauthorized `act_draft` | that slot dropped (null), valid slot kept | pass |
| 13 | 20 KB request body | 413 | pass |

### 2b. Contract — `__tests__/contracts/homeLayout.test.ts` → **24/24 pass**

Covers: valid layout; version 2; expired; future-issued; wrong learner; wrong course; unknown envelope field (`tenant`); million-char title (too large); malformed JSON; two JSON objects joined together; **one bad slot (other survives)**; both slots null; unknown component; extra prop; wrong prop type; extra wrapper field; allowed actions ×2; unknown action; old free-form `actionId` string; action missing its target; path-like target (`../admin`); extra field on an action.

### 2c. Integration — `docs/evidence/bff-contract-integration.txt` (run: `npx tsx scripts/check-bff-contract.ts`)

The envelope the BFF actually emits is **accepted** by the client contract. The same envelope checked against another learner gives **`wrong-context`**.

### 2d. Secret scan of the tree

No Gemini key patterns and no password logging found (`docs/evidence/secret-scan.txt`). Git history was **not** scanned from here; see the rotation note above.

### How these were run, and what was *not* run

- The sandbox had no npm access. The BFF was therefore made **dependency-free** (`node:http`, plus Node 22's native `--env-file`), and Express, axios, cors and dotenv were removed. The contract suite is jest-style. It was run with `tsx` and zod v4 through a jest-compatible shim. On your machine, run it with the repo's jest: `npm run test:contract`.
- **Not run:** `npm ci`, `tsc --noEmit` on the whole app, the Expo build, any device run, or a live LearnHouse instance. These need your machine: run `npm ci && npm run typecheck && npm test && npm run test:bff`, then paste the output into `docs/evidence/`.
- **Not shown yet:** a live pinned LearnHouse instance, and a web client reading back the same learner. Test #6 shows the read-back through a second session against a LearnHouse double, **not** two real clients.

---

## 3. Status against W3 rubric (honest)

| Item | Status |
|---|---|
| FB001: remove secrets/logging, clean setup, type import | **Done in code.** Key rotation is your action. |
| FB001: authenticated BFF, denied cross-user/org, completion write + read-back | **Done against a double.** A live pinned instance is still required. |
| FB001: mobile **and web** read the same learner/course | **Not done.** No web client yet. Planned for W4 (§5). |
| FB002: versioned, bounded contract; typed allowed actions; one working action; automated boundary tests | **Done** (24 + 13 tests). |
| FB002: 3 mobile + 3 web modules; independently deployed web module | **Not done.** W4. Folder structure is not counted as independent deployment. |
| FB003: M1–M9 test-group map, pinning, budget | **Draft below.** The 13 scenarios must be copied in from the five-page design doc. |
| FB003: first durable offline event survives restart | **Not done.** W5 (outbox). The BFF already separates received from applied. |

---

## 4. FB003 — M1–M9 test-group map (2–4 binary groups each)

Targets: **Android emulator (API 35, Pixel 7 profile)** as the native target and **Chrome stable on desktop** as the browser. Course: one synthetic LearnHouse course with 2 checkpoints and a 3-question quiz. Learners: 2 (`asha`, `ravi`).

| M | Test group (each pass/fail) | Threshold | Evidence | Week |
|---|---|---|---|---|
| M1 contracts | T1.1 the same contract file is consumed by native and web builds | both import `src/contracts` | build logs | W4 |
| | T1.2 incompatible version or context rejected | 100% of fixtures | contract suite ✅ W3 | W3 |
| M2 mobile modules | T2.1 player, assessment and agent-UI each have their own test file | 3/3 | jest | W4 |
| | T2.2 disabling one feature flag leaves the other two navigable | 0 crashes | screen recording | W4 |
| M3 web modules | T3.1 shell + 3 Module Federation remotes build separately | 3 builds | CI log | W4 |
| | T3.2 swapping one remote's version needs no shell rebuild | yes | demo | W4 |
| | T3.3 a remote that throws shows a fallback; the other remotes stay usable | yes | demo | W4 |
| M4 player | T4.1 2 checkpoints fire once each, in order | 0 skips/dupes | test | W4 |
| | T4.2 kill the app at a checkpoint → resume within ±1 s | ≤1 s drift | log | W4 |
| M5 sync | T5.1 progress/quiz events survive restart (SQLite / IndexedDB) | 100% | test | W5 |
| | T5.2 duplicate delivery → 1 effect | 1 | BFF test ✅ (#7) | W3/W5 |
| | T5.3 lost write response reconciled to `applied` | yes | BFF test ✅ (#9) | W3/W5 |
| | T5.4 two-device quiz conflict follows the documented policy | as documented | test | W5 |
| M6 streaming | T6.1 AG-UI lifecycle / text / tool / state events stream to one client | yes | log | W6 |
| | T6.2 reconnect inside the replay window resumes; outside it gets a snapshot | both | test | W6 |
| | T6.3 a changed proposal invalidates the approval | rejected | test | W6 |
| M7 safe UI | T7.1 unknown, oversized, stale or wrong-context input handled | 100% | contract suite ✅ | W3 |
| | T7.2 allowed action works; unauthorized action denied server-side | yes | BFF #5, #12 ✅ | W3 |
| | T7.3 component that throws → only its slot falls back | yes | RTL test | W4 |
| M8 a11y | T8.1 core flow with TalkBack and with keyboard-only on web | completes | checklist | W7 |
| | T8.2 200% font scale, no clipped CTA; contrast ≥ 4.5:1 | yes | screenshots | W7 |
| M9 perf | T9.1 cold start (emulator) and web bundle size, median of 5 runs | ≤ 3 s / ≤ 500 KB gz | raw logs | W7 |
| | T9.2 reconnect-to-synced after a 60 s outage | ≤ 5 s | raw logs | W7 |

**The 13 existing scenarios:** copy S1–S13 from the five-page design doc into the table below and give each one a test-group ID above. (They were not in the repo, so they were not invented here.)

| Scenario | Test groups |
|---|---|
| S1 … S13 | _fill in_ |

**Pinning (to fill in from your running setup):** LearnHouse release/commit `____`, edition `____`, and confirmation that the trail-GET and activity-complete-POST endpoints exist on it. Node 22.x. Expo SDK 57, React Native 0.86.3, zod 4.x.

**Effort budget (one member, 8 weeks):** about 12 h/week. W3 so far: ~1 h of AI-assisted implementation plus your review time. Record your actual hours here weekly.

**Policies (short):** media is public or synthetic only. Replay window: 5 min. Privacy: the model receives no name or email, only activity titles and two counts, and logs contain no request bodies. Accessibility and performance follow M8 and M9 above.

---

## 5. Next (W4, in order)

1. Run against a live pinned LearnHouse instance. Record the release and endpoints, and save sanitized request/response pairs.
2. Build the web shell (Vite + Module Federation) with dashboard, media and sync-view remotes. The dashboard reads the same `/api/me` progress, which closes FB001's cross-client read-back.
3. Add 2 checkpoints to the player using Expo Video, and an RTL test for a component that throws.

---

## 6. AI-assistance record (W3)

| Task | AI suggestion | Accepted / changed | Verification |
|---|---|---|---|
| BFF auth + routes | Claude drafted the session-based BFF and removed the URL-identity routes | Accepted. Express swapped for `node:http` because packages couldn't be installed. | 13 BFF tests; Shubham to trace login → session → trail live |
| Versioned contract | Claude drafted the strict envelope, per-slot parse and action union | Accepted | 24 contract tests + BFF↔contract integration |
| Gemini on server | Claude moved generation into the BFF with an enum-restricted schema | Accepted. **Not yet run against real Gemini.** | Agent-output authorization test (#12); live call pending |
| HomeScreen / actions | Claude wired the slots, the boundary and the dispatcher | Accepted. **Not yet run on device.** | Needs `npm run typecheck` + an emulator run |

Ownership check before the review: be ready to explain why the old route `/admin/:org/trails/:userId/...` let any client read any learner's data. Also explain why test #9 needs the read-back.
