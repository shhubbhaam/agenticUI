import { colors } from '../../ui/tokens/colors';
import type { SkillId } from '../../core/you/skills';

// Skill id -> bar colour token (core/ stays free of UI tokens).
export function skillColor(id: SkillId): string {
  return colors.profile.skill[id];
}
