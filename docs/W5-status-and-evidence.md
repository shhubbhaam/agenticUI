# Status and evidence — M5 offline sync and review follow-ups (P10-G37)

Owner: Shubham · Date: 14 Nov 2026 · Branch: `feature/m5-offline-sync` (M5 commit `ad16a12`)

Every "observed" line below comes from a run. Where something is **not done**, it says so. Fake-backed
tests (BFF against the in-memory LearnHouse double) prove BFF logic, not LearnHouse's real routes.
M3 (web modules) is delivered separately in the team's LearnHouse fork, as agreed with the reviewer.

---

## 1. What changed since Week 3

| Review item | Change | Evidence |
|---|---|---|
| W3 P0: durable idempotent delivery | SQLite **outbox** on the phone (event id created once, reused on retry). Batched `POST /api/me/events`. Durable **inbox** in the BFF (`node:sqlite`, `bff/data/inbox.db`) replaces the in-memory map; survives BFF restart. Per-event `applied` / `received` / `rejected`. Concurrent duplicates share one upstream write. | `bff/test/events.test.ts`, `src/data/local/outbox.test.ts`, `src/data/sync/syncEngine.test.ts` |
| W3 P0: changed payload / course under a reused key | Inbox stores course, activity and a payload hash per event id; any difference → `rejected: event_id_reused`, never applied. | `events.test.ts` "reused event id with a DIFFERENT payload", "event id reused for another activity" |
| W3 P0: learner access | Enrollment checked before every write; activities without an explicit `published` flag are treated as unpublished. | `bff/test/bff.test.ts`, `events.test.ts` "not-enrolled learner" |
| W3: received ≠ saved | "Received" is now a queued state kept on the device and resent; the app shows offline/queued wording, not "saved". | `syncEngine.test.ts` |
| M5: quiz attempts | Each quiz hand-in is its own event and attempt (append-only). Offline "Try again" opens a new attempt on sync. The BFF records progress (`retried` → `submitting`) so a resend never submits twice or retries twice; a lost response is confirmed by reading the grade back. | `bff/test/slidesAssignments.test.ts` "events: …" (5 tests) |
| M5: offline reading | Last `/me/trail` saved per learner; shown offline with queued completions applied (next lesson unlocks). | `progressApi.test.ts` "getMyTrail offline", `applyPendingCompletions.test.ts` |
| M5: app start offline | Starting offline no longer signs the learner out; a restored session skips Login. | `useSessionStore.test.ts`, `LaunchpadScreen.test.tsx` |
| M1: versioned events | Events carry `schemaVersion`, `deviceId` (per install) and `seq` (per device). Unsupported versions → `rejected: unsupported_version`, not applied or stored. | `events.test.ts` "unsupported event version", `outbox.test.ts` "schema version, device id …" |
| M2: module isolation | `src/config/features.ts` switches player / assessment / agent UI independently. A disabled module's activities open a "turned off" screen; other routes unchanged; Home falls back to progress cards. | `src/navigation/activityRoute.test.ts` |
| W3 P1 / M7: one canonical schema | The BFF runs the app's own `parseHomeLayout` over every layout before sending and drops any slot the client would reject. Payload cap now counts UTF-8 bytes. | `bff/test/agent.test.ts` "never sent", `__tests__/contracts/homeLayout.test.ts` "UTF-8 bytes" |
| W3 P1 / M7: render failure | A slot whose component throws shows only its own fallback; the other slot renders. | `src/ui/organisms/SlotBoundary.test.tsx` |
| W3 P1: fixtures shown as real | Manage Downloads no longer lists 3 fake downloaded lessons ("Nothing downloaded yet" until real storage exists). | `SettingsScreen.test.tsx` |
| W3 P1: setup / README | README rewritten for Expo + BFF, with the Windows path-length note. | `README.md` |
| M4: checkpoints (BFF extension) | LearnHouse has no checkpoints: `bff/checkpoints.json` defines them per video activity (or `*`), versioned. App gets questions without answers; BFF grades, records attempts append-only (SQLite), enforces order, and blocks LearnHouse completion until all are passed (already-completed videos stay complete). App saves the playhead and resumes, never past an unanswered checkpoint. A lesson whose checkpoints cannot be loaded does not play. | `bff/test/checkpoints.test.ts` (10), `src/screens/lesson/lesson.test.tsx` "server-graded", `src/data/local/playerProgress.test.ts` |

