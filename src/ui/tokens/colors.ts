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
  // Path screen redesign (Figma "AI Launchpad" source, node 18:407/18:107/18:604)
  stageIndigo: '#526ACC',
  stageIndigoShadow: '#3E53A6',
  stageTeal: '#388D84',
  stageTealShadow: '#286B65',
  stagePlum: '#835CB0',
  stagePlumShadow: '#62438B',
  crestLocked: '#E8ECF3',
  crestLockedBorder: '#E3E8F0',
  crestLockedShadow: '#D9DFEB',
  crestRing: 'rgba(255,255,255,0.25)',
  crestRingInner: 'rgba(255,255,255,0.46)',
  subtitleInk: '#778399',
  percentInk: '#667BBA',
  linkInk: '#4260B3',
  iconBtnBorder: '#E6EAF0',
  segmentedSurface: '#E9EDF5',
  segmentedSelectedInk: '#45597F',
  segmentedUnselectedInk: '#7A859B',
  pathTrackSurface: '#E5E8F0',
  pathFillSurface: '#687ECA',
  trailLine: '#D5C5E6',
  panelTealSurface: '#E9F4F1',
  panelTealBorder: '#D7E8E3',
  panelTealInk: '#6A9187',
  panelTealBody: '#6F8E85',
  panelPlumSurface: '#EEE8F7',
  panelPlumBorder: '#E5DAF3',
  panelPlumInk: '#705887',
  // Figma's Foundations token sheet defines stage-open surface/border pairs
  // only for teal, plum and clay (stage/indigo has no captured review-panel
  // state in the source file). Derived by fitting the same base->surface/
  // border/ink HSL relationship those three share (surface L≈94% S≈40%,
  // border L≈88% S≈40%, ink L≈46% S≈18%) to the stage-indigo base color.
  panelIndigoSurface: '#EAEDF6',
  panelIndigoBorder: '#D4DBED',
  panelIndigoInk: '#606B8A',
  historyLinkSurface: '#E7DEF1',
  historyLinkInk: '#725887',
  optionalBranchBorder: '#C7B8D9',
  optionalBranchSurface: 'rgba(255,255,255,0.4)',
  optionalBranchBorder2: '#D0BFDF',
  optionalBranchInk: '#725887',
  btnSecondarySurface: '#DAE0EB',
  btnSecondaryInk: '#40547F',
  badgeGoodSurface: '#E6F3EF',
  badgeGoodInk: '#246C58',
  nodeDefaultSurface: '#FFFFFF',
  nodeDefaultBorder: '#CBB9DF',
  nodeDefaultShadow: '#CCBADF',
  nodeCurrentSurface: '#855BB6',
  nodeCurrentRing: '#EEE7F7',
  nodeCurrentShadow: '#64428C',
  nodeDoneSurface: '#438E86',
  nodeDoneBorder: '#60A198',
  nodeDoneShadow: '#326E68',
  outcomeSurface: '#F8F4FC',
  outcomeBorder: '#E1D5ED',
  miniIconPlumSurface: '#EEE6F7',
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
      ink2: primitives.indigo500, // used in: NextStepCard
      surface2: primitives.slate100
    },
  iconchev: {
      ink: primitives.slate400, // used in: NextStepCard
    },
  path: {
    // used in: PathHeader, PathProgressBar, SegmentedControl, StageCrest, StageRow,
    // LessonStep, StageDetailPanel, OutcomeSummary, Badge, IconButton, Button (Path screen)
    subtitleInk: primitives.subtitleInk,
    percentInk: primitives.percentInk,
    linkInk: primitives.linkInk,
    iconBtnBorder: primitives.iconBtnBorder,
    segmented: {
      surface: primitives.segmentedSurface,
      selectedInk: primitives.segmentedSelectedInk,
      unselectedInk: primitives.segmentedUnselectedInk,
    },
    progress: {
      track: primitives.pathTrackSurface,
      fill: primitives.pathFillSurface,
    },
    stage: {
      indigo: { base: primitives.stageIndigo, shadow: primitives.stageIndigoShadow },
      teal: { base: primitives.stageTeal, shadow: primitives.stageTealShadow },
      plum: { base: primitives.stagePlum, shadow: primitives.stagePlumShadow },
      locked: { base: primitives.crestLocked, border: primitives.crestLockedBorder, shadow: primitives.crestLockedShadow },
      ring: primitives.crestRing,
      ringInner: primitives.crestRingInner,
    },
    trailLine: primitives.trailLine,
    panel: {
      indigo: { surface: primitives.panelIndigoSurface, border: primitives.panelIndigoBorder, ink: primitives.panelIndigoInk },
      teal: { surface: primitives.panelTealSurface, border: primitives.panelTealBorder, ink: primitives.panelTealInk, body: primitives.panelTealBody },
      plum: { surface: primitives.panelPlumSurface, border: primitives.panelPlumBorder, ink: primitives.panelPlumInk },
    },
    historyLink: { surface: primitives.historyLinkSurface, ink: primitives.historyLinkInk },
    optionalBranch: { surface: primitives.optionalBranchSurface, border: primitives.optionalBranchBorder, border2: primitives.optionalBranchBorder2, ink: primitives.optionalBranchInk },
    btnSecondary: { surface: primitives.white, border: primitives.btnSecondarySurface, ink: primitives.btnSecondaryInk },
    badgeGood: { surface: primitives.badgeGoodSurface, ink: primitives.badgeGoodInk },
    node: {
      default: { surface: primitives.nodeDefaultSurface, border: primitives.nodeDefaultBorder, shadow: primitives.nodeDefaultShadow, icon: primitives.stagePlum },
      current: { surface: primitives.nodeCurrentSurface, ring: primitives.nodeCurrentRing, shadow: primitives.nodeCurrentShadow, icon: primitives.white },
      done: { surface: primitives.nodeDoneSurface, border: primitives.nodeDoneBorder, shadow: primitives.nodeDoneShadow, icon: primitives.white },
    },
    outcome: { surface: primitives.outcomeSurface, border: primitives.outcomeBorder },
    miniIconPlum: primitives.miniIconPlumSurface,
  },
} as const;

export type Colors = typeof colors;
