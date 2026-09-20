import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { getTestCredentials } from './testCredentials';

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

const CONNECT_SIMULATION_MS = 1500;

export interface LoginFlowState {
  step: 'choice' | 'email';
  connectingProvider: Provider | null;
  erroredProvider: Provider | null;
  email: string;
  password: string;
  emailError?: string;
  passwordError?: string;
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

  const [step, setStep] = useState<'choice' | 'email'>('choice');
  const [connectingProvider, setConnectingProvider] = useState<Provider | null>(null);
  const [erroredProvider, setErroredProvider] = useState<Provider | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
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
    connectTimer.current = setTimeout(() => {
      setConnectingProvider(null);
      setErroredProvider(provider);
    }, CONNECT_SIMULATION_MS);
  }, [connectingProvider]);

  const onUseEmailInstead = useCallback(() => {
    setStep('email');
  }, []);

  const onBackToChoice = useCallback(() => {
    setStep('choice');
  }, []);

  const onChangeEmail = useCallback((value: string) => {
    setEmail(value);
    if (emailError) setEmailError(undefined);
  }, [emailError]);

  const onChangePassword = useCallback((value: string) => {
    setPassword(value);
    if (passwordError) setPasswordError(undefined);
  }, [passwordError]);

  const onFillTestCreds = useCallback(() => {
    const creds = getTestCredentials();
    setEmail(creds.email);
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
    navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
  }, [email, password, showPasswordField, navigation]);

  return {
    step,
    connectingProvider,
    erroredProvider,
    email,
    password,
    emailError,
    passwordError,
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
