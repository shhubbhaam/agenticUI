import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { getTestCredentials } from './testCredentials';
import { getGoogleAccessToken } from './googleSignIn';
import { useSessionStore } from '../../state/useSessionStore';
import { ApiError } from '../../data/learnhouse/client';
import { shouldShowOnboarding } from '../../core/onboarding/gate';
import { useOnboardingStore } from '../../state/useOnboardingStore';
import { saveCredentials } from '../../data/local/localProfileDb';

export type Provider = 'google' | 'linkedin' | 'org';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string): string | undefined {
  if (!EMAIL_PATTERN.test(email)) {
    return 'Please enter a valid email address';
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'Please enter a valid password';
  }
  return undefined;
}

// LinkedIn sign-in has no backend support yet, so it keeps the original fake
// connecting->error simulation (org opens its own email step). Only Google is wired to a
// real call (via googleSignIn.ts, currently a stub).
const CONNECT_SIMULATION_MS = 1500;

function mapAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return 'Incorrect email or password.';
      case 403:
        return 'Please verify your email before signing in.';
      case 423:
        return 'Too many attempts — this account is temporarily locked.';
      case 429:
        return 'Too many attempts — please try again shortly.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export interface LoginFlowState {
  step: 'choice' | 'email' | 'org';
  connectingProvider: Provider | null;
  erroredProvider: Provider | null;
  email: string;
  password: string;
  emailError?: string;
  passwordError?: string;
  formError?: string;
  isSubmitting: boolean;
  showPasswordField: boolean;
  ctaLabel: 'Continue with email' | 'Continue';
  onContinueWithProvider: (provider: Provider) => void;
  onUseEmailInstead: () => void;
  onBackToChoice: () => void;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onFillTestCreds: () => void;
  onSubmit: () => void;
  onSubmitOrgEmail: () => void;
}

export function useLoginFlow(): LoginFlowState {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signInWithPassword = useSessionStore((s) => s.signInWithPassword);
  const signInWithGoogle = useSessionStore((s) => s.signInWithGoogle);

  const [step, setStep] = useState<'choice' | 'email' | 'org'>('choice');
  const [connectingProvider, setConnectingProvider] = useState<Provider | null>(null);
  const [erroredProvider, setErroredProvider] = useState<Provider | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (connectTimer.current) clearTimeout(connectTimer.current);
    };
  }, []);

  const goAfterSignIn = useCallback(() => {
    const { completed, answers, setResumeAvailable } = useOnboardingStore.getState();
    const showOnboarding = shouldShowOnboarding(completed);
    if (showOnboarding) {
      // Snapshot whether answers survived from an earlier session, before this run changes them.
      setResumeAvailable(Object.values(answers.diagnostic).some((v) => v !== null));
    }
    navigation.reset({
      index: 0,
      routes: [{ name: showOnboarding ? 'OnboardingRole' : 'HomeScreen' }],
    });
  }, [navigation]);

  const onContinueWithProvider = useCallback((provider: Provider) => {
    if (connectingProvider !== null) return;
    if (provider === 'org') {
      setErroredProvider(null);
      setStep('org');
      return;
    }
    setErroredProvider(null);
    setConnectingProvider(provider);

    if (provider === 'google') {
      getGoogleAccessToken()
        .then(({ email: googleEmail, accessToken }) => signInWithGoogle(googleEmail, accessToken))
        .then(() => {
          setConnectingProvider(null);
          goAfterSignIn();
        })
        .catch((err: unknown) => {
          console.error('[useLoginFlow] google sign-in failed:', err);
          setConnectingProvider(null);
          setErroredProvider('google');
        });
      return;
    }

    connectTimer.current = setTimeout(() => {
      setConnectingProvider(null);
      setErroredProvider(provider);
    }, CONNECT_SIMULATION_MS);
  }, [connectingProvider, goAfterSignIn, signInWithGoogle]);

  const onUseEmailInstead = useCallback(() => {
    setStep('email');
  }, []);

  const onBackToChoice = useCallback(() => {
    setStep('choice');
    setEmailError(undefined);
    setPasswordError(undefined);
  }, []);

  const onChangeEmail = useCallback((value: string) => {
    setEmail(value);
    if (emailError) setEmailError(undefined);
    if (formError) setFormError(undefined);
  }, [emailError, formError]);

  const onChangePassword = useCallback((value: string) => {
    setPassword(value);
    if (passwordError) setPasswordError(undefined);
    if (formError) setFormError(undefined);
  }, [passwordError, formError]);

  const onFillTestCreds = useCallback(() => {
    const creds = getTestCredentials();
    setEmail(creds.email);
    setEmailError(undefined);
    setPasswordError(undefined);
    if (showPasswordField) {
      setPassword(creds.password);
    }
  }, [showPasswordField]);

  const onSubmit = useCallback(() => {
    if (!showPasswordField) {
      const error = validateEmail(email);
      if (error) {
        setEmailError(error);
        return;
      }
      setShowPasswordField(true);
      return;
    }

    const error = validatePassword(password);
    if (error) {
      setPasswordError(error);
      return;
    }
    if (isSubmitting) return;

    setFormError(undefined);
    setIsSubmitting(true);
    signInWithPassword(email, password)
      .then(() => {
        // Best-effort: the local record must never block a real sign-in.
        saveCredentials(email, password).catch((err: unknown) => {
          console.error('[useLoginFlow] saving local credentials failed:', err);
        });
        goAfterSignIn();
      })
      .catch((err: unknown) => {
        // The banner only ever shows a mapped, user-safe message — log the
        // real error so a "Something went wrong" report is diagnosable.
        console.error('[useLoginFlow] password sign-in failed:', err);
        setFormError(mapAuthErrorMessage(err));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [email, password, showPasswordField, isSubmitting, goAfterSignIn, signInWithPassword]);

  const onSubmitOrgEmail = useCallback(() => {
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }
    // Org SSO has no backend yet: carry the work email over to the regular
    // email + password step.
    setShowPasswordField(true);
    setStep('email');
  }, [email]);

  return {
    step,
    connectingProvider,
    erroredProvider,
    email,
    password,
    emailError,
    passwordError,
    formError,
    isSubmitting,
    showPasswordField,
    ctaLabel: showPasswordField ? 'Continue' as const : 'Continue with email' as const,
    onContinueWithProvider,
    onUseEmailInstead,
    onBackToChoice,
    onChangeEmail,
    onChangePassword,
    onFillTestCreds,
    onSubmit,
    onSubmitOrgEmail,
  };
}
