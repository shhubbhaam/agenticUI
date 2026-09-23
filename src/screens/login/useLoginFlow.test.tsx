import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { validateEmail, validatePassword, useLoginFlow } from './useLoginFlow';
import { ApiError } from '../../data/learnhouse/client';

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

const mockSignInWithPassword = jest.fn();
const mockSignInWithGoogle = jest.fn();
jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({
      signInWithPassword: mockSignInWithPassword,
      signInWithGoogle: mockSignInWithGoogle,
    }),
}));

const mockGetGoogleAccessToken = jest.fn();
jest.mock('./googleSignIn', () => ({
  getGoogleAccessToken: () => mockGetGoogleAccessToken(),
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

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useLoginFlow state machine', () => {
  const mockReset = jest.fn();
  beforeEach(() => {
    mockReset.mockClear();
    mockSignInWithPassword.mockReset();
    mockSignInWithGoogle.mockReset();
    mockGetGoogleAccessToken.mockReset();
    require('@react-navigation/native').useNavigation.mockReturnValue({ reset: mockReset });
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('goes choice -> connecting -> errored for the pressed provider only (linkedin/org stay simulated)', () => {
    let flow: ReturnType<typeof useLoginFlow>;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);
    });

    act(() => { flow!.onContinueWithProvider('linkedin'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.connectingProvider).toBe('linkedin');
    expect(flow!.erroredProvider).toBeNull();

    act(() => { jest.advanceTimersByTime(1500); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.connectingProvider).toBeNull();
    expect(flow!.erroredProvider).toBe('linkedin');
  });

  it('routes Google through getGoogleAccessToken and lands in erroredProvider when it rejects (unconfigured stub)', async () => {
    mockGetGoogleAccessToken.mockRejectedValue(new Error('Google sign-in is not configured yet'));
    let flow: ReturnType<typeof useLoginFlow>;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);
    });

    act(() => { flow!.onContinueWithProvider('google'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.connectingProvider).toBe('google');

    await flushMicrotasks();
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.connectingProvider).toBeNull();
    expect(flow!.erroredProvider).toBe('google');
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('signs in with Google and navigates home when the stub/exchange succeeds', async () => {
    mockGetGoogleAccessToken.mockResolvedValue({ email: 'a@b.com', accessToken: 'google-token' });
    mockSignInWithGoogle.mockResolvedValue(undefined);
    let flow: ReturnType<typeof useLoginFlow>;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);
    });

    act(() => { flow!.onContinueWithProvider('google'); });
    await flushMicrotasks();
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);

    expect(mockSignInWithGoogle).toHaveBeenCalledWith('a@b.com', 'google-token');
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'HomeScreen' }] });
    expect(flow!.erroredProvider).toBeNull();
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

  it('navigates home once a valid password is submitted and sign-in succeeds', async () => {
    mockSignInWithPassword.mockResolvedValue(undefined);
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
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.isSubmitting).toBe(true);

    await flushMicrotasks();
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(mockSignInWithPassword).toHaveBeenCalledWith('a@b.com', 'longenough');
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'HomeScreen' }] });
    expect(flow!.isSubmitting).toBe(false);
  });

  it('shows a mapped form error and does not navigate when sign-in is rejected', async () => {
    mockSignInWithPassword.mockRejectedValue(new ApiError(401, 'Incorrect email or password'));
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
    act(() => { flow!.onChangePassword('longenough'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    act(() => { flow!.onSubmit(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);

    await flushMicrotasks();
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(mockReset).not.toHaveBeenCalled();
    expect(flow!.formError).toBe('Incorrect email or password.');
    expect(flow!.isSubmitting).toBe(false);

    act(() => { flow!.onChangePassword('longenough2'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.formError).toBeUndefined();
  });

  it('clears a stale emailError when Test creds is used to fill the form', () => {
    let flow: ReturnType<typeof useLoginFlow>;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);
    });

    act(() => { flow!.onUseEmailInstead(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);

    act(() => { flow!.onChangeEmail('not-an-email'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    act(() => { flow!.onSubmit(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.emailError).toBe('Please enter a valid email address');

    act(() => { flow!.onFillTestCreds(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.emailError).toBeUndefined();
  });
});
