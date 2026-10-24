// src/ui/atoms/ActiveButton.test.tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { ActiveButton } from './ActiveButton';
import { colors } from '../tokens/colors';

function getBackgroundColor(tree: ReactTestRenderer.ReactTestRenderer) {
  const style = tree.root.findByType(TouchableOpacity).props.style;
  const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
  return flat.backgroundColor;
}

describe('ActiveButton disabled state', () => {
  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(
        <ActiveButton label="Continue" onPress={onPress} disabled />
      );
    });
    act(() => {
      tree.root.findByType(require('react-native').TouchableOpacity).props.onPress?.();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onPress when not disabled', () => {
    const onPress = jest.fn();
    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(
        <ActiveButton label="Continue" onPress={onPress} />
      );
    });
    act(() => {
      tree.root.findByType(require('react-native').TouchableOpacity).props.onPress?.();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ActiveButton primary variant fill color', () => {
  it('uses colors.action.lesson when no fillColor is provided (no regression)', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(<ActiveButton label="Continue" variant="primary" />);
    });
    expect(getBackgroundColor(tree)).toBe(colors.action.lesson);
  });

  it('uses the provided fillColor to override the background', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <ActiveButton label="Continue" variant="primary" fillColor={colors.action.primary} />
      );
    });
    expect(getBackgroundColor(tree)).toBe(colors.action.primary);
  });
});
