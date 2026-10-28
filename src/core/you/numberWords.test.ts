import { numberToWord } from './numberWords';

describe('numberToWord', () => {
  it('spells small counts and uses numerals beyond', () => {
    expect(numberToWord(0)).toBe('Zero');
    expect(numberToWord(3)).toBe('Three');
    expect(numberToWord(12)).toBe('Twelve');
    expect(numberToWord(13)).toBe('13');
    expect(numberToWord(40)).toBe('40');
    expect(numberToWord(-1)).toBe('-1');
    expect(numberToWord(2.5)).toBe('2.5');
  });
});
