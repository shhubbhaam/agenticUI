export type RoleId =
  | 'leadership' | 'sales' | 'marketing' | 'finance'
  | 'hr' | 'operations' | 'product' | 'engineering';
export type ExperienceId = 'finding-feet' | 'part-of-week' | 'already-building';
export type GoalId = 'save-time' | 'lead-rollout' | 'better-decisions' | 'build-own';
export type BudgetMinutes = 5 | 10 | 15 | 30;
export type FormatId = 'reading' | 'listening' | 'watching' | 'doing';
export type DiagnosticQuestionNumber = 1 | 2 | 3;

// Names of glyphs in src/ui/atoms/Icon.tsx. Kept as a plain string union so
// core/ never imports from ui/.
export type OnboardingIconKey =
  | 'flag' | 'chart' | 'sparkles' | 'user' | 'blocks' | 'workflow' | 'agents'
  | 'sun' | 'clock' | 'file' | 'headphones' | 'play-outline' | 'edit';

export interface ChoiceOption<Id extends string = string> {
  id: Id;
  title: string;
  caption?: string;
  icon?: OnboardingIconKey;
}

export interface OnboardingAnswers {
  role: RoleId | null;
  experience: ExperienceId | null;
  goal: GoalId | null;
  budgetMinutes: BudgetMinutes | null;
  formats: FormatId[];
  diagnostic: Record<DiagnosticQuestionNumber, string | null>;
}
