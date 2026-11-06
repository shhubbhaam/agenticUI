// Decorative crest styling shared by the chapter collection and the skills
// screens. Icon and tone carry NO meaning: they are assigned by position only,
// cycling deterministically, so any number of chapters/skills gets a crest.
// The first slots keep the Figma look (blocks/indigo, brief/teal, layers/plum…).

export type CrestTone = 'indigo' | 'teal' | 'plum';

// Names of glyphs in src/ui/atoms/Icon.tsx (kept as plain strings so core/
// never imports from ui/). All generic — none names a course topic.
export type CrestIconKey = 'blocks' | 'brief' | 'layers' | 'workflow' | 'agents' | 'shield' | 'chart' | 'capstone';

export const CREST_ICONS: readonly CrestIconKey[] = ['blocks', 'brief', 'layers', 'workflow', 'agents', 'shield', 'chart', 'capstone'];
export const CREST_TONES: readonly CrestTone[] = ['indigo', 'teal', 'plum'];

export function crestDecor(index: number): { icon: CrestIconKey; tone: CrestTone } {
  const i = Math.max(0, Math.floor(index));
  return { icon: CREST_ICONS[i % CREST_ICONS.length], tone: CREST_TONES[i % CREST_TONES.length] };
}
