import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function renderScreen(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={initialMetrics}>{node}</SafeAreaProvider>);
  });
  return tree;
}

export function textsOf(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAllByType(Text).map((n) => n.props.children);
}

// Walk up from the label Text to the nearest ancestor with a callable onPress
// (same technique as LoginScreen.test.tsx).
export function pressByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  let node: ReactTestRenderer.ReactTestInstance | null = tree.root.findByProps({ children: label }).parent;
  while (node && typeof node.props.onPress !== 'function') node = node.parent;
  if (!node) throw new Error(`No pressable ancestor found for label "${label}"`);
  act(() => { node!.props.onPress(); });
}

// Note: for components that receive `testID` as their own prop (e.g.
// ChoiceCard), findByProps returns the composite component, not the host
// node. Pressing works via its `onPress` prop, but `accessibilityState` is
// only on the innermost node — use accessibilityStateByTestId for that.
export function pressByTestId(tree: ReactTestRenderer.ReactTestRenderer, testID: string) {
  const node = tree.root.findByProps({ testID });
  act(() => { node.props.onPress(); });
}

// Reads accessibilityState from the innermost node carrying `testID`.
export function accessibilityStateByTestId(tree: ReactTestRenderer.ReactTestRenderer, testID: string) {
  return tree.root.findAllByProps({ testID }).pop()!.props.accessibilityState;
}

// True when the pressable ancestor of `label` is disabled.
export function isDisabledByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string): boolean {
  let node: ReactTestRenderer.ReactTestInstance | null = tree.root.findByProps({ children: label }).parent;
  while (node && node.props.disabled === undefined) node = node.parent;
  return node?.props.disabled === true;
}
