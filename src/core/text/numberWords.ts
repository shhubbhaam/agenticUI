// Small-count number words for UI copy ("Three chapters", "Twelve days").
// 0..99 are spelled out; anything larger (or non-integer / negative) falls back
// to numerals. The single copy used by the You and Streak copy builders.
const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 100) return String(n);
  if (n < 20) return ONES[n];
  const unit = n % 10;
  return unit === 0 ? TENS[n / 10] : `${TENS[Math.floor(n / 10)]}-${ONES[unit]}`;
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Sentence-initial form: "Twelve", "Twenty-one", "100".
export function numberWordCapitalised(n: number): string {
  return capitalise(numberWord(n));
}
