import React, {useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {Rocket} from 'lucide-react-native';
import twrnc from 'twrnc';

const s = twrnc;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Email validation
  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  // Password validation
  const validatePassword = (value: string) => {
    const minLength = value.length >= 8;
    const hasUppercase = /[A-Z]/.test(value);
    const hasSpecialCharacter = /[^A-Za-z0-9]/.test(value);

    return {
      minLength,
      hasUppercase,
      hasSpecialCharacter,
      valid: minLength && hasUppercase && hasSpecialCharacter,
    };
  };

  const handleLogin = () => {
    let valid = true;

    // Validate email
    if (!email) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    } else {
      setEmailError('');
    }

    // Validate password
    const passwordValidation = validatePassword(password);

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (!passwordValidation.valid) {
      const errors: string[] = [];

      if (!passwordValidation.minLength) {
        errors.push('at least 8 characters');
      }

      if (!passwordValidation.hasUppercase) {
        errors.push('one uppercase letter');
      }

      if (!passwordValidation.hasSpecialCharacter) {
        errors.push('one special character');
      }

      setPasswordError(`Password must contain ${errors.join(', ')}.`);
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!valid) {
      return;
    }

    console.log('Login:', {
      email,
      password,
    });
  };

  return (
    <SafeAreaView style={s`flex-1 bg-gray-50`}>
      <KeyboardAvoidingView
        style={s`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s`flex-grow justify-center px-5 py-6`}
          keyboardShouldPersistTaps="handled">

          {/* Main Card */}
          <View
            style={s` bg-white rounded-2xl border border-gray-200 px-5 py-6 shadow-md`}>

            {/* Rocket Icon */}
            <View style={s`items-center mb-5`}>
              <View
                style={s`
                  w-18
                  h-18
                  rounded-full
                  bg-indigo-500
                  items-center
                  justify-center
                `}>
                <Rocket
                  size={32}
                  color="white"
                  strokeWidth={2.2}
                />
              </View>
            </View>

            {/* Heading */}
            <Text
              style={s`
                text-center
                text-[30px]
                font-bold
                text-gray-900
                leading-[36px]
              `}>
              Welcome to AI
            </Text>

            <Text
              style={s`
                text-center
                text-[30px]
                font-bold
                text-gray-900
                leading-[36px]
                mb-2
              `}>
              Launchpad
            </Text>

            {/* Subtitle */}
            <Text
              style={s`
                text-center
                text-[15px]
                text-gray-600
                leading-5
                mb-7
              `}>
              Sign in to continue to your dashboard
            </Text>

            {/* Email */}
            <View style={s`mb-4`}>
              <Text
                style={s`
                  text-[15px]
                  font-medium
                  text-gray-900
                  mb-2
                `}>
                Email Address
              </Text>

              <TextInput
                value={email}
                onChangeText={value => {
                  setEmail(value);

                  if (emailError) {
                    setEmailError('');
                  }
                }}
                placeholder="Enter your email"
                placeholderTextColor="#737d8c"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={s`
                  h-13
                  border
                  border-gray-300
                  rounded-lg
                  px-4
                  text-[15px]
                  text-gray-900
                `}
              />

              {emailError !== '' && (
                <Text style={s`text-red-500 text-xs mt-1`}>
                  {emailError}
                </Text>
              )}
            </View>

            {/* Password */}
            <View style={s`mb-4`}>
              <View style={s`flex-row justify-between items-center mb-2`}>
                <Text
                  style={s`
                    text-[15px]
                    font-medium
                    text-gray-900
                  `}>
                  Password
                </Text>

                <TouchableOpacity>
                  <Text
                    style={s`
                      text-[14px]
                      font-semibold
                      text-indigo-600
                    `}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={password}
                onChangeText={value => {
                  setPassword(value);

                  if (passwordError) {
                    setPasswordError('');
                  }
                }}
                placeholder="Enter your password"
                placeholderTextColor="#737d8c"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={s`
                  h-13
                  border
                  border-gray-300
                  rounded-lg
                  px-4
                  text-[15px]
                  text-gray-900
                `}
              />

              {passwordError !== '' && (
                <Text style={s`text-red-500 text-xs mt-1`}>
                  {passwordError}
                </Text>
              )}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogin}
              style={s`
                h-13
                rounded-lg
                bg-indigo-600
                items-center
                justify-center
                mb-7
              `}>
              <Text
                style={s`
                  text-white
                  text-[16px]
                  font-medium
                `}>
                Login
              </Text>
            </TouchableOpacity>

            {/* Sign Up */}
            <View style={s`flex-row justify-center items-center`}>
              <Text
                style={s`
                  text-[15px]
                  text-gray-600
                `}>
                Don't have an account?{' '}
              </Text>

              <TouchableOpacity>
                <Text
                  style={s`
                    text-[15px]
                    font-medium
                    text-indigo-600
                  `}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}