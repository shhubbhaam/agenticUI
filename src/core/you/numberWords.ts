// Small-count number words for UI copy ("Three chapters", "Twelve days").
// Counts 0..12 are spelled out; anything larger (or invalid) falls back to numerals.
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

export function numberToWord(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
}
