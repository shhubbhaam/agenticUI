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

describe('colors — onboarding tokens (Figma AC-04..AC-07)', () => {
  it('defines choice card tokens', () => {
    expect(colors.onboarding.choice.border).toBe('#DDE4EF');
    expect(colors.onboarding.choice.ink).toBe('#44516B');
    expect(colors.onboarding.choice.selectedSurface).toBe('#F0F3FD');
    expect(colors.onboarding.choice.selectedBorder).toBe('#758BDA');
    expect(colors.onboarding.choice.selectedInk).toBe('#314FA9');
  });
  it('defines radio, header, badge, info alert, budget and rhythm tokens', () => {
    expect(colors.onboarding.radio).toEqual({ border: '#C7D0DF', selected: '#5270D2' });
    expect(colors.onboarding.spanInk).toBe('#8290A4');
    expect(colors.onboarding.badge).toEqual({ surface: '#F0F3F8', ink: '#596982' });
    expect(colors.onboarding.alertInfo).toEqual({ surface: '#EDF3FF', border: '#D7E3FA', ink: '#4F6388' });
    expect(colors.onboarding.budget).toEqual({
      border: '#E0E5EF', ink: '#77859D',
      selectedSurface: '#EDF1FE', selectedBorder: '#879BDD', selectedInk: '#3656B0',
    });
    expect(colors.onboarding.rhythmCard).toEqual({ surface: '#F0EAF8', border: '#E4D8F0' });
    expect(colors.onboarding.miniIconSurface).toBe('#E9EEF9');
  });
});

describe('colors — profile tokens (You tab, Figma 37-3842..37-5726)', () => {
  it('defines avatar, card and skill colours', () => {
    expect(colors.profile.avatar).toEqual({ surface: '#DBE5F8', ink: '#3752A2' });
    expect(colors.profile.cardBorder).toBe('#E4E9F1');
    expect(colors.profile.progressFill).toBe('#5774CC');
    expect(colors.profile.skill).toEqual({
      prompting: '#5270CC', context: '#8563AE', workflows: '#B87459', agents: '#8393C5', judgement: '#518E86',
    });
    expect(colors.profile.radar.stroke).toBe('#6B80C5');
  });
});
