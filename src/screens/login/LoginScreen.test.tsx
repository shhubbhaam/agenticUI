import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './LoginScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <NavigationContainer>
          <LoginScreen />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  });
  return tree;
}

// RN's TouchableOpacity renders through several intermediate host/composite
// nodes (Animated.View wrappers, etc.) before reaching the actual onPress
// handler, so the label Text's immediate `.parent` is not the pressable
// itself. Walk up the instance tree to the nearest ancestor exposing a
// callable `onPress`, which is the standard react-test-renderer way to
// locate an interactive ancestor regardless of wrapper depth.
function pressByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  let node = tree.root.findByProps({ children: label }).parent;
  while (node && typeof node.props.onPress !== 'function') {
    node = node.parent;
  }
  if (!node) {
    throw new Error(`No pressable ancestor found for label "${label}"`);
  }
  node.props.onPress();
}

describe('LoginScreen', () => {
  it('shows all 4 choice buttons plus the email link', () => {
    const tree = renderScreen();
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Continue with Google');
    expect(texts).toContain('Continue with LinkedIn');
    expect(texts).toContain('Sign in with your organization');
    expect(texts).toContain('Use your email instead');
  });

  it('shows a validation error for an invalid email, then reveals the password field for a valid one', () => {
    jest.useFakeTimers();
    const tree = renderScreen();

    act(() => {
      pressByLabel(tree, 'Use your email instead');
    });

    let emailInput = tree.root.findByProps({ placeholder: 'you@example.com' });
    act(() => { emailInput.props.onChangeText('not-an-email'); });
    act(() => {
      pressByLabel(tree, 'Continue with email');
    });
    let texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Please enter a valid email address');

    emailInput = tree.root.findByProps({ placeholder: 'you@example.com' });
    act(() => { emailInput.props.onChangeText('a@b.com'); });
    act(() => {
      pressByLabel(tree, 'Continue with email');
    });
    texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Password');
    expect(texts).toContain('Continue');
    jest.useRealTimers();
  });

  it('shows the organization sign-in view from the org button', () => {
    const tree = renderScreen();
    act(() => { pressByLabel(tree, 'Sign in with your organization'); });
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toEqual(expect.arrayContaining(['Your team\u2019s learning starts here.', 'Work email', 'Continue with email', 'Other sign-in options']));
    expect(tree.root.findAllByProps({ placeholder: 'priya@company.com' }).length).toBeGreaterThan(0);
  });
});
