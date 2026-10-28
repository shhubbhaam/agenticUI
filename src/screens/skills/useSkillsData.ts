import { useCourseProgress } from '../you/useCourseProgress';
import { deriveSkills, hasSkillProgress, type SkillProgress } from '../../core/you/skills';

// 'empty' covers both "no course" and "nothing completed yet" — both render
// the Figma "Your evidence starts here" state.
export type SkillsDataStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface SkillsData {
  status: SkillsDataStatus;
  errorMessage: string | null;
  onRetry: () => void;
  skills: SkillProgress[];
}

export function useSkillsData(): SkillsData {
  const { status, errorMessage, onRetry, course } = useCourseProgress();
  const skills = deriveSkills(course);

  let resolved: SkillsDataStatus;
  if (status === 'loading' || status === 'error') resolved = status;
  else resolved = status === 'ready' && hasSkillProgress(skills) ? 'ready' : 'empty';

  return { status: resolved, errorMessage, onRetry, skills };
}
