import { colors } from '../../ui/tokens/colors';

// Decorative bar colour: cycles through the skill palette by the skill's
// position (core/ stays free of UI tokens; colours carry no meaning).
const PALETTE = Object.values(colors.profile.skill);

export function skillColor(paletteIndex: number): string {
  return PALETTE[Math.max(0, paletteIndex) % PALETTE.length];
}
