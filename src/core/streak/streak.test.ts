import { numberWordCapitalised } from '../text/numberWords';
import {
  deriveStreak,
  localDayIndex,
  longestStreakSubtitle,
  streakCopy,
  STREAK_FREEZE_ALLOWANCE,
  FREEZE_SUBTITLE,
} from './streak';

// Wednesday 2026-10-28, midday local time.
const NOW = new Date(2026, 9, 28, 12, 0, 0);
const day = (offsetFromToday: number, hour = 10) => new Date(2026, 9, 28 + offsetFromToday, hour, 0, 0);
const run = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => day(from + i));

describe('deriveStreak states', () => {
  it('none: no activity ever', () => {
    const s = deriveStreak([], NOW);
    expect(s).toMatchObject({ state: 'none', current: 0, longest: 0, coveredCount: 0, keptToday: false });
  });

  it('restarted: the only activity is today (streak of one)', () => {
    const s = deriveStreak([day(0)], NOW);
    expect(s).toMatchObject({ state: 'restarted', current: 1, longest: 1, keptToday: true });
  });

  it('restarted: a long run was broken, then activity today starts again at one', () => {
    const s = deriveStreak([...run(-30, -20), day(0)], NOW);
    expect(s).toMatchObject({ state: 'restarted', current: 1, longest: 11 });
  });

  it('kept: consecutive days including today, deduping same-day completions', () => {
    const s = deriveStreak([day(0, 9), day(0, 20), day(-1), day(-2)], NOW);
    expect(s).toMatchObject({ state: 'kept', current: 3, longest: 3, keptToday: true, coveredCount: 0 });
  });

  it('atRisk: last activity yesterday, nothing yet today', () => {
    const s = deriveStreak(run(-12, -1), NOW);
    expect(s).toMatchObject({ state: 'atRisk', current: 12, longest: 12, keptToday: false });
  });

  it('frozen: a short gap is covered by the freeze allowance', () => {
    const s = deriveStreak(run(-15, -4), NOW); // missed -3, -2, -1
    expect(s).toMatchObject({ state: 'frozen', current: 12, coveredCount: 3 });
  });

  it('frozen applies at the allowance limit and breaks one day later', () => {
    expect(STREAK_FREEZE_ALLOWANCE).toBe(3);
    expect(deriveStreak(run(-15, -4), NOW).state).toBe('frozen');
    const broken = deriveStreak(run(-15, -5), NOW); // four missed dates
    expect(broken).toMatchObject({ state: 'broken', current: 0, longest: 11 });
  });

  it('a gap inside a run is bridged and counts only active days', () => {
    // active -5,-4, miss -3,-2, active -1, 0
    const s = deriveStreak([day(-5), day(-4), day(-1), day(0)], NOW);
    expect(s).toMatchObject({ state: 'kept', current: 4, coveredCount: 2 });
  });

  it('the allowance is shared across the whole run, so a later gap can break it', () => {
    // gap of 2, then gap of 2 => 4 covered > 3, so the earlier days are a separate run
    const s = deriveStreak([day(-9), day(-6), day(-3), day(0)], NOW);
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
  });

  it('broken: old activity only', () => {
    const s = deriveStreak([day(-40), day(-39)], NOW);
    expect(s).toMatchObject({ state: 'broken', current: 0, longest: 2, keptToday: false });
  });

  it('longest never drops below the current streak and tracks the best earlier run', () => {
    const s = deriveStreak([...run(-60, -43), ...run(-2, 0)], NOW);
    expect(s).toMatchObject({ current: 3, longest: 18 });
  });

  it('ignores completions dated in the future', () => {
    const s = deriveStreak([day(1), day(2)], NOW);
    expect(s.state).toBe('none');
  });
});

describe('deriveStreak day boundaries', () => {
  it('uses the local calendar day: just after midnight yesterday still counts as yesterday', () => {
    const justAfterMidnight = new Date(2026, 9, 28, 0, 5, 0);
    const lateYesterday = new Date(2026, 9, 27, 23, 55, 0);
    expect(deriveStreak([lateYesterday], justAfterMidnight).state).toBe('atRisk');
    expect(deriveStreak([justAfterMidnight], new Date(2026, 9, 28, 23, 59, 0)).state).toBe('restarted');
  });

  it('is not thrown off by DST changeover days (23h/25h)', () => {
    // US DST ends 2026-11-01; local dates around it must stay consecutive.
    const now = new Date(2026, 10, 2, 12, 0, 0);
    const completions = [new Date(2026, 9, 31, 8), new Date(2026, 10, 1, 8), new Date(2026, 10, 2, 8)];
    expect(deriveStreak(completions, now)).toMatchObject({ state: 'kept', current: 3 });
    expect(localDayIndex(new Date(2026, 10, 2)) - localDayIndex(new Date(2026, 10, 1))).toBe(1);
  });
});

