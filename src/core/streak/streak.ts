// Pure streak derivation for the Streak screen, Home header and You tab.
// Zero RN / network imports. Everything is computed from completion dates in
// the device's LOCAL calendar — a "day" is a local calendar day, so the
// midnight boundary follows the learner, not UTC.
//
// Rules (Figma 37:4230 / 37:4361 / 37:4485 / 37:5342):
//  - One completed learning activity on a day keeps that day.
//  - Missing days are bridged by a "streak freeze" allowance: a run may absorb
//    up to STREAK_FREEZE_ALLOWANCE missed dates in total. The streak counts
//    active days only; covered dates are not counted.
//  - Today is still open: not having done anything yet today never breaks a streak.

import { numberWordCapitalised } from '../text/numberWords';

// PRODUCT RULE (no API source): how many missed dates one run may absorb. The
// single source of truth - streak derivation (buildRuns / deriveStreak) and
// the freeze copy below both read it; change it here only.
export const STREAK_FREEZE_ALLOWANCE: number = 3;
export const CALENDAR_WEEKS = 4;

export type StreakState =
  | 'none' // never completed anything
  | 'broken' // had activity, but the last run can no longer be kept alive
  | 'kept' // current run, activity today (streak >= 2)
  | 'restarted' // activity today and the run is just day one
  | 'atRisk' // last activity yesterday, nothing yet today
  | 'frozen'; // missed dates are being covered by the freeze, nothing yet today

export type CalendarDayStatus = 'done' | 'covered' | 'today' | 'idle';

export interface CalendarDay {
  dayOfMonth: number;
  isoDate: string; // YYYY-MM-DD, local
  status: CalendarDayStatus;
  isToday: boolean;
  isFuture: boolean;
}

export interface StreakSummary {
  state: StreakState;
  current: number;
  longest: number;
  // Missed dates covered by the freeze in the current run (0 when none).
  coveredCount: number;
  keptToday: boolean;
  calendar: CalendarDay[]; // CALENDAR_WEEKS * 7 cells, Monday first
}

const MS_PER_DAY = 86_400_000;

// Integer day number of the LOCAL calendar date. Built from UTC of the local
// Y/M/D so DST shifts (23/25 hour days) never change the count.
export function localDayIndex(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}

function isoFromIndex(index: number): string {
  return new Date(index * MS_PER_DAY).toISOString().slice(0, 10);
}

interface Run {
  days: number[]; // active day indices, ascending
  covered: number[]; // missed day indices bridged inside the run
}

function buildRuns(activeDays: number[]): Run[] {
  const runs: Run[] = [];
  let run: Run | null = null;
  for (const day of activeDays) {
    if (!run) {
      run = { days: [day], covered: [] };
      runs.push(run);
      continue;
    }
    const last = run.days[run.days.length - 1];
    const missed: number[] = [];
    for (let m = last + 1; m < day; m += 1) missed.push(m);
    if (run.covered.length + missed.length <= STREAK_FREEZE_ALLOWANCE) {
      run.covered.push(...missed);
      run.days.push(day);
    } else {
      run = { days: [day], covered: [] };
      runs.push(run);
    }
  }
  return runs;
}

export function deriveStreak(completions: Date[], now: Date = new Date()): StreakSummary {
  const today = localDayIndex(now);
  // Completions stamped in the future (clock skew) are ignored.
  const activeDays = [...new Set(completions.map(localDayIndex))].filter((d) => d <= today).sort((a, b) => a - b);
  const runs = buildRuns(activeDays);
  const lastRun = runs[runs.length - 1] ?? null;
  const lastActive = lastRun ? lastRun.days[lastRun.days.length - 1] : null;

  let state: StreakState = lastRun ? 'broken' : 'none';
  let current = 0;
  let covered: number[] = [];

  if (lastRun && lastActive !== null) {
    if (lastActive === today) {
      current = lastRun.days.length;
      covered = lastRun.covered;
      state = current === 1 ? 'restarted' : 'kept';
    } else if (lastActive === today - 1) {
      current = lastRun.days.length;
      covered = lastRun.covered;
      state = 'atRisk';
    } else {
      // Dates between the last activity and today (today excluded, still open).
      const pending: number[] = [];
      for (let m = lastActive + 1; m < today; m += 1) pending.push(m);
      if (lastRun.covered.length + pending.length <= STREAK_FREEZE_ALLOWANCE) {
        current = lastRun.days.length;
        covered = [...lastRun.covered, ...pending];
        state = 'frozen';
      }
    }
  }

  const longest = Math.max(current, ...runs.map((r) => r.days.length), 0);
  const activeSet = new Set(activeDays);
  const coveredSet = new Set(covered);
  const todayDate = new Date(today * MS_PER_DAY);
  // Monday-first week containing today; JS getUTCDay: 0 = Sunday.
  const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
  const gridStart = today - mondayOffset - (CALENDAR_WEEKS - 1) * 7;

  const calendar: CalendarDay[] = Array.from({ length: CALENDAR_WEEKS * 7 }, (_, i) => {
    const day = gridStart + i;
    const isToday = day === today;
    let status: CalendarDayStatus = 'idle';
    if (activeSet.has(day)) status = 'done';
    else if (coveredSet.has(day)) status = 'covered';
    else if (isToday) status = 'today';
    const iso = isoFromIndex(day);
    return { dayOfMonth: Number(iso.slice(8, 10)), isoDate: iso, status, isToday, isFuture: day > today };
  });

  return { state, current, longest, coveredCount: covered.length, keptToday: lastActive === today, calendar };
}

// --- copy -----------------------------------------------------------------
// Every number/word in the copy comes from the computed summary (or the
// allowance constant); only the surrounding phrases are fixed UI copy.

export type MessageTone = 'warning' | 'info';

export interface StreakCopy {
  title: string;
  message: { tone: MessageTone; text: string } | null;
}

// Headline + optional message pill per state. Apostrophes are typographic, as in Figma.
export function streakCopy(summary: Pick<StreakSummary, 'state' | 'current' | 'coveredCount'>): StreakCopy {
  switch (summary.state) {
    case 'kept':
      return { title: `${numberWordCapitalised(summary.current)} days of showing up.`, message: null };
    case 'atRisk':
      return {
        title: 'There’s still time today.',
        message: { tone: 'warning', text: 'A short article or completed practice activity is enough to keep today’s streak.' },
      };
    case 'frozen': {
      const n = summary.coveredCount;
      const lead = n === 1 ? 'One missed date was' : `${numberWordCapitalised(n)} missed dates were`;
      return {
        title: 'A little room for life.',
        message: { tone: 'info', text: `${lead} covered by your freeze allowance. Completed work is unchanged.` },
      };
    }
    case 'restarted':
      return { title: 'A new beginning.', message: null };
    case 'broken':
      return { title: 'A fresh start is one step away.', message: null };
    default:
      return { title: 'Your rhythm starts here.', message: null };
  }
}

export function longestStreakSubtitle(longest: number): string {
  if (longest <= 0) return 'Your first day starts the count';
  return `${longest} ${longest === 1 ? 'day' : 'days'} · A rhythm you can come back to`;
}

export const FREEZE_SUBTITLE = `${STREAK_FREEZE_ALLOWANCE} ${STREAK_FREEZE_ALLOWANCE === 1 ? 'day' : 'days'} per allowance · Coverage is shown by date`;