## 2. Milestone status

| M | Status | Done | Not done |
|---|---|---|---|
| M1 | Partial | Versioned, bounded contracts for layout, quiz, slides, video and **events**; old/unsupported versions rejected | Web consumer (LearnHouse fork); written LearnHouse operation/owner map (§5) |
| M2 | Pass (needs recording) | 3 mobile modules with their own tests; per-module switches; routing test | Screen recording of one module disabled on device (T2.2 evidence) |
| M3 | Separate | — | Delivered in the LearnHouse fork |
| M4 | Pass in code; device run pending | Exact pause at each checkpoint, no seeking past an unanswered one, passed checkpoints never reopen, watched kept separate; checkpoints from the BFF (no answers on device), server grading, append-only attempts, order enforced, completion blocked until all passed, passes survive restarts (server) and the playhead resumes (device) | Recorded device run (T4.1/T4.2); checkpoint content is synthetic (`bff/checkpoints.json`); captions for uploaded videos |
| M5 | Pass in code + device run | See §1; device: offline slide completion → reconnect → LearnHouse web agrees (14 Nov) | Recorded device runs for process death and phone/web conflict (§4); preference conflicts (S9) |
| M6 | Not started | — | SSE/AG-UI stream, replay window, snapshot, bound approval |
| M7 | Substantial | Strict envelope, typed actions, per-slot fallback, server re-check with the same schema, byte cap, render-failure test | Approval tampering (needs M6) |
| M8 | Partial | Accessibility labels (~51 components), larger text, reduce motion | Recorded TalkBack and 200% text runs; captions; localization-safe check |
| M9 | Not started | Timeouts and fallbacks | Measured cold start, bundle size, reconnect-to-synced, module failure |

## 3. The 13 required scenarios

| # | Scenario | Test group | Status | Evidence |
|---|---|---|---|---|
| S1 | Unknown component | M7 T7.1 | **Pass** | contract suite; BFF re-check (`agent.test.ts`) |
| S2 | Malformed properties | M7 T7.1/T7.3 | **Pass** | contract suite; `SlotBoundary.test.tsx` |
| S3 | Code/script injection | M7 T7.1 | **Pass** | closed catalogue and actions; contract suite (inert strings) |
| S4 | Duplicate SSE event | M6 T6.2 | Not done | needs M6 |
| S5 | Interrupted SSE stream | M6 T6.2 | Not done | needs M6 |
| S6 | Offline duplicate batch | M5 T5.2 | **Pass** | `events.test.ts` "same batch sent twice", "same event id twice in ONE batch", durable restart |
| S7 | App terminated offline | M5 T5.1 | **Pass (code)**; device run pending | `outbox.test.ts`; device test 1 in §4 |
| S8 | Multi-device completion | M5 T5.4 | **Pass (code)**; device run pending | monotonic completion + read-back; device test 2 in §4 |
| S9 | Conflicting preferences | M5 T5.4 | Not done | settings are device-local; no cross-device rule yet |
| S10 | Approval tampering | M6 T6.3 | Not done | needs M6 |
| S11 | Old client version | M1 T1.2 / M7 T7.1 | **Pass** | layout `version` and event `schemaVersion` rejection tests |
| S12 | Sensitive telemetry | M7/M9 | Partial | model receives no name/email; raw model text never logged; no automated log-content test yet |
| S13 | Recovery to live state | M5/M6/M9 | Partial | offline snapshot → reconnect → server state (M5); agent stream recovery needs M6 |

## 4. Device runs to record (M5)

