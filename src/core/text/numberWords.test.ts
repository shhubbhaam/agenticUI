import { numberWord, numberWordCapitalised } from './numberWords';

describe('numberWord', () => {
  it('spells 0..99 and uses numerals beyond or for invalid counts', () => {
    expect(numberWord(0)).toBe('zero');
    expect(numberWord(12)).toBe('twelve');
    expect(numberWord(21)).toBe('twenty-one');
    expect(numberWord(40)).toBe('forty');
    expect(numberWord(100)).toBe('100');
    expect(numberWord(-1)).toBe('-1');
    expect(numberWord(2.5)).toBe('2.5');
  });
  it('capitalises for sentence starts', () => {
    expect(numberWordCapitalised(3)).toBe('Three');
    expect(numberWordCapitalised(21)).toBe('Twenty-one');
    expect(numberWordCapitalised(150)).toBe('150');
  });
});
