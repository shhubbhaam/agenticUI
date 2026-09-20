import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import YouScreen from './YouScreen';

const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ reset: mockReset }),
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function pressByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  let node = tree.root.findByProps({ children: label });
  while (node && typeof node.props.onPress !== 'function') {
    node = node.parent!;
  }
  if (!node) throw new Error(`No pressable ancestor found for label "${label}"`);
  node.props.onPress();
}

function renderScreen() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <NavigationContainer>
          <YouScreen />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  });
  return tree;
}

describe('YouScreen', () => {
  it('renders a Log out button that resets navigation to Login', () => {
    mockReset.mockClear();
    const tree = renderScreen();

    act(() => {
      pressByLabel(tree, 'Log out');
    });

    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
  });

  it('still renders the placeholder heading', () => {
    const tree = renderScreen();
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('You');
    expect(texts).toContain('Coming soon.');
  });
});
