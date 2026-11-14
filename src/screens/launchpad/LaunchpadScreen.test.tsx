import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LaunchpadScreen, { restoredSessionRoute } from './LaunchpadScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('LaunchpadScreen', () => {
  it('renders the wordmark and a Continue link', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <NavigationContainer>
            <LaunchpadScreen />
          </NavigationContainer>
        </SafeAreaProvider>
      );
    });
    const texts = tree.root.findAllByType(require('react-native').Text).map((n) => n.props.children);
    expect(texts).toContain('AI Launchpad');
    expect(texts).toContain('Continue');
  });
});

describe('restored session at app start', () => {
  it('goes straight in: Home, or onboarding if it was never finished', () => {
    expect(restoredSessionRoute(true)).toBe('HomeScreen');
    expect(restoredSessionRoute(false)).toBe('OnboardingRole');
  });
});
