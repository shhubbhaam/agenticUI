# AI Launchpad — mobile learner app + BFF (P10-G37)

A React Native (Expo) learner app over a self-hosted LearnHouse LMS, with offline progress sync and
agent-chosen Home cards. The app never talks to LearnHouse directly: a small **BFF** (`bff/`) holds
the LearnHouse org token and the Gemini key, derives the learner from an opaque session, and owns
only what LearnHouse lacks (offline event inbox, agent layout).

```
App (Expo, Android)  ──HTTPS──▶  BFF (Node, bff/)  ──▶  LearnHouse API (learn.praxisacademy.ai)
  SQLite outbox                    SQLite inbox            courses, activities, progress (source of truth)
                                   Gemini (server only)
```

## Requirements

- Node **22.11+** (the BFF's durable inbox uses the built-in `node:sqlite`)
- Android Studio with an emulator (API 35 used for evidence), JDK 17
- **Windows:** keep the project in a short path (e.g. `D:\ail`). The native build (CMake/ninja)
  fails with "Filename longer than 260 characters" from deep folders such as
  `C:\Users\...\Projects\...`.

## Setup

```bash
npm install
cp .env.example .env              # app: EXPO_PUBLIC_BFF_URL (emulator: http://10.0.2.2:3000/api)
cp bff/.env.example bff/.env      # BFF: LH_BASE_URL, LH_ORG_SLUG, LH_API_TOKEN, LH_ALLOWED_COURSES, GEMINI_API_KEY
```

Secrets live only in `bff/.env` (git-ignored). Anything prefixed `EXPO_PUBLIC_` is bundled into the
app and readable by anyone with the APK: never put a token or password there.

## Run

```bash
npm run bff          # BFF on :3000 — reads bff/.env once at start; restart after editing it
npm run android      # build + install the app on the emulator, start Metro
```

The BFF log shows `Inbox: …/bff/data/inbox.db` when the durable inbox is on.

## Test

```bash
npm test             # app (Jest): contracts, outbox/sync, screens
npm run typecheck    # app TypeScript
npm run test:bff     # BFF (node:test, fake LearnHouse double)
npm run typecheck:bff
npm run lint
```

## Offline sync (M5) in one paragraph

Completing a lesson or handing in a quiz writes an event to a SQLite **outbox** on the phone first
(event id created once, reused on every retry; schema version, device id and per-device sequence
attached). The app sends the outbox in one batch (`POST /api/me/events`) on start, sign-in, return
to foreground and a back-off timer. The BFF records each event in a durable **inbox**
(`bff/data/inbox.db`), applies it to LearnHouse, **reads it back**, and answers `applied`,
`received` (retry later) or `rejected` (with a fixed reason) per event. Completion only ever goes
one way; each quiz hand-in is its own attempt. While offline, Home/Path show the last saved trail
with queued completions applied.

Inspect the inbox:

```bash
cd bff
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('data/inbox.db');console.table(db.prepare('SELECT event_id,type,activity_uuid,status,reason,device_id,seq FROM inbox').all())"
```

## Video checkpoints (M4)

LearnHouse has no checkpoint concept, so the BFF owns them: `bff/checkpoints.json` maps a LearnHouse
video activity uuid (or `"*"` for every video) to a versioned set of questions. Times count from the
lesson's LearnHouse start point. The app receives the questions **without answers**; the BFF grades
each answer, records every attempt (append-only, same SQLite file as the inbox) and refuses to mark
the video complete in LearnHouse until every checkpoint is passed. Changing a set's `version` makes
learners answer the new questions. The app saves the playhead on the device, so a reopened lesson
resumes where it stopped (never past an unanswered checkpoint). The shipped file is synthetic content.

## Feature modules (M2)

`src/config/features.ts` switches the three mobile features independently: `player` (video lessons),
`assessment` (quizzes), `agentUi` (agent-chosen Home cards). Turning one off leaves the others,
navigation and state untouched.

## Docs

- `docs/W5-status-and-evidence.md` — current milestone status, 13-scenario map, evidence commands
- `docs/W3-plan-and-evidence.md` — Week 3 plan and evidence (historical)
- `docs/evidence/` — raw test output and live-run screenshots
- `ARCHITECTURE_RULEBOOK.md` — architecture rules
