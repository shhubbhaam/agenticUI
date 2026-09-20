import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import LaunchpadScreen from './LaunchpadScreen';

describe('LaunchpadScreen', () => {
  it('renders the wordmark and a Continue link', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <NavigationContainer>
          <LaunchpadScreen />
        </NavigationContainer>
      );
    });
    const texts = tree.root.findAllByType(require('react-native').Text).map((n) => n.props.children);
    expect(texts).toContain('AI Launchpad');
    expect(texts).toContain('Continue');
  });
});
