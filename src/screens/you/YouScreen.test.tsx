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

const mockSignOut = jest.fn();
jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({ signOut: mockSignOut }),
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
  it('signs out and resets navigation to Login', async () => {
    mockReset.mockClear();
    mockSignOut.mockReset().mockResolvedValue(undefined);
    const tree = renderScreen();

    await act(async () => {
      pressByLabel(tree, 'Log out');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
  });

  it('still navigates to Login even if signOut rejects', async () => {
    mockReset.mockClear();
    mockSignOut.mockReset().mockRejectedValue(new Error('network error'));
    const tree = renderScreen();

    await act(async () => {
      pressByLabel(tree, 'Log out');
      await Promise.resolve();
      await Promise.resolve();
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
