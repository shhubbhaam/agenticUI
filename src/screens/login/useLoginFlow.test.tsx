import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { validateEmail, validatePassword, useLoginFlow } from './useLoginFlow';

// `@react-navigation/native`'s Babel-compiled ESM->CJS output exposes
// `useNavigation` as a non-configurable getter, so `jest.spyOn(require(...),
// 'useNavigation')` throws "Cannot redefine property: useNavigation" in this
// project's test environment (verified: Object.getOwnPropertyDescriptor
// reports configurable: false). Mocking the whole module instead sidesteps
// that — the factory returns a plain object with a fresh, writable jest.fn()
// for useNavigation — while keeping the same test intent (stub `reset`).
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

describe('validateEmail', () => {
  it('accepts a well-formed email', () => {
    expect(validateEmail('a@b.com')).toBeUndefined();
  });
  it.each(['', 'not-an-email', 'a@b', '@b.com', 'a@.com'])('rejects %p', (value) => {
    expect(validateEmail(value)).toBe('Please enter a valid email address');
  });
});

describe('validatePassword', () => {
  it('accepts an 8+ character password', () => {
    expect(validatePassword('longenough')).toBeUndefined();
  });
  it.each(['', 'short'])('rejects %p', (value) => {
    expect(validatePassword(value)).toBe('Please enter a valid password');
  });
});

function Harness({ onReady }: { onReady: (flow: ReturnType<typeof useLoginFlow>) => void }) {
  const flow = useLoginFlow();
  onReady(flow);
  return null;
}

describe('useLoginFlow state machine', () => {
  const mockReset = jest.fn();
  beforeEach(() => {
    mockReset.mockClear();
    require('@react-navigation/native').useNavigation.mockReturnValue({ reset: mockReset });
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('goes choice -> connecting -> errored for the pressed provider only', () => {
    let flow: ReturnType<typeof useLoginFlow>;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);
    });

    act(() => { flow!.onContinueWithProvider('google'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.connectingProvider).toBe('google');
    expect(flow!.erroredProvider).toBeNull();

    act(() => { jest.advanceTimersByTime(1500); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.connectingProvider).toBeNull();
    expect(flow!.erroredProvider).toBe('google');
  });

  it('moves to the email step and reveals the password field after a valid email submit', () => {
    let flow: ReturnType<typeof useLoginFlow>;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);
    });

    act(() => { flow!.onUseEmailInstead(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.step).toBe('email');

    act(() => { flow!.onChangeEmail('bad-email'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    act(() => { flow!.onSubmit(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.emailError).toBe('Please enter a valid email address');
    expect(flow!.showPasswordField).toBe(false);

    act(() => { flow!.onChangeEmail('a@b.com'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    act(() => { flow!.onSubmit(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.showPasswordField).toBe(true);
    expect(flow!.ctaLabel).toBe('Continue');
  });

  it('navigates home once a valid password is submitted', () => {
    let flow: ReturnType<typeof useLoginFlow>;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);
    });

    act(() => { flow!.onUseEmailInstead(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    act(() => { flow!.onChangeEmail('a@b.com'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    act(() => { flow!.onSubmit(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);

    act(() => { flow!.onChangePassword('short'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    act(() => { flow!.onSubmit(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.passwordError).toBe('Please enter a valid password');
    expect(mockReset).not.toHaveBeenCalled();

    act(() => { flow!.onChangePassword('longenough'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    act(() => { flow!.onSubmit(); });
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'HomeScreen' }] });
  });
});
