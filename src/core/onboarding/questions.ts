import type {
  BudgetMinutes,
  ChoiceOption,
  DiagnosticQuestionNumber,
  ExperienceId,
  FormatId,
  GoalId,
  RoleId,
} from './types';

export const ROLE_OPTIONS: ChoiceOption<RoleId>[] = [
  { id: 'leadership', title: 'Leadership', caption: 'Leading a team', icon: 'flag' },
  { id: 'sales', title: 'Sales', caption: 'Building relationships', icon: 'chart' },
  { id: 'marketing', title: 'Marketing', caption: 'Campaigns & content', icon: 'sparkles' },
  { id: 'finance', title: 'Finance', caption: 'Numbers & decisions', icon: 'chart' },
  { id: 'hr', title: 'HR & Talent', caption: 'People & potential', icon: 'user' },
  { id: 'operations', title: 'Operations', caption: 'Making things work', icon: 'workflow' },
  { id: 'product', title: 'Product', caption: 'What to build next', icon: 'blocks' },
  { id: 'engineering', title: 'Engineering', caption: 'Systems & software', icon: 'agents' },
];

export const EXPERIENCE_OPTIONS: ChoiceOption<ExperienceId>[] = [
  { id: 'finding-feet', title: "I’m finding my feet", caption: "I’ve heard about AI, but haven’t used it much.", icon: 'sun' },
  { id: 'part-of-week', title: "It’s part of my week", caption: 'I use ChatGPT or similar tools a few times a week.', icon: 'sparkles' },
  { id: 'already-building', title: "I’m already building", caption: 'I create AI workflows or automations.', icon: 'workflow' },
];

export const GOAL_OPTIONS: ChoiceOption<GoalId>[] = [
  { id: 'save-time', title: 'Save time on everyday work', caption: 'Reports, briefs, decks and the inbox.', icon: 'clock' },
  { id: 'lead-rollout', title: 'Lead an AI rollout', caption: 'Help your team put AI to work.', icon: 'flag' },
  { id: 'better-decisions', title: 'Make better decisions', caption: 'Understand the possibilities and the tradeoffs.', icon: 'chart' },
  { id: 'build-own', title: 'Build something of my own', caption: 'Turn an idea into a working project.', icon: 'blocks' },
];

export const FORMAT_OPTIONS: ChoiceOption<FormatId>[] = [
  { id: 'reading', title: 'Reading', caption: 'A quiet moment with a useful idea.', icon: 'file' },
  { id: 'listening', title: 'Listening', caption: 'A voice to learn from on the move.', icon: 'headphones' },
  { id: 'watching', title: 'Watching', caption: 'See an idea put into practice.', icon: 'play-outline' },
  { id: 'doing', title: 'Doing', caption: 'Try it, then make it your own.', icon: 'edit' },
];

export const BUDGET_OPTIONS: readonly BudgetMinutes[] = [5, 10, 15, 30];

const MINUTE_WORDS: Record<BudgetMinutes, string> = {
  5: 'Five',
  10: 'Ten',
  15: 'Fifteen',
  30: 'Thirty',
};

export function rhythmCopy(minutes: BudgetMinutes): { headline: string; body: string } {
  return {
    headline: `${MINUTE_WORDS[minutes]} minutes for you.`,
    body: "Your first chapter contains 8 lessons. We’ll fit the day’s steps around this budget.",
  };
}

export const UNSURE_OPTION_ID = 'unsure';

const UNSURE: ChoiceOption = {
  id: UNSURE_OPTION_ID,
  title: "I’m not sure",
  caption: "That’s useful to know, too.",
};

export interface DiagnosticQuestion {
  title: string;
  subtitle: string;
  cta: string;
  options: ChoiceOption[];
}

export const DIAGNOSTIC_QUESTIONS: Record<DiagnosticQuestionNumber, DiagnosticQuestion> = {
  1: {
    title: 'A brief comes back vague. What do you change?',
    subtitle: 'You asked AI to "make the campaign better".',
    cta: 'Next question',
    options: [
      { id: 'impressive', title: 'Ask for a more impressive answer' },
      { id: 'add-context', title: 'Add the audience, goal and constraints' },
      { id: 'try-again', title: 'Ask it to try again' },
      UNSURE,
    ],
  },
  2: {
    title: "The answer includes a number you can’t verify.",
    subtitle: 'You need to use it in a team report.',
    cta: 'Next question',
    options: [
      { id: 'trust-confident', title: 'Use it because the answer sounds confident' },
      { id: 'check-source', title: 'Check the original source before using it' },
      { id: 'table', title: 'Ask for the answer in a table' },
      UNSURE,
    ],
  },
  3: {
    title: "What would you share to get help with a campaign?",
    subtitle: "These answers help set your starting point.",
    cta: 'Build my path',
    options: [
      { id: 'brief-no-data', title: 'A campaign brief with no customer data' },
      { id: 'customer-export', title: 'An export of the customer list' },
      { id: 'private-convos', title: 'Private customer conversations' },
      UNSURE,
    ],
  },
};
