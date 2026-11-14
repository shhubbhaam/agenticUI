// M2: the three end-user feature modules on mobile, each switchable on its own. Turning one off
// leaves the others, navigation and app state untouched:
//  - player     (video lessons with checkpoints)   -> its activities open a "turned off" screen
//  - assessment (assignment quizzes)                -> same
//  - agentUi    (agent-chosen Home cards)           -> Home shows the progress-based cards only
// A replacement module plugs in at the same seams (routeForActivity, HomeScreen's layout source).
export type FeatureId = 'player' | 'assessment' | 'agentUi';
export type FeatureFlags = Readonly<Record<FeatureId, boolean>>;

export const FEATURES: FeatureFlags = {
  player: true,
  assessment: true,
  agentUi: true,
};

export const FEATURE_LABELS: Record<FeatureId, string> = {
  player: 'Video lessons',
  assessment: 'Assignments',
  agentUi: 'Personalised Home',
};
