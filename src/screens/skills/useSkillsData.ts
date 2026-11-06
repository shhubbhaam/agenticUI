import { useCourseProgress } from '../you/useCourseProgress';
import { deriveSkills, hasSkillProgress, type SkillProgress, type SkillsSource } from '../../core/you/skills';

// 'empty' covers both "no skills/courses" and "nothing completed yet" — both
// render the Figma "Your evidence starts here" state.
export type SkillsDataStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface SkillsData {
  status: SkillsDataStatus;
  errorMessage: string | null;
  onRetry: () => void;
  source: SkillsSource;
  // Every skill, for the readable list.
  skills: SkillProgress[];
  // 3..5 skills when the radar can be drawn, otherwise empty (chart hidden).
  radarSkills: SkillProgress[];
}

export function useSkillsData(): SkillsData {
  const { status, errorMessage, onRetry, courses } = useCourseProgress();
  const { source, skills, radarSkills } = deriveSkills(courses);

  let resolved: SkillsDataStatus;
  if (status === 'loading' || status === 'error') resolved = status;
  else resolved = hasSkillProgress(skills) ? 'ready' : 'empty';

  return { status: resolved, errorMessage, onRetry, source, skills, radarSkills };
}