describe('deriveStreak calendar', () => {
  it('is four Monday-first weeks ending with the current week', () => {
    const { calendar } = deriveStreak([], NOW);
    expect(calendar).toHaveLength(28);
    // 2026-10-28 is a Wednesday: the grid starts Monday 2026-10-05 and ends Sunday 2026-11-01.
    expect(calendar[0].isoDate).toBe('2026-10-05');
    expect(calendar[27].isoDate).toBe('2026-11-01');
    expect(calendar.filter((c) => c.isToday)).toHaveLength(1);
    expect(calendar.find((c) => c.isToday)?.isoDate).toBe('2026-10-28');
    expect(calendar[27].isFuture).toBe(true);
    expect(calendar[27].dayOfMonth).toBe(1);
  });

  it('marks done, covered and open-today cells', () => {
    const { calendar } = deriveStreak(run(-15, -4), NOW);
    const byIso = (y: number, m: number, d: number) =>
      calendar.find((c) => c.isoDate === `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)!;
    expect(byIso(2026, 10, 24).status).toBe('done'); // -4
    expect(byIso(2026, 10, 25).status).toBe('covered'); // -3
    expect(byIso(2026, 10, 27).status).toBe('covered'); // -1
    expect(byIso(2026, 10, 28).status).toBe('today');
    expect(byIso(2026, 10, 29).status).toBe('idle');
  });

  it('shows today as done once activity happened', () => {
    const { calendar } = deriveStreak([day(0)], NOW);
    const today = calendar.find((c) => c.isToday)!;
    expect(today.status).toBe('done');
  });

  it('keeps the grid stable on a Sunday (last column)', () => {
    const sunday = new Date(2026, 10, 1, 9, 0, 0);
    const { calendar } = deriveStreak([], sunday);
    expect(calendar[27].isToday).toBe(true);
    expect(calendar[0].isoDate).toBe('2026-10-05');
  });
});

describe('streakCopy', () => {
  it('matches the Figma strings', () => {
    expect(streakCopy({ state: 'kept', current: 12, coveredCount: 0 })).toEqual({ title: 'Twelve days of showing up.', message: null });
    expect(streakCopy({ state: 'atRisk', current: 12, coveredCount: 0 })).toEqual({
      title: 'There’s still time today.',
      message: { tone: 'warning', text: 'A short article or completed practice activity is enough to keep today’s streak.' },
    });
    expect(streakCopy({ state: 'frozen', current: 12, coveredCount: 3 })).toEqual({
      title: 'A little room for life.',
      message: { tone: 'info', text: 'Three missed dates were covered by your freeze allowance. Completed work is unchanged.' },
    });
    expect(streakCopy({ state: 'restarted', current: 1, coveredCount: 0 })).toEqual({ title: 'A new beginning.', message: null });
  });

  it('handles a single covered date and the no-activity states', () => {
    expect(streakCopy({ state: 'frozen', current: 5, coveredCount: 1 }).message?.text).toMatch(/^One missed date was covered/);
    expect(streakCopy({ state: 'none', current: 0, coveredCount: 0 }).title).toBe('Your rhythm starts here.');
    expect(streakCopy({ state: 'broken', current: 0, coveredCount: 0 }).message).toBeNull();
  });
});

describe('copy numbers come from the data', () => {
  it.each([[2, 'Two'], [7, 'Seven'], [12, 'Twelve'], [25, 'Twenty-five'], [150, '150']])(
    'kept streak of %i reads "%s days of showing up."',
    (current, word) => {
      expect(streakCopy({ state: 'kept', current, coveredCount: 0 }).title).toBe(`${word} days of showing up.`);
    },
  );

  it('words the covered count from the actual covered dates', () => {
    expect(streakCopy({ state: 'frozen', current: 5, coveredCount: 2 }).message?.text).toMatch(/^Two missed dates were covered/);
  });

  it('derives the covered count within the allowance and reflects it in the copy', () => {
    // Last activity 3 days ago -> the 2 dates since then are covered by the allowance.
    const summary = deriveStreak([day(-5), day(-4), day(-3)], NOW);
    expect(summary.state).toBe('frozen');
    expect(summary.coveredCount).toBe(2);
    expect(summary.coveredCount).toBeLessThanOrEqual(STREAK_FREEZE_ALLOWANCE);
    const text = streakCopy(summary).message?.text ?? '';
    expect(text.startsWith(`${numberWordCapitalised(summary.coveredCount)} missed date`)).toBe(true);
  });

  it('builds the allowance subtitle from the constant', () => {
    expect(FREEZE_SUBTITLE).toBe(`${STREAK_FREEZE_ALLOWANCE} days per allowance · Coverage is shown by date`);
  });
});

describe('longestStreakSubtitle', () => {
  it('formats the longest streak', () => {
    expect(longestStreakSubtitle(18)).toBe('18 days · A rhythm you can come back to');
    expect(longestStreakSubtitle(1)).toBe('1 day · A rhythm you can come back to');
    expect(longestStreakSubtitle(0)).toBe('Your first day starts the count');
  });
});
