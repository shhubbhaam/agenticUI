// src/ui/atoms/ActiveButton.test.tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ActiveButton } from './ActiveButton';

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
