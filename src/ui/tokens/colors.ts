// src/ui/tokens/colors.ts

// Primitives: raw values, no meaning attached. Never referenced directly
// by a component — only `colors` below may reference these.
const primitives = {
  slate900: '#182033',
  slate600: '#5E6980',
  slate500: '#64748b',
  slate100: '#f1f5f9',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  purple600: '#816696',
  purple500: '#7751AD',
  blue600: '#3157D5',
  white: '#FFFFFF',
  canvas: '#F8F9FC',
  sky500: '#0ea5e9',
  navy800: '#0c4a6e',
  green500: '#00f003',
  sky700: '#075985',
  slateBlue600: '#657187',
  rust600: '#A95214',
  cream100: '#FFF1DF',
  lavender100: '#F1ECF8',
  slate200: '#E5E8F1',
  periwinkle300: '#BFC9EC',
  indigo500: '#536BD2',
} as const;

// Semantic tokens: the tier every component imports and reads from.
// Each key's comment names its current consumer(s) for discoverability —
// names stay role-based, not screen-based, so a token doesn't need
// renaming the moment a second screen reuses it.
export const colors = {
  text: {
    primary: primitives.slate900, // used in: HomeCard, HomeHeader
    body: primitives.slate600, // used in: HomeCard, HomeScreen
    ink: primitives.purple600, // used in: HomeCard
    muted: primitives.slate500, // used in: BottomTabs, PathScreen
  },
  border: primitives.slate100, // used in: BottomTabs
  action: {
    primary: primitives.blue600, // used in: HomeScreen, BottomTabs, PathScreen
    lesson: primitives.purple500, // used in: ActiveButton
  },
  surface: {
    white: primitives.white, // used in: HomeCard
    canvas: primitives.canvas, // used in: HomeTemplate
  },
  node: {
    // used in: RoadmapNode (PathScreen's lesson nodes)
    completed: { base: primitives.sky500, rim: primitives.navy800, shadow: primitives.navy800, icon: primitives.white },
    active: { base: primitives.green500, rim: primitives.sky700, shadow: primitives.navy800, icon: primitives.white },
    locked: { base: primitives.slate100, rim: primitives.slate300, shadow: primitives.slate400, icon: primitives.slate400 },
  },
  eyebrow: {
    ink: primitives.slateBlue600, // used in: HomeHeader
  },
  streak: {
    ink: primitives.rust600, // used in: HomeHeader
    surface: primitives.cream100, // used in: HomeHeader
  },
  hero: {
    surface: primitives.lavender100, // used in: HomeCard
  },
  dot: {
    surface: primitives.slate200, // used in: ProgressBar
    active: {
      surface: primitives.periwinkle300, // used in: ProgressBar
    },
    done: {
      surface: primitives.indigo500, // used in: ProgressBar
    },
  },
  icon: {
      surface: primitives.lavender100, // used in: NextStepCard
      ink: primitives.purple500, // used in: NextStepCard
    },
  iconchev: {
      ink: primitives.slate400, // used in: NextStepCard
    },
} as const;

export type Colors = typeof colors;
