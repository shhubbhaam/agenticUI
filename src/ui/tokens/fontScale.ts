// M8: text follows Android's own font size setting (Settings > Display > Font size, up to 200% on
// Android 14+). Nothing in the app turns font scaling off. Containers grow with their text
// (minHeight, not height). Only text inside a fixed grid or a fixed bar is capped, so it can't
// overflow its cell; everything else scales fully.
export const FONT_SCALE_CAP = {
  /** Fixed-size grid cells and bars: calendar days, tab bar labels, player times. */
  fixedCell: 1.3,
  /** Short labels in tiles that share a row with other tiles. */
  tile: 1.5,
} as const;
