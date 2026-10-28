import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ComingSoonScreen from './ComingSoonScreen';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

describe('ComingSoonScreen', () => {
  it('shows the title and goes back', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
          <ComingSoonScreen title="Streak" />
        </SafeAreaProvider>
      );
    });
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toEqual(expect.arrayContaining(['STREAK', 'Streak', 'Coming soon.']));
    act(() => tree.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress());
    expect(mockGoBack).toHaveBeenCalled();
  });
});
