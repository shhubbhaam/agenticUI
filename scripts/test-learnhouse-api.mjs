#!/usr/bin/env node
/**
 * Standalone exploration script — NOT part of the app.
 * Simulates the real end-user flow: login -> find org -> list courses ->
 * fetch chapters -> attempt to read the user's own progress (expected to fail,
 * since LearnHouse's trail/progress endpoints require an org API token, not
 * a plain user session).
 *
 * Usage:
 *   LH_BASE_URL=https://api.yourdomain.com \
 *   LH_EMAIL=admin@yourorg.com \
 *   LH_PASSWORD=yourpassword \
 *   node scripts/test-learnhouse-api.mjs
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const BASE_URL = process.env.LH_BASE_URL || "https://REPLACE_ME.example.com";
const EMAIL = process.env.LH_EMAIL || "REPLACE_ME@example.com";
const PASSWORD = process.env.LH_PASSWORD || "REPLACE_ME";

async function promptChoice(question, choices) {
  const rl = createInterface({ input: stdin, output: stdout });
  choices.forEach((c, i) => console.log(`  [${i}] ${c.label}`));
  let index = -1;
  while (!(index >= 0 && index < choices.length)) {
    const answer = await rl.question(`${question} (0-${choices.length - 1}): `);
    index = Number.parseInt(answer, 10);
  }
  rl.close();
  return choices[index];
}

function log(step, data) {
  console.log(`\n=== ${step} ===`);
  console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

async function request(path, { method = "GET", token, body, form } = {}) {
  let requestBody;
  if (form) {
    requestBody = new URLSearchParams(form).toString();
  } else if (body) {
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: requestBody,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

function findToken(obj) {
  if (!obj || typeof obj !== "object") return null;
  const candidates = [obj, obj.tokens];
  for (const candidate of candidates) {
    if (!candidate) continue;
    for (const key of ["access_token", "accessToken", "token", "session_token"]) {
      if (candidate[key]) return candidate[key];
    }
  }
  return null;
}

function findUserId(obj) {
  if (!obj || typeof obj !== "object") return null;
  const user = obj.user || obj.profile || obj;
  return user.id ?? user.user_id ?? user.uuid ?? null;
}

async function main() {
  if (BASE_URL.includes("REPLACE_ME") || EMAIL.includes("REPLACE_ME")) {
    console.error(
      "Set LH_BASE_URL, LH_EMAIL, LH_PASSWORD env vars before running (see header comment)."
    );
    process.exit(1);
  }

  // 1. Login as the real user (email + password)
  const login = await request("/api/v1/auth/login", {
    method: "POST",
    form: { username: EMAIL, password: PASSWORD },
  });
  log("1. Login response", login);
  if (!login.ok) {
    console.error("Login failed — stopping here.");
    process.exit(1);
  }
  const token = findToken(login.data);
  const userId = findUserId(login.data);
  log("Parsed token/userId", { token: token ? "(present)" : null, userId });

  // 2. Find the organization(s) this user belongs to, to get org_slug.
  // Try admin-owned orgs first, fall back to all orgs the user is a member of.
  let orgs = await request("/api/v1/orgs/user_admin/page/1/limit/10", { token });
  log("2a. Organizations (admin)", orgs);
  let orgList = Array.isArray(orgs.data) ? orgs.data : orgs.data?.items || [];
  if (orgList.length === 0) {
    orgs = await request("/api/v1/orgs/user/page/1/limit/10", { token });
    log("2b. Organizations (member)", orgs);
    orgList = Array.isArray(orgs.data) ? orgs.data : orgs.data?.items || [];
  }
  const orgSlug = orgList[0]?.slug || orgList[0]?.org_slug;
  if (!orgSlug) {
    console.error("Could not determine org_slug from response — inspect step 2 output above.");
    process.exit(1);
  }
  log("Using org_slug", orgSlug);

  // 3. List courses for that org (session/bearer token should work here)
  const courses = await request(
    `/api/v1/courses/org_slug/${orgSlug}/page/1/limit/20`,
    { token }
  );
  log("3. Courses list", courses);
  const courseList = Array.isArray(courses.data) ? courses.data : courses.data?.items || [];
  if (courseList.length === 0) {
    console.error("No courses found — inspect step 3 output above.");
    process.exit(1);
  }

  const choice = await promptChoice(
    "\nWhich course do you want to inspect?",
    courseList.map((c) => ({
      label: c.name || c.title || "(untitled course)",
      course: c,
    }))
  );
  const courseUuid =
    choice.course.course_uuid || choice.course.uuid || choice.course.id;
  if (!courseUuid) {
    console.error("Selected course has no recognizable UUID field — inspect step 3 output above.");
    process.exit(1);
  }
  log("Using course_uuid", courseUuid);

  // 4. Fetch chapters/structure for that course (should work with session token)
  const meta = await request(`/api/v1/courses/${courseUuid}/meta?slim=true`, { token });
  log("4. Course meta (chapters/activities)", meta);

  // 5. Attempt to read this user's own progress — expected to be rejected,
  //    since docs say trail/progress endpoints require an org API token,
  //    not a user session.
  const progress = await request(
    `/api/v1/admin/${orgSlug}/progress/${userId}/${courseUuid}`,
    { token }
  );
  log("5. Progress attempt with user session (expected to fail)", progress);

  console.log(
    "\nIf step 5 returned 401/403, that confirms progress data needs a backend " +
      "holding an org API token — a plain logged-in user session can't read it directly."
  );
}

try {
  await main();
} catch (err) {
  console.error("Script error:", err);
  process.exit(1);
}
