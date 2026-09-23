import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { getTestCredentials } from './testCredentials';
import { getGoogleAccessToken } from './googleSignIn';
import { useSessionStore } from '../../state/useSessionStore';
import { ApiError } from '../../data/learnhouse/client';

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

// LinkedIn and org sign-in have no backend support yet, so they keep the
// original fake connecting->error simulation. Only Google is wired to a
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
  step: 'choice' | 'email';
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
}

export function useLoginFlow(): LoginFlowState {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signInWithPassword = useSessionStore((s) => s.signInWithPassword);
  const signInWithGoogle = useSessionStore((s) => s.signInWithGoogle);

  const [step, setStep] = useState<'choice' | 'email'>('choice');
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

  const onContinueWithProvider = useCallback((provider: Provider) => {
    if (connectingProvider !== null) return;
    setErroredProvider(null);
    setConnectingProvider(provider);

    if (provider === 'google') {
      getGoogleAccessToken()
        .then(({ email: googleEmail, accessToken }) => signInWithGoogle(googleEmail, accessToken))
        .then(() => {
          setConnectingProvider(null);
          navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
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
  }, [connectingProvider, navigation, signInWithGoogle]);

  const onUseEmailInstead = useCallback(() => {
    setStep('email');
  }, []);

  const onBackToChoice = useCallback(() => {
    setStep('choice');
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
        navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
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
  }, [email, password, showPasswordField, isSubmitting, navigation, signInWithPassword]);

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
  };
}
