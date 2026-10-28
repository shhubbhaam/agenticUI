import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeHeader } from './HomeHeader';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function render(onPressStreak?: () => void) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <HomeHeader username="Priya" streakCount={12} onPressStreak={onPressStreak} />
      </SafeAreaProvider>
    );
  });
  return tree;
}

describe('HomeHeader streak button', () => {
  it('opens the streak screen when pressed', () => {
    const onPress = jest.fn();
    const tree = render(onPress);
    const button = tree.root.findByProps({ accessibilityLabel: '12 day streak' });
    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is inert without a handler', () => {
    const tree = render();
    expect(tree.root.findByProps({ accessibilityLabel: '12 day streak' }).props.disabled).toBe(true);
  });
});
