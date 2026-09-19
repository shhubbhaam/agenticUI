import { colors } from './colors';

describe('colors — auth-flow semantic tokens', () => {
  it('defines the alert error tone', () => {
    expect(colors.alert.error.surface).toBe('#FCEEEE');
    expect(colors.alert.error.border).toBe('#EFD7D7');
    expect(colors.alert.error.ink).toBe('#954B4F');
  });

  it('defines input field tokens', () => {
    expect(colors.input.border).toBe('#DCE3EE');
    expect(colors.input.ink).toBe('#33425E');
  });

  it('defines the ghost button ink and primary button shadow', () => {
    expect(colors.action.ghost).toBe('#4A608B');
    expect(colors.action.primaryShadow).toBe('#2442A9');
  });

  it('defines the brand mark surface/shadow', () => {
    expect(colors.hero.brandMark.surface).toBe('#4262E5');
    expect(colors.hero.brandMark.shadow).toBe('#2943A9');
  });
});
