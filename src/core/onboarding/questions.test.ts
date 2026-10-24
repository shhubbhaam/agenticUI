import {
  ROLE_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  FORMAT_OPTIONS,
  BUDGET_OPTIONS,
  DIAGNOSTIC_QUESTIONS,
  UNSURE_OPTION_ID,
  rhythmCopy,
} from './questions';

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe('onboarding question data', () => {
  it('has the Figma option counts with unique ids', () => {
    expect(ROLE_OPTIONS).toHaveLength(8);
    expect(EXPERIENCE_OPTIONS).toHaveLength(3);
    expect(GOAL_OPTIONS).toHaveLength(4);
    expect(FORMAT_OPTIONS).toHaveLength(4);
    for (const list of [ROLE_OPTIONS, EXPERIENCE_OPTIONS, GOAL_OPTIONS, FORMAT_OPTIONS]) {
      expect(unique(list.map((o) => o.id))).toBe(true);
    }
  });

  it('gives every role/experience/goal/format option an icon and caption', () => {
    for (const o of [...ROLE_OPTIONS, ...EXPERIENCE_OPTIONS, ...GOAL_OPTIONS, ...FORMAT_OPTIONS]) {
      expect(o.icon).toBeDefined();
      expect(o.caption).toBeTruthy();
    }
  });

  it('keeps the role order from the Figma grid (reading order)', () => {
    expect(ROLE_OPTIONS.map((o) => o.title)).toEqual([
      'Leadership',
      'Sales',
      'Marketing',
      'Finance',
      'HR & Talent',
      'Operations',
      'Product',
      'Engineering',
    ]);
  });

  it('defines three diagnostic questions, each ending with the "I\'m not sure" option', () => {
    for (const q of [1, 2, 3] as const) {
      const { options } = DIAGNOSTIC_QUESTIONS[q];
      expect(options).toHaveLength(4);
      expect(unique(options.map((o) => o.id))).toBe(true);
      expect(options[3].id).toBe(UNSURE_OPTION_ID);
      expect(options[3].title).toBe("I’m not sure");
      expect(options[3].caption).toBe("That’s useful to know, too.");
    }
    expect(DIAGNOSTIC_QUESTIONS[1].title).toBe('A brief comes back vague. What do you change?');
    expect(DIAGNOSTIC_QUESTIONS[1].subtitle).toBe(
      'You asked AI to “make the campaign better”.'
    );
    expect(DIAGNOSTIC_QUESTIONS[1].cta).toBe('Next question');
    expect(DIAGNOSTIC_QUESTIONS[2].title).toBe(
      "The answer includes a number you can’t verify."
    );
    expect(DIAGNOSTIC_QUESTIONS[2].subtitle).toBe('You need to use it in a team report.');
    expect(DIAGNOSTIC_QUESTIONS[2].cta).toBe('Next question');
    expect(DIAGNOSTIC_QUESTIONS[3].title).toBe(
      'What would you share to get help with a campaign?'
    );
    expect(DIAGNOSTIC_QUESTIONS[3].subtitle).toBe('These answers help set your starting point.');
    expect(DIAGNOSTIC_QUESTIONS[3].cta).toBe('Build my path');
  });

  it('offers 5/10/15/30 minute budgets with spelled-out headlines', () => {
    expect(BUDGET_OPTIONS).toEqual([5, 10, 15, 30]);
    expect(rhythmCopy(5).headline).toBe('Five minutes for you.');
    expect(rhythmCopy(10).headline).toBe('Ten minutes for you.');
    expect(rhythmCopy(15).headline).toBe('Fifteen minutes for you.');
    expect(rhythmCopy(30).headline).toBe('Thirty minutes for you.');
    expect(rhythmCopy(10).body).toBe(
      "Your first chapter contains 8 lessons. We’ll fit the day’s steps around this budget."
    );
  });
});
