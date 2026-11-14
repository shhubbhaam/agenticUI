// M7 (W3 review): a registered component that throws while rendering is replaced by ITS slot's
// fallback; the other slot keeps rendering.
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, View } from 'react-native';
import { SlotBoundary } from './SlotBoundary';

function Exploding(): React.ReactElement {
  throw new Error('component bug');
}

describe('SlotBoundary', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    // React logs caught render errors; keep the test output readable.
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('a throwing slot shows only its own fallback; the other slot still renders', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <View>
          <SlotBoundary slot="mainCard" fallback={<Text>main fallback</Text>}>
            <Exploding />
          </SlotBoundary>
          <SlotBoundary slot="nextStepSection" fallback={<Text>next fallback</Text>}>
            <Text>next step card</Text>
          </SlotBoundary>
        </View>,
      );
    });
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toEqual(['main fallback', 'next step card']);
  });

  it('renders its children when nothing throws', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <SlotBoundary slot="mainCard" fallback={<Text>fallback</Text>}>
          <Text>card</Text>
        </SlotBoundary>,
      );
    });
    expect(tree.root.findAllByType(Text).map((n) => n.props.children)).toEqual(['card']);
  });
});