Stop the BFF (`Ctrl+C`) to go offline when the app must be closed and reopened (a debug build cannot
reload its JavaScript in airplane mode). After each run, save a LearnHouse screenshot and the inbox
output (command in `README.md`).

1. **Process death:** BFF stopped → complete a lesson → swipe the app away → reopen (goes straight to
   Home, lesson done) → start BFF → foreground the app. Expected: LearnHouse shows it; one inbox row,
   `applied`.
2. **Phone/web conflict:** BFF stopped → complete lesson X on the phone → complete X on the LearnHouse
   website → start BFF → sync. Expected: both show X completed once; inbox `applied`; no error.
3. **BFF restart dedupe:** complete online → restart BFF → reopen app. Expected: still one inbox row.

| Run | Date | Expected | Observed | Files |
|---|---|---|---|---|
| Offline slide completion → reconnect | 14 Nov 2026 | Completed offline, synced, LearnHouse web agrees | Pass (observed by Shubham) | _add screenshots_ |
| 1 Process death | | | | |
| 2 Phone/web conflict | | | | |
| 3 BFF restart dedupe | | | | |

## 5. LearnHouse pin (still open)

The server's `/openapi.json` is disabled, so `bff/scripts/lh-version.ts` cannot read the version.
Fill these in over SSH on the server:

```bash
docker ps --format '{{.Names}}  {{.Image}}'          # image tags of the LearnHouse containers
docker inspect --format '{{.Config.Image}} {{.Created}}' <api-container>
git -C <path-to-learnhouse-fork> rev-parse HEAD     # exact fork commit
git -C <path-to-learnhouse-fork> describe --tags --always
```

| Item | Value |
|---|---|
| LearnHouse fork commit | `____` |
| Upstream release it is based on | `____` |
| Edition | Community (self-hosted) — confirm |
| Routes used and verified live | `POST /auth/login`, `GET /users/session`, `GET /courses/{uuid}/meta`, `GET /admin/{org}/trails/{user}`, `POST /admin/{org}/progress/{user}/activities/{id}/complete` (live run 24 Oct), assignment routes (learner token) |

### Who owns which state

| State | Owner | Notes |
|---|---|---|
| Courses, activities, publication | LearnHouse | read by the BFF with the org token |
| Learner identity, enrollment | LearnHouse | BFF session derived from LearnHouse login |
| Activity completion, quiz submissions and grades | LearnHouse | written by the BFF, always read back |
| Offline event inbox (dedupe, received/applied) | BFF (`bff/data/inbox.db`) | extension record keyed by LearnHouse ids |
| Pending offline events, saved trail, device id | App (SQLite) | deleted once `applied` |
| Agent layout | BFF (generated per request, 10 min TTL) | built only from LearnHouse data |

## 6. Remaining demo data

| Where | What | Status |
|---|---|---|
| Practice tab | Due items and practice set are sample content (`MockPracticeRepository`) | Still sample data: label in demos or hide |
| Path | `CAPSTONE` / `STAGE nn` labels when a chapter has no `stage_label` | Design default, documented |
| Lesson player | Checkpoint questions in `bff/checkpoints.json` are synthetic, applied to every video via `*` | Synthetic content on purpose (public/synthetic data rule); answers stay on the server. `mockLesson.ts` is only the design preview with no activity. |
| Manage Downloads | Was 3 fake lessons | **Fixed:** empty until real downloads exist |

## 7. AI assistance (this round)

| Task | AI suggestion | Accepted / changed | Verification |
|---|---|---|---|
| Outbox, sync engine, BFF inbox | Claude designed and wrote the outbox/inbox/batch endpoint and tests | Accepted; tested on emulator by Shubham | 98 BFF tests; app Jest suite; device run 14 Nov |
| Offline start, Path refresh, slide fallback | Found on device during testing; Claude traced and fixed | Accepted | Device re-test; app tests |
| M1/M2/M7 follow-ups | Claude added event versioning, module switches, server-side schema check | Accepted. First M7 test passed without exercising the fix; rewritten to assert the check fired | `agent.test.ts` asserts the rejection warning |
